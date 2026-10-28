import {expect,it} from 'vitest';
import {createProject,exportPack,importPack,walk} from './project.js';
import {applyDataWidget,selectedDataWidget} from './data-widgets.js';
import {inspectListRebinding,listBindingMessage} from './list-rebinding.js';
import {createRenderer} from '../preview/dom.js';
import type {JsonValue,LayoutNode} from './types.js';

function fixture(){
 const p=createProject('blank');p.manifest.match={gameCode:['TEST']};p.manifest.script='scripts/main.lua';
 p.files={'scripts/main.lua':btoa('function update() return {} end'),'assets/opaque.bin':btoa('\x00\xff')};
 const row={name:'One',id:1,portrait:'asset:one.png',hp:4,maxHp:8,enabled:true,accent:'red',skills:[{title:'Dash'}]};
 p.data={chapter:'Harbor',oldRows:[row],nextRows:[{...row,name:'Two',id:2,hp:0},{...row,name:'Three',id:3}]};
 const list:LayoutNode={type:'list',id:'roster',items:'$oldRows',empty:'Empty',class:'roster',style:{gap:'9px'},template:{type:'column',id:'row',class:'card',style:{padding:'7px'},visibleIf:'enabled',classIf:{ready:'$enabled'},bindStyle:{color:'$accent'},children:[
  {type:'text',id:'name',text:'{name} · {chapter}'},
  {type:'image',id:'portrait',src:'$portrait'},
  {type:'bar',id:'meter',value:'hp',maxKey:'$maxHp',label:'{hp}/{maxHp}'},
  {type:'button',id:'open',text:'Open {name}',onClick:[{set:{selected:'$id'}},{call:'focus',args:['$id','{@index}'],navigate:'panel-{id}'}]}
 ]}};
 p.layout.pages![0].child.children=[list];return {p,list};
}
const rebind=(p:ReturnType<typeof fixture>['p'])=>applyDataWidget(p,{kind:'list',replaceId:'roster',parentId:'',field:'nextRows'});
it('checks all row dependencies, changes only the source and preserves reader/resource bytes through ZIP',async()=>{
 const {p,list}=fixture(),before=structuredClone(p),template=list.template;
 const report=inspectListRebinding(p,list.id,'nextRows');
 expect(report).toMatchObject({ok:true,rows:2,nestedScope:false,issues:[]});
 expect(report.fields).toEqual(expect.arrayContaining(['name','portrait','hp','maxHp','id','enabled','accent']));
 expect(rebind(p)).toBe('roster');expect(list.template).toBe(template);expect(p.layout.pages![0].child.children![0]).toBe(list);
 before.layout.pages![0].child.children![0].items='$nextRows';expect(p).toEqual(before);
 const after=await importPack(await(await exportPack(p)).arrayBuffer());
 expect(after.layout).toEqual(p.layout);expect(after.data).toEqual(before.data);
 for(const [name,bytes]of Object.entries(before.files))expect(after.files[name]).toBe(bytes);
 expect(after.manifest.script).toBe(before.manifest.script);
});
it('renders the new repeated rows and keeps action arguments and row indexes bound to the correct row',()=>{
 const {p,list}=fixture(),calls:unknown[]=[];rebind(p);
 const renderer=createRenderer(path=>path,{onCall:(name,args)=>calls.push([name,args])});
 const dom=renderer.build(list);renderer.update(p.data);
 const rows=dom.querySelectorAll<HTMLElement>('[data-list-item]');expect(rows).toHaveLength(2);
 expect(rows[0].querySelector('[data-type="text"]')?.textContent).toBe('Two · Harbor');
 expect(rows[0].querySelector<HTMLElement>('.fill')?.style.width).toBe('0%');
 expect(rows[1].querySelector('[data-type="image"]')?.getAttribute('src')).toContain('one.png');
 rows[1].querySelector<HTMLElement>('[data-type="button"]')!.click();
 expect(calls).toEqual([['focus',[3,1]]]);expect(renderer.ui).toMatchObject({selected:3,page:'panel-3'});
});
it('rejects a missing image/action field on later rows atomically and identifies the row',()=>{
 for(const key of ['portrait','id']){
  const {p}=fixture(),rows=p.data.nextRows as Record<string,JsonValue>[];delete rows[1][key];const before=structuredClone(p);
  const report=inspectListRebinding(p,'roster','nextRows');expect(report.ok).toBe(false);
  expect(report.issues).toContainEqual(expect.objectContaining({code:'missing',path:key,row:1}));
  expect(()=>rebind(p)).toThrow('row template');expect(p).toEqual(before);
  expect(listBindingMessage(report.issues[0],'vi')).toContain('dòng 2');
 }
});
it('checks bare visibility/class/bar paths and bound styles according to renderer semantics',()=>{
 for(const key of ['enabled','accent','hp','maxHp']){
  const {p}=fixture();delete (p.data.nextRows as Record<string,JsonValue>[])[0][key];
  expect(inspectListRebinding(p,'roster','nextRows').issues).toContainEqual(expect.objectContaining({code:'missing',path:key,row:0}));
 }
 const {p}=fixture();(p.data.nextRows as Record<string,JsonValue>[])[1].hp='unknown';
 expect(inspectListRebinding(p,'roster','nextRows').issues).toContainEqual(expect.objectContaining({code:'type',path:'hp',row:1}));
});
it('prevents global-to-row and row-to-global scope changes rather than silently falling back',()=>{
 const {p}=fixture();(p.data.nextRows as Record<string,JsonValue>[])[1].chapter='Shadow';
 expect(inspectListRebinding(p,'roster','nextRows').issues).toContainEqual(expect.objectContaining({code:'scope',path:'chapter',row:1}));
 const other=fixture();other.p.data.name='Fallback';delete (other.p.data.nextRows as Record<string,JsonValue>[])[0].name;
 expect(inspectListRebinding(other.p,'roster','nextRows').issues).toContainEqual(expect.objectContaining({code:'scope',path:'name',row:0}));
});
it('supports nested lists, global fallbacks in inner rows and empty destination nested lists',()=>{
 const {p,list}=fixture();list.template!.children!.push({type:'list',id:'skills',items:'skills',empty:'None for {name}',template:{type:'text',id:'skill',text:'{title} · {chapter}'}});
 const rows=p.data.nextRows as Record<string,JsonValue>[];rows[0].skills=[];
 expect(inspectListRebinding(p,'roster','nextRows').ok).toBe(true);
 rows[1].skills=[{other:'missing title'}];
 expect(inspectListRebinding(p,'roster','nextRows').issues).toContainEqual(expect.objectContaining({code:'missing',path:'title',row:1,nodeId:'skill'}));
 rows[1].skills=[{title:'Works'}];
 rows[1].chapter='Outer row'; // This still shadows the top-level name text, so remove it from the outer template.
 list.template!.children![0].text='{name}';
 expect(inspectListRebinding(p,'roster','nextRows').ok).toBe(true); // Inner chapter comes from global data, not the enclosing row.
});
it('rebinds an inner list using the first enclosing sample and preserves the nested template',()=>{
 const {p,list}=fixture();p.data.oldRows=[{skills:[{title:'Old'}],alternatives:[{title:'New'}]}];
 list.template={type:'list',id:'inner',items:'$skills',template:{type:'text',id:'skill',text:'{title}'}};
 const before=structuredClone(list.template.template);
 expect(inspectListRebinding(p,'inner','alternatives')).toMatchObject({ok:true,rows:1,nestedScope:true});
 applyDataWidget(p,{kind:'list',replaceId:'inner',parentId:'',field:'alternatives'});
 expect(list.template).toMatchObject({items:'$alternatives',template:before});
});
it('keeps ui-prefixed nested list sources global even if a row has an object with the same name',()=>{
 const {p,list}=fixture();p.data.ui={choices:[{title:'Global choice'}]};
 for(const row of p.data.nextRows as Record<string,JsonValue>[])row.ui={choices:[{wrong:'Row shadow'}]};
 list.template={type:'list',id:'choices',items:'$ui.choices',template:{type:'text',id:'choice',text:'{title}'}};
 expect(inspectListRebinding(p,'roster','nextRows').ok).toBe(true);
});
it('checks whole-row payload shape but does not interpret literal JSON action values as bindings',()=>{
 const {p,list}=fixture();list.template={type:'button',id:'open',text:'Open',onClick:{call:'focus',args:['$item',{literal:'$doesNotExist'}]}};
 expect(inspectListRebinding(p,'roster','nextRows').ok).toBe(true);
 delete (p.data.nextRows as Record<string,JsonValue>[])[1].id;
 expect(inspectListRebinding(p,'roster','nextRows').issues).toContainEqual(expect.objectContaining({code:'type',path:'item',row:1}));
});
it('requires representative old/new samples, a usable template, and resolvable source paths',()=>{
 const {p,list}=fixture();list.items='oldRows';expect(selectedDataWidget(p,'roster')?.field).toBe('oldRows');
 expect(inspectListRebinding(p,'roster','nextRows').ok).toBe(true);
 list.items='{oldRows}';expect(inspectListRebinding(p,'roster','nextRows').issues[0].code).toBe('binding');
 list.items='$oldRows';p.data.oldRows=[];expect(inspectListRebinding(p,'roster','nextRows').issues[0].code).toBe('old-sample');
 p.data.oldRows=[{}];p.data.nextRows=[];expect(inspectListRebinding(p,'roster','nextRows').issues[0].code).toBe('new-sample');
 delete list.template;expect(inspectListRebinding(p,'roster','nextRows').issues[0].code).toBe('template');
 expect(inspectListRebinding(p,'absent','nextRows').issues[0].code).toBe('source');
});
it('rejects unsafe bindings and bounds compatibility work without mutating the project',()=>{
 const {p,list}=fixture();list.template!.children!.push({type:'text',id:'unsafe',text:'{constructor.name}'});
 expect(inspectListRebinding(p,'roster','nextRows').issues).toContainEqual(expect.objectContaining({code:'binding',path:'constructor.name'}));
 list.template={type:'text',id:'name',text:'{name}'};p.data.nextRows=Array.from({length:12000},()=>({name:'New'}));
 const before=JSON.stringify(p);expect(inspectListRebinding(p,'roster','nextRows').issues.some(i=>i.code==='limit')).toBe(true);expect(JSON.stringify(p)).toBe(before);
});
it('preserves every non-source project field over generated row counts, names, and templates',()=>{
 let seed=0x62b7;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 for(let n=0;n<60;n++){
  const {p,list}=fixture(),count=1+random()%12;
  p.data.nextRows=Array.from({length:count},(_,i)=>({name:`Dòng ${random()} Ω`,id:i,portrait:'asset:sample.png',hp:random()%50,maxHp:50,enabled:!!(random()%2),accent:'#abc',skills:[]}));
  list.style={padding:`${random()%20}px`,opacity:String((random()%100)/100)};
  if(n%2)list.template!.children!.push({type:'text',id:'extra',text:'{@index} {ui.selection} {chapter}'});
  const before=structuredClone(p),template=list.template;expect(inspectListRebinding(p,'roster','nextRows').ok).toBe(true);rebind(p);
  before.layout.pages![0].child.children![0].items='$nextRows';expect(p).toEqual(before);expect(list.template).toBe(template);
  expect(walk(p.layout).length).toBe(walk(before.layout).length);
 }
});
