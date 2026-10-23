/** @typedef {import('./types.js').RamRange} RamRange */
/** Validate every read before it reaches ADB or the native bridge. @param {unknown} value @returns {RamRange[]} */
export function readRanges(value,inspection=false){
  if(!Array.isArray(value)||value.length<1||value.length>64)throw Error('Read requires 1 to 64 memory ranges.');
  let total=0;
  return value.map(range=>{
    if(!range||typeof range!=='object')throw Error('Invalid memory range.');
    const {address,length}=range;
    if(!Number.isSafeInteger(address)||!Number.isSafeInteger(length)||length<1||length>4096)throw Error('Memory ranges require an integer address and 1 to 4096 bytes.');
    const regions=inspection?[[0x02000000,0x02040000],[0x03000000,0x03008000],[0x05000000,0x05000400],[0x06000000,0x06018000],[0x07000000,0x07000400],[0x08000000,0x0A000000]]:[[0x02000000,0x02040000],[0x03000000,0x03008000]];
    if(!regions.some(([start,end])=>address>=start&&address+length<=end))throw Error(inspection?'Address is outside the allowed read-only regions.':'Only EWRAM and IWRAM ranges can be read.');
    total+=length;if(total>65536)throw Error('Requested memory ranges are too large.');
    return {address,length};
  });
}
/** @param {unknown} command @param {unknown} ranges */
export function bridgeCommand(command,ranges){
  if(typeof command!=='string'||!['info','read','capture','data','inspect'].includes(command))throw Error('Lệnh chỉ đọc không hợp lệ.');
  return command==='read'||command==='inspect'?{ranges:readRanges(ranges,command==='inspect')}:{};
}
