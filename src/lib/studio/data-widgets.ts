import {widget,uid} from './project.js';
import {walk} from './tree.js';
import {dataCatalog,listItemFields,safeDataPath} from './data-catalog.js';
import type {Project,LayoutNode} from './types.js';
import {inspectListRebinding,type ListFieldMapping} from './list-rebinding.js';
import {textTemplateBindings,rebindTextTemplate} from './text-rebinding.js';
export interface DataWidgetRequest {kind:'text'|'bar'|'list'|'image';field:string;maxField?:string;itemField?:string;caption?:string;keepLabel?:boolean;keepText?:boolean;textFields?:Record<string,string>;listFields?:ListFieldMapping;parentId:string;replaceId?:string;position?:'start'|'end'}

function bindingPath(value:unknown){if(typeof value!=='string')return '';const match=value.match(/^\$([^{}]+)$|^\{([^{}]+)\}$/),path=match?.[1]??match?.[2]??'';return safeDataPath(path)?path:'';}
/** Prefill native bindings; complex text keeps its template and maps each field. */
export function selectedDataWidget(project:Project,id:string):DataWidgetRequest|null{
 const node=walk(project.layout).find(ref=>ref.node.id===id)?.node;
 if(!node||!['text','bar','image','list'].includes(node.type))return null;
 const result:DataWidgetRequest={kind:node.type as 'text'|'bar'|'image'|'list',field:'',caption:'',parentId:'',replaceId:id};
 if(node.type==='image')result.field=bindingPath(node.src);
 else if(node.type==='bar'){result.field=bindingPath(node.value);result.maxField=bindingPath(node.maxKey);result.keepLabel=!!result.field&&!!result.maxField&&result.field!==result.maxField;}
 else if(node.type==='list'){const path=(node.items??'').replace(/^\$/,'');result.field=safeDataPath(path)?path:'';}
 else{
  const match=(typeof node.text==='string'?node.text:'').match(/^(.*)\{([^{}]+)\}$/),prefix=match?.[1]??'';
  if(match&&safeDataPath(match[2])&&!/[{}$]/.test(prefix)&&(!prefix||prefix.endsWith(': '))){result.field=match[2];result.caption=prefix.slice(0,-2);}
  const info=textTemplateBindings(node.text);
  if(info.supported){result.keepText=!result.field;result.textFields=Object.fromEntries(info.paths.map(path=>[path,path]));}
 }
 return result;
}

/** One authoring transaction; existing Lua/files/data are never modified. */
export function applyDataWidget(project:Project,request:DataWidgetRequest,language='en'){
  const {kind,field,maxField,itemField,parentId,replaceId}=request;
  if(!['text','bar','list','image'].includes(kind))throw Error('Choose text, an image, a bar or a list.');
  if(request.position!==undefined&&!['start','end'].includes(request.position))throw Error('Choose the start or end of the container.');
  const refs=walk(project.layout),parent=refs.find(ref=>ref.node.id===parentId)?.node;
  const target=replaceId?refs.find(ref=>ref.node.id===replaceId)?.node:undefined;
  if(replaceId&&(!target||target.type!==kind))throw Error('Choose an existing component of the same type.');
  if(!replaceId&&(!parent||!['row','column','box'].includes(parent.type)))throw Error('Choose a row, column or box for the new component.');
  const fields=dataCatalog(project,replaceId??parentId,language),source=fields.find(f=>f.path===field);
  const preservingText=kind==='text'&&request.keepText;
  if(preservingText&&!target)throw Error('Choose an existing text component to keep its template.');
  if(!preservingText&&!source)throw Error('This data field is not available in the selected component scope.');
  const caption=request.caption??'';
  if(!preservingText&&(typeof caption!=='string'||caption.length>128||/[{}$]/.test(caption)))throw Error('Use a short display label without binding symbols.');
  let changes:Partial<LayoutNode>;
  if(preservingText){
    changes={text:rebindTextTemplate(target!.text,request.textFields,fields)};
  }else if(kind==='text'){
    if(source!.kind==='list')throw Error('Choose a scalar value for text.');
    changes={text:(caption?caption+': ':'')+'{'+field+'}'};
  }else if(kind==='image'){
    if(source!.kind!=='string')throw Error('Choose a text field containing an image source.');
    changes={src:'$'+field};
  }else if(kind==='bar'){
    const max=fields.find(f=>f.path===maxField);
    if(source!.kind!=='number'||max?.kind!=='number'||max.scope!==source!.scope||max.path===source!.path)throw Error('Choose two different numeric fields from the same scope for the bar.');
    changes={value:'$'+field,maxKey:'$'+max.path};
    if(target&&request.keepLabel){
      if(target.label!==undefined&&typeof target.label!=='string')throw Error('The existing bar label cannot be preserved. Choose a new label.');
      const previous=bindingPath(target.value),previousMax=bindingPath(target.maxKey);
      if(target.label&&(!previous||!previousMax))throw Error('The existing bar label cannot be preserved. Choose a new label.');
      if(previous&&previous===previousMax&&target.label?.includes('{'+previous+'}'))throw Error('The old bar uses the same field twice. Choose a new label.');
      if(target.label!==undefined)changes.label=target.label.replace(/\{([^{}]+)\}/g,(token,key)=>key===previous?'{'+field+'}':key===previousMax?'{'+max.path+'}':token);
    }else changes.label=(caption?caption+': ':'')+'{'+field+'} / {'+max.path+'}';
  }else if(target){
    const report=inspectListRebinding(project,target.id,field,request.listFields);
    if(!report.ok)throw Error('The selected list does not match the existing row template.');
    changes={items:'$'+field,...(report.template!==target.template?{template:report.template}:{})};
  }else{
    if(source!.kind!=='list'||!itemField||!listItemFields(source!.value).includes(itemField))throw Error('Choose an object list and a field from its sample row.');
    const template={...widget('text',language),text:'{'+itemField+'}',style:{padding:'8px'}};
    changes={items:'$'+field,template,empty:language==='vi'?'Chưa có dữ liệu':'No items'};
  }
  const node=target??{...widget(kind,language),id:uid()};
  Object.assign(node,changes);
  if(kind==='bar')delete node.max;
  if(!target){parent!.children??=[];if(request.position==='start')parent!.children.unshift(node);else parent!.children.push(node);}
  return node.id;
}

export function dataWidgetMessage(message:string,language='en'){
 if(language!=='vi')return message;
 const messages:Record<string,string>={
  'Choose text, an image, a bar or a list.':'Chọn chữ, ảnh, thanh chỉ số hoặc danh sách.',
  'Choose the start or end of the container.':'Chọn vị trí đầu hoặc cuối khung.',
  'Choose an existing component of the same type.':'Chọn thành phần có sẵn cùng loại.',
  'Choose an existing text component to keep its template.':'Chọn thành phần chữ có sẵn để giữ mẫu chữ.',
  'This text template needs the full editor.':'Mẫu chữ này cần được sửa trong trình soạn thảo đầy đủ.',
  'Choose a replacement for every text value.':'Chọn trường thay thế cho từng giá trị trong mẫu chữ.',
  'Choose an available text, number or status field for every text value.':'Mỗi giá trị cần một trường chữ, số hoặc trạng thái có sẵn trong phạm vi này.',
  'The selected list does not match the existing row template.':'Dữ liệu mẫu của danh sách chưa phù hợp với mẫu dòng đang có. Kiểm tra các trường và phạm vi trước khi áp dụng.',
  'Choose a row, column or box for the new component.':'Chọn khung chứa cho thành phần mới.',
  'This data field is not available in the selected component scope.':'Trường dữ liệu không có trong phạm vi thành phần đang chọn.',
  'Use a short display label without binding symbols.':'Nhãn cần tối đa 128 ký tự, không chứa dấu {, } hoặc $.',
  'Choose a scalar value for text.':'Chọn trường chữ, số hoặc trạng thái để hiển thị bằng chữ.',
  'Choose a text field containing an image source.':'Chọn trường chữ chứa nguồn ảnh.',
  'Choose two different numeric fields from the same scope for the bar.':'Chọn hai trường số khác nhau trong cùng phạm vi cho thanh chỉ số.',
  'Choose an object list and a field from its sample row.':'Chọn danh sách đối tượng và một trường trong dòng mẫu.',
  'The existing bar label cannot be preserved. Choose a new label.':'Không giữ được nhãn cũ của thanh. Bỏ chọn giữ định dạng và đặt nhãn mới.',
  'The old bar uses the same field twice. Choose a new label.':'Thanh cũ dùng trùng trường hiện tại và tối đa. Bỏ chọn giữ định dạng và đặt nhãn mới.'
 };
 return messages[message]??message;
}
