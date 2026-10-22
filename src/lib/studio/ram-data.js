/** @param {import('./types.js').EncodedRamRange} range */
export function decodeRamRange(range) {
  const {address,length,base64}=range;
  if(!Number.isSafeInteger(address)||!Number.isInteger(length)||length<1)throw Error('Thông tin vùng RAM không hợp lệ.');
  const valid=(address>=0x02000000&&address<0x02040000&&length<=0x02040000-address)||(address>=0x03000000&&address<0x03008000&&length<=0x03008000-address);
  if(!valid)throw Error('Vùng dữ liệu nằm ngoài RAM GBA được hỗ trợ.');
  const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
  if(bytes.length!==length)throw Error('Số byte nhận về không khớp.');
  return {address,bytes};
}
/** @param {Uint8Array} bytes */
export function firstRamValues(bytes) {
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  return {u8:bytes.length?view.getUint8(0):null,u16:bytes.length>=2?view.getUint16(0,true):null,u32:bytes.length>=4?view.getUint32(0,true):null};
}

export const ramRegions=[{name:'EWRAM',start:0x02000000,end:0x02040000},{name:'IWRAM',start:0x03000000,end:0x03008000}];
/** @param {number} byte */
export const asciiByte=(byte)=>byte>=32&&byte<=126?String.fromCharCode(byte):'.';
/** @param {Uint8Array} bytes @param {string} [encoding] */
export function ramText(bytes,encoding='ascii') {
  if(encoding==='ascii')return Array.from(bytes,asciiByte).join('');
  if(!['utf-8','utf-16le'].includes(encoding))throw Error('Bảng mã chưa được hỗ trợ.');
  return new TextDecoder(encoding).decode(bytes).replace(/\0/g,'·');
}
/** @param {number} address @param {number} length @param {number} direction */
export function ramPageAddress(address,length,direction) {
  if(!Number.isInteger(address)||!Number.isInteger(length)||length<1||![-1,1].includes(direction))return null;
  const region=ramRegions.find(r=>address>=r.start&&address<r.end&&length<=r.end-address);
  if(!region)return null;
  const next=Math.max(region.start,Math.min(region.end-length,address+direction*length));
  return next===address?null:next;
}
