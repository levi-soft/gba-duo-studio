import type JSZip from 'jszip';
export const PACK_LIMITS={compressed:128*1024*1024,expanded:256*1024*1024,file:32*1024*1024,entries:10000};
export function safePackPath(value:unknown):asserts value is string {
  if(typeof value!=='string'||!value||value.length>512||/^[\s/\\]|[\\:\x00-\x1f\x7f]/.test(value)||value.split('/').some(part=>!part||part==='.'||part==='..'||['__proto__','prototype','constructor'].includes(part)))throw Error('Unsafe pack-relative path.');
}
export async function boundedZipInput(input:Parameters<JSZip['loadAsync']>[0]){
  const value=await input;
  const length=typeof value==='string'?value.length:'byteLength' in value?value.byteLength:'size' in value?value.size:Array.isArray(value)?value.length:null;
  if(length===null)throw Error('Import ZIP bytes or a file, not an unbounded stream.');
  if(length>PACK_LIMITS.compressed)throw Error('ZIP exceeds the 128 MiB input limit.');
  return value;
}
export interface ReadBudget {used:number;max?:number;fileMax?:number}
/** Bound nested preview data before recursive form/binding rendering. */
export function validatePreviewData(input:unknown){
  const pending:{value:unknown;depth:number}[]=[{value:input,depth:0}];let count=0;
  while(pending.length){
    const {value,depth}=pending.pop()!;
    if(++count>100000||depth>64)throw Error('Preview data exceeds complexity limits.');
    if(value&&typeof value==='object')for(const child of Object.values(value))pending.push({value:child,depth:depth+1});
    else if(value!==null&&!['string','number','boolean','undefined'].includes(typeof value)||typeof value==='number'&&!Number.isFinite(value))throw Error('Preview data must contain JSON values.');
  }
}
/** Stop inflation as soon as the actual output exceeds its budget. */
export function readZipEntry(entry:JSZip.JSZipObject,budget:ReadBudget):Promise<Uint8Array<ArrayBuffer>> {
  return new Promise((resolve,reject)=>{
    // JSZip exposes this documented API but omits it from JSZipObject typings.
    const readable=entry as JSZip.JSZipObject & {internalStream:(type:'uint8array')=>JSZip.JSZipStreamHelper<Uint8Array>};
    const stream=readable.internalStream('uint8array'),chunks:Uint8Array[]=[];let length=0,failed=false;
    stream.on('data',(chunk:Uint8Array)=>{
      if(failed)return;
      length+=chunk.byteLength;budget.used+=chunk.byteLength;
      if(length>(budget.fileMax??PACK_LIMITS.file)||budget.used>(budget.max??PACK_LIMITS.expanded)){
        failed=true;stream.pause();chunks.length=0;reject(Error('ZIP expanded data exceeds the import limit.'));return;
      }
      chunks.push(chunk);
    }).on('error',(error:unknown)=>{failed=true;reject(error);}).on('end',()=>{
      if(failed)return;
      const result=new Uint8Array(length);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength;}resolve(result);
    }).resume();
  });
}
