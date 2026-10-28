import {it,expect} from 'vitest';
import {createProject} from './project.js';
import type {Project} from './types.js';
import {applySourceText,cloneProject,rememberProject,serializeSourceProject,deserializeSourceProject,SOURCE_META} from './source-project.js';

function fixture(){const p=createProject();p.manifest.script='main.lua';p.manifest.match={gameCode:['TEST'],crc32:['12345678']};p.manifest.cursorNavigation={version:1,kind:'fe-map'};p.files={'main.lua':btoa('local D=pack.require("game.reader")\nfunction update()return D end'),'game.reader.lua':btoa('return {hp=10}'),'assets/pixel.png':btoa(String.fromCharCode(0,255,128))};return p;}
it('folder sources preserve native metadata, binary assets, modules and authored layout',()=>{
 const p=fixture(),entries=serializeSourceProject(p),round=deserializeSourceProject(entries);
 expect(round).toEqual(p);expect(new TextDecoder().decode(entries['main.lua'])).toContain('pack.require');
 expect(new TextDecoder().decode(entries['AGENTS.md'])).toContain('must not change');
 const descriptor=JSON.parse(new TextDecoder().decode(entries[SOURCE_META]));expect(descriptor.files).toContain('game.reader.lua');expect(descriptor.files).not.toContain('layout.json');
});
it('seeded source-folder properties preserve binary assets, Unicode data and Lua modules',()=>{
 let seed=0x8a554422;const next=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
 for(let run=0;run<80;run++){
  const p=fixture(),bytes=Uint8Array.from({length:next()%1024},()=>next()>>>24);
  const lua=new TextEncoder().encode(`-- dữ liệu thử ${run}\nreturn {value=${next()%65536}}\n`);
  p.files['assets/generated.bin']=btoa(String.fromCharCode(...bytes));
  p.files['generated.lua']=btoa(String.fromCharCode(...lua));p.data={label:'Mẫu tiếng Việt '+run,value:next()%65536};
  const out=serializeSourceProject(p),round=deserializeSourceProject(out);
  expect([...out['assets/generated.bin']]).toEqual([...bytes]);expect([...out['generated.lua']]).toEqual([...lua]);
  expect(round.files).toEqual(p.files);expect(round.data).toEqual(p.data);expect(round.manifest).toEqual(p.manifest);
 }
});

it('editing a module is atomic and never changes the entry script',()=>{
 const p=fixture(),next=applySourceText(p,'game.reader.lua','return {hp=15}');
 expect(next.manifest.script).toBe('main.lua');expect(atob(next.files['game.reader.lua'])).toBe('return {hp=15}');expect(atob(p.files['game.reader.lua'])).toBe('return {hp=10}');
 expect(()=>applySourceText(p,'manifest.json','{invalid')).toThrow('manifest.json');expect(p.manifest.script).toBe('main.lua');
 expect(()=>applySourceText(p,'../main.lua','')).toThrow('Unsafe');
});
it('invalid source indexes and missing modules cannot replace a project',()=>{
 const entries=serializeSourceProject(fixture()),decode=new TextDecoder(),encode=new TextEncoder();
 const index=JSON.parse(decode.decode(entries[SOURCE_META]));index.files.push('../secret');entries[SOURCE_META]=encode.encode(JSON.stringify(index));expect(()=>deserializeSourceProject(entries)).toThrow('Unsafe');
 const missing=serializeSourceProject(fixture());delete missing['main.lua'];expect(()=>deserializeSourceProject(missing)).toThrow('Missing pack file');
});
it('history bounds snapshots and does not serialize binary asset payloads',()=>{
 const p=fixture();Object.defineProperty(p.files,'toJSON',{value:()=>{throw Error('Asset map serialized');},enumerable:false});
 const copy=cloneProject(p);expect(copy.files).not.toBe(p.files);expect(copy.files['assets/pixel.png']).toBe(p.files['assets/pixel.png']);
 copy.layout.id='changed';expect(p.layout.id).not.toBe('changed');
 let history:Project[]=[];for(let n=0;n<7;n++)history=rememberProject(history,p,3);expect(history).toHaveLength(3);expect(rememberProject(history,p,1)).toHaveLength(1);
});
