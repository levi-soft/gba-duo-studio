// @vitest-environment node
import {it,expect} from 'vitest';
import {LuaFactory} from 'wasmoon';
import {createRequire} from 'node:module';
import {createProject,exportPack,importPack} from './project.js';
import {computedLua,shouldGenerateScript} from './computed-values.js';
import {decode4bpp,decompressLz77,readGameGraphics,validateGraphicsSpec,sameGraphicsSource,graphicsPage,graphicsPalette} from './rom-graphics.js';
import {insertGraphicsBlock} from './graphics-blocks.js';
import type {BridgeInfo,BridgeSend,GraphicsSpec} from './types.js';
const spec:GraphicsSpec={tiles:'0x08000100',palette:'0x08000200',width:8,height:8,lz77:false};
it('pages whole image batches without overlap and changes one 16-color palette at a time',()=>{
  const icon={...spec,width:16,height:16};
  const next=graphicsPage(icon,1);
  expect(next.count).toBe(16);expect(next.spec.tiles).toBe('0x8000900');
  expect(sameGraphicsSource(graphicsPage(next.spec,-1).spec,icon)).toBe(true);
  expect(graphicsPage({...icon,height:72},0).count).toBe(3);
  expect(graphicsPalette(icon,1).palette).toBe('0x8000220');
  expect(sameGraphicsSource(graphicsPalette(graphicsPalette(icon,1),-1),icon)).toBe(true);
  expect(()=>graphicsPage({...icon,tiles:'0x08000000'},-1)).toThrow();
  expect(()=>graphicsPage({...icon,lz77:true},1)).toThrow('uncompressed');
  expect(()=>graphicsPage({...icon,tiles:'0x06017F80'},1)).toThrow();
  expect(()=>graphicsPalette({...icon,palette:'0x050003E0'},1)).toThrow();
});
const info:BridgeInfo={platform:'gba',gameCode:'TEST',crc32:'12345678',sessionId:'a',romSize:0x1000,bridgeVersion:2,capabilities:{inspect:true}};
const bytes=new Uint8Array(0x1000);bytes.fill(0x11,0x100,0x120);bytes[0x202]=31;
const send:BridgeSend=async(command,params)=>command==='info'?info:{...info,ranges:params!.ranges.map(range=>({...range,base64:btoa(String.fromCharCode(...bytes.slice(range.address-0x08000000,range.address-0x08000000+range.length)))}))};
it('compares palette variants from one coherent read with exact source descriptors',async()=>{
  let inspections=0;
  const counted:BridgeSend=async(command,params)=>{
    if(command==='inspect'){inspections++;expect(params!.ranges).toEqual([{address:0x08000100,length:32},{address:0x08000200,length:256}]);}
    return send(command,params);
  };
  const result=await readGameGraphics(spec,counted,undefined,8);
  expect(inspections).toBe(1);expect(result.variants).toHaveLength(8);
  expect(result.variants[0].rgba[0]).toBe(248);expect(result.variants[1].rgba[0]).toBe(0);
  expect(result.variants[7].spec.palette).toBe('0x80002E0');
  await expect(readGameGraphics(spec,send,undefined,17)).rejects.toThrow('16 palettes');
  await expect(readGameGraphics({...spec,palette:'0x08000FE0'},send,undefined,8)).rejects.toThrow('ROM size');
  await expect(readGameGraphics({...spec,palette:'0x050003E0'},send,undefined,8)).rejects.toThrow();
});
it('decodes 4bpp nibble order, tile rows, palette colors and transparent zero exactly like native gfx',()=>{
  const tiles=new Uint8Array(64);tiles[0]=0x21;tiles[32]=3;const palette=new Uint8Array(32);palette[2]=31;palette[4]=0xe0;palette[5]=3;palette[7]=0x7c;
  const image=decode4bpp(tiles,palette,16,8);
  expect([...image.rgba.slice(0,8)]).toEqual([248,0,0,255,0,248,0,255]);
  expect([...image.rgba.slice(8*4,9*4)]).toEqual([0,0,248,255]);
  expect(image.rgba[2*4+3]).toBe(0);
  expect(()=>decode4bpp(new Uint8Array(1),palette,16,8)).toThrow('Incomplete');
});
it('rejects malformed compressed data and handles overlapping LZ77 references',()=>{
  expect([...decompressLz77(new Uint8Array([0x10,6,0,0,0x10,1,2,3,0,2]),6)]).toEqual([1,2,3,1,2,3]);
  expect(()=>decompressLz77(new Uint8Array([0x10,6,0,0,0x80,0,2]),6)).toThrow('reference');
  expect(()=>decompressLz77(new Uint8Array([0x10,6,0,0]),6)).toThrow('Truncated');
  expect(()=>validateGraphicsSpec({...spec,tiles:'0x04000000'})).toThrow();
  expect(()=>validateGraphicsSpec({...spec,lz77:true,tiles:'0x06000000'})).toThrow('ROM');
  expect(sameGraphicsSource(spec,{...spec,tiles:'08000100'})).toBe(true);
  expect(sameGraphicsSource(spec,{...spec,palette:'0x08000220'})).toBe(false);
});
it('reads image and palette from the same inspection response and refuses wrong sessions or ROM bounds',async()=>{
  expect((await readGameGraphics(spec,send)).rgba[0]).toBe(248);
  const changed:BridgeSend=async(command,params)=>({...await send(command,params),...(command==='inspect'?{sessionId:'b'}:{})});
  await expect(readGameGraphics(spec,changed)).rejects.toThrow('session');
  await expect(readGameGraphics({...spec,tiles:'0x08000FF8'},send)).rejects.toThrow('ROM size');
  await expect(readGameGraphics(spec,async()=>({...info,capabilities:undefined}))).rejects.toThrow('Update');
});
it('exports source descriptors and generated gfx Lua without embedding preview pixels',async()=>{
  const p=createProject('blank');const id=insertGraphicsBlock(p,p.layout.pages![0].child.id,'portrait',spec,info);
  expect(shouldGenerateScript(p)).toBe(true);expect(p.data.portrait).toBe('');expect(p.files).toEqual({});
  const imported=await importPack(await (await exportPack(p)).arrayBuffer());
  expect(imported.manifest.studioGraphics?.portrait).toEqual(spec);
  expect(imported.data.portrait).toBe('');expect(imported.layout.pages![0].child.children!.find(n=>n.id===id)?.src).toBe('$portrait');
  expect(Object.keys(imported.files).some(path=>/\.(png|webp|gba|bin)$/.test(path))).toBe(false);
  const factory=new LuaFactory(createRequire(import.meta.url).resolve('wasmoon/dist/glue.wasm')),lua=await factory.createEngine();
  try{
    lua.global.set('gfx',{decode:(config:{tiles:number;palette:number})=>{expect(config.tiles).toBe(0x08000100);expect(config.palette).toBe(0x08000200);return 'gfx:test';}});
    await lua.doString(computedLua(p.manifest));expect(await lua.doString('return update().portrait')).toBe('gfx:test');
    await lua.doString('gfx.decode=function() error("bad source") end');expect(await lua.doString('return update().portrait')).toBe('');
  }finally{lua.global.close();}
});
it('preserves custom scripts and rejects duplicate data keys',()=>{
  const p=createProject('blank');p.manifest.script='custom.lua';p.files['custom.lua']=btoa('function update() return {} end');
  expect(()=>insertGraphicsBlock(p,p.layout.pages![0].child.id,'portrait',spec,info)).toThrow('Custom Lua');
  delete p.manifest.script;p.manifest.values={hp:{addr:'0x02000000',type:'u8'}};
  expect(()=>insertGraphicsBlock(p,p.layout.pages![0].child.id,'hp',spec,info)).toThrow('already exists');
  expect(()=>insertGraphicsBlock(p,p.layout.pages![0].child.id,'frame',{...spec,tiles:'0x06010000'},info)).toThrow('inspection-only');
});
