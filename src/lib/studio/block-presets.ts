import {characterCard,statsTable} from './function-blocks.js';
import {walk} from './tree.js';
import type {FunctionBlockRequest} from './function-block-authoring.js';
import type {Project} from './types.js';

export type BlockConfig=Omit<FunctionBlockRequest,'parentId'|'position'>;
export interface BlockPreset {id:string;name:string;config:BlockConfig}
export interface BlockPresets {formatVersion:1;presets:BlockPreset[]}
export const BLOCK_PRESETS_KEY='gba-duo-studio-block-presets-v1';
export const BLOCK_PRESETS_LIMIT=50;
const MAX_BYTES=512*1024;
const object=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid block configuration.');return v as Record<string,unknown>;};
function text(v:unknown,max=128,fallback=''){if(v===undefined)return fallback;if(typeof v!=='string'||v.length>max)throw Error('Invalid block configuration.');return v;}
function config(input:unknown):BlockConfig{
 const v=object(input),title=text(v.title);
 if(v.kind==='stats'){
  if(!Array.isArray(v.rows)||!v.rows.length||v.rows.length>24)throw Error('Choose 1 to 24 stat rows.');
  const rows=v.rows.map(input=>{const row=object(input);return {label:row.labelField!==undefined?'':text(row.label),field:text(row.field,256),...(row.labelField!==undefined?{labelField:text(row.labelField,256)}:{})};});
  statsTable({id:'preset-check',title,rows});return {kind:'stats',title,rows};
 }
 if(v.kind!=='character')throw Error('Choose a character card or a stat table.');
 if(v.hpEnabled!==undefined&&typeof v.hpEnabled!=='boolean')throw Error('Invalid block configuration.');
 const mode=v.portraitMode??'none';if(!['none','field','asset'].includes(String(mode)))throw Error('Choose a portrait source.');
 const result:BlockConfig={kind:'character',title,nameField:text(v.nameField,256),portraitMode:mode as 'none'|'field'|'asset',hpEnabled:v.hpEnabled===true};
 if(v.levelField){result.levelField=text(v.levelField,256);if(v.levelLabel!==undefined)result.levelLabel=text(v.levelLabel);}
 if(mode==='field')result.portraitField=text(v.portraitField,256);
 if(mode==='asset'){result.portraitAsset=text(v.portraitAsset,512);if(!result.portraitAsset.startsWith('assets/'))throw Error('Invalid local portrait path.');}
 if(result.hpEnabled){result.currentHpField=text(v.currentHpField,256);result.maximumHpField=text(v.maximumHpField,256);result.barLabel=text(v.barLabel,128,'HP');}
 characterCard({id:'preset-check',title,nameField:result.nameField!,levelField:result.levelField,levelLabel:result.levelLabel,portrait:mode==='field'?'$'+result.portraitField:mode==='asset'?'asset:'+result.portraitAsset!.slice(7):undefined,currentHpField:result.currentHpField,maximumHpField:result.maximumHpField,hpLabel:result.barLabel});
 return result;
}
export function makeBlockPreset(request:BlockConfig,id:string,name:string):BlockPreset{
 if(typeof id!=='string'||! /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id))throw Error('Invalid saved block ID.');
 const display=text(name,80).trim().normalize('NFC');if(!display)throw Error('Enter a name for the saved configuration.');
 return {id,name:display,config:config(request)};
}
export function validateBlockPresets(input:unknown):BlockPresets{
 const v=object(input);if(v.formatVersion!==1||!Array.isArray(v.presets)||v.presets.length>BLOCK_PRESETS_LIMIT)throw Error('Invalid saved block library or too many configurations.');
 const ids=new Set<string>(),names=new Set<string>();
 const presets=v.presets.map(input=>{const p=object(input),result=makeBlockPreset(config(p.config),text(p.id,64),text(p.name,80)),name=result.name.toLowerCase();
  if(ids.has(result.id)||names.has(name))throw Error('A saved configuration with this name or ID already exists.');ids.add(result.id);names.add(name);return result;});
 const result:BlockPresets={formatVersion:1,presets};if(new TextEncoder().encode(JSON.stringify(result)).length>MAX_BYTES)throw Error('The saved block library is too large.');return result;
}
export function parseBlockPresets(source:string):BlockPresets{
 if(typeof source!=='string'||source.length>MAX_BYTES||new TextEncoder().encode(source).length>MAX_BYTES)throw Error('The saved block library is too large.');
 let value:unknown;try{value=JSON.parse(source.replace(/^\uFEFF/,''));}catch{throw Error('Invalid saved block JSON.');}return validateBlockPresets(value);
}
export function serializeBlockPresets(value:BlockPresets){const source=JSON.stringify(validateBlockPresets(value),null,2);if(new TextEncoder().encode(source).length>MAX_BYTES)throw Error('The saved block library is too large.');return source;}
export function loadBlockPresets(storage?:Pick<Storage,'getItem'>):BlockPresets{
 let source:string|null;try{source=(storage??globalThis.localStorage).getItem(BLOCK_PRESETS_KEY);}catch{throw Error('The browser could not load saved block configurations.');}
 return source===null?{formatVersion:1,presets:[]}:parseBlockPresets(source);
}
export function saveBlockPresets(value:BlockPresets,storage?:Pick<Storage,'setItem'>){const source=serializeBlockPresets(value);try{(storage??globalThis.localStorage).setItem(BLOCK_PRESETS_KEY,source);}catch{throw Error('The browser could not save block configurations.');}}
export function mergeBlockPresets(current:BlockPresets,incoming:BlockPresets):BlockPresets{
 const result=validateBlockPresets(current),next=validateBlockPresets(incoming);
 for(const item of next.presets){const previous=result.presets.find(p=>p.id===item.id);if(previous){if(JSON.stringify(previous)!==JSON.stringify(item))throw Error('A saved configuration with this name or ID already exists.');}else result.presets.push(item);}
 return validateBlockPresets(result);
}
export const blockPresetRequest=(preset:BlockPreset,parentId:string,position:'start'|'end'):FunctionBlockRequest=>({...config(preset.config),parentId,position});

/** Recover only the configuration of constructor-shaped blocks; never copy CSS,
 * assets, reader code, UI actions or values into the shared library. */
export function selectedBlockConfig(project:Project,selected:string):BlockConfig|null{
 const refs=walk(project.layout),index=refs.findIndex(r=>r.node.id===selected);if(index<0)return null;
 const candidates=refs.slice(0,index+1).reverse().filter(r=>r.node.type==='box'&&walk(r.node).some(r=>r.node.id===selected));
 const field=(value:unknown)=>{if(typeof value!=='string')throw Error('Not a generated block.');const m=value.match(/^\{([^{}]+)\}$/);if(!m)throw Error('Not a generated block.');return m[1];};
 const dollar=(value:unknown)=>{if(typeof value!=='string'||!value.startsWith('$'))throw Error('Not a generated block.');return value.slice(1);};
 for(const {node:root}of candidates)try{
  const id=root.id,children=[...(root.children??[])];let title='';
  if(children[0]?.id===id+'-title'&&children[0].type==='text')title=String(children.shift()!.text??'');
  if(children.length===1&&children[0].id===id+'-body'&&children[0].type==='row'){
   const body=[...(children[0].children??[])];let portraitMode:'none'|'field'|'asset'='none',portraitField='',portraitAsset='';
   if(body[0]?.id===id+'-portrait'&&body[0].type==='image'){const source=String(body.shift()!.src??'');if(source.startsWith('$')){portraitMode='field';portraitField=source.slice(1);}else if(source.startsWith('asset:')){portraitMode='asset';portraitAsset='assets/'+source.slice(6);}else continue;}
   if(body.length!==1||body[0].type!=='column'||body[0].id!==id+'-details')continue;
   const detail=[...(body[0].children??[])],name=detail.shift();if(name?.id!==id+'-name'||name.type!=='text')continue;
   const result:BlockConfig={kind:'character',title,nameField:field(name.text),portraitMode,portraitField,portraitAsset,hpEnabled:false};
   if(detail[0]?.id===id+'-level'&&detail[0].type==='text'){
    const match=String(detail.shift()!.text??'').match(/^(.*)\{([^{}]+)\}$/);if(!match||match[1]&&!match[1].endsWith(': '))continue;
    result.levelField=match[2];result.levelLabel=match[1].slice(0,-2);
   }
   if(detail[0]?.id===id+'-hp'&&detail[0].type==='bar'){
    const bar=detail.shift()!;result.hpEnabled=true;result.currentHpField=dollar(bar.value);result.maximumHpField=dollar(bar.maxKey);
    const suffix='{'+result.currentHpField+'} / {'+result.maximumHpField+'}',label=String(bar.label??'');if(!label.endsWith(suffix))continue;
    const prefix=label.slice(0,-suffix.length);if(prefix&&!prefix.endsWith(': '))continue;result.barLabel=prefix.slice(0,-2);
   }
   if(detail.length)continue;return config(result);
  }
  if(!children.length)continue;
  const rows=children.map((row,i)=>{
   if(row.type!=='row'||row.id!==id+'-row-'+i||row.children?.length!==2)throw Error('Not a generated block.');
   const [label,value]=row.children;if(label.type!=='text'||value.type!=='text'||label.id!==id+'-label-'+i||value.id!==id+'-value-'+i)throw Error('Not a generated block.');
   const text=String(label.text??'');return {label:text.startsWith('{')?'':text,...(text.startsWith('{')?{labelField:field(text)}:{}),field:field(value.text)};
  });
  return config({kind:'stats',title,rows});
 }catch{/* A regular hand-authored container is not a function-block configuration. */}
 return null;
}
