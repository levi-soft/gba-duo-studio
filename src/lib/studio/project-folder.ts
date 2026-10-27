import type {Project} from './types.js';
import {SOURCE_META,SOURCE_FILES,serializeSourceProject,deserializeSourceProject,parseSourceDescriptor} from './source-project.js';
import {safePackPath,PACK_LIMITS} from './pack-safety.js';

export interface FolderFile {
  kind:'file';name:string;
  getFile():Promise<{size:number;lastModified:number;arrayBuffer():Promise<ArrayBuffer>}>;
  createWritable():Promise<{write(data:Uint8Array):Promise<void>;close():Promise<void>;abort?():Promise<void>}>;
}
export interface ProjectFolder {
  kind:'directory';name:string;
  values():AsyncIterable<FolderFile|ProjectFolder>;
  getFileHandle(name:string,options?:{create:boolean}):Promise<FolderFile>;
  getDirectoryHandle(name:string,options?:{create:boolean}):Promise<ProjectFolder>;
}
export interface FolderSnapshot {project:Project;version:string}
export class FolderConflictError extends Error {constructor(){super('External files changed. Reload and review them before saving.');}}

async function fileAt(folder:ProjectFolder,path:string,create=false):Promise<FolderFile>{
  safePackPath(path);const parts=path.split('/');let current=folder;
  for(const part of parts.slice(0,-1))current=await current.getDirectoryHandle(part,{create});
  return current.getFileHandle(parts.at(-1)!,{create});
}
async function inventory(folder:ProjectFolder){
  const meta=await (await fileAt(folder,SOURCE_META)).getFile();
  if(meta.size>2*1024*1024)throw Error('Studio source index exceeds 2 MiB.');
  const metaBytes=new Uint8Array(await meta.arrayBuffer()),descriptor=parseSourceDescriptor(metaBytes);
  const paths=[...SOURCE_FILES,...descriptor.files],files=await Promise.all(paths.map(async path=>({path,file:await (await fileAt(folder,path)).getFile()})));
  let size=meta.size;for(const {file}of files){size+=file.size;if(file.size>PACK_LIMITS.file||size>PACK_LIMITS.expanded)throw Error('Source folder exceeds project size limits.');}
  // Include the descriptor's contents, not only its timestamp: the index is small.
  const version=JSON.stringify([new TextDecoder().decode(metaBytes),meta.lastModified,files.map(({path,file})=>[path,file.size,file.lastModified])]);
  return {version,files,metaBytes};
}
export async function inspectProjectFolder(folder:ProjectFolder):Promise<string>{return (await inventory(folder)).version;}
export async function readProjectFolder(folder:ProjectFolder):Promise<FolderSnapshot>{
  const current=await inventory(folder),entries:Record<string,Uint8Array>={[SOURCE_META]:current.metaBytes};
  await Promise.all(current.files.map(async({path,file})=>{entries[path]=new Uint8Array(await file.arrayBuffer());}));
  const project=deserializeSourceProject(entries);
  if(await inspectProjectFolder(folder)!==current.version)throw Error('Source files changed while loading. Try reloading again.');
  return {project,version:current.version};
}
export async function saveProjectFolder(folder:ProjectFolder,project:Project,expectedVersion?:string):Promise<FolderSnapshot>{
  const entries=serializeSourceProject(project);
  if(expectedVersion!==undefined){if(await inspectProjectFolder(folder)!==expectedVersion)throw new FolderConflictError();}
  else {
    for await(const item of folder.values())if(!item.name.startsWith('.'))throw Error('Choose an empty folder, or use Open folder for an existing Studio project.');
  }
  // Write only managed files; no directory enumeration/deletion or unrelated cleanup.
  // The index is committed last. A failed save is never reported as successful.
  const paths=Object.keys(entries).filter(path=>path!==SOURCE_META);
  paths.push(SOURCE_META);
  for(const path of paths){
    const writable=await (await fileAt(folder,path,true)).createWritable();
    try{await writable.write(entries[path]);await writable.close();}catch(error){await writable.abort?.().catch(()=>{});throw error;}
  }
  return readProjectFolder(folder);
}
export function incomingSourceAction(dirty:boolean,loadedVersion:string,nextVersion:string):'none'|'reload'|'conflict'{
  return loadedVersion===nextVersion?'none':dirty?'conflict':'reload';
}
