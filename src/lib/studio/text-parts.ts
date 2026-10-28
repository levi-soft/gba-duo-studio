import {walk} from './tree.js';
import type {Project} from './types.js';

const MAX_TEXT=16384,MAX_TOKENS=32;
export interface TextParts {supported:boolean;original:string;tokens:string[];literals:string[]}
export interface TextPartsRequest {original:string;literals:string[]}
type EditCode='unsupported'|'shape'|'bindings'|'length'|'stale'|'component';
class TextPartsError extends Error {constructor(public code:EditCode){super(code);}}

/** Use exactly the native interpolation syntax. Tokens include their original braces. */
export function textParts(value:unknown):TextParts{
  const unsupported:TextParts={supported:false,original:typeof value==='string'?value:'',tokens:[],literals:[]};
  if(typeof value!=='string'||value.length>MAX_TEXT)return unsupported;
  const tokens:string[]=[],literals:string[]=[];let end=0;
  for(const match of value.matchAll(/\{([^{}]+)\}/g)){
    tokens.push(match[0]);literals.push(value.slice(end,match.index));end=match.index+match[0].length;
    if(tokens.length>MAX_TOKENS)return unsupported;
  }
  if(!tokens.length)return unsupported;
  literals.push(value.slice(end));return {supported:true,original:value,tokens,literals};
}

/** Rebuild literal segments only, then verify native binding identity/order again. */
export function editedTextParts(request:TextPartsRequest):string{
  if(!request||typeof request.original!=='string')throw new TextPartsError('shape');
  const parts=textParts(request.original);if(!parts.supported)throw new TextPartsError('unsupported');
  if(!Array.isArray(request.literals)||request.literals.length!==parts.literals.length)throw new TextPartsError('shape');
  let size=parts.tokens.reduce((sum,token)=>sum+token.length,0);
  for(let i=0;i<parts.literals.length;i++){if(typeof request.literals[i]!=='string')throw new TextPartsError('shape');size+=request.literals[i].length;}
  if(size>MAX_TEXT)throw new TextPartsError('length');
  let result=request.literals[0];
  for(let i=0;i<parts.tokens.length;i++){
    if(result.length>MAX_TEXT)throw new TextPartsError('length');
    result+=parts.tokens[i]+request.literals[i+1];
  }
  if(result.length>MAX_TEXT)throw new TextPartsError('length');
  const after=textParts(result);
  if(!after.supported||after.tokens.length!==parts.tokens.length||after.tokens.some((token,index)=>token!==parts.tokens[index]))throw new TextPartsError('bindings');
  return result;
}

/** One authored property changes. Sample values, scripts, actions and styles stay intact. */
export function applyTextParts(project:Project,id:string,request:TextPartsRequest){
  const node=walk(project.layout).find(ref=>ref.node.id===id)?.node;
  const property=node&&['text','button'].includes(node.type)?'text':node?.type==='bar'?'label':undefined;
  if(!node||!property||typeof node[property]!=='string')throw new TextPartsError('component');
  if(node[property]!==request?.original)throw new TextPartsError('stale');
  const result=editedTextParts(request);node[property]=result;
}

export function textPartsError(error:unknown,language='en'){
  const messages:Record<EditCode,[string,string]>={
    unsupported:['Use the full editor for this text template.','Dùng trình soạn thảo đầy đủ cho mẫu chữ này.'],
    shape:['Keep one text segment before and after each data value.','Giữ đủ các ô chữ trước và sau mỗi giá trị dữ liệu.'],
    bindings:['Text edits must keep the same data values in the same order.','Phần chữ phải giữ nguyên các giá trị dữ liệu và thứ tự của chúng.'],
    length:['The resulting text must be at most 16,384 characters.','Nội dung sau khi sửa không được quá 16.384 ký tự.'],
    stale:['This component changed. Reopen its text controls before applying.','Thành phần đã thay đổi. Mở lại phần sửa chữ trước khi áp dụng.'],
    component:['Choose bound text, a button label or a bar label.','Chọn chữ có dữ liệu, nhãn nút hoặc nhãn thanh chỉ số.']
  };
  return error instanceof TextPartsError?messages[error.code][language==='vi'?1:0]:error instanceof Error?error.message:String(error);
}
