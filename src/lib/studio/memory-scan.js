import {decodeMemoryValue, memoryTypes, validateMemorySpecs, validateGameInfo} from './memory-values.js';
import {decodeRamRange} from './ram-data.js';
/** @typedef {import('./types.js').MemoryType} MemoryType */
/** @typedef {{address:number,bytes:Uint8Array}} Sample */
/** @typedef {{type:MemoryType,ranges:Sample[],candidates:number[],identity:string}} Scan */
/** @param {import('./types.js').BridgeInfo} info */
export function scanIdentity(info) {
  if (!info.sessionId || !info.gameCode || !info.crc32) throw Error('A connected game session is required.');
  return JSON.stringify([info.deviceSerial??'',info.sessionId,info.gameCode,info.crc32]);
}
/** @param {import('./types.js').BridgeInfo} packet @param {string} region */
export function scanSamples(packet, region) {
  const ranges=(packet.ranges??[]).map(decodeRamRange).filter(r=>region==='all'||(region==='ewram'?r.address===0x02000000:r.address===0x03000000));
  if (!ranges.length || ranges.reduce((sum,r)=>sum+r.bytes.length,0)>0x48000) throw Error('Missing or oversized RAM capture.');
  const sorted=[...ranges].sort((a,b)=>a.address-b.address);
  for(let i=1;i<sorted.length;i++)if(sorted[i].address<sorted[i-1].address+sorted[i-1].bytes.length)throw Error('Overlapping RAM ranges.');
  return sorted;
}
/** @param {Sample[]} ranges @param {number} address @param {MemoryType} type */
export function scanValue(ranges,address,type){
  const size=memoryTypes[type],range=ranges.find(r=>address>=r.address&&address+size<=r.address+r.bytes.length);
  if(!range)throw Error('RAM capture does not cover this candidate.');
  return decodeMemoryValue(range.bytes.subarray(address-range.address,address-range.address+size),{type});
}
/** @param {Sample[]} ranges @param {MemoryType} type @param {string} identity @param {number|null} [exact] @returns {Scan} */
export function startScan(ranges,type,identity,exact=null){
  if(!Object.hasOwn(memoryTypes,type))throw Error('Unsupported memory type.');
  const size=memoryTypes[type],candidates=[];
  for(const range of ranges)for(let offset=(size-range.address%size)%size;offset+size<=range.bytes.length;offset+=size){
    const address=range.address+offset;
    if(exact===null||scanValue([range],address,type)===exact)candidates.push(address);
  }
  return {type,ranges,candidates,identity};
}
/** @param {Scan} previous @param {Sample[]} ranges @param {string} identity @param {string} comparison @param {number|null} [exact] @returns {Scan} */
export function refineScan(previous,ranges,identity,comparison,exact=null){
  if(previous.identity!==identity)throw Error('Game session changed. Start a new scan.');
  if(!['equal','changed','unchanged','increased','decreased'].includes(comparison))throw Error('Unsupported comparison.');
  if(comparison==='equal'&&(exact===null||!Number.isFinite(exact)))throw Error('Enter a numeric value.');
  const candidates=previous.candidates.filter(address=>{
    const before=scanValue(previous.ranges,address,previous.type),after=scanValue(ranges,address,previous.type);
    return comparison==='equal'?after===exact:comparison==='changed'?after!==before:comparison==='unchanged'?after===before:comparison==='increased'?after>before:after<before;
  });
  return {...previous,ranges,candidates};
}
/** @param {import('./types.js').Project} project @param {import('./types.js').BridgeInfo} info @param {string} name @param {number} address @param {MemoryType} type @param {number} value */
export function registerMemoryBlock(project,info,name,address,type,value){
  if(project.manifest.script)throw Error('Use a new project for RAM blocks; the existing custom script is preserved.');
  if(project.manifest.match?.gameCode?.length)validateGameInfo(project.manifest,info);
  else if(!info.gameCode||!info.crc32)throw Error('Connect a game before saving a block.');
  if(Object.hasOwn(project.manifest.values??{},name))throw Error('This field name already exists.');
  const values={...project.manifest.values,[name]:{addr:'0x'+address.toString(16).toUpperCase(),type}};
  validateMemorySpecs(values);
  project.manifest.values=values;
  if(!project.manifest.match?.gameCode?.length)project.manifest.match={gameCode:[info.gameCode],crc32:[info.crc32??'']};
  Object.defineProperty(project.data,name,{value,enumerable:true,writable:true,configurable:true});
}
