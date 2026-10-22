// @vitest-environment node
import {it,expect} from 'vitest';
import {LuaFactory} from 'wasmoon';
import {createRequire} from 'node:module';
import {createProject,exportPack,importPack} from './project.js';
import {computedLua,computedScriptPath,applyComputedValues} from './computed-values.js';
import {decodeMemoryValue} from './memory-values.js';
const factory=new LuaFactory(createRequire(import.meta.url).resolve('wasmoon/dist/glue.wasm'));
it('executes generated Lua with pointer fields, masks, expressions, UTF-8 and pulse timing',async()=>{
 const p=createProject();p.manifest.match={gameCode:['TEST']};
 p.manifest.values={hp:{ptr:'02000000',offset:4,type:'u16',mask:'FF',shift:1}};
 p.manifest.studioComputed={remaining:{op:'sub',args:[{field:'hp'},3]},caption:'Hello · Xin chào'};
 p.manifest.studioPulse={periodMs:1000,bindings:{flash:'remaining'}};
 const lua=await factory.createEngine();
 try{
  lua.global.set('mem',{u32:()=>0x02000100,u16:(address:number)=>{expect(address).toBe(0x02000104);return 0x1214;}});
  await lua.doString(computedLua(p.manifest));
  const first:unknown=await lua.doString('return update()');
  expect(first).toMatchObject({hp:10,remaining:7,caption:'Hello · Xin chào',flash:true});
  expect(await lua.doString('return update().flash')).toBe(false);
 }finally{lua.global.close();}
 const roundtrip=await importPack(await (await exportPack(p)).arrayBuffer());
 expect(roundtrip.manifest.script).toBe(computedScriptPath);
 roundtrip.manifest.studioComputed={changed:42};
 const updated=await importPack(await (await exportPack(roundtrip)).arrayBuffer());
 expect(atob(updated.files[computedScriptPath])).toContain('=42');
});
it('rejects undefined arithmetic and wrong expression arity before export',()=>{
 expect(()=>applyComputedValues({}, {a:{op:'divfloor',args:[5,0]}})).toThrow('zero');
 expect(()=>applyComputedValues({}, {a:{op:'choose',args:[true,1]}})).toThrow('count');
});
it('keeps signed field and shift-zero semantics consistent with native values',async()=>{
 const p=createProject();p.manifest.values={signed:{addr:'02000000',type:'s8',shift:0}};
 expect(decodeMemoryValue(new Uint8Array([255]),p.manifest.values.signed)).toBe(-1);
 const lua=await factory.createEngine();
 try{lua.global.set('mem',{s8:()=>-1});await lua.doString(computedLua(p.manifest));expect(await lua.doString('return update().signed')).toBe(-1);}finally{lua.global.close();}
});
