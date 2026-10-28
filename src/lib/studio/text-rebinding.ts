import {safeDataPath,type CatalogField} from './data-catalog.js';

const MAX_TEXT=16384,MAX_FIELDS=24;
/** Extract only the interpolation syntax used by native text widgets. UI state
 * and the row index remain untouched; they are not reader fields to remap. */
export function textTemplateBindings(value:unknown):{supported:boolean;paths:string[]}{
 if(typeof value!=='string'||value.length>MAX_TEXT)return {supported:false,paths:[]};
 const paths=new Set<string>();
 for(const token of value.matchAll(/\{([^{}]+)\}/g)){
  const path=token[1];
  if(path==='@index')continue;
  if(!safeDataPath(path))return {supported:false,paths:[]};
  if(path.startsWith('ui.'))continue;
  paths.add(path);if(paths.size>MAX_FIELDS)return {supported:false,paths:[]};
 }
 return {supported:paths.size>0,paths:[...paths]};
}

/** Validate every destination before producing a new template. One regex pass
 * keeps swaps/cycles simultaneous, preserves literal text and never touches
 * the project, its sample values, Lua or other widget properties. */
export function rebindTextTemplate(template:unknown,mapping:unknown,fields:CatalogField[]):string{
 const info=textTemplateBindings(template);
 if(!info.supported)throw Error('This text template needs the full editor.');
 if(!mapping||typeof mapping!=='object'||Array.isArray(mapping))throw Error('Choose a replacement for every text value.');
 const choices=mapping as Record<string,unknown>,keys=Object.keys(choices);
 if(keys.length!==info.paths.length||keys.some(key=>!info.paths.includes(key)))throw Error('Choose a replacement for every text value.');
 for(const path of info.paths){
  const choice=Object.hasOwn(choices,path)?choices[path]:undefined;
  if(typeof choice!=='string'||!safeDataPath(choice)||!fields.some(f=>f.path===choice&&f.kind!=='list'))throw Error('Choose an available text, number or status field for every text value.');
 }
 const result=(template as string).replace(/\{([^{}]+)\}/g,(token,path)=>Object.hasOwn(choices,path)?'{'+choices[path]+'}':token);
 if(result.length>MAX_TEXT)throw Error('This text template needs the full editor.');
 return result;
}
