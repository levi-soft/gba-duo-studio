import {dataCatalog,safeDataPath} from './data-catalog.js';
import {walk} from './tree.js';
import {resolve,scopedValues} from '../preview/data.js';
import type {Project,LayoutNode,JsonValue} from './types.js';

type Expected='scalar'|'number'|'string'|'list'|'truthy'|'value';
export type ListFieldMapping=Record<string,string>;
export interface ListFieldChoice {path:string;value:JsonValue}
export interface ListBindingField {key:string;scopeId:string;path:string;choices:ListFieldChoice[]}
export interface ListBindingIssue {code:'source'|'template'|'old-sample'|'new-sample'|'missing'|'scope'|'type'|'binding'|'mapping'|'limit';path?:string;nodeId?:string;row?:number}
export interface ListBindingCheck {ok:boolean;rows:number;fields:string[];bindings:ListBindingField[];issues:ListBindingIssue[];nestedScope:boolean;template?:LayoutNode}
const pathOf=(value:string)=>value.replace(/\[(\d+)\]/g,'.$1');
function own(value:JsonValue|undefined,path:string):JsonValue|undefined{
 let result=value;for(const key of path.split('.')){if(!result||typeof result!=='object'||!Object.hasOwn(result,key))return undefined;result=Array.isArray(result)?result[Number(key)]:result[key];}return result;
}
function lookup(row:JsonValue,path:string,root:Project['data']){
 const local=own(row,path);if(local!==undefined&&local!==null)return {scope:'row',value:local};
 const global=own(root,path);return {scope:'root',value:global};
}
const scalar=(v:unknown)=>typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v);
const numeric=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)||typeof v==='string'&&(['','-','--','---','—','…'].includes(v.trim())||v.trim()!==''&&Number.isFinite(Number(v)));

/** Conservative sample-based check; never mutates the project or runs Lua.
 * Optional matches produce a prospective template with only bound references
 * changed. All destination rows are checked within a bounded budget; the
 * first old row and first enclosing-list rows are representative samples. */
export function inspectListRebinding(project:Project,id:string,field:string,mapping?:ListFieldMapping):ListBindingCheck{
 const refs=walk(project.layout),target=refs.find(r=>r.node.id===id)?.node;
 const issues:ListBindingIssue[]=[],fields=new Set<string>(),seen=new Set<string>();let work=0,stopped=false;
 const bindings=new Map<string,ListBindingField>(),choiceCache=new Map<JsonValue,ListFieldChoice[]>(),contracts=new Map<string,Set<Expected>>();
 const edits=new Map<LayoutNode,Partial<LayoutNode>>();
 let template:LayoutNode|undefined;
 const nestedScope=refs.some(r=>r.node.type==='list'&&r.node.id!==id&&walk(r.node.template).some(r=>r.node.id===id));
 const result=(rows=0):ListBindingCheck=>({ok:!issues.length,rows,fields:[...fields],bindings:[...bindings.values()],issues,nestedScope,...(!issues.length&&template?{template}:{})});
 function issue(code:ListBindingIssue['code'],path?:string,nodeId?:string,row?:number){const key=JSON.stringify([code,path,nodeId,row]);if(seen.has(key)||issues.length>=12)return;seen.add(key);issues.push({code,...(path?{path}:{}),...(nodeId?{nodeId}:{}),...(row!==undefined?{row}:{})});}
 function step(){if(++work>20000){if(!stopped)issue('limit');stopped=true;}return !stopped;}
 if(mapping!==undefined&&(!mapping||typeof mapping!=='object'||Array.isArray(mapping)||Object.keys(mapping).length>128)){issue('mapping');return result();}
 if(target?.type!=='list'){issue('source');return result();}
 if(!target.template){issue('template');return result();}
 const catalog=dataCatalog(project,id),source=catalog.find(f=>f.path===field);
 if(source?.kind!=='list'){issue('source');return result();}
 let context:Parameters<typeof resolve>[1]=project.data;
 for(const {node}of refs)if(node.type==='list'&&node.id!==id&&walk(node.template).some(ref=>ref.node.id===id)){
  const rows=resolve(node.items,context);
  if(!Array.isArray(rows)||!rows.length){issue('old-sample');return result();}
  context=scopedValues(rows[0],0,project.data);
 }
 const oldField=typeof target.items==='string'?target.items.replace(/^\$/,''):'';
 if(!safeDataPath(pathOf(oldField))){issue('binding',oldField,target.id);return result();}
 const previous=resolve(target.items,context),destination=resolve(field,context);
 if(!Array.isArray(previous)||!previous.length){issue('old-sample');return result(Array.isArray(destination)?destination.length:0);}
 if(!Array.isArray(destination)||!destination.length){issue('new-sample');return result();}
 const root=project.data;
 function shape(a:JsonValue,b:JsonValue|undefined,depth=0):boolean{
  if(!step())return false;if(depth>32){issue('limit');stopped=true;return false;}
  if(a===null)return b===null;
  if(Array.isArray(a))return Array.isArray(b)&&(!a.length||b.every(item=>shape(a[0],item,depth+1)));
  if(typeof a==='object')return !!b&&typeof b==='object'&&!Array.isArray(b)&&Object.entries(a).every(([key,value])=>shape(value??null,Object.hasOwn(b,key)?b[key]:undefined,depth+1));
  return typeof a===typeof b&&(typeof b!=='number'||Number.isFinite(b));
 }
 function accepts(expected:Expected,before:JsonValue,value:JsonValue){return expected==='truthy'||expected==='scalar'&&scalar(value)||expected==='number'&&numeric(value)||expected==='string'&&typeof value==='string'||expected==='list'&&Array.isArray(value)||expected==='value'&&shape(before,value);}
 function choices(row:JsonValue){
  const cached=choiceCache.get(row);if(cached)return cached;
  const values:ListFieldChoice[]=[];
  function visit(value:JsonValue|undefined,path:string,depth:number){
   if(!step()||value==null)return;if(depth>32){issue('limit');stopped=true;return;}
   if(path&&safeDataPath(path)&&path!=='item'&&!path.startsWith('ui.'))values.push({path,value});
   if(value&&typeof value==='object'&&!Array.isArray(value))for(const[key,child]of Object.entries(value)){
    if(stopped)break;if(safeDataPath(key)&&!key.includes('.'))visit(child,path?path+'.'+key:key,depth+1);
   }
  }
  visit(row,'',0);choiceCache.set(row,values);return values;
 }
 function compare(path:string,expected:Expected,oldRow:JsonValue,newRow:JsonValue,nodeId:string,row:number,scopeId:string):string{
  if(!step())return path;
  const key=pathOf(path);
  if(key==='@index')return path;
  if(key!=='item'&&!safeDataPath(key)){issue('binding',path,nodeId,row);return path;}
  if(key.startsWith('ui.'))return path;
  const before=key==='item'?{scope:'row',value:oldRow}:lookup(oldRow,key,root);
  if(before.value===undefined||before.value===null){issue('missing',key,nodeId,row);return path;}
  let selected=path;
  if(mapping!==undefined&&before.scope==='row'&&key!=='item'){
   const bindingKey=scopeId+':'+key;
   let binding=bindings.get(bindingKey);
   if(!binding){
    if(bindings.size>=128){issue('limit');stopped=true;return path;}
    binding={key:bindingKey,scopeId,path:key,choices:choices(newRow).slice()};bindings.set(bindingKey,binding);contracts.set(bindingKey,new Set());
   }
   const types=contracts.get(bindingKey)!;
   if(!types.has(expected)){binding.choices=binding.choices.filter(c=>step()&&accepts(expected,before.value!,c.value));types.add(expected);}
   if(mapping&&Object.hasOwn(mapping,bindingKey)){
    const choice=mapping[bindingKey];
    if(typeof choice!=='string'||!safeDataPath(choice)||choice==='item'||choice.startsWith('ui.')){issue('mapping',key,nodeId,row);return path;}
    selected=choice;
   }
  }
  const after=key==='item'?{scope:'row',value:newRow}:lookup(newRow,pathOf(selected),root);
  if(after.value===undefined||after.value===null){issue('missing',pathOf(selected),nodeId,row);return selected;}
  if(before.scope!==after.scope){issue('scope',pathOf(selected),nodeId,row);return selected;}
  if(before.scope==='root')return path;
  fields.add(key);
  if(!accepts(expected,before.value,after.value))issue('type',pathOf(selected),nodeId,row);
  return selected;
 }
 function text<T>(value:T,expected:Expected,oldRow:JsonValue,newRow:JsonValue,id:string,row:number,scopeId:string,bound=false):T{
  if(!step()||typeof value!=='string')return value;
  if(bound&&value.startsWith('$'))return ('$'+compare(value.slice(1),expected,oldRow,newRow,id,row,scopeId)) as T;
  const exact=bound&&/^\{([^{}]+)\}$/.exec(value);
  if(exact)return ('{'+compare(exact[1],expected,oldRow,newRow,id,row,scopeId)+'}') as T;
  const next=value.replace(/\{([^{}]+)\}/g,(_token,path)=>'{'+compare(path,'scalar',oldRow,newRow,id,row,scopeId)+'}');
  if(next!==value&&next.length>16384){issue('limit');stopped=true;return value;}
  return next as T;
 }
 function reference<T>(value:T,expected:Expected,a:JsonValue,b:JsonValue,id:string,row:number,scopeId:string):T{
  if(typeof value!=='string')return value;
  return ((value.startsWith('$')?'$':'')+compare(value.replace(/^\$/,''),expected,a,b,id,row,scopeId)) as T;
 }
 function actions(value:JsonValue|undefined,a:JsonValue,b:JsonValue,id:string,row:number,scopeId:string):JsonValue|undefined{
  const list=Array.isArray(value)?value:[value];let changed=false;
  const next=list.map(action=>{
   if(!step()||!action||typeof action!=='object'||Array.isArray(action))return action;
   const patch:Record<string,JsonValue|undefined>={};
   if(action.set&&typeof action.set==='object'){
    let differs=false;const set=Object.fromEntries(Object.entries(action.set).map(([key,v])=>{const next=text(v,'value',a,b,id,row,scopeId,true);differs||=next!==v;return [key,next];}));
    if(differs)patch.set=Array.isArray(action.set)?Object.values(set) as JsonValue[]:set;
   }
   if(action.args!=null){
    if(Array.isArray(action.args)){const args=action.args.map(v=>text(v,'value',a,b,id,row,scopeId,true));if(args.some((v,i)=>v!==(action.args as JsonValue[])[i]))patch.args=args;}
    else{const next=text(action.args,'value',a,b,id,row,scopeId,true);if(next!==action.args)patch.args=next;}
   }
   const navigate=text(action.navigate,'scalar',a,b,id,row,scopeId);if(navigate!==action.navigate)patch.navigate=navigate;
   if(!Object.keys(patch).length)return action;changed=true;return {...action,...patch};
  });
  return changed?(Array.isArray(value)?next as JsonValue[]:next[0]):value;
 }
 // Collect reference edits across every row before rebuilding once. A nested
 // list may be empty in the first new row but populated in a later row.
 function visit(node:LayoutNode,a:JsonValue,b:JsonValue,row:number,scopeId:string,depth=0){
  if(!step())return;if(depth>100){issue('limit');stopped=true;return;}
  const patch:Partial<LayoutNode>={};
  function set<K extends keyof LayoutNode>(key:K,value:LayoutNode[K]){if(value!==node[key])patch[key]=value;}
  if(['text','button'].includes(node.type))set('text',text(node.text,'scalar',a,b,node.id,row,scopeId));
  if(node.type==='image')set('src',text(node.src,'string',a,b,node.id,row,scopeId,true));
  if(node.type==='bar'){set('value',reference(node.value,'number',a,b,node.id,row,scopeId));set('maxKey',reference(node.maxKey,'number',a,b,node.id,row,scopeId));set('label',text(node.label,'scalar',a,b,node.id,row,scopeId));}
  set('visibleIf',reference(node.visibleIf,'truthy',a,b,node.id,row,scopeId));
  if(node.classIf){const values=Object.fromEntries(Object.entries(node.classIf).map(([key,v])=>[key,reference(v,'truthy',a,b,node.id,row,scopeId)]));if(Object.keys(values).some(k=>values[k]!==node.classIf![k]))set('classIf',values);}
  if(node.bindStyle){const values=Object.fromEntries(Object.entries(node.bindStyle).map(([key,v])=>[key,text(v,'scalar',a,b,node.id,row,scopeId,true)]));if(Object.keys(values).some(k=>values[k]!==node.bindStyle![k]))set('bindStyle',values);}
  if(node.type==='list')set('empty',text(node.empty,'scalar',a,b,node.id,row,scopeId));
  set('onClick',actions(node.onClick,a,b,node.id,row,scopeId));
  for(const child of node.children??[])visit(child,a,b,row,scopeId,depth+1);
  if(node.child)visit(node.child,a,b,row,scopeId,depth+1);
  for(const key of ['pages','tabs'] as const)if(node[key]){
   const group=node[key]!.map(entry=>{const title=text(entry.title,'scalar',a,b,node.id,row,scopeId);visit(entry.child,a,b,row,scopeId,depth+1);return title!==entry.title?{...entry,title}:entry;});
   if(group.some((v,i)=>v!==node[key]![i]))set(key,group);
  }
  if(node.type==='list'&&node.template){
   const items=reference(node.items,'list',a,b,node.id,row,scopeId);set('items',items);
   const path=typeof node.items==='string'?node.items.replace(/^\$/,''):'';
   if(!path||!safeDataPath(pathOf(path))){issue('binding',String(node.items??''),node.id,row);return;}
   const oldList=resolve(path,scopedValues(a,row,root)),newList=resolve(items,scopedValues(b,row,root));
   if(!Array.isArray(oldList)||!oldList.length||!Array.isArray(newList)){issue('missing',path,node.id,row);return;}
   for(const item of newList){if(stopped)break;visit(node.template,oldList[0],item,row,node.id,depth+1);}
  }else if(node.template)visit(node.template,a,b,row,scopeId,depth+1);
  if(Object.keys(patch).length)edits.set(node,{...edits.get(node),...patch});
 }
 for(let index=0;index<destination.length;index++){if(stopped||issues.length>=12)break;visit(target.template,previous[0],destination[index],index,id);}
 if(mapping)for(const key of Object.keys(mapping))if(!bindings.has(key))issue('mapping',key);
 function rebuild(node:LayoutNode):LayoutNode{
  const patch:Partial<LayoutNode>={...edits.get(node)};
  for(const key of ['child','template'] as const)if(node[key]){const child=rebuild(node[key]!);if(child!==node[key])patch[key]=child;}
  if(node.children){const children=node.children.map(rebuild);if(children.some((v,i)=>v!==node.children![i]))patch.children=children;}
  for(const key of ['pages','tabs'] as const)if(node[key]){
   const group=(patch[key]??node[key])!.map((entry,i)=>{const child=rebuild(node[key]![i].child);return child===entry.child?entry:{...entry,child};});
   if(group.some((v,i)=>v!==node[key]![i]))patch[key]=group;
  }
  return Object.keys(patch).length?{...node,...patch}:node;
 }
 if(!issues.length)template=rebuild(target.template);
 return result(destination.length);
}

export function listBindingMessage(issue:ListBindingIssue,language='en'){
 const vi=language==='vi',path=issue.path?` “${issue.path}”`:'',row=issue.row!==undefined?(vi?` ở dòng ${issue.row+1}`:` in row ${issue.row+1}`):'';
 const messages:Record<ListBindingIssue['code'],string>={
  source:vi?'Chọn một trường danh sách trong phạm vi này.':'Choose a list field available in this scope.',
  template:vi?'Danh sách chưa có mẫu dòng. Dùng trình soạn thảo đầy đủ để chuẩn bị mẫu.':'The list has no row template. Prepare it in the full editor.',
  'old-sample':vi?'Cần một dòng mẫu đại diện ở nguồn danh sách đang dùng.':'The current list source needs a representative sample row.',
  'new-sample':vi?'Cần một dòng mẫu đại diện ở nguồn danh sách mới.':'The new list source needs a representative sample row.',
  missing:vi?`Chưa có trường${path}${row} trong dữ liệu mẫu để kiểm tra.`:`Sample field${path}${row} is missing.`,
  scope:vi?`Trường${path}${row} sẽ đổi giữa phạm vi dòng và toàn cục. Kiểm tra lại dữ liệu.`:`Field${path}${row} would change between row and global scope.`,
  type:vi?`Kiểu dữ liệu của trường${path}${row} không phù hợp với mẫu dòng.`:`Field${path}${row} has an incompatible type for this row template.`,
  binding:vi?`Binding${path} cần được kiểm tra trong trình soạn thảo đầy đủ.`:`Binding${path} needs review in the full editor.`,
  mapping:vi?`Lựa chọn ghép trường${path} chưa phù hợp. Chọn lại hoặc đặt lại phần ghép trường.`:`Field mapping${path} is not valid. Choose again or reset the mappings.`,
  limit:vi?'Mẫu quá lớn để kiểm tra bằng hướng dẫn này. Dùng trình soạn thảo đầy đủ.':'The sample is too complex for this guide. Use the full editor.'
 };
 return messages[issue.code];
}
