import {it,expect} from 'vitest';
import {createProject,exportPack,importPack,walk,validate} from './project.js';
import {dataCatalog,validateDataFields} from './data-catalog.js';
import {applyDataWidget,selectedDataWidget} from './data-widgets.js';
import {interpolate,resolve,scopedValues} from '../preview/data.js';

function fixture(){const p=createProject('blank');p.manifest.match={gameCode:['TEST'],crc32:['12345678']};p.manifest.script='scripts/main.lua';p.files={'scripts/main.lua':btoa('function update() return {hp=12,maxHp=30} end'),'scripts/helper.lua':btoa('return {}'),'assets/test.bin':btoa('\x00\xff')};p.data={hp:12,maxHp:30,level:4,gold:90,party:[{name:'One',hp:3,maxHp:7},{name:'Two',hp:8,maxHp:10}]};return p;}
const parent=(p:ReturnType<typeof fixture>)=>p.layout.pages![0].child.id;
it('names existing fields in Vietnamese, honors author descriptions and keeps configured values distinct from observations',()=>{
  const p=fixture();p.manifest.studioDataFields={hp:{label:'Vitality',labelVi:'Sức sống',kind:'number',aliases:['máu']},missing:{labelVi:'Điểm chưa có',kind:'number'}};
  p.manifest.values={nativeOnly:{type:'u8',addr:'02000000'}};
  expect(dataCatalog(p,parent(p),'vi','mau').map(f=>f.label)).toEqual(['Sức sống']);
  expect(dataCatalog(p,parent(p),'vi').find(f=>f.path==='maxHp')?.label).toBe('HP tối đa');
  expect(dataCatalog(p,parent(p),'vi').find(f=>f.path==='nativeOnly')).toMatchObject({source:'native',kind:'number',value:undefined});
  expect(dataCatalog(p,parent(p),'vi').find(f=>f.path==='missing')).toMatchObject({source:'declared',kind:'number',value:undefined});
});
it('binds a live numeric bar with a real maximum and preserves all reader bytes/data across ZIP export',async()=>{
  const p=fixture(),before=structuredClone(p),id=applyDataWidget(p,{kind:'bar',field:'hp',maxField:'maxHp',caption:'Sức khỏe',parentId:parent(p),position:'start'},'vi');
  const node=walk(p.layout).find(r=>r.node.id===id)!.node;
  expect(node).toMatchObject({type:'bar',value:'$hp',maxKey:'$maxHp',label:'Sức khỏe: {hp} / {maxHp}'});expect(node.max).toBeUndefined();
  expect(p.layout.pages![0].child.children![0].id).toBe(id);
  expect(interpolate(node.label,{hp:6,maxHp:30})).toBe('Sức khỏe: 6 / 30');expect(resolve(node.value,{hp:6,maxHp:30})).toBe(6);
  const after=await importPack(await(await exportPack(p)).arrayBuffer());
  for(const [name,bytes]of Object.entries(before.files))expect(after.files[name]).toBe(bytes);
  expect(after.manifest.script).toBe(before.manifest.script);expect(after.data).toEqual(before.data);expect(after.manifest.values).toEqual(before.manifest.values);
});
it('recognizes old-pack numeric placeholders from existing bars without converting or inventing sample values',()=>{
  const p=fixture(),existing=applyDataWidget(p,{kind:'bar',field:'hp',maxField:'maxHp',parentId:parent(p)});
  p.data.hp='---';p.data.maxHp='---';
  p.manifest.studioDataFields={hp:{kind:'string'}}; // Old sample-only metadata must not override an actual numeric bar contract.
  expect(dataCatalog(p,parent(p)).find(f=>f.path==='hp')).toMatchObject({kind:'number',source:'declared',value:'---'});
  expect(()=>applyDataWidget(p,{kind:'bar',field:'hp',maxField:'maxHp',parentId:parent(p)})).not.toThrow();
  expect(p.data.hp).toBe('---');
  p.data.hp='not a number';expect(dataCatalog(p,parent(p)).find(f=>f.path==='hp')?.kind).toBe('string');
  expect(()=>applyDataWidget(p,{kind:'bar',field:'hp',maxField:'maxHp',parentId:parent(p)})).toThrow();
  expect(walk(p.layout).find(r=>r.node.id===existing)?.node.maxKey).toBe('$maxHp');
  const native=fixture();native.manifest.values={hp:{type:'u8',addr:'02000000'}};native.data.hp='---';expect(dataCatalog(native,parent(native)).find(f=>f.path==='hp')?.kind).toBe('number');
});
it('keeps list-row values separate from global values, including zero and empty lists',()=>{
  const p=fixture(),id=applyDataWidget(p,{kind:'list',field:'party',itemField:'name',parentId:parent(p)},'vi');
  const list=walk(p.layout).find(r=>r.node.id===id)!.node,template=list.template!;
  const fields=dataCatalog(p,template.id,'vi');expect(fields.filter(f=>f.path==='hp')).toHaveLength(1);expect(fields.find(f=>f.path==='hp')).toMatchObject({scope:'item',value:3});
  expect(()=>applyDataWidget(p,{kind:'bar',field:'hp',maxField:'gold',parentId:parent(p),replaceId:template.id})).toThrow();
  applyDataWidget(p,{kind:'text',field:'hp',parentId:parent(p),replaceId:template.id,caption:'HP'});
  expect(interpolate(template.text,scopedValues({hp:0},0,p.data))).toBe('HP: 0');
  p.data.party=[];expect(dataCatalog(p,template.id)).toEqual([]);
});
it('rejects incompatible types, wrong targets, unsafe keys and bad metadata without partial mutations',()=>{
  for(const request of [
    {kind:'bar' as const,field:'hp',maxField:'hp'},
    {kind:'bar' as const,field:'party',maxField:'maxHp'},
    {kind:'text' as const,field:'party'},
    {kind:'text' as const,field:'unknown'},
    {kind:'list' as const,field:'party',itemField:'unknown'},
    {kind:'image' as const,field:'hp'},
    {kind:'image' as const,field:'party'},
  ]){const p=fixture(),before=JSON.stringify(p);expect(()=>applyDataWidget(p,{...request,parentId:parent(p)})).toThrow();expect(JSON.stringify(p)).toBe(before);}
  const p=fixture();p.data['constructor']=5;p.data['literal.dot']=7;expect(dataCatalog(p,parent(p)).some(f=>f.path==='constructor'||f.path==='literal.dot')).toBe(false);
  for(const metadata of [{bad:{kind:'function'}},JSON.parse('{"__proto__":{"label":"bad"}}'),{x:{aliases:[7]}}])expect(()=>validateDataFields(metadata)).toThrow();
  p.manifest.studioDataFields={x:{kind:'number'}};expect(()=>validate(p)).not.toThrow();
});
it('prefills recognizable native bindings and keeps complex text as a per-field template',()=>{
 const p=fixture();p.layout.pages![0].child.children=[{id:'name',type:'text',text:'Nhân vật: {unitName}'},{id:'mixed',type:'text',text:'{unitName} — Cấp {level}'},{id:'image',type:'image',src:'$portrait'},{id:'bar',type:'bar',value:'{hp}',maxKey:'$maxHp',label:'Máu {hp}/{maxHp}'}];
 const before=JSON.stringify(p);
 expect(selectedDataWidget(p,'name')).toMatchObject({kind:'text',field:'unitName',caption:'Nhân vật',replaceId:'name'});
 expect(selectedDataWidget(p,'mixed')).toMatchObject({kind:'text',field:'',caption:'',keepText:true,textFields:{unitName:'unitName',level:'level'}});
 expect(selectedDataWidget(p,'image')).toMatchObject({kind:'image',field:'portrait'});
 expect(selectedDataWidget(p,'bar')).toMatchObject({kind:'bar',field:'hp',maxField:'maxHp',keepLabel:true});
 expect(selectedDataWidget(p,parent(p))).toBeNull();expect(JSON.stringify(p)).toBe(before);
});
it('rebinds image data in place, preserving its identity, styling, actions and reader bytes through export',async()=>{
 const p=fixture();p.data.portrait='asset:one.png';p.data.avatar='asset:two.png';
 const image={id:'portrait-image',type:'image',src:'$portrait',class:'framed',visibleIf:'$show',style:{width:'90px',height:'120px','object-fit':'cover'},onClick:{call:'open'}};
 p.layout.pages![0].child.children=[image];const before=structuredClone(p),nodeCount=walk(p.layout).length;
 const id=applyDataWidget(p,{kind:'image',field:'avatar',parentId:'',replaceId:image.id});expect(id).toBe(image.id);expect(walk(p.layout).length).toBe(nodeCount);
 expect(image).toEqual({...before.layout.pages![0].child.children![0],src:'$avatar'});
 expect(resolve(image.src,p.data)).toBe('asset:two.png');expect(p.data).toEqual(before.data);expect(p.files).toEqual(before.files);expect(p.manifest).toEqual(before.manifest);
 const after=await importPack(await(await exportPack(p)).arrayBuffer());expect(walk(after.layout).find(r=>r.node.id===id)?.node).toEqual(image);
 for(const [name,bytes]of Object.entries(before.files))expect(after.files[name]).toBe(bytes);
});
it('remaps current/maximum label tokens in one pass while preserving other label content',()=>{
 const p=fixture(),bar={id:'bar',type:'bar',value:'$hp',maxKey:'$maxHp',max:100,label:'Máu {hp}/{maxHp} — Cấp {level}',class:'old',style:{width:'90px'},onClick:{call:'show'}};
 p.layout.pages![0].child.children=[bar];const before=structuredClone(p);
 applyDataWidget(p,{kind:'bar',field:'maxHp',maxField:'hp',keepLabel:true,parentId:'',replaceId:'bar'});
 expect(bar.label).toBe('Máu {maxHp}/{hp} — Cấp {level}');expect(bar.style).toEqual(before.layout.pages![0].child.children![0].style);expect(bar.onClick).toEqual({call:'show'});
 expect(interpolate(bar.label,p.data)).toBe('Máu 30/12 — Cấp 4');expect(bar.max).toBeUndefined();expect(p.files).toEqual(before.files);expect(p.data).toEqual(before.data);
});
it('requires a deliberate new label when the old bar has ambiguous repeated bindings',()=>{
 const p=fixture(),bar={id:'bar',type:'bar',value:'$hp',maxKey:'$hp',label:'{hp} / {hp}'};p.layout.pages![0].child.children=[bar];const before=JSON.stringify(p);
 expect(()=>applyDataWidget(p,{kind:'bar',field:'hp',maxField:'maxHp',keepLabel:true,parentId:'',replaceId:'bar'})).toThrow('same field twice');expect(JSON.stringify(p)).toBe(before);
 applyDataWidget(p,{kind:'bar',field:'hp',maxField:'maxHp',keepLabel:false,caption:'Sức khỏe',parentId:'',replaceId:'bar'});expect(bar.label).toBe('Sức khỏe: {hp} / {maxHp}');
});
it('generated binding properties track changed values without changing reader configuration',()=>{
  let seed=0x8267a42;const next=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  for(let i=0;i<100;i++){const p=fixture(),current=next()%1000,max=current+1+next()%1000;p.data.hp=current;p.data.maxHp=max;const files=JSON.stringify(p.files),manifest=JSON.stringify(p.manifest);
    const id=applyDataWidget(p,{kind:'bar',field:'hp',maxField:'maxHp',parentId:parent(p)}),node=walk(p.layout).find(r=>r.node.id===id)!.node;
    expect(interpolate(node.label,{hp:0,maxHp:max})).toBe(`0 / ${max}`);expect(resolve(node.maxKey,{maxHp:max})).toBe(max);
    expect(JSON.stringify(p.files)).toBe(files);expect(JSON.stringify(p.manifest)).toBe(manifest);
  }
});
