import {expect,it} from 'vitest';
import {createProject,exportPack,importPack,walk} from './project.js';
import {applyDataWidget,type DataWidgetRequest} from './data-widgets.js';
import {inspectListRebinding,type ListFieldMapping} from './list-rebinding.js';
import {createRenderer} from '../preview/dom.js';
import type {LayoutNode,JsonValue} from './types.js';

function fixture(){
 const p=createProject('blank');p.manifest.match={gameCode:['TEST']};p.manifest.script='reader.lua';p.files={'reader.lua':btoa('function update() return {} end'),'assets/opaque.bin':btoa('\x00\xff')};
 p.data={chapter:'Harbor',oldRows:[{name:'One',id:1,portrait:'asset:one.png',hp:4,maxHp:8,enabled:true,accent:'red',skills:[{title:'Dash'}]}],newRows:[{displayName:'Two',unitId:2,picture:'asset:two.png',current:0,limit:9,ready:true,tint:'blue',moves:[{caption:'Run'}]},{displayName:'Three',unitId:3,picture:'asset:three.png',current:5,limit:10,ready:false,tint:'green',moves:[]}]};
 const list:LayoutNode={type:'list',id:'roster',items:'$oldRows',empty:'Empty',class:'roster',style:{gap:'9px'},template:{type:'column',id:'row',class:'card',style:{padding:'7px'},visibleIf:'enabled',classIf:{ready:'$enabled'},bindStyle:{color:'$accent'},children:[
  {type:'text',id:'name',text:'{name} · {chapter}'},
  {type:'image',id:'portrait',src:'{portrait}'},
  {type:'bar',id:'meter',value:'hp',maxKey:'$maxHp',label:'{hp}/{maxHp}'},
  {type:'button',id:'open',text:'Open {name}',onClick:[{set:{selected:'$id',literal:{keep:'{name}'}}},{call:'focus',args:['{id}','{@index}',{literal:'$name'}],navigate:'panel-{id}',state:'panel'}]},
  {type:'list',id:'skills',items:'$skills',empty:'None for {name}',template:{type:'text',id:'skill',text:'{title} · {chapter}'}}
 ]}};
 p.layout.pages![0].child.children=[list];return {p,list};
}
const mapping:ListFieldMapping={'roster:name':'displayName','roster:id':'unitId','roster:portrait':'picture','roster:hp':'current','roster:maxHp':'limit','roster:enabled':'ready','roster:accent':'tint','roster:skills':'moves','skills:title':'caption'};
const request:DataWidgetRequest={kind:'list',field:'newRows',parentId:'',replaceId:'roster',listFields:mapping};
it('exposes type-compatible row choices and independent nested scopes while an incomplete source is blocked',()=>{
 const {p}=fixture(),before=structuredClone(p),report=inspectListRebinding(p,'roster','newRows',{'roster:skills':'moves'});
 expect(report.ok).toBe(false);expect(report.bindings.find(b=>b.key==='roster:portrait')?.choices.map(c=>c.path)).toContain('picture');
 expect(report.bindings.find(b=>b.key==='roster:hp')?.choices.map(c=>c.path)).not.toContain('displayName');
 expect(report.bindings.find(b=>b.key==='roster:skills')?.choices.map(c=>c.path)).toEqual(['moves']);
 expect(report.bindings.find(b=>b.key==='skills:title')?.choices.map(c=>c.path)).toEqual(['caption']);
 expect(report.bindings.some(b=>b.path==='chapter'||b.path==='@index')).toBe(false);expect(report.template).toBeUndefined();expect(p).toEqual(before);
});
it('rewrites only matched references, retaining widget IDs, static styles, action names/literals and project bytes through ZIP',async()=>{
 const {p,list}=fixture(),before=structuredClone(p),ids=walk(p.layout).map(r=>r.node.id),old=list.template!;
 const report=inspectListRebinding(p,'roster','newRows',mapping);expect(report.issues).toEqual([]);expect(p).toEqual(before);
 expect(applyDataWidget(p,request)).toBe('roster');expect(walk(p.layout).map(r=>r.node.id)).toEqual(ids);
 expect(list.template!.style).toBe(old.style);expect(list.style).toEqual(before.layout.pages![0].child.children![0].style);
 expect(list.template).toMatchObject({visibleIf:'ready',classIf:{ready:'$ready'},bindStyle:{color:'$tint'},children:[
  {text:'{displayName} · {chapter}'},{src:'{picture}'},{value:'current',maxKey:'$limit',label:'{current}/{limit}'},
  {text:'Open {displayName}',onClick:[{set:{selected:'$unitId',literal:{keep:'{name}'}}},{call:'focus',args:['{unitId}','{@index}',{literal:'$name'}],navigate:'panel-{unitId}',state:'panel'}]},
  {items:'$moves',empty:'None for {displayName}',template:{text:'{caption} · {chapter}'}}
 ]});
 const expected=structuredClone(before);expected.layout.pages![0].child.children![0].items='$newRows';expected.layout.pages![0].child.children![0].template=list.template;expect(p).toEqual(expected);
 const imported=await importPack(await(await exportPack(p)).arrayBuffer());expect(imported.layout).toEqual(p.layout);expect(imported.data).toEqual(before.data);for(const [path,bytes]of Object.entries(before.files))expect(imported.files[path]).toBe(bytes);
});
it('renders mapped text/images/bars/nested rows and dispatches the new row ID with the original call name',()=>{
 const {p,list}=fixture();applyDataWidget(p,request);const calls:unknown[]=[];
 const renderer=createRenderer(path=>path,{onCall:(name,args)=>calls.push([name,args])}),dom=renderer.build(list);renderer.update(p.data);
 const row=dom.querySelector<HTMLElement>('[data-list-item]')!;
 expect(row.querySelector('[data-type="text"]')?.textContent).toBe('Two · Harbor');expect(row.querySelector('img')?.getAttribute('src')).toContain('two.png');
 expect(row.querySelector<HTMLElement>('.fill')?.style.width).toBe('0%');expect(row.textContent).toContain('Run · Harbor');expect(row.style.color).toBe('blue');
 row.querySelector<HTMLElement>('[data-type="button"]')!.click();expect(calls).toEqual([['focus',[2,0,{literal:'$name'}]]]);expect(renderer.ui).toMatchObject({selected:2,panel:'panel-2',literal:{keep:'{name}'}});
});
it('rejects a missing or wrongly typed mapped field on a later row without changing the project',()=>{
 for(const value of [undefined,'bad number']){
  const {p}=fixture(),rows=p.data.newRows as Record<string,JsonValue|undefined>[];rows[1].current=value;const before=structuredClone(p);
  const report=inspectListRebinding(p,'roster','newRows',mapping);expect(report.ok).toBe(false);expect(report.issues).toContainEqual(expect.objectContaining({path:'current',row:1}));
  expect(()=>applyDataWidget(p,request)).toThrow('row template');expect(p).toEqual(before);
 }
});
it('keeps mappings for the same field name independent across two nested lists and visits later nonempty samples',()=>{
 const {p,list}=fixture();p.data.oldRows=[{a:[{name:'Old A'}],b:[{name:'Old B'}]}];p.data.newRows=[{left:[],right:[]},{left:[{title:'New A'}],right:[{caption:'New B'}]}];
 list.template={type:'column',id:'row',children:[{type:'list',id:'a',items:'$a',template:{type:'text',id:'a-name',text:'{name}'}},{type:'list',id:'b',items:'$b',template:{type:'text',id:'b-name',text:'{name}'}}]};
 const fields={'roster:a':'left','roster:b':'right','a:name':'title','b:name':'caption'};
 expect(inspectListRebinding(p,'roster','newRows',fields).ok).toBe(true);applyDataWidget(p,{...request,listFields:fields});
 expect(list.template.children![0]).toMatchObject({items:'$left',template:{text:'{title}'}});expect(list.template.children![1]).toMatchObject({items:'$right',template:{text:'{caption}'}});
});
it('rejects scope fallback, unknown keys, reserved/unsafe destinations and whole-row payload schema changes',()=>{
 for(const fields of [{...mapping,'unknown:key':'name'},{...mapping,'roster:name':'chapter'},{...mapping,'roster:name':'ui.page'},{...mapping,'roster:name':'constructor'},{...mapping,'roster:name':'item'},{...mapping,'roster:name':''}]){
  const {p}=fixture(),before=structuredClone(p);expect(inspectListRebinding(p,'roster','newRows',fields).ok).toBe(false);expect(()=>applyDataWidget(p,{...request,listFields:fields})).toThrow();expect(p).toEqual(before);
 }
 const {p,list}=fixture();list.template!.onClick={call:'whole',args:['$item']};const report=inspectListRebinding(p,'roster','newRows',mapping);
 expect(report.issues).toContainEqual(expect.objectContaining({code:'type',path:'item'}));
});
it('supports swaps in bar paths and repeated text in one pass while leaving global/index/UI references unchanged',()=>{
 const {p,list}=fixture();p.data.oldRows=[{hp:4,maxHp:8}];p.data.newRows=[{hp:5,maxHp:10}];list.template={type:'bar',id:'bar',value:'$hp',maxKey:'$maxHp',label:'{hp}/{maxHp} · {hp} {chapter} {@index} {ui.page}'};
 const fields={'roster:hp':'maxHp','roster:maxHp':'hp'};applyDataWidget(p,{...request,listFields:fields});
 expect(list.template).toMatchObject({value:'$maxHp',maxKey:'$hp',label:'{maxHp}/{hp} · {maxHp} {chapter} {@index} {ui.page}'});
});
it('keeps source-only checking independent of unused candidate fields and bounds optional mapping work',()=>{
 const {p,list}=fixture();p.data.oldRows=[{name:'Old'}];p.data.newRows=[{name:'New',...Object.fromEntries(Array.from({length:15000},(_,i)=>['unused'+i,i]))}];list.template={type:'text',id:'name',text:'{name}'};
 expect(inspectListRebinding(p,'roster','newRows').ok).toBe(true);
 expect(inspectListRebinding(p,'roster','newRows',{}).issues.some(i=>i.code==='limit')).toBe(true);
});
it('preserves structure and reader data over generated renamed row schemas and row counts',()=>{
 let seed=0x5ea1;const random=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 for(let n=0;n<60;n++){
  const {p,list}=fixture(),count=1+random()%10,name='name_'+random(),hp='value_'+random();
  p.data.oldRows=[{name:'Old',hp:8}];p.data.newRows=Array.from({length:count},(_,i)=>({[name]:`Mẫu Ω ${i}`,[hp]:random()%100}));
  list.template={type:'row',id:'row',style:{padding:`${random()%20}px`},children:[{type:'text',id:'name',text:'Tên {name} · {name}'},{type:'bar',id:'bar',value:'$hp',max:100,label:'HP {hp}'}]};
  const before=structuredClone(p),oldStyle=list.template.style,fields={'roster:name':name,'roster:hp':hp};applyDataWidget(p,{...request,listFields:fields});
  const expected=structuredClone(before);expected.layout.pages![0].child.children![0].items='$newRows';expected.layout.pages![0].child.children![0].template!.children![0].text=`Tên {${name}} · {${name}}`;expected.layout.pages![0].child.children![0].template!.children![1].value='$'+hp;expected.layout.pages![0].child.children![0].template!.children![1].label=`HP {${hp}}`;
  expect(p).toEqual(expected);expect(list.template.style).toBe(oldStyle);
 }
});
