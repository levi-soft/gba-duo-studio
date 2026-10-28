import {characterCard,statsTable} from './function-blocks.js';
import {dataCatalog} from './data-catalog.js';
import {uid} from './project.js';
import {walk,clone} from './tree.js';
import {resolve,scopedValues} from '../preview/data.js';
import type {Project,LayoutNode,DataValues,JsonValue} from './types.js';
export interface FunctionBlockRequest {kind:'character'|'stats';parentId:string;position:'start'|'end';title:string;nameField?:string;levelField?:string;levelLabel?:string;portraitMode?:'none'|'field'|'asset';portraitField?:string;portraitAsset?:string;hpEnabled?:boolean;currentHpField?:string;maximumHpField?:string;barLabel?:string;rows?:{label:string;labelField?:string;field:string}[]}

/** Build a detached native subtree first; insert only after every binding passes. */
export function prepareFunctionBlock(project:Project,request:FunctionBlockRequest,id:string,language='en'):LayoutNode{
  const parent=walk(project.layout).find(ref=>ref.node.id===request.parentId)?.node;
  if(!parent||!['row','column','box'].includes(parent.type))throw Error('Choose a row, column or box for the block.');
  if(!['start','end'].includes(request.position))throw Error('Choose the start or end of the container.');
  const fields=dataCatalog(project,request.parentId,language);
  const scalar=(path:string|undefined)=>{const field=fields.find(f=>f.path===path);if(!field||field.kind==='list')throw Error('Choose a scalar field available in this container.');return field;};
  if(request.kind==='character'){
    const name=scalar(request.nameField);
    if(request.levelField)scalar(request.levelField);
    let portrait='';
    if(request.portraitMode==='field'){const image=scalar(request.portraitField);if(image.kind!=='string')throw Error('Choose a text field containing the image source.');portrait='$'+image.path;}
    else if(request.portraitMode==='asset'){const file=request.portraitAsset;if(!file||!file.startsWith('assets/')||!Object.hasOwn(project.files,file)||! /\.(png|jpe?g|webp|gif|svg)$/i.test(file))throw Error('Choose an existing local image asset.');portrait='asset:'+file.slice(7);}
    else if(request.portraitMode!==undefined&&request.portraitMode!=='none')throw Error('Choose a portrait source.');
    if(request.hpEnabled){const hp=scalar(request.currentHpField),max=scalar(request.maximumHpField);if(hp.kind!=='number'||max.kind!=='number'||hp.path===max.path||hp.scope!==max.scope)throw Error('Choose two different numeric HP fields from the same scope.');}
    return characterCard({id,title:request.title,nameField:name.path,levelField:request.levelField,levelLabel:request.levelLabel??(language==='vi'?'Cấp độ':'Level'),portrait,currentHpField:request.hpEnabled?request.currentHpField:undefined,maximumHpField:request.hpEnabled?request.maximumHpField:undefined,hpLabel:request.barLabel??'HP'});
  }
  if(request.kind!=='stats')throw Error('Choose a character card or a stat table.');
  for(const row of request.rows??[]){scalar(row.field);if(row.labelField!==undefined)scalar(row.labelField);}
  return statsTable({id,title:request.title,rows:request.rows??[]});
}

export function insertFunctionBlock(project:Project,request:FunctionBlockRequest,language='en',id=uid()){
  const block=prepareFunctionBlock(project,request,id,language),refs=walk(project.layout),existing=new Set(refs.map(ref=>ref.node.id));
  if(walk(block).some(ref=>existing.has(ref.node.id)))throw Error('The block ID is already in use.');
  const parent=refs.find(ref=>ref.node.id===request.parentId)!.node;
  parent.children??=[];if(request.position==='start')parent.children.unshift(block);else parent.children.push(block);
  return block.id;
}

/** Preview only the first row in each enclosing list; never modify stored data. */
export function previewFunctionBlock(project:Project,request:FunctionBlockRequest,language='en',values:DataValues=project.data):Project{
  let layout=prepareFunctionBlock(project,request,'function-block-preview',language);
  const data=clone(values),lists=walk(project.layout).filter(ref=>ref.node.type==='list'&&walk(ref.node.template).some(r=>r.node.id===request.parentId));
  let item:JsonValue=data;
  for(let i=0;i<lists.length;i++){
    const rows=resolve(lists[i].node.items,i?scopedValues(item,0,data):data);
    if(Array.isArray(rows)&&rows.length){rows.splice(1);item=rows[0];}
  }
  for(let i=lists.length-1;i>=0;i--)layout={type:'list',id:'function-block-preview-scope-'+i,items:lists[i].node.items,template:layout,style:{width:'100%'}};
  return {...project,layout,data,width:1000,height:Math.max(700,request.kind==='stats'?(request.rows?.length??1)*110+200:700)};
}

export function functionBlockMessage(message:string,language='en'){
  if(language!=='vi')return message;
  const messages:Record<string,string>={
    'Choose a row, column or box for the block.':'Chọn khung chứa cho khối mới.',
    'Choose the start or end of the container.':'Chọn vị trí đầu hoặc cuối khung.',
    'Choose a scalar field available in this container.':'Chọn trường chữ, số hoặc trạng thái có sẵn trong khung này.',
    'Choose a text field containing the image source.':'Chọn trường chữ chứa đường dẫn ảnh.',
    'Choose an existing local image asset.':'Chọn một ảnh có sẵn trong tài nguyên của companion.',
    'Choose a portrait source.':'Chọn nguồn ảnh chân dung.',
    'Choose two different numeric HP fields from the same scope.':'Chọn hai trường số hiện tại/tối đa khác nhau trong cùng phạm vi dữ liệu.',
    'Choose a character card or a stat table.':'Chọn thẻ nhân vật hoặc bảng chỉ số.',
    'The block ID is already in use.':'Mã khối bị trùng. Hãy thử thêm lại.',
    'Choose a valid data field.':'Chọn trường dữ liệu hợp lệ.',
    'Use a short label without binding symbols.':'Nhãn cần tối đa 128 ký tự, không chứa dấu {, } hoặc $.',
    'Choose both current and maximum HP fields.':'Chọn cả trường hiện tại và trường tối đa.',
    'Current and maximum fields must be different.':'Trường hiện tại và tối đa cần khác nhau.',
    'Choose 1 to 24 stat rows.':'Bảng chỉ số cần từ 1 đến 24 dòng.',
    'Each stat row needs a display label.':'Mỗi dòng chỉ số cần có nhãn hiển thị.',
    'Choose a bound portrait or a local image.':'Chọn ảnh từ dữ liệu hoặc ảnh có sẵn.',
    'Invalid local portrait path.':'Đường dẫn ảnh cục bộ không hợp lệ.',
    'Invalid block configuration.':'Cấu hình khối không hợp lệ.',
    'Invalid saved block ID.':'Mã cấu hình đã lưu không hợp lệ.',
    'Enter a name for the saved configuration.':'Nhập tên cho cấu hình đã lưu.',
    'Invalid saved block library or too many configurations.':'Thư viện cấu hình không hợp lệ hoặc vượt quá 50 mục.',
    'A saved configuration with this name or ID already exists.':'Đã có cấu hình trùng tên hoặc mã. Hãy dùng tên khác; các mục đang có được giữ nguyên.',
    'The saved block library is too large.':'Tệp cấu hình quá lớn. Giới hạn là 512 KiB.',
    'Invalid saved block JSON.':'Tệp JSON thư viện cấu hình không hợp lệ.',
    'The browser could not load saved block configurations.':'Trình duyệt không đọc được thư viện cấu hình đã lưu. Bạn vẫn có thể tạo và chèn khối mới.',
    'The browser could not save block configurations.':'Trình duyệt chưa lưu được thư viện cấu hình. Các mục đã có được giữ nguyên.'
  };
  return messages[message]??message;
}
