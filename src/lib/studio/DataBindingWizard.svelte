<script lang="ts">
  import {onMount} from 'svelte';
  import {locale} from './i18n.js';
  import {walk} from './tree.js';
  import {dataCatalog,listItemFields,dataFieldLabel} from './data-catalog.js';
  import {resolve} from '../preview/data.js';
  import type {Project,DataValues,JsonValue} from './types.js';
  import {selectedDataWidget,dataWidgetMessage,type DataWidgetRequest} from './data-widgets.js';
  import {inspectListRebinding,listBindingMessage,type ListFieldMapping,type ListBindingField} from './list-rebinding.js';
  import {textTemplateBindings,rebindTextTemplate} from './text-rebinding.js';
  interface Props {project:Project;targetId:string;sourceDirty:boolean;liveData?:DataValues|null;liveState?:string;onapply:(request:DataWidgetRequest)=>string;onclose:()=>void}
  let {project,targetId,sourceDirty,liveData=null,liveState='sample',onapply,onclose}:Props=$props();
  const copy=(en:string,vi:string)=>$locale==='vi'?vi:en;
  let mode=$state('new'),kind=$state<'text'|'bar'|'list'|'image'>('text'),parentId=$state(''),replaceId=$state('');
  let field=$state(''),maxField=$state(''),itemField=$state(''),caption=$state(''),search=$state(''),error=$state('');
  let position=$state<'start'|'end'>('end');
  let keepLabel=$state(false);
  let keepText=$state(false),textFields=$state<Record<string,string>>({});
  let mapLists=$state(false),listFields=$state<ListFieldMapping>({});
  let closeButton:HTMLButtonElement;
  const refs=$derived(walk(project.layout));
  const containers=$derived(refs.filter(r=>['row','column','box'].includes(r.node.type)));
  const replacements=$derived(refs.filter(r=>['text','bar','image','list'].includes(r.node.type)));
  const scopeId=$derived(mode==='existing'?replaceId:parentId);
  const allFields=$derived(dataCatalog(project,scopeId,$locale));
  const fields=$derived(dataCatalog(project,scopeId,$locale,search).filter(f=>kind==='bar'?f.kind==='number':kind==='list'?f.kind==='list':kind==='image'?f.kind==='string':f.kind!=='list'));
  const source=$derived(allFields.find(f=>f.path===field));
  const compatible=$derived(source&&(kind==='bar'?source.kind==='number':kind==='list'?source.kind==='list':kind==='image'?source.kind==='string':source.kind!=='list'));
  const maximums=$derived(allFields.filter(f=>f.kind==='number'&&f.path!==field&&f.scope===source?.scope));
  const maximum=$derived(maximums.find(f=>f.path===maxField));
  const rowFields=$derived(listItemFields(source?.value));
  const textTemplate=$derived(mode==='existing'&&kind==='text'?refs.find(r=>r.node.id===replaceId)?.node.text:undefined);
  const textInfo=$derived(textTemplateBindings(textTemplate));
  const preservingText=$derived(mode==='existing'&&kind==='text'&&keepText);
  const textCheck=$derived.by(()=>{if(!preservingText)return null;try{return {value:rebindTextTemplate(textTemplate,textFields,allFields),error:''};}catch(e){return {value:undefined,error:dataWidgetMessage(e instanceof Error?e.message:String(e),$locale)};}});
  const textPreview=$derived.by(()=>{
    let incomplete=false;
    const value=textCheck?.value?.replace(/\{([^{}]+)\}/g,(_token,path)=>{const sample=allFields.find(f=>f.path===path)?.value;if(path==='@index'||path.startsWith('ui.')||sample==null){incomplete=true;return '…';}return String(sample);});
    return {value,incomplete};
  });
  const listCheck=$derived.by(()=>{if(mode!=='existing'||kind!=='list'||!replaceId||!source)return null;try{return {report:inspectListRebinding(project,replaceId,field,mapLists?listFields:undefined),error:''};}catch(e){return {report:null,error:dataWidgetMessage(e instanceof Error?e.message:String(e),$locale)};}});
  const canApply=$derived(preservingText?!!textCheck&&!textCheck.error:!!compatible&&!!(mode==='existing'?replaceId:parentId)&&!(kind==='bar'&&!maximum)&&!(kind==='list'&&(mode==='new'?!itemField:!listCheck?.report?.ok)));
  const displayValue=$derived(source?.scope==='root'&&liveData?resolve(source.path,liveData):source?.value);
  const sourceName=$derived(source?.scope==='root'&&liveData?(liveState==='live'?copy('Live companion data','Dữ liệu companion trực tiếp'):copy('Last successful live data (stale)','Dữ liệu trực tiếp lần gần nhất (cũ)')):copy('Project sample / reader declaration','Dữ liệu mẫu / khai báo bộ đọc'));
  function title(id:string){
    const index=refs.findIndex(r=>r.node.id===id),ref=refs[index];if(!ref)return id;
    const types:Record<string,string>={row:copy('Row','Hàng'),column:copy('Column','Cột'),box:copy('Box','Khung'),text:copy('Text','Chữ'),bar:copy('Bar','Thanh chỉ số'),image:copy('Image','Ảnh'),list:copy('Repeated list','Danh sách lặp')};
    const text=ref.node.text??ref.node.children?.find(n=>typeof n.text==='string'&&!n.text.includes('{'))?.text;
    const name=ref.title||(typeof text==='string'&&text&&!text.includes('{')?text.slice(0,60):types[ref.node.type]??ref.node.type);
    return (index===0?copy('Main container','Khung chính'):name)+' · '+(index+1);
  }
  function chooseReplacement(){const current=selectedDataWidget(project,replaceId);if(current){kind=current.kind;field=current.field;maxField=current.maxField??'';caption=current.caption??'';keepLabel=current.keepLabel??false;keepText=current.keepText??false;textFields={...current.textFields};}else{field='';maxField='';caption='';keepLabel=false;keepText=false;textFields={};}itemField='';search='';error='';mapLists=false;listFields={};}
  function changeMode(value:string){mode=value;field='';maxField='';itemField='';caption='';keepLabel=false;keepText=false;textFields={};mapLists=false;listFields={};search='';if(mode==='existing')chooseReplacement();}
  function apply(){error=dataWidgetMessage(onapply({kind,field,maxField,itemField,caption,parentId,position,keepLabel:mode==='existing'&&kind==='bar'&&keepLabel,...(preservingText?{keepText:true,textFields:{...textFields}}:{}),...(mode==='existing'&&kind==='list'&&mapLists?{listFields:{...listFields}}:{}),...(mode==='existing'?{replaceId}:{})}),$locale);if(!error)onclose();}
  function mappingLabel(binding:ListBindingField,path:string,destination=false){
    let prefix='',owner='';
    for(const {node}of refs)if(node.type==='list'&&(node.id===binding.scopeId||walk(node.template).some(r=>r.node.id===binding.scopeId))){
      let source=(node.items??'').replace(/^\$/,'');
      if(destination){if(node.id===replaceId)source=field;else if(mapLists)source=listFields[owner+':'+source.replace(/\[(\d+)\]/g,'.$1')]??source;}
      prefix+=source+'[].';owner=node.id;
    }
    return dataFieldLabel(path,$locale,project.manifest.studioDataFields?.[prefix+path]);
  }
  function sampleLabel(value:JsonValue|undefined){return Array.isArray(value)?copy(`${value.length} rows`,`${value.length} dòng`):value&&typeof value==='object'?copy('Object','Đối tượng'):value==null?copy('No sample','Chưa có mẫu'):String(value).slice(0,60);}
  function keys(e:KeyboardEvent){
    if(e.key==='Escape'){e.preventDefault();onclose();}
    if(e.key==='Tab'){const targets=[...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)')].filter(el=>el.offsetParent!==null&&!el.closest('fieldset:disabled'));const first=targets[0],last=targets.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
  }
  onMount(()=>{const previous=document.activeElement,target=refs.findIndex(r=>r.node.id===targetId);parentId=containers.find(r=>r.node.id===targetId)?.node.id??refs.slice(0,target).reverse().find(r=>r.depth<(refs[target]?.depth??0)&&['row','column','box'].includes(r.node.type))?.node.id??containers[0]?.node.id??'';const selected=replacements.find(r=>r.node.id===targetId);replaceId=selected?.node.id??replacements[0]?.node.id??'';if(selected){mode='existing';chooseReplacement();}closeButton?.focus();return()=>{if(previous instanceof HTMLElement)previous.focus();};});
</script>

<div class="modal-backdrop"><div class="modal data-binding-wizard" role="dialog" aria-modal="true" aria-label={copy('Connect companion data','Gắn dữ liệu companion')} tabindex="-1" onkeydown={keys}>
  <div class="modal-title"><h2>{copy('Connect companion data','Gắn dữ liệu companion')}</h2><button bind:this={closeButton} aria-label={copy('Close data guide','Đóng hướng dẫn dữ liệu')} onclick={onclose}>✕</button></div>
  <p>{copy('Use fields already supplied by this companion. Choose by name; its game reader stays unchanged.','Dùng các trường đã có trong companion. Chọn theo tên; bộ đọc game được giữ nguyên.')}</p>
  <fieldset disabled={sourceDirty}>
    <label>{copy('Where to apply','Cách áp dụng')}<select value={mode} onchange={e=>changeMode(e.currentTarget.value)}><option value="new">{copy('Add a new component','Thêm thành phần mới')}</option><option value="existing" disabled={!replacements.length}>{copy('Connect an existing component','Gắn vào thành phần có sẵn')}</option></select></label>
    {#if mode==='new'}
      <label>{copy('Container for the new component','Khung chứa thành phần mới')}<select bind:value={parentId} onchange={()=>{field='';maxField='';}}><option value="">{copy('Choose a container…','Chọn khung chứa…')}</option>{#each containers as ref}<option value={ref.node.id}>{title(ref.node.id)}</option>{/each}</select></label>
      <label>{copy('Position in container','Vị trí trong khung')}<select bind:value={position}><option value="end">{copy('At the end','Cuối khung')}</option><option value="start">{copy('At the start','Đầu khung')}</option></select></label>
      <label>{copy('Display as','Hiển thị bằng')}<select bind:value={kind} onchange={()=>{field='';maxField='';itemField='';caption='';keepLabel=false;keepText=false;textFields={};}}><option value="text">{copy('Text or a number','Chữ hoặc con số')}</option><option value="image">{copy('Image from data','Ảnh từ dữ liệu')}</option><option value="bar">{copy('Current / maximum bar','Thanh hiện tại / tối đa')}</option><option value="list">{copy('Repeated list','Danh sách lặp')}</option></select></label>
    {:else}
      <label>{copy('Existing component','Thành phần có sẵn')}<select value={replaceId} onchange={e=>{replaceId=e.currentTarget.value;chooseReplacement();}}>{#each replacements as ref}<option value={ref.node.id}>{title(ref.node.id)}</option>{/each}</select></label>
      <p class="hint">{copy('Its layout, styles and actions are kept. The selected data binding will be replaced.','Giữ bố cục, style và hành động. Binding dữ liệu được chọn sẽ được thay thế.')}</p>
    {/if}
    <label>{copy('Find a value by name','Tìm giá trị theo tên')}<input type="search" bind:value={search} placeholder={copy('HP, money, level…','HP, tiền, cấp độ…')} /></label>
    {#if mode==='existing'&&kind==='text'&&textInfo.supported}<label class="toggle"><input type="checkbox" bind:checked={keepText}/>{copy('Keep the existing text template','Giữ mẫu chữ đang có')}</label>{/if}
    {#if preservingText}
      <p class="hint">{copy('Choose a replacement for each value. The surrounding text, punctuation and line breaks stay unchanged. Repeated uses of one field change together.','Chọn trường thay thế cho từng giá trị. Giữ phần chữ, dấu câu và xuống dòng xung quanh. Các chỗ dùng cùng một trường sẽ đổi cùng nhau.')}</p>
      {#each textInfo.paths as path,index (path)}
        {@const selectedField=allFields.find(f=>f.path===textFields[path]&&f.kind!=='list')}
        <label>{copy('Value','Giá trị')} {index+1}: {allFields.find(f=>f.path===path)?.label??path}<select value={textFields[path]??''} onchange={e=>{textFields={...textFields,[path]:e.currentTarget.value};error='';}}>
          <option value="">{copy('Choose a field…','Chọn trường dữ liệu…')}</option>
          {#each fields.slice(0,500) as f}<option value={f.path}>{f.label} · {f.scope==='item'?copy('list row','mỗi dòng'):copy('global','toàn cục')} ({f.path})</option>{/each}
          {#if selectedField&&!fields.slice(0,500).some(f=>f.path===selectedField.path)}<option value={selectedField.path}>{selectedField.label} ({selectedField.path}) · {copy('selected','đang chọn')}</option>{:else if textFields[path]&&!selectedField}<option value={textFields[path]} disabled>{textFields[path]} · {copy('unavailable here','chưa có trong phạm vi này')}</option>{/if}
        </select></label>
      {/each}
      {#if textCheck?.error}<p class="error" role="alert">{textCheck.error}</p>{:else if textPreview.value!==undefined}<div class="field-preview"><strong>{copy('Text with sample data','Chữ với dữ liệu mẫu')}</strong><output class="text-sample">{textPreview.value}</output>{#if textPreview.incomplete}<p class="hint">{copy('Some sample values or UI state are unavailable and shown as …. Their references are kept.','Một số giá trị mẫu hoặc trạng thái giao diện chưa có, được hiển thị bằng …. Các tham chiếu này được giữ.')}</p>{/if}</div>{/if}
    {:else}
    <label>{kind==='bar'?copy('Current value','Giá trị hiện tại'):copy('Data field','Trường dữ liệu')}<select bind:value={field} onchange={()=>{maxField='';itemField='';listFields={};error='';}}><option value="">{copy('Choose a field…','Chọn trường dữ liệu…')}</option>{#each fields.slice(0,500) as f}<option value={f.path}>{f.label} · {f.scope==='item'?copy('list row','mỗi dòng'):copy('global','toàn cục')} ({f.path})</option>{/each}{#if compatible&&source&&!fields.slice(0,500).some(f=>f.path===field)}<option value={field}>{source.label} ({field}) · {copy('selected','đang chọn')}</option>{/if}</select></label>
    {/if}
    {#if !fields.length}<p class="hint">{copy('No compatible values here. Try another search or container. Inside an empty list, add a representative sample row in Data first.','Chưa có giá trị phù hợp. Thử từ tìm kiếm hoặc khung chứa khác. Với danh sách trống, thêm một dòng mẫu đại diện trong Dữ liệu trước.')}</p>{/if}
    {#if kind==='bar'}<label>{copy('Maximum value','Giá trị tối đa')}<select bind:value={maxField}><option value="">{copy('Choose the maximum field…','Chọn trường tối đa…')}</option>{#each maximums as f}<option value={f.path}>{f.label} ({f.path})</option>{/each}</select></label>{/if}
    {#if kind==='list'&&mode==='new'}<label>{copy('Value shown on each row','Giá trị hiển thị ở mỗi dòng')}<select bind:value={itemField}><option value="">{copy('Choose a row field…','Chọn trường của dòng…')}</option>{#each rowFields as name}<option value={name}>{name}</option>{/each}</select></label>{/if}
    {#if kind==='list'&&mode==='existing'}<div class="field-preview">
      <strong>{copy('Keep the existing row template','Giữ mẫu dòng đang có')}</strong>
      <p class="hint">{copy('Change the list source and optionally match row fields. Component IDs, layout, styles and actions stay in place; matched references are updated. Checks use sample data without running Lua.','Đổi nguồn danh sách và có thể ghép trường của từng dòng. Giữ ID, bố cục, style và hành động; cập nhật các tham chiếu đã ghép. Kiểm tra bằng dữ liệu mẫu, không chạy Lua.')}</p>
      <label class="toggle"><input type="checkbox" bind:checked={mapLists} onchange={()=>{listFields={};error='';}}/>{copy('Match row fields','Ghép trường của mẫu dòng')}</label>
      {#if mapLists&&listCheck?.report}
        <p class="hint">{copy('Choose corresponding fields from the new sample rows. A field shared by text, bars or actions changes everywhere in this list scope. Nested lists have separate matches.','Chọn trường tương ứng từ dòng mẫu mới. Trường dùng chung cho chữ, thanh chỉ số hoặc hành động sẽ đổi cùng nhau trong phạm vi danh sách này. Danh sách lồng có phần ghép riêng.')}</p>
        {#each listCheck.report.bindings as binding (binding.key)}
          {@const chosen=listFields[binding.key]??binding.path}
          {@const selected=binding.choices.find(c=>c.path===chosen)}
          <label>{copy('Match','Ghép')} {mappingLabel(binding,binding.path)} · {title(binding.scopeId)}<select data-list-binding={binding.key} value={chosen} onchange={e=>{listFields={...listFields,[binding.key]:e.currentTarget.value};error='';}}>
            <option value="">{copy('Choose a matching field…','Chọn trường tương ứng…')}</option>
            {#each binding.choices.slice(0,500) as choice}<option value={choice.path}>{mappingLabel(binding,choice.path,true)} ({choice.path}) · {sampleLabel(choice.value)}</option>{/each}
            {#if selected&&!binding.choices.slice(0,500).some(c=>c.path===chosen)}<option value={chosen}>{mappingLabel(binding,chosen,true)} ({chosen}) · {sampleLabel(selected.value)}</option>{:else if chosen&&!selected}<option value={chosen} disabled>{chosen} · {copy('no compatible first-row sample','chưa phù hợp với dòng mẫu đầu')}</option>{/if}
          </select></label>
          {#if selected}<span>{copy('Sample after matching','Mẫu sau ghép')}: {sampleLabel(selected.value)}</span>{/if}
        {/each}
        <button type="button" onclick={()=>{listFields={};error='';}}>{copy('Reset field matches','Đặt lại ghép trường')}</button>
      {/if}
      {#if listCheck?.error}<p class="error" role="alert">{listCheck.error}</p>{:else if listCheck?.report}
        {#if listCheck.report.ok}<p role="status">{copy(`Sample checks passed: ${listCheck.report.rows} rows.`,`Đã kiểm tra mẫu: ${listCheck.report.rows} dòng.`)}</p>{:else}<ul>{#each listCheck.report.issues as issue}<li>{listBindingMessage(issue,$locale)}</li>{/each}</ul>{/if}
        {#if listCheck.report.nestedScope}<p class="hint">{copy('For a list inside another list, this uses the first enclosing sample rows.','Với danh sách lồng, kiểm tra dùng các dòng mẫu đầu của danh sách bao ngoài.')}</p>{/if}
      {/if}
    </div>{/if}
    {#if mode==='existing'&&kind==='bar'}<label class="toggle"><input type="checkbox" bind:checked={keepLabel}/>{copy('Keep the existing label format','Giữ định dạng nhãn đang có')}</label>{#if keepLabel}<p class="hint">{copy('Current/maximum references in the label follow the newly selected fields. Other label content is kept.','Các giá trị hiện tại/tối đa trong nhãn đổi theo trường vừa chọn. Giữ các nội dung khác của nhãn.')}</p>{/if}{/if}
    {#if kind==='text'&&!preservingText||kind==='bar'&&!keepLabel}<label>{copy('Display label (optional)','Nhãn hiển thị (tùy chọn)')}<input bind:value={caption} maxlength="128" placeholder={copy('For example: HP','Ví dụ: Sức khỏe')} /></label>{/if}
    {#if mode==='existing'&&kind==='text'&&!preservingText}<p class="hint">{copy('Applying replaces the text with the display label and one field. Enable template preservation to keep its wording, or use the full editor for unsupported templates.','Áp dụng sẽ thay nội dung chữ bằng nhãn và một trường dữ liệu. Bật giữ mẫu chữ để giữ nội dung xung quanh, hoặc dùng trình soạn thảo đầy đủ với mẫu chưa được hỗ trợ.')}</p>{/if}
    {#if kind==='image'}<p class="hint">{copy('Choose a text field containing an image source supplied by the reader. Image dimensions and styling stay unchanged when rebinding.','Chọn trường chữ chứa nguồn ảnh do bộ đọc cung cấp. Khi gắn lại, giữ kích thước và style của ảnh.')}</p>{/if}
    {#if source&&!preservingText}<div class="field-preview"><strong>{source.label}</strong><span>{sourceName}</span><output>{Array.isArray(displayValue)?copy(`${displayValue.length} rows`,`${displayValue.length} dòng`):displayValue===null||displayValue===undefined?copy('No value in this snapshot','Chưa có giá trị trong mẫu này'):String(displayValue).slice(0,160)}</output>{#if source.description}<p>{source.description}</p>{/if}</div>{/if}
    <p class="hint">{copy('Names describe existing fields; they do not prove the reader is correct for every ROM. Browser preview does not execute Lua.','Tên mô tả các trường có sẵn; không khẳng định bộ đọc đúng trên mọi ROM. Xem trước trên trình duyệt không chạy Lua.')}</p>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    <button class="primary" disabled={!canApply} onclick={apply}>{mode==='existing'?copy('Apply data binding','Áp dụng dữ liệu'):copy('Add connected component','Thêm thành phần có dữ liệu')}</button>
  </fieldset>
  {#if sourceDirty}<p class="error">{copy('Apply or discard the Code draft first.','Áp dụng hoặc bỏ bản nháp Mã nguồn trước.')}</p>{/if}
</div></div>

<style>
  .data-binding-wizard{width:min(700px,calc(100vw - 24px));max-height:calc(100dvh - 32px);overflow:auto}fieldset{padding:0;margin:0;border:0;min-width:0}.field-preview{display:flex;flex-direction:column;gap:6px;border:1px solid #53647b;padding:12px;margin:12px 0;border-radius:6px;overflow-wrap:anywhere}.field-preview span,.hint{color:#c4cede;font-size:12px;line-height:1.5}.field-preview output{font-size:20px}.toggle{display:flex;flex-direction:row;gap:8px;align-items:center}.toggle input{width:18px;height:18px}select,input{max-width:100%}
  .text-sample{white-space:pre-wrap}
</style>
