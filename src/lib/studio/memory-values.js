import {decodeRamRange,ramRegions} from './ram-data.js';
import {applyComputedValues} from './computed-values.js';
/** @typedef {import('./types.js').MemorySpec} MemorySpec */
/** @typedef {import('./types.js').Manifest} Manifest */
/** @typedef {import('./types.js').BridgeInfo} BridgeInfo */
export const memoryTypes={u8:1,s8:1,u16:2,s16:2,u32:4,s32:4};
/** @param {string} value */
export function memoryHex(value){
  if(typeof value!=='string'||! /^(?:0x)?[0-9a-f]+$/i.test(value))throw Error('Enter a hexadecimal address.');
  const n=Number.parseInt(value.replace(/^0x/i,''),16);
  if(!Number.isSafeInteger(n)||n<0||n>0xFFFFFFFF)throw Error('Address must fit in 32 bits.');
  return n;
}
/** @param {number} address @param {number} length */
function ensureRam(address,length){
  if(!ramRegions.some(region=>address>=region.start&&address<region.end&&length<=region.end-address))throw Error('Address is outside supported game RAM.');
}
/** @param {Record<string,MemorySpec>} [specs] */
export function validateMemorySpecs(specs={}){
  if(!specs||typeof specs!=='object'||Array.isArray(specs))throw Error('Memory fields must be an object.');
  for(const[name,spec]of Object.entries(specs)){
    if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)||['__proto__','constructor','prototype'].includes(name))throw Error('Invalid memory field name.');
    if(!spec||!Object.hasOwn(memoryTypes,spec.type))throw Error('Unsupported memory field type.');
    if(Boolean(spec.addr)===Boolean(spec.ptr))throw Error('Choose a direct address or pointer.');
    if(spec.addr)ensureRam(memoryHex(spec.addr),memoryTypes[spec.type]);
    if(spec.ptr)ensureRam(memoryHex(spec.ptr),4);
    if(spec.offset!=null&&(!Number.isSafeInteger(spec.offset)||Math.abs(spec.offset)>0x40000))throw Error('Invalid pointer offset.');
    if(spec.mask!=null)memoryHex(spec.mask);
    if(spec.shift!=null&&(!Number.isInteger(spec.shift)||spec.shift<0||spec.shift>31))throw Error('Shift must be between 0 and 31.');
  }
}
/** @param {Uint8Array} bytes @param {MemorySpec} spec */
export function decodeMemoryValue(bytes,spec){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let value=({u8:()=>view.getUint8(0),s8:()=>view.getInt8(0),u16:()=>view.getUint16(0,true),s16:()=>view.getInt16(0,true),u32:()=>view.getUint32(0,true),s32:()=>view.getInt32(0,true)})[spec.type]();
  if(spec.mask!=null)value=(value&memoryHex(spec.mask))>>>0;
  if(spec.shift)value=Number(BigInt.asUintN(64,BigInt(value))>>BigInt(spec.shift));
  return value;
}
/** @param {Manifest} manifest @param {BridgeInfo} info */
export function validateGameInfo(manifest,info){
  const codes=manifest.match?.gameCode??[];
  /** @param {string} message */
  const mismatch=message=>{throw Object.assign(Error(message),{identityMismatch:true});};
  if(!codes.length)throw Error('Set the project game code before using live data.');
  if(!codes.includes(info.gameCode))mismatch('The running game does not match this project.');
  const crcs=manifest.match?.crc32??[];
  if(crcs.length&&!crcs.some(crc=>memoryHex(crc)===memoryHex(info.crc32??'')))mismatch('ROM CRC32 does not match the project filter.');
}
/** @param {Manifest} manifest @param {import('./types.js').BridgeSend} send @param {object} [context] */
export async function readMemoryValues(manifest,send,context={}){
  validateMemorySpecs(manifest.values??{});
  const info=await send('info');validateGameInfo(manifest,info);
  if(manifest.script){
    const packet=await send('data');validateGameInfo(manifest,packet);
    if(packet.sessionId!==info.sessionId)throw Error('Game session changed during the read.');
    if(packet.packId!==manifest.id)throw Object.assign(Error('Assign this companion to the game in GBA Duo Plus to preview its runtime script data.'),{identityMismatch:true});
    if(!packet.data||typeof packet.data!=='object'||Array.isArray(packet.data))throw Error('Waiting for companion runtime data.');
    return {values:packet.data,info:packet};
  }
  const fields=Object.entries(manifest.values??{});
  /** @type {import('./types.js').DataValues} */
  const values={};
  let latest=info;
  /** @param {import('./types.js').RamRange[]} ranges */
  async function read(ranges){
    const packet=await send('read',{ranges});validateGameInfo(manifest,packet);
    if(packet.sessionId!==info.sessionId)throw Error('Game session changed during the read.');
    if(!packet.ranges||packet.ranges.length!==ranges.length)throw Error('Memory response does not match the request.');
    latest=packet;
    return packet.ranges.map((range,index)=>{
      if(range.address!==ranges[index].address||range.length!==ranges[index].length)throw Error('Memory response address mismatch.');
      return decodeRamRange(range).bytes;
    });
  }
  for(let i=0;i<fields.length;i+=24){
    const group=fields.slice(i,i+24),pointers=[...new Set(group.filter(([,spec])=>spec.ptr).map(([,spec])=>memoryHex(spec.ptr??'')))];
    const pointerRanges=pointers.map(address=>({address,length:4}));
    const first=pointers.length?await read(pointerRanges):[];
    const addresses=new Map(pointers.map((address,index)=>[address,new DataView(first[index].buffer,first[index].byteOffset,4).getUint32(0,true)]));
    const ranges=group.map(([,spec])=>{
      const pointer=addresses.get(memoryHex(spec.ptr??spec.addr??''));
      if(!spec.addr&&pointer===undefined)throw Error('Missing pointer response.');
      const address=spec.addr?memoryHex(spec.addr):(pointer??0)+(spec.offset??0);
      ensureRam(address,memoryTypes[spec.type]);return {address,length:memoryTypes[spec.type]};
    });
    const result=await read([...ranges,...pointerRanges]);
    for(let n=0;n<first.length;n++)if(first[n].some((byte,j)=>byte!==result[group.length+n][j]))throw Error('Pointer changed during the read; waiting for a stable snapshot.');
    group.forEach(([name,spec],index)=>Object.defineProperty(values,name,{value:decodeMemoryValue(result[index],spec),enumerable:true}));
  }
  return {values:applyComputedValues(values,manifest.studioComputed),info:latest};
}
