import type {Project} from './types.js';
import {validate} from './project.js';
import {safePackPath,PACK_LIMITS} from './pack-safety.js';
import {parseLayoutWithWarnings} from '../preview/layout.js';

export const SOURCE_META='studio.project.json';
export const SOURCE_FILES=['manifest.json','layout.json','style.css','preview-data.json'] as const;
const reserved=new Set<string>([SOURCE_META,'AGENTS.md','studio-design.json',...SOURCE_FILES]);
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});

/** Asset strings are immutable: do not serialize megabytes of them per undo step. */
export function cloneProject(project:Project):Project {
  const {files,...document}=project;
  return {...JSON.parse(JSON.stringify(document)),files:{...files}};
}
export function rememberProject(history:Project[],project:Project,limit=50):Project[]{
  return [...(limit>1?history.slice(-(limit-1)):[]),cloneProject(project)];
}
export function decodeSource(value:string):string {
  return decoder.decode(Uint8Array.from(atob(value),c=>c.charCodeAt(0)));
}
function base64(bytes:Uint8Array):string {
  let text='';for(let n=0;n<bytes.length;n+=32768)text+=String.fromCharCode(...bytes.subarray(n,n+32768));return btoa(text);
}
function json(text:string,path:string){
  try{return JSON.parse(text);}catch(error){throw Error(`${path}: ${error instanceof Error?error.message:String(error)}`);}
}
export function sourceText(project:Project,path:string):string {
  if(path==='manifest.json')return JSON.stringify(project.manifest,null,2);
  if(path==='layout.json')return JSON.stringify(project.layout,null,2);
  if(path==='style.css')return project.css;
  if(path==='preview-data.json')return JSON.stringify(project.data,null,2);
  safePackPath(path);return decodeSource(project.files[path]??'');
}
export function sourcePaths(project:Project):string[]{
  return [...SOURCE_FILES,...Object.keys(project.files).filter(path=>!reserved.has(path)&&/\.(lua|json|css|txt|md|svg)$/i.test(path)).sort()];
}
/** Apply one file as a transaction. Module edits never select a new entry script. */
export function applySourceText(project:Project,path:string,text:string):Project {
  safePackPath(path);
  if(encoder.encode(text).length>PACK_LIMITS.file)throw Error('Source file exceeds the 32 MiB limit.');
  const next=cloneProject(project);
  if(path==='manifest.json')next.manifest=json(text,path);
  else if(path==='layout.json')next.layout=parseLayoutWithWarnings(json(text,path)).root;
  else if(path==='style.css')next.css=text;
  else if(path==='preview-data.json')next.data=json(text,path);
  else {
    if(reserved.has(path))throw Error('This file is managed by Studio.');
    next.files[path]=base64(encoder.encode(text));
  }
  validate(next);return next;
}

export interface SourceDescriptor {
  format:'gba-duo-studio-source';version:1;
  project:Record<string,unknown>;files:string[];
}
export const AI_GUIDE=`# Companion source project

This folder is edited by both Codex and GBA Duo Studio. No AI API key is needed.
Read studio.project.json and manifest.json first. Edit layout.json, style.css,
preview-data.json or the declared Lua modules. Keep native manifest metadata,
including permissions and cursorNavigation. Preserve unknown fields.

manifest.script is the entry point. Editing another Lua module must not change
that entry point. Keep Lua modular; do not merge all modules into one script.
Generated ROM tables/assets should be regenerated with the matching Builder,
not replaced with guesses. Keep ROM-derived text, graphics and captures private.

When adding/removing a pack file, update the files array in studio.project.json.
The four top-level source files are managed separately and are not in that array.
Studio never deletes unlisted files. Do not modify .git or unrelated folders.

Use stable unique node IDs, existing CSS classes and native companion widgets.
Preserve bindings and actions when changing UI. Validate in Studio and test on
the emulator: browser preview does not execute the game or arbitrary Lua.
If Studio reports unsaved visual edits and external changes, resolve the conflict
before saving; never silently replace another writer's work.
`;

export function serializeSourceProject(project:Project):Record<string,Uint8Array> {
  validate(project);
  const {manifest,layout,css,data,files,...metadata}=project;
  const descriptor:SourceDescriptor={format:'gba-duo-studio-source',version:1,project:metadata,files:Object.keys(files).filter(path=>!reserved.has(path)).sort()};
  const output:Record<string,Uint8Array>={};
  for(const path of SOURCE_FILES)output[path]=encoder.encode(sourceText(project,path)+'\n');
  output[SOURCE_META]=encoder.encode(JSON.stringify(descriptor,null,2)+'\n');
  output['AGENTS.md']=encoder.encode(AI_GUIDE);
  for(const path of descriptor.files){safePackPath(path);output[path]=Uint8Array.from(atob(files[path]),c=>c.charCodeAt(0));}
  return output;
}
export function parseSourceDescriptor(bytes:Uint8Array):SourceDescriptor {
  const value=json(decoder.decode(bytes),SOURCE_META);
  if(value?.format!=='gba-duo-studio-source'||value.version!==1||!value.project||typeof value.project!=='object'||Array.isArray(value.project)||!Array.isArray(value.files)||value.files.length>PACK_LIMITS.entries)throw Error('Unsupported Studio source folder.');
  const seen=new Set<string>();
  for(const path of value.files){safePackPath(path);if(reserved.has(path)||seen.has(path))throw Error('Invalid or duplicate source file: '+path);seen.add(path);}
  return value;
}
export function deserializeSourceProject(entries:Record<string,Uint8Array>):Project {
  const descriptor=parseSourceDescriptor(entries[SOURCE_META]);
  function text(path:string){if(!entries[path])throw Error('Missing source file: '+path);return decoder.decode(entries[path]);}
  const files:Record<string,string>={};
  for(const path of descriptor.files){if(!entries[path])throw Error('Missing pack file: '+path);files[path]=base64(entries[path]);}
  const project={...descriptor.project,manifest:json(text('manifest.json'),'manifest.json'),layout:parseLayoutWithWarnings(json(text('layout.json'),'layout.json')).root,css:text('style.css').replace(/\n$/,''),data:json(text('preview-data.json'),'preview-data.json'),files} as Project;
  validate(project);return project;
}
