import {expect,it} from 'vitest';
import {createProject,walk,exportPack,importPack} from './project.js';
import {dataCatalog} from './data-catalog.js';
import {applyDataWidget,selectedDataWidget} from './data-widgets.js';
import {textTemplateBindings,rebindTextTemplate} from './text-rebinding.js';
import {interpolate,scopedValues} from '../preview/data.js';
import type {DataWidgetRequest} from './data-widgets.js';

function fixture(){
 const p=createProject('blank');p.manifest.match={gameCode:['TEST']};p.manifest.script='reader.lua';
 p.files={'reader.lua':btoa('function update() return {} end'),'assets/opaque.bin':btoa('\x00\xff')};
 p.data={hp:12,maxHp:30,energy:0,capacity:20,level:4,rank:'D',active:false,rows:[{hp:3,maxHp:9,energy:0,capacity:5,level:2}]};
 p.layout.pages![0].child.children=[{type:'text',id:'summary',text:'Máu {hp}/{maxHp}\nCấp {level} · {hp} HP',style:{color:'#ffff00'},class:'stats',onClick:{call:'details'},visibleIf:'$active'}];
 return p;
}
const node=(p:ReturnType<typeof fixture>)=>walk(p.layout).find(r=>r.node.id==='summary')!.node;
const request:DataWidgetRequest={kind:'text',field:'',parentId:'',replaceId:'summary',keepText:true,textFields:{hp:'energy',maxHp:'capacity',level:'level'}};
it('extracts unique fields in display order and keeps row-index/UI references out of reader mapping',()=>{
 expect(textTemplateBindings('HP {hp}/{maxHp} · {hp}\n{@index} {ui.page}')).toEqual({supported:true,paths:['hp','maxHp']});
 const p=fixture(),before=structuredClone(p);expect(selectedDataWidget(p,'summary')).toMatchObject({kind:'text',keepText:true,textFields:{hp:'hp',maxHp:'maxHp',level:'level'}});expect(p).toEqual(before);
 for(const value of [null,'Static only','{@index} {ui.page}','{constructor.name}','{hp} {ui.__proto__.x}',Array(25).fill(0).map((_,i)=>`{value${i}}`).join(''),'x'.repeat(16385)+'{hp}'])expect(textTemplateBindings(value).supported).toBe(false);
});
it('changes all selected tokens in one transaction while preserving literal text, style/actions, sample/reader data and ZIP content',async()=>{
 const p=fixture(),before=structuredClone(p),target=node(p);expect(applyDataWidget(p,request)).toBe('summary');
 expect(node(p)).toBe(target);expect(target.text).toBe('Máu {energy}/{capacity}\nCấp {level} · {energy} HP');
 expect(interpolate(target.text,p.data)).toBe('Máu 0/20\nCấp 4 · 0 HP');
 before.layout.pages![0].child.children![0].text=target.text;expect(p).toEqual(before);
 const imported=await importPack(await(await exportPack(p)).arrayBuffer());expect(node(imported)).toEqual(target);expect(imported.data).toEqual(p.data);
 for(const [path,bytes]of Object.entries(p.files))expect(imported.files[path]).toBe(bytes);
});
it('handles swapped and cyclic replacements simultaneously, including repeated fields and UI/index tokens',()=>{
 const p=fixture(),fields=dataCatalog(p,'summary'),original='{hp}|{maxHp}|{level}|{hp}|{@index}|{ui.tab}';
 const changed=rebindTextTemplate(original,{hp:'maxHp',maxHp:'level',level:'hp'},fields);
 expect(changed).toBe('{maxHp}|{level}|{hp}|{maxHp}|{@index}|{ui.tab}');
 expect(rebindTextTemplate(changed,{maxHp:'hp',level:'maxHp',hp:'level'},fields)).toBe(original);
});
it('rejects incomplete, extra, unsafe, out-of-scope and array destinations without a partial project edit',()=>{
 const invalid:(Record<string,string>|undefined)[]=[undefined,{hp:'energy'},{hp:'energy',maxHp:'capacity',level:'level',extra:'hp'}, {hp:'rows',maxHp:'capacity',level:'level'}, {hp:'unknown',maxHp:'capacity',level:'level'}, {hp:'constructor',maxHp:'capacity',level:'level'}, {hp:'{hp}',maxHp:'capacity',level:'level'}];
 for(const textFields of invalid){
  const p=fixture(),before=structuredClone(p);expect(()=>applyDataWidget(p,{...request,textFields})).toThrow();expect(p).toEqual(before);
 }
 const p=fixture(),before=structuredClone(p);
 expect(()=>applyDataWidget(p,{...request,replaceId:undefined,parentId:p.layout.pages![0].child.id})).toThrow('existing text');expect(p).toEqual(before);
 node(p).text='{hp} {constructor.name}';const unsafe=structuredClone(p);
 expect(()=>applyDataWidget(p,request)).toThrow('full editor');expect(p).toEqual(unsafe);
});
it('maps declared values and missing original fields deliberately without inventing sample data',()=>{
 const p=fixture();node(p).text='HP {missingOld}/{maxHp}';p.manifest.studioDataFields={newHp:{kind:'number'}};
 const before=structuredClone(p.data);
 applyDataWidget(p,{...request,textFields:{missingOld:'newHp',maxHp:'capacity'}});
 expect(node(p).text).toBe('HP {newHp}/{capacity}');expect(p.data).toEqual(before);expect(Object.hasOwn(p.data,'newHp')).toBe(false);
});
it('uses the repeated row scope rather than a same-named global field',()=>{
 const p=fixture(),text=node(p);p.layout.pages![0].child.children=[{id:'list',type:'list',items:'$rows',template:text}];
 applyDataWidget(p,request);const row=(p.data.rows as Record<string,number>[])[0];
 expect(interpolate(text.text,scopedValues(row,0,p.data))).toBe('Máu 0/5\nCấp 2 · 0 HP');
 p.data.rows=[];const before=structuredClone(p);expect(()=>applyDataWidget(p,request)).toThrow();expect(p).toEqual(before);
});
it('bounds expanded templates and ignores the unused simple-label draft while preserving text',()=>{
 const p=fixture();node(p).text='A'.repeat(200)+': {hp}';
 applyDataWidget(p,{...request,caption:'unused {draft}',textFields:{hp:'energy'}});expect(node(p).text).toBe('A'.repeat(200)+': {energy}');
 const longPath='a'.repeat(100);p.data[longPath]=1;node(p).text='{hp}'.repeat(4000);const before=structuredClone(p);
 expect(()=>applyDataWidget(p,{...request,textFields:{hp:longPath}})).toThrow('full editor');expect(p).toEqual(before);
});
it('preserves multilingual literals under generated bijective remaps and their inverse',()=>{
 let seed=0xe9d4;const random=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 const p=fixture(),fields=dataCatalog(p,'summary'),paths=['hp','maxHp','energy','capacity','level'];
 for(let n=0;n<80;n++){
  const shift=1+random()%4,mapping=Object.fromEntries(paths.map((path,i)=>[path,paths[(i+shift)%paths.length]])),inverse=Object.fromEntries(Object.entries(mapping).map(([a,b])=>[b,a]));
  const prefix=`Nhân vật Ω ${random()}\n`,suffix=` · 終 ${random()} !`,body=Array.from({length:1+random()%15},()=>'{'+paths[random()%paths.length]+'}').join(' / '),original=prefix+body+suffix;
  const info=textTemplateBindings(original),selected=Object.fromEntries(info.paths.map(path=>[path,mapping[path]]));
  const changed=rebindTextTemplate(original,selected,fields);
  expect(changed.startsWith(prefix)).toBe(true);expect(changed.endsWith(suffix)).toBe(true);
  const undo=Object.fromEntries(textTemplateBindings(changed).paths.map(path=>[path,inverse[path]]));
  expect(rebindTextTemplate(changed,undo,fields)).toBe(original);
 }
});
