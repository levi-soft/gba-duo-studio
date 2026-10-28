import {it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import JSZip from 'jszip';
import {createProject} from '../src/lib/studio/project.js';
import {packReadinessReport} from '../src/lib/studio/pack-readiness.js';
import type {DependencyReport} from '../src/lib/studio/project-diagnostics.js';
import type {Project} from '../src/lib/studio/types.js';

function builder(){
 const dir=process.env.GBA_DUO_BUILDER_DIR;if(!dir)throw Error('Run npm run test:builder.');
 const context=vm.createContext({structuredClone,Uint8Array,JSZip,globalThis:undefined});context.globalThis=context;
 for(const name of ['pack-compiler.js','builder-core.js'])vm.runInContext(fs.readFileSync(path.join(dir,'site',name),'utf8'),context);
 return context.CompanionBuild as {inspectProject:(rom:Uint8Array,p:Project)=>{diagnostics:DependencyReport};buildProject:(rom:Uint8Array,p:Project)=>Promise<unknown>};
}
it('keeps the independent Studio and Builder diagnostics sources synchronized',()=>{
 const dir=process.env.GBA_DUO_BUILDER_DIR!;
 expect(fs.readFileSync('src/lib/studio/project-diagnostics.js','utf8').replace(/\r\n/g,'\n')).toBe(fs.readFileSync(path.join(dir,'ui/project-diagnostics.js'),'utf8').replace(/\r\n/g,'\n'));
});

it('flags existing browser-only formats consistently in Studio and Builder without blocking legacy editing',()=>{
 const api=builder(),p=createProject('blank');p.manifest.match={gameCode:['TEST'],crc32:['2419A356']};p.files={'assets/vector.svg':btoa('<svg/>'),'assets/web.woff2':btoa('font')};p.css='@font-face {font-family:web;src:url(web.woff2)}';p.layout.pages![0].child.children=[{type:'image',id:'vector',src:'asset:vector.svg'}];
 const rom=new Uint8Array(192);rom.set(new TextEncoder().encode('TEST'),0xac);const before=structuredClone(p),studio=packReadinessReport(p),report=api.inspectProject(rom,p).diagnostics;
 expect(studio.errors).toBe(0);expect(report.errors).toBe(0);expect(studio.warnings).toBe(report.warnings+1); // Studio also identifies sample-only data.
 expect(studio.issues.filter(i=>i.code.startsWith('android-')).map(i=>[i.code,i.nodeId,i.property,i.detail])).toEqual(report.issues.map(i=>[i.code,i.nodeId,i.property,i.detail]));expect(p).toEqual(before);
});
it('agrees on missing dependencies through both actual preflight paths and permits the repaired source without edits to reader/ROM',async()=>{
 const api=builder(),rom=new Uint8Array(192);rom.set(new TextEncoder().encode('TEST'),0xac);const bytes=Buffer.from(rom),p=createProject('blank');p.manifest.match={gameCode:['TEST'],crc32:['2419A356']};p.manifest.script='main.lua';p.files['main.lua']=btoa('function update() return {} end');
 p.css+='\n@font-face{font-family:demo;src:url(fonts/demo.woff2)}';p.data.party=[];
 p.layout.pages![0].child.children=[{type:'button',id:'action',buttonSkin:{normal:'assets/button.png'},onClick:{call:'literal',args:['$readerOnly']}},{type:'list',id:'party',items:'party',template:{type:'text',id:'row',text:'{unobserved}'}}];
 const before=structuredClone(p),a=packReadinessReport(p),b=api.inspectProject(rom,p).diagnostics;
 expect([a.errors,a.warnings,a.info,a.truncated,a.complete]).toEqual([b.errors,b.warnings,b.info,b.truncated,b.complete]);
 const withoutTarget=a.issues.map(({target,...issue})=>issue);expect(JSON.parse(JSON.stringify(withoutTarget))).toEqual(JSON.parse(JSON.stringify(b.issues)));expect(a.errors).toBe(2);expect(a.info).toBe(2);
 await expect(api.buildProject(rom,p)).rejects.toThrow('references');expect(p).toEqual(before);expect(Buffer.from(rom)).toEqual(bytes);
 p.files['assets/fonts/demo.woff2']='';p.files['assets/button.png']='';expect(packReadinessReport(p).errors).toBe(0);expect(api.inspectProject(rom,p).diagnostics.errors).toBe(0);await expect(api.buildProject(rom,p)).resolves.toBeDefined();expect(p.files['main.lua']).toBe(before.files['main.lua']);expect(Buffer.from(rom)).toEqual(bytes);
});
