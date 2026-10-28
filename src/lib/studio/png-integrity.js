// Browsers may decode PNGs with damaged chunk CRCs that Android rejects.
// This checks the container only; image decoding still belongs to the preview.
const crcTable=Uint32Array.from({length:256},(_,index)=>{
  let value=index;for(let bit=0;bit<8;bit++)value=value&1?0xedb88320^(value>>>1):value>>>1;return value>>>0;
});
/** @param {string} base64 @returns {boolean} */
export function validPngContainer(base64){
  let bytes;try{bytes=atob(base64);}catch{return false;}
  if(bytes.length<45||![137,80,78,71,13,10,26,10].every((b,i)=>bytes.charCodeAt(i)===b))return false;
  /** @param {number} offset */
  const u32=offset=>((bytes.charCodeAt(offset)<<24)|(bytes.charCodeAt(offset+1)<<16)|(bytes.charCodeAt(offset+2)<<8)|bytes.charCodeAt(offset+3))>>>0;
  let offset=8,header=false,pixels=false;
  while(offset+12<=bytes.length){
    const size=u32(offset),end=offset+12+size,type=bytes.slice(offset+4,offset+8);
    if(end>bytes.length||!Number.isSafeInteger(end)||!/^[A-Za-z]{4}$/.test(type))return false;
    let crc=0xffffffff;for(let i=offset+4;i<end-4;i++)crc=crcTable[(crc^bytes.charCodeAt(i))&255]^(crc>>>8);
    if(((crc^0xffffffff)>>>0)!==u32(end-4))return false;
    if(!header){if(type!=='IHDR'||size!==13||!u32(offset+8)||!u32(offset+12))return false;header=true;}
    else if(type==='IHDR')return false;
    if(type==='IDAT')pixels=true;
    if(type==='IEND')return size===0&&pixels&&end===bytes.length;
    offset=end;
  }
  return false;
}
