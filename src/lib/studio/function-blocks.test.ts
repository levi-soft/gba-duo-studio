import {it,expect} from 'vitest';
import {characterCard,statsTable} from './function-blocks.js';
import {prepareFunctionBlock,previewFunctionBlock,insertFunctionBlock,type FunctionBlockRequest} from './function-block-authoring.js';
import {createProject,walk,exportPack,importPack} from './project.js';
import {interpolate,scopedValues} from '../preview/data.js';
import {cloneProject,rememberProject,serializeSourceProject,deserializeSourceProject} from './source-project.js';
function fixture(){const p=createProject('blank');p.manifest.match={gameCode:['TEST'],crc32:['12345678']};p.manifest.script='main.lua';p.files={'main.lua':btoa('function update() return {pilot="Aya",ammo=3,capacity=20} end'),'reader.lua':btoa('return {}'),'assets/portrait.png':btoa('\x00\xff\x80')};p.data={pilot:'Aya',rank:4,ammo:3,capacity:20,energy:0,avatar:'asset:portrait.png'};return p;}
const parent=(p:ReturnType<typeof fixture>)=>p.layout.pages![0].child.id;
const request=(p:ReturnType<typeof fixture>):FunctionBlockRequest=>({kind:'character',parentId:parent(p),position:'start',title:'Phi công',nameField:'pilot',levelField:'rank',levelLabel:'Hạng',portraitMode:'field',portraitField:'avatar',hpEnabled:true,currentHpField:'ammo',maximumHpField:'capacity',barLabel:'Đạn'});
it('constructs reusable game-neutral blocks with explicit fields and no forced palette',()=>{
  const card=characterCard({id:'pilot-card',nameField:'pilot',portrait:'$avatar',levelField:'rank',currentHpField:'ammo',maximumHpField:'capacity',hpLabel:'Đạn'});
  const refs=walk(card);expect(refs.find(r=>r.node.type==='bar')?.node).toMatchObject({value:'$ammo',maxKey:'$capacity',label:'Đạn: {ammo} / {capacity}'});
  expect(card.style?.['flex-shrink']).toBe('0');
  expect(statsTable({id:'table',rows:[{label:'Ammo',field:'ammo'}]}).style?.['flex-shrink']).toBe('0');
  expect(refs.some(r=>Object.keys(r.node.style??{}).some(k=>['color','background','background-color','font-family'].includes(k)))).toBe(false);
  expect(new Set(refs.map(r=>r.node.id)).size).toBe(refs.length);
  expect(interpolate(refs.find(r=>r.node.type==='bar')!.node.label,{ammo:0,capacity:20})).toBe('Đạn: 0 / 20');
  expect(characterCard({id:'minimal',nameField:'pilot'}).children).toHaveLength(1);
  expect(walk(characterCard({id:'minimal',nameField:'pilot'})).some(r=>r.node.type==='image'||r.node.type==='bar')).toBe(false);
});
it('inserts and roundtrips a complete block preserving reader bytes, data and original nodes',async()=>{
  const p=fixture(),before=cloneProject(p),originalIds=walk(p.layout).map(r=>r.node.id),history=rememberProject([],p);
  const id=insertFunctionBlock(p,request(p),'vi','inserted-card');expect(p.layout.pages![0].child.children![0].id).toBe(id);
  const result=await importPack(await(await exportPack(p)).arrayBuffer());
  for(const[name,value]of Object.entries(before.files))expect(result.files[name],name).toBe(value);
  expect(result.manifest).toEqual(before.manifest);expect(result.data).toEqual(before.data);
  expect(originalIds.every(id=>walk(result.layout).some(r=>r.node.id===id))).toBe(true);
  expect(walk(result.layout).find(r=>r.node.id==='inserted-card-hp')?.node.label).toBe('Đạn: {ammo} / {capacity}');
  expect(history[0]).toEqual(before);expect(history[0].layout).not.toEqual(p.layout);
  expect(deserializeSourceProject(serializeSourceProject(p))).toEqual(p);
});
it('keeps validation atomic for incompatible data, missing portraits, row limits and ID collisions',()=>{
  const cases=[{nameField:'unknown'},{portraitField:'rank'},{portraitMode:'asset',portraitAsset:'assets/missing.png'},{maximumHpField:'pilot'},{maximumHpField:'ammo'},{kind:'unknown'}];
  for(const change of cases){const p=fixture(),before=JSON.stringify(p);expect(()=>insertFunctionBlock(p,{...request(p),...change} as FunctionBlockRequest,'vi','test')).toThrow();expect(JSON.stringify(p)).toBe(before);}
  const p=fixture(),before=JSON.stringify(p),base:FunctionBlockRequest={kind:'stats',parentId:parent(p),position:'end',title:'Chỉ số',rows:[]};
  for(const labelField of ['unknown','__proto__.x','items','']){expect(()=>insertFunctionBlock(p,{...base,rows:[{label:'',labelField,field:'ammo'}]},'vi','label-test')).toThrow();expect(JSON.stringify(p)).toBe(before);}
  for(const rows of [[],Array.from({length:25},()=>({label:'Đạn',field:'ammo'})),[{label:'',field:'ammo'}],[{label:'Đạn',field:'unknown'}]]){expect(()=>insertFunctionBlock(p,{...base,rows},'vi','stats')).toThrow();expect(JSON.stringify(p)).toBe(before);}
  p.layout.pages![0].child.children=[{id:'collision-name',type:'text',text:'Keep'}];const snapshot=JSON.stringify(p);
  expect(()=>insertFunctionBlock(p,request(p),'vi','collision')).toThrow('already in use');expect(JSON.stringify(p)).toBe(snapshot);
  for(const field of ['constructor','__proto__.x','hp} injected {maxHp'])expect(()=>statsTable({id:'safe',rows:[{label:'X',field}]})).toThrow();
});
it('supports validated label fields without interpreting literal labels as bindings',()=>{
  const p=fixture();p.data.powerName='Mag';p.data.power=7;
  const request:FunctionBlockRequest={kind:'stats',parentId:parent(p),position:'end',title:'',rows:[{label:'',labelField:'powerName',field:'power'}]};
  insertFunctionBlock(p,request,'en','bound-label');
  const node=walk(p.layout).find(r=>r.node.id==='bound-label-label-0')!.node;
  expect(node.text).toBe('{powerName}');expect(interpolate(node.text,p.data)).toBe('Mag');
  expect(interpolate(node.text,{...p.data,powerName:'Str'})).toBe('Str');
  expect(()=>statsTable({id:'literal',rows:[{label:'{powerName}',field:'power'}]})).toThrow();
  expect(()=>statsTable({id:'invalid',rows:[{labelField:'constructor',field:'power'}]})).toThrow();
});
it('renders a detached row-scope preview without changing sample arrays or resolving global HP by mistake',()=>{
  const p=fixture();p.data.party=[{pilot:'One',rank:2,ammo:0,capacity:8,avatar:'asset:portrait.png'},{pilot:'Two',rank:5,ammo:6,capacity:9,avatar:'asset:portrait.png'}];
  p.layout.pages![0].child.children=[{type:'list',id:'party',items:'$party',template:{type:'column',id:'row',children:[]}}];
  const before=JSON.stringify(p),r={...request(p),parentId:'row'};
  const preview=previewFunctionBlock(p,r,'vi');expect((preview.data.party as unknown[]).length).toBe(1);expect(JSON.stringify(p)).toBe(before);
  const name=walk(preview.layout).find(r=>r.node.id==='function-block-preview-name')!.node;
  expect(interpolate(name.text,scopedValues((p.data.party as any[])[0],0,p.data))).toBe('One');
  p.data.party=[];expect(()=>prepareFunctionBlock(p,r,'test','vi')).toThrow('scalar');
});
it('stat rows retain caller ordering, arbitrary non-game-specific field names and zero values',()=>{
  let seed=0x5a1c399;const next=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  for(let run=0;run<80;run++){
    const data:Record<string,number>={},rows=Array.from({length:1+next()%24},(_,i)=>{const field='metric_'+i;data[field]=next()%1000;return{label:'Chỉ số '+i,field};});
    data.metric_0=0;
    const a=statsTable({id:'stats',title:'Dữ liệu',rows}),b=statsTable({id:'stats',title:'Dữ liệu',rows});expect(a).toEqual(b);
    const values=walk(a).filter(r=>r.node.id.startsWith('stats-value-'));
    expect(values.map(r=>interpolate(r.node.text,data))).toEqual(rows.map(r=>String(data[r.field])));
    expect(new Set(walk(a).map(r=>r.node.id)).size).toBe(walk(a).length);
    const reversed=statsTable({id:'reversed',rows:[...rows].reverse()});expect(walk(reversed).filter(r=>r.node.id.startsWith('reversed-value-')).map(r=>interpolate(r.node.text,data))).toEqual([...rows].reverse().map(r=>String(data[r.field])));
  }
});
