import {it,expect} from 'vitest';
import {applyComputedValues,computedLua,shouldGenerateScript} from './computed-values.js';
import {validateMemorySpecs,decodeMemoryValue,readMemoryValues} from './memory-values.js';
import {createProject,exportPack,importPack} from './project.js';
const info={gameCode:'TEST',crc32:'12345678',sessionId:'session',packId:'my-companion'};
it('decodes signed memory and rejects unsupported addresses and prototype fields',()=>{
 expect(decodeMemoryValue(new Uint8Array([255,255]),{type:'s16'})).toBe(-1);
 expect(()=>validateMemorySpecs({hp:{type:'u8',addr:'08000000'}})).toThrow();
 expect(()=>validateMemorySpecs(JSON.parse('{"constructor":{"type":"u8","addr":"02000000"}}'))).toThrow();
});
it('reads runtime Lua data only for the assigned pack and same game session',async()=>{
 const manifest={...createProject().manifest,script:'main.lua',match:{gameCode:['TEST']}};
 expect((await readMemoryValues(manifest,async command=>command==='info'?info:{...info,data:{hp:12}})).values).toEqual({hp:12});
 await expect(readMemoryValues(manifest,async command=>command==='info'?info:{...info,packId:'other',data:{hp:12}})).rejects.toThrow('Assign');
 await expect(readMemoryValues(manifest,async command=>command==='info'?info:{...info,sessionId:'new',data:{hp:12}})).rejects.toThrow('session');
});
it('computes declarative values and generates game-neutral Lua',()=>{
 /** @type {Record<string,import('./types.js').Expression>} */
 const studioComputed={remaining:{op:'max',args:[0,{op:'sub',args:[{field:'hp'},4]}]}};
 expect(applyComputedValues({hp:8},studioComputed).remaining).toBe(4);
 expect(computedLua({...createProject().manifest,values:{hp:{addr:'02000000',type:'u8'}},studioComputed})).toContain('read(33554432,1');
 expect(computedLua({...createProject().manifest,values:{hp:{addr:'02000000',type:'u8',mask:'FF'}}})).toContain('& 255');
});
it('roundtrips imported Lua without regenerating game adapters or dropping metadata',async()=>{
 const project=createProject();project.manifest.match={gameCode:['TEST']};
 project.manifest.script='main.lua';project.manifest.adapterMetadata={version:3};
 project.manifest.studioComputed={hp:5};const script='function update() return {hp=9} end';
 project.files['main.lua']=btoa(script);
 expect(shouldGenerateScript(project)).toBe(false);
 const result=await importPack(await (await exportPack(project)).arrayBuffer());
 expect(atob(result.files['main.lua'])).toBe(script);
 expect(result.manifest.adapterMetadata).toEqual({version:3});
});
