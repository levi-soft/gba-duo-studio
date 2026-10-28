import {walk} from './tree.js';
import {resolve,scopedValues} from '../preview/data.js';
import type {Project,JsonValue,DataFieldInfo} from './types.js';

export type FieldKind='number'|'string'|'boolean'|'list';
export interface CatalogField {path:string;label:string;kind:FieldKind;value:JsonValue|undefined;scope:'root'|'item';source:'sample'|'native'|'declared';description:string;aliases:string[]}
const forbidden=new Set(['__proto__','prototype','constructor']);
export function safeDataPath(path:string){return typeof path==='string'&&path.length<=256&&/^[\p{L}_][\p{L}\p{N}_-]*(?:\.(?:[\p{L}_][\p{L}\p{N}_-]*|\d+))*$/u.test(path)&&!path.split('.').some(key=>forbidden.has(key));}
const kinds=new Set(['number','string','boolean','list']);
export function validateDataFields(fields:unknown){
  if(fields===undefined)return;
  if(!fields||typeof fields!=='object'||Array.isArray(fields)||Object.keys(fields).length>4000)throw Error('Invalid named data fields.');
  for(const [path,info]of Object.entries(fields)){
    if(!safeDataPath(path.replaceAll('[]',''))||!info||typeof info!=='object'||Array.isArray(info))throw Error('Invalid named data field.');
    const value=info as DataFieldInfo;
    for(const key of ['label','labelVi','description'] as const)if(value[key]!==undefined&&(typeof value[key]!=='string'||value[key]!.length>256))throw Error('Data field labels must be short text.');
    if(value.kind!==undefined&&!kinds.has(value.kind))throw Error('Invalid named data field type.');
    if(value.aliases!==undefined&&(!Array.isArray(value.aliases)||value.aliases.length>16||value.aliases.some(alias=>typeof alias!=='string'||alias.length>128)))throw Error('Invalid data field aliases.');
  }
}
const names:Record<string,[string,string]>={hp:['Current HP','HP hiện tại'],maxHp:['Maximum HP','HP tối đa'],money:['Money','Tiền'],gold:['Gold','Vàng'],level:['Level','Cấp độ'],exp:['Experience','Kinh nghiệm'],unitName:['Character name','Tên nhân vật'],name:['Name','Tên'],items:['Items','Vật phẩm'],party:['Party','Đội hình']};
Object.assign(names,{portrait:['Portrait','Chân dung'],avatar:['Avatar','Ảnh đại diện'],icon:['Icon','Biểu tượng']});
export function dataFieldLabel(path:string,language='en',info?:DataFieldInfo){const leaf=path.split('.').at(-1)!;return (language==='vi'?info?.labelVi:info?.label)||info?.label||names[leaf]?.[language==='vi'?1:0]||leaf.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' ');}
const kindOf=(value:JsonValue|undefined):FieldKind|undefined=>Array.isArray(value)?'list':typeof value==='number'&&Number.isFinite(value)?'number':typeof value==='string'?'string':typeof value==='boolean'?'boolean':undefined;
const normalize=(text:string)=>text.normalize('NFD').replace(/\p{M}/gu,'').replaceAll('đ','d').replaceAll('Đ','D').toLocaleLowerCase();

/** Discover names/types from sample data and explicit reader declarations, never Lua text or RAM guesses. */
export function dataCatalog(project:Project,id:string,language='en',query=''):CatalogField[]{
  validateDataFields(project.manifest.studioDataFields);
  const vi=language==='vi',metadata=project.manifest.studioDataFields??{};
  const refs=walk(project.layout),owners=refs.filter(r=>r.node.type==='list').map(r=>({id:r.node.id,members:new Set(walk(r.node.template).map(ref=>ref.node.id))}));
  const scopeOf=(nodeId:string)=>owners.filter(owner=>owner.members.has(nodeId)).map(owner=>owner.id).join('/');
  const targetScope=scopeOf(id),rootTypes=new Map<string,FieldKind>(),rowTypes=new Map<string,FieldKind>();
  // Existing bars already declare a numeric display contract, even when an old
  // pack's preview uses "---". This never discovers an address or executes Lua.
  for(const {node}of refs)if(node.type==='bar'){
    const scope=scopeOf(node.id),target=scope===''?rootTypes:scope===targetScope?rowTypes:null;
    if(!target)continue;
    for(const value of [node.value,node.maxKey])if(typeof value==='string'){
      const path=value.startsWith('$')?value.slice(1):/^\{[^{}]+\}$/.test(value)?value.slice(1,-1):'';
      if(safeDataPath(path))target.set(path,'number');
    }
  }
  function entries(data:JsonValue|undefined,scope:'root'|'item',prefix=''){
    const result:CatalogField[]=[];
    function visit(value:JsonValue|undefined,path='',depth=0){
      if(depth>32||result.length>4000)throw Error('Data catalog exceeds limits.');
      if(path&&safeDataPath(path)){
        const actual=kindOf(value),expected=(scope==='root'&&Object.hasOwn(project.manifest.values??{},path)?'number':undefined)??(scope==='root'?rootTypes:rowTypes).get(path)??metadata[prefix+path]?.kind;
        const placeholder=value==null||typeof value==='string'&&['','-','--','---','—','…'].includes(value.trim());
        const numericText=expected==='number'&&typeof value==='string'&&value.trim()!==''&&Number.isFinite(Number(value));
        const kind=expected&&(placeholder||numericText)?expected:actual;
        if(kind){const info=metadata[prefix+path],leaf=path.split('.').at(-1)!;
          result.push({path,kind,value,scope,source:kind!==actual?'declared':'sample',label:(vi?info?.labelVi:info?.label)||info?.label||names[leaf]?.[vi?1:0]||leaf.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('_',' '),description:info?.description??'',aliases:info?.aliases??[]});return;}
      }
      if(value&&typeof value==='object'&&!Array.isArray(value))for(const[key,child]of Object.entries(value))if(safeDataPath(key)&&!key.includes('.'))visit(child,path?path+'.'+key:key,depth+1);
    }
    visit(data);return result;
  }
  const roots=entries(project.data,'root');
  const declared=new Map<string,FieldKind>(Object.entries(project.manifest.values??{}).map(([path])=>[path,'number']));
  for(const[path,info]of Object.entries(metadata))if(info.kind&&!path.includes('[]'))declared.set(path,info.kind);
  for(const[path,kind]of rootTypes)declared.set(path,kind);
  for(const path of Object.keys(project.manifest.values??{}))declared.set(path,'number');
  for(const[path,kind]of declared)if(safeDataPath(path)&&!roots.some(field=>field.path===path)){
    const info=metadata[path],leaf=path.split('.').at(-1)!;
    roots.push({path,kind,value:undefined,scope:'root',source:Object.hasOwn(project.manifest.values??{},path)?'native':'declared',label:(vi?info?.labelVi:info?.label)||info?.label||names[leaf]?.[vi?1:0]||leaf,description:info?.description??'',aliases:info?.aliases??[]});
  }
  let item:JsonValue|undefined=project.data,prefix='',inList=false;
  for(const{node}of refs){
    if(node.type!=='list'||!walk(node.template).some(ref=>ref.node.id===id))continue;
    const path=(node.items??'').replace(/^\$/,'');
    const values=resolve(path,inList?scopedValues(item??null,0,project.data):project.data);
    if(!Array.isArray(values)||!values.length)return []; // Unknown row scope cannot safely offer root fields.
    item=values[0];prefix+=path+'[].';inList=true;
  }
  const local=inList?entries(item,'item',prefix):[],shadow=new Set(local.map(field=>field.path));
  const needle=normalize(query.trim());
  return [...local,...roots.filter(field=>!shadow.has(field.path))].filter(field=>!needle||normalize([field.label,field.path,field.description,...field.aliases].join(' ')).includes(needle));
}

export function listItemFields(value:JsonValue|undefined):string[]{
  if(!Array.isArray(value)||!value.length||!value[0]||typeof value[0]!=='object'||Array.isArray(value[0]))return [];
  return Object.entries(value[0]).filter(([key,v])=>safeDataPath(key)&&!key.includes('.')&&!!kindOf(v)&&kindOf(v)!=='list').map(([key])=>key);
}
