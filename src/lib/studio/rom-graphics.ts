import {memoryHex,validateGameInfo} from './memory-values.js';
import {readRanges} from './thor-contract.js';
import type {GraphicsSpec,BridgeInfo,BridgeSend,Manifest,RamRange} from './types.js';

export function graphicsPage(spec:GraphicsSpec,direction:number){
  const source=validateGraphicsSpec(spec);
  if(spec.lz77||![ -1,0,1 ].includes(direction))throw Error('Consecutive image browsing requires uncompressed tiles and a valid direction.');
  const count=Math.min(16,Math.floor(256/spec.height));
  const tiles=source.tiles+direction*source.size*count;
  const next={...spec,tiles:'0x'+tiles.toString(16).toUpperCase()};
  validateGraphicsSpec({...next,height:spec.height*count});
  if(Math.floor(tiles/0x01000000)!==Math.floor(source.tiles/0x01000000))throw Error('Image page crosses a memory region.');
  return {spec:next,count};
}
export function graphicsPalette(spec:GraphicsSpec,direction:number){
  const source=validateGraphicsSpec(spec);
  if(![-1,1].includes(direction))throw Error('Invalid palette direction.');
  const palette=source.palette+32*direction;
  const next={...spec,palette:'0x'+palette.toString(16).toUpperCase()};
  validateGraphicsSpec(next);
  if(Math.floor(palette/0x01000000)!==Math.floor(source.palette/0x01000000))throw Error('Palette crosses a memory region.');
  return next;
}

export function validateGraphicsSpec(spec:GraphicsSpec){
  if(!spec||typeof spec!=='object'||!Number.isInteger(spec.width)||!Number.isInteger(spec.height)||
    spec.width<8||spec.height<8||spec.width>256||spec.height>256||spec.width%8||spec.height%8||typeof spec.lz77!=='boolean')throw Error('Graphics dimensions must be multiples of 8, from 8 to 256.');
  const tiles=memoryHex(spec.tiles),palette=memoryHex(spec.palette),size=spec.width*spec.height/2;
  readRanges([{address:tiles,length:Math.min(spec.lz77?4:size,4096)},{address:palette,length:32}],true);
  // Validate the full tile extent, even when split into wire-sized chunks later.
  if(!spec.lz77)for(let offset=0;offset<size;offset+=4096)readRanges([{address:tiles+offset,length:Math.min(4096,size-offset)}],true);
  if(spec.lz77&&(tiles<0x08000000||tiles>=0x0A000000))throw Error('Compressed tiles must come from ROM.');
  return {tiles,palette,size};
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
  const aa=validateGraphicsSpec(a),bb=validateGraphicsSpec(b);
  return aa.tiles===bb.tiles&&aa.palette===bb.palette&&a.width===b.width&&a.height===b.height&&a.lz77===b.lz77;
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
export function graphicsLua(manifest:Manifest){
  validateGraphicsSpecs(manifest.studioGraphics);
  return Object.entries(manifest.studioGraphics??{}).map(([key,spec])=>{
    if(Object.hasOwn(manifest.values??{},key)||Object.hasOwn(manifest.studioComputed??{},key))throw Error('Graphics block conflicts with a numeric/computed field: '+key);
    const {tiles,palette}=validateGraphicsSpec(spec);
    return `do local ok,image=pcall(gfx.decode,{tiles=${tiles},palette=${palette},width=${spec.width},height=${spec.height},bpp=4,lz77=${spec.lz77}}) v[${JSON.stringify(key)}]=ok and image or "" end`;
  });
}
function identity(info:BridgeInfo){return JSON.stringify([info.deviceSerial,info.sessionId,info.gameCode,info.crc32]);}
export async function readGameGraphics(spec:GraphicsSpec,send:BridgeSend,manifest?:Manifest,paletteCount=1){
  if(!Number.isInteger(paletteCount)||paletteCount<1||paletteCount>16)throw Error('Choose between 1 and 16 palettes.');
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
  const inputLength=spec.lz77?Math.min(65536-32*paletteCount,romEnd-config.tiles):config.size;
  if(inputLength<4)throw Error('Incomplete tile data.');
  const [source,palette]=await inspect([{address:config.tiles,length:inputLength},{address:config.palette,length:32*paletteCount}]);
  const tiles=spec.lz77?decompressLz77(source,config.size):source;
  const variants=Array.from({length:paletteCount},(_,index)=>({
    ...decode4bpp(tiles,palette.subarray(index*32,index*32+32),spec.width,spec.height),
    spec:{...spec,palette:'0x'+(config.palette+index*32).toString(16).toUpperCase()}
  }));
  return {...variants[0],info,variants};
}
