// @vitest-environment node
import {it,expect} from 'vitest';
import {LuaFactory} from 'wasmoon';
import {createRequire} from 'node:module';
import {createProject,exportPack,importPack} from './project.js';
import {computedLua} from './computed-values.js';
import {insertGraphicsBlock} from './graphics-blocks.js';
import {decodeSprite,readGameGraphics,validateGraphicsSpec,validateGraphicsSpecs,graphicsPage,sameGraphicsSource} from './rom-graphics.js';
import type {GraphicsSpec,BridgeInfo,BridgeSend} from './types.js';

const info:BridgeInfo={platform:'gba',gameCode:'TEST',crc32:'12345678',sessionId:'a',romSize:0x4000,bridgeVersion:2,capabilities:{inspect:true}};
const spec:GraphicsSpec={tiles:'0x08000100',palette:'0x08000200',width:16,height:16,lz77:false,kind:'sprite',parts:[
  {x:0,y:0,w:8,h:8,tile:0,bank:0},{x:4,y:0,w:8,h:8,tile:1,bank:1,hflip:true}
]};
function source(){
  const bytes=new Uint8Array(0x4000),v=new DataView(bytes.buffer);
  bytes.fill(0x11,0x100,0x120);bytes.fill(0x22,0x120,0x140);bytes[0x100]=0x10;
  v.setUint16(0x202,31,true);v.setUint16(0x224,0x7c00,true);
  v.setUint32(0x40,0x08000100,true);v.setUint32(0x44,0x08000200,true);
  const send:BridgeSend=async(command,params)=>command==='info'?info:{...info,ranges:params!.ranges.map(r=>({...r,base64:Buffer.from(bytes.subarray(r.address-0x08000000,r.address-0x08000000+r.length)).toString('base64')}))};
  return {bytes,v,send};
}
it('reads sprite parts and palette banks coherently and matches layering/transparency',async()=>{
  const {send}=source();let reads=0;
  const result=await readGameGraphics(spec,async(c,p)=>{if(c==='inspect')reads++;return send(c,p);});
  expect(reads).toBe(1);expect([...result.rgba.slice(0,4)]).toEqual([0,0,0,0]);
  expect([...result.rgba.slice(4*4,4*4+4)]).toEqual([248,0,0,255]);
  expect([...result.rgba.slice(8*4,8*4+4)]).toEqual([0,0,248,255]);
  expect(result.spec).toEqual(spec);
});
it('dereferences ROM addresses with offsets and rechecks both pointers with the pixel read',async()=>{
  const {bytes,v,send}=source();v.setUint32(0x40,0x080000e0,true);v.setUint32(0x44,0x080001e0,true);
  const pointer={...spec,tiles:'0x08000040',palette:'0x08000044',tilesIndirect:true,paletteIndirect:true,tilesOffset:32,paletteOffset:32};
  let reads=0;const result=await readGameGraphics(pointer,async(c,p)=>{if(c==='inspect')reads++;return send(c,p);});
  expect(reads).toBe(2);expect(result.rgba).toEqual((await readGameGraphics(spec,send)).rgba);expect(result.spec).toEqual(pointer);
  reads=0;
  await expect(readGameGraphics(pointer,async(c,p)=>{
    if(c==='inspect'&&++reads===2)v.setUint32(0x40,0x080000f0,true);
    return send(c,p);
  })).rejects.toThrow('pointer changed');
  v.setUint32(0x40,0x03000000,true);
  await expect(readGameGraphics(pointer,send)).rejects.toThrow('outside this ROM');
  v.setUint32(0x40,0x08003ff0,true);
  await expect(readGameGraphics({...pointer,tilesOffset:0},send)).rejects.toThrow('ROM size');
  expect(bytes.length).toBe(info.romSize);
});
it('pointer mode also supports sequential LZ77 images without changing saved descriptors',async()=>{
  const {bytes,v,send}=source();const data=[0x10,32,0,0];for(let n=0;n<4;n++)data.push(0,...Array(8).fill(0x11));bytes.set(data,0x300);v.setUint32(0x40,0x08000300,true);
  const p:GraphicsSpec={tiles:'0x08000040',tilesIndirect:true,palette:'0x08000200',width:8,height:8,lz77:true};
  const out=await readGameGraphics(p,send);expect(out.rgba[0]).toBe(248);expect(out.spec).toEqual(p);
  await expect(readGameGraphics(p,send,undefined,8)).rejects.toThrow('direct sequential');
});
it('validates all descriptors before reads, including unsupported compressed sprites and bad parts',async()=>{
  for(const bad of [{...spec,lz77:true},{...spec,parts:[]},{...spec,parts:Array(33).fill(spec.parts![0])},
    {...spec,parts:[{...spec.parts![0],w:24}]},{...spec,parts:[{...spec.parts![0],tile:-1}]},
    {...spec,parts:[{...spec.parts![0],bank:16}]},{...spec,parts:[{...spec.parts![0],hflip:1}]},
    {...spec,tilesIndirect:true,tiles:'0x02000000'},{...spec,tilesOffset:NaN}])expect(()=>validateGraphicsSpec(bad as GraphicsSpec)).toThrow();
  expect(()=>validateGraphicsSpecs({image:{...spec,palette:'0x05000200'}})).toThrow('inspection-only');
  expect(()=>graphicsPage(spec,1)).toThrow('direct');
  expect(sameGraphicsSource(spec,{...spec,parts:spec.parts!.map(p=>({...p,hflip:p.hflip??false,vflip:false}))})).toBe(true);
  expect(sameGraphicsSource(spec,{...spec,parts:[...spec.parts!].reverse()})).toBe(false);
});
it('exports pointer/parts descriptors and executes native-compatible guarded Lua',async()=>{
  const p=createProject('blank');p.manifest.match={gameCode:['TEST']};
  const pointer:GraphicsSpec={...spec,tiles:'0x08000040',palette:'0x08000044',tilesIndirect:true,paletteIndirect:true};
  insertGraphicsBlock(p,p.layout.pages![0].child.id,'image',pointer,info);
  expect(p.manifest.match.crc32).toEqual(['12345678']);
  const round=await importPack(await (await exportPack(p)).arrayBuffer());expect(round.manifest.studioGraphics!.image).toEqual(pointer);
  expect(Object.keys(round.files).some(f=>/\.(png|bin|gba)$/.test(f))).toBe(false);
  const lua=await new LuaFactory(createRequire(import.meta.url).resolve('wasmoon/dist/glue.wasm')).createEngine();
  try{
    const code=computedLua(round.manifest);
    const result=await lua.doString(`
      local calls=0;local target=0x08000100
      mem={u32=function(a)if a==0x08000040 then return target else return 0x08000200 end end}
      gfx={sprite=function(c)calls=calls+1;assert(c.tiles==0x08000100 and c.palette==0x08000200);assert(#c.parts==2 and c.parts[2].bank==1 and c.parts[2].hflip);return 'gfx:parts'end}
      ${code}
      assert(update().image=='gfx:parts' and calls==1)
      target=0x02000000;assert(update().image=='' and calls==1)
      target=0x09ffffff;assert(update().image=='' and calls==1)
      return true
    `);
    expect(result).toBe(true);
    const poisoned={...pointer,parts:[{...pointer.parts![0],['injected()']:true}]};
    expect(computedLua({...p.manifest,studioGraphics:{image:poisoned}})).not.toContain('injected');
  }finally{lua.global.close();}
});
it('seeded sprite properties match a separate per-pixel 1D tile oracle for clipping, flips and bank colors',()=>{
  let state=0x31eac553;const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state;};
  for(let run=0;run<100;run++){
    const parts=Array.from({length:1+next()%5},()=>({x:(next()%25)-8,y:(next()%25)-8,w:[8,16,32,64][(next()>>>16)%4],h:[8,16,32,64][(next()>>>16)%4],tile:0,bank:0,hflip:!!(next()>>>31),vflip:!!(next()>>>31)}));
    const tiles=parts.map(p=>Uint8Array.from({length:p.w*p.h/2},()=>next()>>>24)),colors=parts.map(()=>Uint8Array.from({length:32},()=>next()>>>24));
    const s={...spec,parts},out=decodeSprite(s,tiles,colors).rgba;
    for(let y=0;y<16;y++)for(let x=0;x<16;x++){
      let expected=[0,0,0,0];
      for(let n=0;n<parts.length;n++){
        const p=parts[n],dx=x-p.x,dy=y-p.y;if(dx<0||dx>=p.w||dy<0||dy>=p.h)continue;
        const sx=p.hflip?p.w-1-dx:dx,sy=p.vflip?p.h-1-dy:dy;
        const tile=(sy>>3)*(p.w/8)+(sx>>3),b=tiles[n][tile*32+(sy%8)*4+((sx%8)>>1)],index=(b>>(4*(sx%2)))&15;
        if(!index)continue;
        const c=colors[n][index*2]|colors[n][index*2+1]<<8;expected=[(c&31)*8,((c>>5)&31)*8,((c>>10)&31)*8,255];break;
      }
      expect([...out.subarray((y*16+x)*4,(y*16+x)*4+4)]).toEqual(expected);
    }
  }
});
