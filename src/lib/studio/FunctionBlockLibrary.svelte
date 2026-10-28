<script lang="ts">
  import {onMount} from 'svelte';
  import {locale} from './i18n.js';
  import {walk} from './tree.js';
  import {dataCatalog} from './data-catalog.js';
  import {previewFunctionBlock,functionBlockMessage,type FunctionBlockRequest} from './function-block-authoring.js';
  import Preview from './Preview.svelte';
  import type {Project,DataValues} from './types.js';
  import {uid} from './project.js';
  import {loadBlockPresets,saveBlockPresets,makeBlockPreset,mergeBlockPresets,parseBlockPresets,serializeBlockPresets,selectedBlockConfig,BLOCK_PRESETS_LIMIT,type BlockConfig,type BlockPresets,type BlockPreset} from './block-presets.js';
  interface Props {project:Project;targetId:string;sourceDirty:boolean;liveData?:DataValues|null;liveState?:string;onapply:(request:FunctionBlockRequest)=>string;onclose:()=>void}
  let {project,targetId,sourceDirty,liveData=null,liveState='sample',onapply,onclose}:Props=$props();
  const copy=(en:string,vi:string)=>$locale==='vi'?vi:en;
  let kind=$state<'character'|'stats'>('character'),parentId=$state(''),position=$state<'start'|'end'>('end'),title=$state('');
  let nameField=$state(''),levelField=$state(''),portraitMode=$state<'none'|'field'|'asset'>('none'),portraitField=$state(''),portraitAsset=$state('');
  let hpEnabled=$state(false),currentHpField=$state(''),maximumHpField=$state(''),error=$state('');
  let barLabel=$state('HP'),levelLabel=$state('');
  let sequence=1,rows=$state<{id:number;label:string;field:string;labelSource:'text'|'field';labelField:string}[]>([{id:0,label:'',field:'',labelSource:'text',labelField:''}]),closeButton:HTMLButtonElement;
  let saved=$state<BlockPresets>({formatVersion:1,presets:[]}),savedId=$state(''),presetName=$state(''),presetError=$state(''),presetMessage=$state(''),libraryReady=$state(false),removed=$state<{item:BlockPreset;index:number}|null>(null),importInput:HTMLInputElement;
  const captured=$derived(selectedBlockConfig(project,targetId));
  const refs=$derived(walk(project.layout)),containers=$derived(refs.filter(r=>['row','column','box'].includes(r.node.type)));
  const fields=$derived(dataCatalog(project,parentId,$locale)),scalars=$derived(fields.filter(f=>f.kind!=='list')),numbers=$derived(fields.filter(f=>f.kind==='number'));
  const currentHp=$derived(numbers.find(f=>f.path===currentHpField));
  const maxFields=$derived(numbers.filter(f=>f.path!==currentHpField&&f.scope===currentHp?.scope));
  const imageFields=$derived(fields.filter(f=>f.kind==='string'));
  const assets=$derived(Object.keys(project.files).filter(path=>path.startsWith('assets/')&&/\.(png|jpe?g|webp|gif|svg)$/i.test(path)).sort());
  const request=$derived<FunctionBlockRequest>({kind,parentId,position,title,nameField,levelField,levelLabel:levelLabel||undefined,portraitMode,portraitField,portraitAsset,hpEnabled,currentHpField,maximumHpField,barLabel,rows:rows.map(({label,field,labelSource,labelField})=>({label,field,...(labelSource==='field'?{labelField}:{})}))});
  const preview=$derived.by(()=>{try{return {project:previewFunctionBlock(project,request,$locale,liveData??project.data),error:''};}catch(e){return {project:null,error:functionBlockMessage(e instanceof Error?e.message:String(e),$locale)};}});
  function containerTitle(id:string){const index=refs.findIndex(r=>r.node.id===id),ref=refs[index];if(!ref)return id;return (index===0?copy('Main container','Khung chính'):ref.title||({row:copy('Row','Hàng'),column:copy('Column','Cột'),box:copy('Box','Khung')} as Record<string,string>)[ref.node.type])+' · '+(index+1);}
  function selectParent(){nameField='';levelField='';portraitField='';currentHpField='';maximumHpField='';rows=rows.map(row=>({...row,field:'',labelField:''}));error='';}
  function move(index:number,delta:number){const next=[...rows];[next[index],next[index+delta]]=[next[index+delta],next[index]];rows=next;}
  function selectStat(index:number){if(!rows[index].label.trim())rows[index].label=scalars.find(f=>f.path===rows[index].field)?.label??'';}
  function apply(){error=functionBlockMessage(onapply(request),$locale);if(!error)onclose();}
  function loadConfig(value:BlockConfig){kind=value.kind;title=value.title;nameField=value.nameField??'';levelField=value.levelField??'';levelLabel=value.levelLabel??'';portraitMode=value.portraitMode??'none';portraitField=value.portraitField??'';portraitAsset=value.portraitAsset??'';hpEnabled=value.hpEnabled??false;currentHpField=value.currentHpField??'';maximumHpField=value.maximumHpField??'';barLabel=value.barLabel??'HP';rows=value.kind==='stats'?(value.rows??[]).map((r,id)=>({...r,id,labelSource:r.labelField!==undefined?'field':'text',labelField:r.labelField??''})):[{id:0,label:'',field:'',labelSource:'text',labelField:''}];sequence=rows.length;error='';}
  function presetFailure(e:unknown){presetError=functionBlockMessage(e instanceof Error?e.message:String(e),$locale);presetMessage='';}
  function commitLibrary(next:BlockPresets){saveBlockPresets(next);saved=next;presetError='';}
  function saveConfig(){try{const item=makeBlockPreset(request,uid(),presetName),next=mergeBlockPresets(saved,{formatVersion:1,presets:[item]});commitLibrary(next);savedId=item.id;presetMessage=copy('Saved in this browser. Export JSON for a portable backup.','Đã lưu trong trình duyệt này. Xuất JSON để sao lưu và mang sang máy khác.');}catch(e){presetFailure(e);}}
  function loadSaved(){const item=saved.presets.find(p=>p.id===savedId);if(!item)return;loadConfig(item.config);presetName=item.name;presetError='';presetMessage=copy('Configuration loaded. Re-select fields or images that are missing in this project.','Đã nạp cấu hình. Chọn lại trường hoặc ảnh còn thiếu trong dự án này.');}
  function captureSelected(){if(!captured)return;loadConfig(captured);savedId='';presetName=captured.title||copy(captured.kind==='stats'?'Stat table':'Character card',captured.kind==='stats'?'Bảng chỉ số':'Thẻ nhân vật');presetError='';presetMessage=copy('Loaded creation settings from the selected block. Manual styling is not included.','Đã lấy cấu hình tạo khối đang chọn. Các chỉnh sửa style thủ công không nằm trong cấu hình này.');}
  function removeSaved(){try{const index=saved.presets.findIndex(p=>p.id===savedId);if(index<0)return;const item=saved.presets[index];commitLibrary({...saved,presets:saved.presets.filter(p=>p.id!==savedId)});removed={item,index};savedId='';presetMessage=copy('Configuration removed. You can undo this removal.','Đã bỏ cấu hình. Có thể hoàn tác thao tác này.');}catch(e){presetFailure(e);}}
  function undoRemove(){if(!removed)return;try{const merged=mergeBlockPresets(saved,{formatVersion:1,presets:[removed.item]}),item=merged.presets.find(p=>p.id===removed!.item.id)!;merged.presets=merged.presets.filter(p=>p.id!==item.id);merged.presets.splice(removed.index,0,item);commitLibrary(merged);savedId=item.id;removed=null;presetMessage=copy('Configuration restored.','Đã khôi phục cấu hình.');}catch(e){presetFailure(e);}}
  function exportSaved(){try{const blob=new Blob([serializeBlockPresets(saved)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='gba-duo-block-presets.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);presetError='';}catch(e){presetFailure(e);}}
  async function importSaved(e:Event){const input=e.currentTarget as HTMLInputElement,file=input.files?.[0];input.value='';if(!file)return;try{if(file.size>512*1024)throw Error('The saved block library is too large.');const incoming=parseBlockPresets(await file.text()),next=mergeBlockPresets(saved,incoming);commitLibrary(next);presetMessage=copy('Configurations imported. Existing entries were preserved.','Đã nhập cấu hình và giữ nguyên các mục đang có.');}catch(e){presetFailure(e);}}
  function keys(e:KeyboardEvent){
    if(e.key==='Escape'){e.preventDefault();onclose();}
    if(e.key==='Tab'){const targets=[...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)')].filter(el=>el.offsetParent!==null&&!el.closest('fieldset:disabled'));const first=targets[0],last=targets.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
  }
  onMount(()=>{const previous=document.activeElement,index=refs.findIndex(r=>r.node.id===targetId);parentId=containers.find(r=>r.node.id===targetId)?.node.id??refs.slice(0,index).reverse().find(r=>r.depth<(refs[index]?.depth??0)&&['row','column','box'].includes(r.node.type))?.node.id??containers[0]?.node.id??'';try{saved=loadBlockPresets();libraryReady=true;}catch(e){presetFailure(e);}closeButton?.focus();return()=>{if(previous instanceof HTMLElement)previous.focus();};});
</script>

{#snippet fieldOptions(list:typeof fields)}<option value="">{copy('Choose a field…','Chọn trường dữ liệu…')}</option>{#each list as f}<option value={f.path}>{f.label} · {f.scope==='item'?copy('list row','mỗi dòng'):copy('global','toàn cục')} ({f.path})</option>{/each}{/snippet}
<div class="modal-backdrop"><div class="modal function-library" role="dialog" aria-modal="true" aria-label={copy('Function blocks','Khối chức năng')} tabindex="-1" onkeydown={keys}>
  <div class="modal-title"><h2>{copy('Function blocks','Khối chức năng')}</h2><button bind:this={closeButton} aria-label={copy('Close block library','Đóng thư viện khối')} onclick={onclose}>✕</button></div>
  <p>{copy('Build a reusable card or table from fields your companion already supplies. Colors and fonts are inherited from its theme.','Tạo thẻ hoặc bảng từ trường dữ liệu có sẵn của companion. Khối kế thừa màu và font của giao diện.')}</p>
  <fieldset disabled={sourceDirty}>
  <details class="saved-configs"><summary>{copy('Saved block configurations','Cấu hình khối đã lưu')} ({saved.presets.length})</summary>
    <p class="hint">{copy('Creation settings only: labels and data fields. Images, Lua and manual styling stay in each project.','Lưu cấu hình tạo khối: nhãn và trường dữ liệu. Ảnh, Lua và style thủ công nằm trong từng dự án.')}</p>
    <button disabled={!captured} onclick={captureSelected}>{copy('Use settings from selected block','Lấy cấu hình từ khối đang chọn')}</button>
    <label>{copy('Saved configuration','Cấu hình đã lưu')}<select bind:value={savedId}><option value="">{copy('Choose a configuration…','Chọn cấu hình…')}</option>{#each saved.presets as item}<option value={item.id}>{item.name}</option>{/each}</select></label>
    <div class="row-actions"><button disabled={!savedId} onclick={loadSaved}>{copy('Load configuration','Nạp cấu hình')}</button><button disabled={!libraryReady||!savedId} onclick={removeSaved}>{copy('Remove configuration','Bỏ cấu hình')}</button>{#if removed}<button disabled={!libraryReady} onclick={undoRemove}>{copy('Undo removal','Hoàn tác bỏ cấu hình')}</button>{/if}</div>
    <label>{copy('Configuration name','Tên cấu hình')}<input bind:value={presetName} maxlength="80" /></label>
    <div class="row-actions"><button disabled={!libraryReady||!preview.project||!presetName.trim()||saved.presets.length>=BLOCK_PRESETS_LIMIT} onclick={saveConfig}>{copy('Save as new configuration','Lưu cấu hình mới')}</button><button disabled={!libraryReady||!saved.presets.length} onclick={exportSaved}>{copy('Export configurations JSON','Xuất cấu hình JSON')}</button><button disabled={!libraryReady} onclick={()=>importInput.click()}>{copy('Import configurations JSON','Nhập cấu hình JSON')}</button></div>
    <input class="hidden" bind:this={importInput} type="file" accept="application/json,.json" aria-label={copy('Configuration library JSON file','Tệp JSON thư viện cấu hình')} onchange={importSaved}/>
    {#if presetError}<p class="error" role="alert">{presetError}</p>{/if}{#if presetMessage}<p class="hint" role="status">{presetMessage}</p>{/if}
  </details><div class="block-columns"><div>
    <label>{copy('Block type','Loại khối')}<select bind:value={kind}><option value="character">{copy('Character card','Thẻ nhân vật')}</option><option value="stats">{copy('Stat table','Bảng chỉ số')}</option></select></label>
    <label>{copy('Container','Khung chứa')}<select bind:value={parentId} onchange={selectParent}><option value="">{copy('Choose a container…','Chọn khung chứa…')}</option>{#each containers as ref}<option value={ref.node.id}>{containerTitle(ref.node.id)}</option>{/each}</select></label>
    <label>{copy('Position','Vị trí')}<select bind:value={position}><option value="end">{copy('At the end','Cuối khung')}</option><option value="start">{copy('At the start','Đầu khung')}</option></select></label>
    <label>{copy('Heading (optional)','Tiêu đề (tùy chọn)')}<input bind:value={title} maxlength="128" /></label>
    {#if kind==='character'}
      <label>{copy('Character name','Tên nhân vật')}<select bind:value={nameField}>{@render fieldOptions(scalars)}</select></label>
      <label>{copy('Level (optional)','Cấp độ (tùy chọn)')}<select bind:value={levelField}><option value="">{copy('Do not show','Không hiển thị')}</option>{#each scalars as f}<option value={f.path}>{f.label} ({f.path})</option>{/each}</select></label>
      {#if levelField}<label>{copy('Level label','Nhãn cấp độ')}<input bind:value={levelLabel} placeholder={copy('Level','Cấp độ')} maxlength="128" /></label>{/if}
      <label>{copy('Portrait','Chân dung')}<select bind:value={portraitMode}><option value="none">{copy('No portrait','Không dùng ảnh')}</option><option value="field">{copy('From a data field','Lấy từ trường dữ liệu')}</option><option value="asset">{copy('Use an existing image','Dùng ảnh có sẵn')}</option></select></label>
      {#if portraitMode==='field'}<label>{copy('Portrait data field','Trường dữ liệu chân dung')}<select bind:value={portraitField}>{@render fieldOptions(imageFields)}</select></label>{/if}
      {#if portraitMode==='asset'}<label>{copy('Image asset','Ảnh trong tài nguyên')}<select bind:value={portraitAsset}><option value="">{copy('Choose an image…','Chọn ảnh…')}</option>{#each assets as path}<option value={path}>{path}</option>{/each}</select></label>{/if}
      <label class="toggle"><input type="checkbox" bind:checked={hpEnabled}/>{copy('Include a current / maximum bar','Thêm thanh hiện tại / tối đa')}</label>
      {#if hpEnabled}<label>{copy('Bar label','Nhãn thanh chỉ số')}<input bind:value={barLabel} maxlength="128" /><small>{copy('For example: HP, ammo or energy','Ví dụ: HP, đạn hoặc năng lượng')}</small></label><label>{copy('Current value','Giá trị hiện tại')}<select bind:value={currentHpField} onchange={()=>maximumHpField=''}>{@render fieldOptions(numbers)}</select></label><label>{copy('Maximum value','Giá trị tối đa')}<select bind:value={maximumHpField}>{@render fieldOptions(maxFields)}</select></label>{/if}
    {:else}
      <p class="hint">{copy('Choose fields, name each row, then reorder them.','Chọn trường, đặt tên từng dòng rồi sắp xếp thứ tự.')}</p>
      {#each rows as row,index (row.id)}<section class="stat-row">
        <strong>{copy('Row','Dòng')} {index+1}</strong>
        <label>{copy('Field','Trường dữ liệu')} {index+1}<select value={row.field} onchange={(e)=>{row.field=e.currentTarget.value;selectStat(index);}}>{@render fieldOptions(scalars)}</select></label>
        <label>{copy('Label source','Nguồn nhãn')} {index+1}<select bind:value={row.labelSource}><option value="text">{copy('Custom text','Tự nhập')}</option><option value="field">{copy('From a data field','Lấy từ trường dữ liệu')}</option></select></label>
        {#if row.labelSource==='field'}<label>{copy('Label data field','Trường dữ liệu nhãn')} {index+1}<select bind:value={row.labelField}>{@render fieldOptions(scalars)}</select></label><small>{copy('The label updates with the selected subject, using the reader’s value.','Nhãn cập nhật theo đối tượng đang chọn, dùng giá trị bộ đọc cung cấp.')}</small>{:else}<label>{copy('Row label','Nhãn dòng')} {index+1}<input bind:value={row.label} maxlength="128" /></label>{/if}
        <div class="row-actions"><button aria-label={copy('Move row up','Đưa dòng lên')+' '+(index+1)} disabled={index===0} onclick={()=>move(index,-1)}>↑</button><button aria-label={copy('Move row down','Đưa dòng xuống')+' '+(index+1)} disabled={index===rows.length-1} onclick={()=>move(index,1)}>↓</button><button disabled={rows.length===1} onclick={()=>rows=rows.filter(r=>r.id!==row.id)}>{copy('Remove row','Bỏ dòng')}</button></div>
      </section>{/each}
      <button disabled={rows.length>=24} onclick={()=>rows=[...rows,{id:sequence++,label:'',field:'',labelSource:'text',labelField:''}]}>{copy('Add stat row','Thêm dòng chỉ số')}</button>
    {/if}
  </div><aside class="block-preview"><h3>{copy('Sample preview','Xem trước bằng dữ liệu mẫu')}</h3>
    <p class="hint">{liveData?(liveState==='live'?copy('Using the connected companion snapshot.','Đang dùng mẫu đọc từ companion đã kết nối.'):copy('Using the last successful live snapshot (stale).','Đang dùng lần đọc trực tiếp gần nhất (dữ liệu cũ).')):copy('Preview only; Lua is not executed.','Chỉ xem trước; không chạy Lua.')}</p>
    {#if preview.project}<div class="preview-scroll"><Preview project={preview.project} grid={{visible:false,snap:false,size:32}} zoom={0.28}/></div>{:else}<p class="hint">{preview.error}</p>{/if}
    <p class="hint">{copy('The inserted block remains editable as ordinary components. One insertion is one Undo step.','Khối sau khi chèn vẫn sửa được như các thành phần thường. Một lần chèn là một bước Hoàn tác.')}</p>
  </aside></div>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  <button class="primary" disabled={!preview.project} onclick={apply}>{copy('Insert function block','Chèn khối chức năng')}</button></fieldset>
  {#if sourceDirty}<p class="error">{copy('Apply or discard the Code draft first.','Áp dụng hoặc bỏ bản nháp Mã nguồn trước.')}</p>{/if}
</div></div>
<style>
  .function-library{width:min(1000px,calc(100vw - 24px));max-height:calc(100dvh - 32px);overflow:auto}fieldset{padding:0;margin:0;border:0;min-width:0}.block-columns{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:20px}.block-columns>div{min-width:0}.block-preview{min-width:0;position:sticky;top:0;align-self:start}.preview-scroll{max-height:400px;overflow:auto;padding:4px}.hint{color:#c4cede;font-size:12px;line-height:1.5}.toggle{display:flex;flex-direction:row;align-items:center;gap:8px}.toggle input{width:18px;height:18px}.stat-row{padding:10px;border:1px solid #526076;border-radius:5px;margin:8px 0}.row-actions{display:flex;flex-wrap:wrap;gap:6px}.saved-configs{padding:10px;border:1px solid #526076;border-radius:5px;margin-bottom:16px}.saved-configs summary{cursor:pointer}.hidden{display:none}@media(max-width:720px){.block-columns{grid-template-columns:1fr}.block-preview{position:static}.preview-scroll{max-height:280px}}select,input{max-width:100%}
</style>
