import {memoryHex,validateGameInfo} from './memory-values.js';
import {readRanges} from './thor-contract.js';
import type {GraphicsSpec,GraphicsPart,BridgeInfo,BridgeSend,Manifest,RamRange} from './types.js';

export function complexGraphics(spec:GraphicsSpec){return spec.kind==='sprite'||spec.tilesIndirect===true||spec.paletteIndirect===true;}
function sourceAddress(spec:GraphicsSpec,field:'tiles'|'palette'){
  const indirect=spec[`${field}Indirect`]??false,offset=spec[`${field}Offset`]??0;
  if(typeof indirect!=='boolean'||!Number.isSafeInteger(offset)||Math.abs(offset)>0x02000000)throw Error('Invalid graphics pointer or offset.');
  const location=memoryHex(spec[field]),address=location+(indirect?0:offset);
  readRanges([{address,length:indirect?4:field==='palette'?32:4}],true);
  if(indirect&&(location<0x08000000||location+4>0x0A000000))throw Error('Graphics pointer locations must be in ROM.');
  return {location,address,indirect,offset};
}
function partList(spec:GraphicsSpec):GraphicsPart[]{
  if(spec.kind!=='sprite'){if(spec.parts!==undefined)throw Error('Parts require sprite mode.');return [];}
  if(spec.lz77)throw Error('Native gfx.sprite requires uncompressed tiles.');
  if(!Array.isArray(spec.parts)||spec.parts.length<1||spec.parts.length>32)throw Error('A sprite needs 1 to 32 parts.');
  return spec.parts.map(p=>{
    if(!p||![p.x,p.y,p.w,p.h,p.tile,p.bank].every(Number.isSafeInteger)||
      ![8,16,32,64].includes(p.w)||![8,16,32,64].includes(p.h)||p.x< -64||p.x>256||p.y< -64||p.y>256||
      p.tile<0||p.tile>65535||p.bank<0||p.bank>15||
      (p.hflip!==undefined&&typeof p.hflip!=='boolean')||(p.vflip!==undefined&&typeof p.vflip!=='boolean'))throw Error('Invalid sprite part (size 8/16/32/64, tile 0–65535, bank 0–15).');
    return {x:p.x,y:p.y,w:p.w,h:p.h,tile:p.tile,bank:p.bank,hflip:p.hflip??false,vflip:p.vflip??false};
  });
}
function sourceSegments(spec:GraphicsSpec,tiles:number,palette:number){
  return spec.kind==='sprite'?partList(spec).flatMap(p=>[
    {address:tiles+p.tile*32,length:p.w*p.h/2},{address:palette+p.bank*32,length:32}
  ]):[{address:tiles,length:spec.width*spec.height/2},{address:palette,length:32}];
}
function validateResolved(spec:GraphicsSpec,tiles:number,palette:number){
  for(const range of sourceSegments(spec,tiles,palette)){
    const length=spec.lz77&&range.address===tiles?4:range.length;
    for(let offset=0;offset<length;offset+=4096)readRanges([{address:range.address+offset,length:Math.min(4096,length-offset)}],true);
  }
  if(spec.lz77&&(tiles<0x08000000||tiles>=0x0A000000))throw Error('Compressed tiles must come from ROM.');
}

export function graphicsPage(spec:GraphicsSpec,direction:number){
  const source=validateGraphicsSpec(spec);
  if(spec.lz77||complexGraphics(spec)||![ -1,0,1 ].includes(direction))throw Error('Consecutive image browsing requires direct uncompressed tiles and a valid direction.');
  const count=Math.min(16,Math.floor(256/spec.height));
  const tiles=source.tiles+direction*source.size*count;
  const next={...spec,tiles:'0x'+tiles.toString(16).toUpperCase(),tilesOffset:undefined};
  validateGraphicsSpec({...next,height:spec.height*count});
  if(Math.floor(tiles/0x01000000)!==Math.floor(source.tiles/0x01000000))throw Error('Image page crosses a memory region.');
  return {spec:next,count};
}
export function graphicsPalette(spec:GraphicsSpec,direction:number){
  const source=validateGraphicsSpec(spec);
  if(complexGraphics(spec)||![-1,1].includes(direction))throw Error('Palette paging requires a direct tile image.');
  const palette=source.palette+32*direction;
  const next={...spec,palette:'0x'+palette.toString(16).toUpperCase(),paletteOffset:undefined};
  validateGraphicsSpec(next);
  if(Math.floor(palette/0x01000000)!==Math.floor(source.palette/0x01000000))throw Error('Palette crosses a memory region.');
  return next;
}

export function validateGraphicsSpec(spec:GraphicsSpec){
  if(!spec||typeof spec!=='object'||!Number.isInteger(spec.width)||!Number.isInteger(spec.height)||
    spec.width<8||spec.height<8||spec.width>256||spec.height>256||spec.width%8||spec.height%8||typeof spec.lz77!=='boolean')throw Error('Graphics dimensions must be multiples of 8, from 8 to 256.');
  if(spec.kind!==undefined&&!['tiles','sprite'].includes(spec.kind))throw Error('Unsupported graphics mode.');
  partList(spec);
  const t=sourceAddress(spec,'tiles'),p=sourceAddress(spec,'palette'),size=spec.width*spec.height/2;
  // Validate known extents now; unresolved targets are checked after dereferencing.
  validateResolved(spec,t.indirect?0x08000000:t.address,p.indirect?0x08000000:p.address);
  return {tiles:t.address,palette:p.address,size,tileSource:t,paletteSource:p};
}
export function validateGraphicsSpecs(specs:Record<string,GraphicsSpec>={}){
  if(!specs||typeof specs!=='object'||Array.isArray(specs)||Object.keys(specs).length>32)throw Error('Too many ROM image blocks.');
  let pixels=0;
  for(const[key,spec]of Object.entries(specs)){
    if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)||['__proto__','constructor','prototype'].includes(key))throw Error('Invalid graphics block key.');
    const source=validateGraphicsSpec(spec);
    if(source.tiles<0x08000000||source.palette<0x08000000)throw Error('Exported image blocks currently require ROM tiles and a ROM palette; VRAM is inspection-only.');
    pixels+=spec.width*spec.height;
  }
  if(pixels>262144)throw Error('ROM image blocks exceed the per-project pixel budget.');
}
export function sameGraphicsSource(a:GraphicsSpec,b:GraphicsSpec){
  const canonical=(s:GraphicsSpec)=>{const c=validateGraphicsSpec(s);return [c.tileSource,c.paletteSource,s.width,s.height,s.lz77,s.kind??'tiles',partList(s)];};
  return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
}
export function decompressLz77(bytes:Uint8Array,minimum:number){
  if(bytes.length<4||bytes[0]!==0x10)throw Error('Not a GBA LZ77 block.');
  const size=bytes[1]|bytes[2]<<8|bytes[3]<<16;
  if(size<minimum||size>1048576)throw Error('Invalid LZ77 output size.');
  const output=new Uint8Array(size);let source=4,target=0;
  while(target<size){
    if(source>=bytes.length)throw Error('Truncated LZ77 data.');
    const flags=bytes[source++];
    for(let bit=7;bit>=0&&target<size;bit--){
      if(flags&(1<<bit)){
        if(source+2>bytes.length)throw Error('Truncated LZ77 reference.');
        const a=bytes[source++],b=bytes[source++],count=(a>>4)+3,distance=((a&15)<<8|b)+1;
        if(distance>target)throw Error('Invalid LZ77 back-reference.');
        for(let i=0;i<count&&target<size;i++,target++)output[target]=output[target-distance];
      }else{
        if(source>=bytes.length)throw Error('Truncated LZ77 literal.');
        output[target++]=bytes[source++];
      }
    }
  }
  return output;
}
export function decode4bpp(tiles:Uint8Array,palette:Uint8Array,width:number,height:number){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<8||height<8||width>256||height>256||width%8||height%8||tiles.length<width*height/2||palette.length<32)throw Error('Incomplete 4bpp image.');
  const rgba=new Uint8ClampedArray(width*height*4),colors=new DataView(palette.buffer,palette.byteOffset,palette.byteLength);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const tile=Math.floor(y/8)*(width/8)+Math.floor(x/8),offset=tile*32+(y%8)*4+Math.floor((x%8)/2);
    const index=(tiles[offset]>>((x%2)*4))&15,color=colors.getUint16(index*2,true),p=(y*width+x)*4;
    const r=color&31,g=color>>5&31,b=color>>10&31;
    // Match native script.c's gba_argb exactly (5-bit channels shifted by 3).
    rgba[p]=r<<3;rgba[p+1]=g<<3;rgba[p+2]=b<<3;rgba[p+3]=index===0?0:255;
  }
  return {width,height,rgba};
}
/** Match native gfx.sprite: 1D tile mapping, clipping and first opaque part wins. */
export function decodeSprite(spec:GraphicsSpec,tileData:Uint8Array[],palettes:Uint8Array[]){
  validateGraphicsSpec(spec);const parts=partList(spec);
  if(spec.kind!=='sprite'||tileData.length!==parts.length||palettes.length!==parts.length)throw Error('Incomplete sprite sources.');
  const rgba=new Uint8ClampedArray(spec.width*spec.height*4);
  for(const [index,p]of parts.entries()){
    const image=decode4bpp(tileData[index],palettes[index],p.w,p.h);
    for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++){
      const dx=p.x+(p.hflip?p.w-1-x:x),dy=p.y+(p.vflip?p.h-1-y:y),source=(y*p.w+x)*4;
      if(dx<0||dy<0||dx>=spec.width||dy>=spec.height||!image.rgba[source+3])continue;
      const target=(dy*spec.width+dx)*4;
      if(!rgba[target+3])rgba.set(image.rgba.subarray(source,source+4),target);
    }
  }
  return {width:spec.width,height:spec.height,rgba};
}
export function graphicsLua(manifest:Manifest){
  validateGraphicsSpecs(manifest.studioGraphics);
  return Object.entries(manifest.studioGraphics??{}).map(([key,spec])=>{
    if(Object.hasOwn(manifest.values??{},key)||Object.hasOwn(manifest.studioComputed??{},key))throw Error('Graphics block conflicts with a numeric/computed field: '+key);
    const c=validateGraphicsSpec(spec);
    const address=(s:typeof c.tileSource)=>s.indirect?`(mem.u32(${s.location})+${s.offset})`:String(s.address);
    const parts=partList(spec);
    const tileExtent=parts.length?Math.max(...parts.map(p=>p.tile*32+p.w*p.h/2)):spec.lz77?4:c.size;
    const paletteExtent=parts.length?32*(Math.max(...parts.map(p=>p.bank))+1):32;
    const args=spec.kind==='sprite'?`parts={${parts.map(p=>'{'+Object.entries(p).map(([k,v])=>k+'='+v).join(',')+'}').join(',')}}`:`bpp=4,lz77=${spec.lz77}`;
    return `do local ok,image=pcall(function() local t=${address(c.tileSource)} local p=${address(c.paletteSource)} if t<134217728 or t+${tileExtent}>167772160 or p<134217728 or p+${paletteExtent}>167772160 then return "" end return gfx.${spec.kind==='sprite'?'sprite':'decode'}{tiles=t,palette=p,width=${spec.width},height=${spec.height},${args}} end) v[${JSON.stringify(key)}]=ok and image or "" end`;
  });
}
function identity(info:BridgeInfo){return JSON.stringify([info.deviceSerial,info.sessionId,info.gameCode,info.crc32]);}
export async function readGameGraphics(spec:GraphicsSpec,send:BridgeSend,manifest?:Manifest,paletteCount=1){
  if(!Number.isInteger(paletteCount)||paletteCount<1||paletteCount>16)throw Error('Choose between 1 and 16 palettes.');
  if(paletteCount!==1&&complexGraphics(spec))throw Error('Palette comparison requires a direct sequential tile image.');
  const config=validateGraphicsSpec(spec),info=await send('info');
  if(info.platform!=='gba'||!info.capabilities?.inspect||!Number.isInteger(info.romSize)||(info.romSize??0)<1||(info.romSize??0)>0x02000000||!info.sessionId)throw Error('Update GBA Duo Plus to a build with ROM/graphics inspection and enable Studio Connection.');
  if(manifest?.match?.gameCode?.length)validateGameInfo(manifest,info);
  const romEnd=0x08000000+(info.romSize??0);
  async function inspect(segments:RamRange[]){
    const ranges:RamRange[]=[];
    for(const segment of segments){
      if(segment.address>=0x08000000&&(segment.address>=romEnd||segment.length>romEnd-segment.address))throw Error('Image data exceeds the actual ROM size.');
      for(let offset=0;offset<segment.length;offset+=4096)ranges.push({address:segment.address+offset,length:Math.min(4096,segment.length-offset)});
    }
    readRanges(ranges,true);
    const packet=await send('inspect',{ranges});
    if(identity(packet)!==identity(info))throw Error('Game session changed while reading graphics.');
    if(!packet.ranges||packet.ranges.length!==ranges.length)throw Error('Incomplete inspection response.');
    const chunks=packet.ranges.map((range,index)=>{
      if(range.address!==ranges[index].address||range.length!==ranges[index].length)throw Error('Inspection response does not match the request.');
      const bytes=Uint8Array.from(atob(range.base64),c=>c.charCodeAt(0));
      if(bytes.length!==range.length)throw Error('Incomplete inspection bytes.');return bytes;
    });
    let index=0;
    return segments.map(segment=>{
      const output=new Uint8Array(segment.length);for(let offset=0;offset<segment.length;offset+=4096)output.set(chunks[index++],offset);return output;
    });
  }
  const pointerSources=[config.tileSource,config.paletteSource].filter(s=>s.indirect);
  const pointerRanges=pointerSources.map(s=>({address:s.location,length:4}));
  const pointerBytes=pointerRanges.length?await inspect(pointerRanges):[];
  let pointerIndex=0;
  function resolve(s:typeof config.tileSource){
    if(!s.indirect)return s.address;
    const bytes=pointerBytes[pointerIndex++],address=new DataView(bytes.buffer,bytes.byteOffset,4).getUint32(0,true)+s.offset;
    if(address<0x08000000||address>=romEnd)throw Error('Graphics pointer target is outside this ROM.');
    return address;
  }
  const tilesAddress=resolve(config.tileSource),paletteAddress=resolve(config.paletteSource);
  validateResolved(spec,tilesAddress,paletteAddress);
  if(spec.kind==='sprite'){
    const segments=sourceSegments(spec,tilesAddress,paletteAddress);
    // Merge repeated/overlapping part sources, then fetch one coherent snapshot.
    const merged:RamRange[]=[];
    for(const r of [...segments].sort((a,b)=>a.address-b.address)){
      const last=merged.at(-1);
      if(last&&r.address<=last.address+last.length)last.length=Math.max(last.address+last.length,r.address+r.length)-last.address;
      else merged.push({...r});
    }
    const chunks=await inspect([...merged,...pointerRanges]);
    pointerBytes.forEach((bytes,i)=>{if(bytes.some((b,j)=>b!==chunks[merged.length+i][j]))throw Error('Graphics pointer changed during inspection. Preview again.');});
    const read=(r:RamRange)=>{const i=merged.findIndex(m=>r.address>=m.address&&r.address+r.length<=m.address+m.length);return chunks[i].subarray(r.address-merged[i].address,r.address-merged[i].address+r.length);};
    const parts=partList(spec),image=decodeSprite(spec,parts.map((_,i)=>read(segments[i*2])),parts.map((_,i)=>read(segments[i*2+1])));
    const variant={...image,spec:{...spec}};
    return {...variant,info,variants:[variant]};
  }
  const inputLength=spec.lz77?Math.min(65536-32*paletteCount-pointerRanges.length*4,romEnd-tilesAddress):config.size;
  if(inputLength<4)throw Error('Incomplete tile data.');
  const chunks=await inspect([{address:tilesAddress,length:inputLength},{address:paletteAddress,length:32*paletteCount},...pointerRanges]);
  pointerBytes.forEach((bytes,i)=>{if(bytes.some((b,j)=>b!==chunks[2+i][j]))throw Error('Graphics pointer changed during inspection. Preview again.');});
  const [source,palette]=chunks;
  const tiles=spec.lz77?decompressLz77(source,config.size):source;
  const variants=Array.from({length:paletteCount},(_,index)=>({
    ...decode4bpp(tiles,palette.subarray(index*32,index*32+32),spec.width,spec.height),
    spec:paletteCount===1?{...spec}:{...spec,palette:'0x'+(paletteAddress+index*32).toString(16).toUpperCase(),paletteOffset:undefined}
  }));
  return {...variants[0],info,variants};
}
