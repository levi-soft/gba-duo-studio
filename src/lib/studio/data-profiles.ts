import {validateMemorySpecs} from './memory-values.js';
/** @param {string} text */
export function parseDataProfile(text:string){
  if(text.length>256*1024)throw Error('Data profile is too large.');
  const value=JSON.parse(text);
  if(!value||value.profileVersion!==1||typeof value.name!=='string'||!value.name.trim()||value.name.length>160)throw Error('Invalid data profile.');
  if(!value.match||!Array.isArray(value.match.gameCode)||!value.match.gameCode.length||value.match.gameCode.some((code:unknown)=>typeof code!=='string'||!/^\w{4}$/.test(code)))throw Error('Profile needs valid game codes.');
  if(value.match.crc32!==undefined&&(!Array.isArray(value.match.crc32)||value.match.crc32.some((crc:unknown)=>typeof crc!=='string'||!/^[0-9a-f]{8}$/i.test(crc))))throw Error('Invalid profile CRC32.');
  if(!value.values||Object.keys(value.values).length<1||Object.keys(value.values).length>256)throw Error('A profile needs 1 to 256 fields.');
  validateMemorySpecs(value.values);
  // Explicit projection: do not import scripts, captures or assets from a profile.
  const values:Record<string,import('./types.js').MemorySpec>={};
  for(const [key,spec]of Object.entries(value.values) as [string,import('./types.js').MemorySpec][]){
    values[key]={type:spec.type,...(spec.addr?{addr:spec.addr}:{ptr:spec.ptr,offset:spec.offset??0}),...(spec.mask!=null?{mask:spec.mask}:{}),...(spec.shift!=null?{shift:spec.shift}:{})};
  }
  return {profileVersion:1,name:value.name.trim() as string,match:{gameCode:[...value.match.gameCode] as string[],crc32:[...(value.match.crc32??[])] as string[]},values};
}
/** @param {import('./types.js').Project} project @param {ReturnType<typeof parseDataProfile>} profile */
export function applyDataProfile(project:import('./types.js').Project,profile:ReturnType<typeof parseDataProfile>){
  if(project.manifest.script)throw Error('Use a project without a custom Lua script to import data blocks.');
  const existing=project.manifest.match;
  if(existing?.gameCode?.length&&JSON.stringify([...existing.gameCode].sort())!==JSON.stringify([...profile.match.gameCode].sort()))throw Error('Profile game does not match the project.');
  if(existing?.crc32?.length&&JSON.stringify(existing.crc32.map(v=>v.toUpperCase()).sort())!==JSON.stringify(profile.match.crc32.map(v=>v.toUpperCase()).sort()))throw Error('Profile ROM versions do not match the project.');
  for(const key of Object.keys(profile.values))if(Object.hasOwn(project.manifest.values??{},key))throw Error('A block with this key already exists: '+key);
  project.manifest.values={...project.manifest.values,...profile.values};
  project.manifest.match={...profile.match};
  for(const key of Object.keys(profile.values))Object.defineProperty(project.data,key,{value:0,enumerable:true,writable:true,configurable:true});
}
