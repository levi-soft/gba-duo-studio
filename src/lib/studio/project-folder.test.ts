import {it,expect} from 'vitest';import {createProject} from './project.js';
import {saveProjectFolder,readProjectFolder,inspectProjectFolder,incomingSourceAction,FolderConflictError,type ProjectFolder} from './project-folder.js';

function memoryFolder(){
 let time=1;const files=new Map<string,{bytes:Uint8Array;time:number}>();
 function directory(prefix='',name='project'):ProjectFolder{return {kind:'directory',name,
  async *values(){const seen=new Set<string>();for(const path of files.keys())if(path.startsWith(prefix)){const part=path.slice(prefix.length).split('/')[0];if(seen.has(part))continue;seen.add(part);yield path.slice(prefix.length).includes('/')?directory(prefix+part+'/',part):await this.getFileHandle(part);}},
  async getDirectoryHandle(name){return directory(prefix+name+'/',name);},
  async getFileHandle(name,options){const path=prefix+name;if(!files.has(path)){if(!options?.create)throw Error('Missing '+path);files.set(path,{bytes:new Uint8Array(),time:time++});}
   return {kind:'file',name,async getFile(){const record=files.get(path)!;const bytes=record.bytes.slice();return {size:bytes.length,lastModified:record.time,async arrayBuffer(){return bytes.buffer;}};},async createWritable(){return {async write(bytes){files.set(path,{bytes:bytes.slice(),time:time++});},async close(){}};}};
  }
 };}
 return {folder:directory(),files,external(path:string,text:string){files.set(path,{bytes:new TextEncoder().encode(text),time:time++});}};
}
it('saves plain files, reloads AI edits and preserves unknown native metadata',async()=>{
 const m=memoryFolder(),p=createProject();p.manifest.extraCapability={enabled:true};const saved=await saveProjectFolder(m.folder,p);
 expect(saved.project).toEqual(p);expect(m.files.has('layout.json')).toBe(true);expect(m.files.has('AGENTS.md')).toBe(true);
 const data={...p.data,character:'Edited by Codex'};m.external('preview-data.json',JSON.stringify(data));
 expect(await inspectProjectFolder(m.folder)).not.toBe(saved.version);expect((await readProjectFolder(m.folder)).project.data.character).toBe('Edited by Codex');
});
it('stale saves are refused and unlisted files are not deleted',async()=>{
 const m=memoryFolder(),p=createProject(),saved=await saveProjectFolder(m.folder,p);
 m.external('notes.txt','unmanaged');m.external('style.css',':root{color:red}');
 await expect(saveProjectFolder(m.folder,p,saved.version)).rejects.toBeInstanceOf(FolderConflictError);
 const reloaded=await readProjectFolder(m.folder);await saveProjectFolder(m.folder,reloaded.project,reloaded.version);
 expect(new TextDecoder().decode(m.files.get('notes.txt')!.bytes)).toBe('unmanaged');
});
it('invalid external JSON fails atomically and cannot be overwritten by a stale save',async()=>{
 const m=memoryFolder(),p=createProject(),saved=await saveProjectFolder(m.folder,p);m.external('layout.json','{');
 await expect(readProjectFolder(m.folder)).rejects.toThrow('layout.json');await expect(saveProjectFolder(m.folder,p,saved.version)).rejects.toBeInstanceOf(FolderConflictError);
 expect(saved.project.layout).toEqual(p.layout);
});
it('fresh saves refuse nonempty unrelated folders and sync distinguishes dirty conflicts',async()=>{
 const m=memoryFolder();m.external('document.txt','keep');await expect(saveProjectFolder(m.folder,createProject())).rejects.toThrow('empty folder');
 expect(incomingSourceAction(false,'a','a')).toBe('none');expect(incomingSourceAction(false,'a','b')).toBe('reload');expect(incomingSourceAction(true,'a','b')).toBe('conflict');
});
