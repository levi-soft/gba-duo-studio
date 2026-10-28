<script lang="ts">
  import {onMount} from 'svelte';
  import {locale} from './i18n.js';
  import {guideParts,guideStatus} from './companion-guide.js';
  import TextPartsEditor from './TextPartsEditor.svelte';
  import {textParts,type TextPartsRequest} from './text-parts.js';
  import type {Project} from './types.js';
  interface Props {
    project:Project;sourceDirty:boolean;onopen:()=>void;onclose:()=>void;onselect:(id:string)=>void;
    ontext:(id:string,text:string)=>void;oncolor:(id:string,key:string,value:string)=>void;
    ontest:()=>void;onexport:()=>void;onsave:()=>void;
    onbind:(id:string)=>void;
    onwording:(id:string,request:TextPartsRequest)=>string;
    onassets?:(id:string)=>void;initialId?:string;
  }
  let {project,sourceDirty,onopen,onclose,onselect,ontext,oncolor,ontest,onexport,onsave,onbind,onwording,onassets,initialId=''}:Props=$props();
  const copy=(en:string,vi:string)=>$locale==='vi'?vi:en;
  let search=$state(''),selected=$state(''),closeButton:HTMLButtonElement;
  let textDraft=$state(''),draftId='',draftOriginal='';
  const parts=$derived(guideParts(project,search)),status=$derived(guideStatus(project));
  const current=$derived(guideParts(project).find(part=>part.id===selected));
  $effect(()=>{if(current&&(draftId!==current.id||draftOriginal!==current.text)){draftId=current.id;draftOriginal=current.text;textDraft=current.text;}});
  onMount(()=>{const previous=document.activeElement;if(initialId&&guideParts(project).some(part=>part.id===initialId))selected=initialId;closeButton?.focus();return()=>{if(previous instanceof HTMLElement)previous.focus();};});
  const color=(value:string|undefined,fallback:string)=>/^#[\da-f]{6}$/i.test(value??'')?value!:fallback;
  const typeName=(type:string)=>({text:copy('Text','Chữ'),button:copy('Button','Nút'),bar:copy('Bar','Thanh chỉ số'),box:copy('Box','Khung'),row:copy('Row','Hàng'),column:copy('Column','Cột'),image:copy('Image','Ảnh'),list:copy('List','Danh sách'),tabs:copy('Tabs','Tab')} as Record<string,string>)[type]??type;
  function dialogKey(e:KeyboardEvent){
    if(e.key==='Escape'){e.preventDefault();onclose();}
    if(e.key==='Tab'){
      const dialog=e.currentTarget as HTMLElement;
      const targets=[...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(el=>el.offsetParent!==null&&!el.closest('fieldset:disabled'));
      const first=targets[0],last=targets.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    }
  }
</script>

<div class="modal-backdrop"><div class="modal companion-guide" role="dialog" aria-modal="true" aria-label={copy('Edit a companion','Sửa companion')} tabindex="-1" onkeydown={dialogKey}>
  <div class="modal-title"><h2>{copy('Edit a companion','Sửa companion')}</h2><button bind:this={closeButton} aria-label={copy('Close guide','Đóng hướng dẫn')} onclick={onclose}>✕</button></div>
  <p>{copy('Change an existing companion in a copy. Your edits use the same Undo history as the editor.','Chỉnh sửa trên bản sao của companion. Các thay đổi dùng chung lịch sử Hoàn tác của trình soạn thảo.')}</p>
  <section class="guide-step"><h3>{copy('1. Open your companion','1. Mở companion của bạn')}</h3>
    <button disabled={sourceDirty} onclick={onopen}>{copy('Open companion ZIP…','Mở ZIP companion…')}</button>
    <strong>{project.manifest.name}</strong><span class="muted">{status.gameCodes.join(' · ')||copy('No ROM selected','Chưa chọn ROM')} · {status.fileCount} {copy('preserved files','tệp được giữ lại')}</span>
    <p class="muted">{copy('Opening does not change the original ZIP. Lua modules, assets and game data stay with the project.','Mở dự án không sửa ZIP gốc. Các module Lua, tài nguyên và dữ liệu game được giữ trong dự án.')}</p>
  </section>
  <section class="guide-step"><h3>{copy('2. Choose what to change','2. Chọn phần cần sửa')}</h3>
    <button disabled={sourceDirty} onclick={()=>onbind(selected)}>{copy('Connect a value or add a data component','Gắn giá trị hoặc thêm thành phần dữ liệu')}</button>
    <label>{copy('Find text or component','Tìm chữ hoặc thành phần')}<input type="search" bind:value={search} placeholder={copy('For example: Inventory','Ví dụ: Túi đồ')} /></label>
    <fieldset class="guide-editor" disabled={sourceDirty}><div class="guide-parts" role="group" aria-label={copy('Components','Thành phần')}>
      {#each parts.slice(0,100) as part (part.id)}<button class:chosen={selected===part.id} aria-pressed={selected===part.id} onclick={()=>selected=part.id}><span>{part.text||typeName(part.type)}</span><small>{typeName(part.type)}{part.dynamic?' · '+copy('game data','dữ liệu game'):''}</small></button>{/each}
      {#if parts.length>100}<p class="muted">{copy('Showing the first 100 components. Search to narrow the list.','Đang hiện 100 thành phần đầu. Nhập từ tìm kiếm để thu hẹp danh sách.')}</p>{/if}
      {#if !parts.length}<p>{copy('No matching components. Try another word.','Không tìm thấy thành phần. Thử từ khác.')}</p>{/if}
    </div><div class="guide-properties">
      {#if current}
        {#if current.editable}<label>{copy('Display text','Chữ hiển thị')}<input bind:value={textDraft} /></label><button disabled={textDraft===current.text} onclick={()=>ontext(current.id,textDraft)}>{copy('Apply text','Áp dụng chữ')}</button>
        {:else if current.dynamic&&['text','button','bar'].includes(current.type)&&textParts(current.text).supported}{#key current.id}<TextPartsEditor text={current.text} disabled={sourceDirty} onapply={request=>onwording(current.id,request)} />{/key}
        {:else if current.dynamic}<p>{copy('Use Connect a value to change the data source, or the full editor for this text template.','Dùng Gắn giá trị để đổi nguồn dữ liệu, hoặc trình soạn thảo đầy đủ cho mẫu chữ này.')}</p>
        {:else}<p>{copy('Edit its colors here, or open the full editor for size, images and layout.','Sửa màu tại đây, hoặc mở trình soạn thảo đầy đủ để chỉnh kích thước, ảnh và bố cục.')}</p>{/if}
        <label class="guide-color">{copy('Text color','Màu chữ')}<input type="color" value={color(current.color,'#edf4ff')} onchange={(e)=>oncolor(current.id,'color',e.currentTarget.value)} /></label>
        <label class="guide-color">{copy('Background color','Màu nền')}<input type="color" value={color(current.background,'#101e30')} onchange={(e)=>oncolor(current.id,'background',e.currentTarget.value)} /></label>
        <p class="muted">{copy('These controls set the normal inline color of this component. Conditional styles and image skins may override it.','Các nút này đặt màu trực tiếp ở trạng thái thường. Style theo điều kiện và vỏ ảnh có thể ghi đè màu.')}</p>
        <button onclick={()=>onselect(current.id)}>{copy('Open in full editor','Mở trong trình soạn thảo')}</button>
        {#if onassets}<button onclick={()=>onassets?.(current.id)}>{copy('Change image or font…','Thay ảnh hoặc font…')}</button>{/if}
      {:else}<p>{copy('Choose a component from the list.','Chọn một thành phần trong danh sách.')}</p>{/if}
    </div></fieldset>
  </section>
  <section class="guide-step"><h3>{copy('3. Check and save a copy','3. Kiểm tra và lưu bản sao')}</h3>
    {#if sourceDirty}<p class="error">{copy('Apply or discard the Code draft before changing or exporting the project.','Áp dụng hoặc bỏ bản nháp Mã nguồn trước khi chỉnh hay xuất dự án.')}</p>{/if}
    {#if status.missingScript}<p class="error">{copy('The declared Lua entry point is missing. Restore it before export.','Thiếu tệp Lua khởi chạy đã khai báo. Hãy khôi phục trước khi xuất.')}</p>
    {:else if !status.hasReader}<p class="muted">{copy('This project has no game reader. Sample values are for the Studio preview; exporting does not make them live game data.','Dự án chưa có bộ đọc game. Giá trị mẫu chỉ dùng xem trước trong Studio; xuất ZIP không biến chúng thành dữ liệu game thật.')}</p>
    {:else}<p class="muted">{copy('The reader is preserved. Browser preview does not execute Lua; test the exported copy on your device.','Bộ đọc được giữ lại. Xem trước trên trình duyệt không chạy Lua; hãy kiểm tra bản sao đã xuất trên thiết bị.')}</p>{/if}
    <div class="guide-actions"><button onclick={ontest}>{copy('Test preview','Xem thử')}</button><button disabled={sourceDirty} onclick={onsave}>{copy('Save editable project','Lưu dự án để sửa tiếp')}</button><button class="primary" disabled={sourceDirty||status.missingScript} onclick={onexport}>{copy('Export companion copy','Xuất bản sao companion')}</button></div>
  </section>
</div></div>

<style>
  .companion-guide{width:min(900px,calc(100vw - 24px));max-height:calc(100dvh - 32px);overflow:auto}.guide-step{border-top:1px solid #425268;padding:14px 0}.guide-step h3{margin:0 0 12px}.guide-step>strong,.guide-step>span{display:inline-block;margin-left:12px}.guide-editor{border:0;padding:0;margin:0;min-width:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}.guide-parts{height:240px;overflow:auto;display:flex;flex-direction:column;gap:4px}.guide-parts button{text-align:left;display:flex;flex-direction:column;flex-shrink:0;max-width:100%}.guide-parts button span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.guide-parts small{opacity:.7;font-size:11px}.guide-properties{min-width:0}.guide-color{display:flex;justify-content:space-between;align-items:center}.guide-color input{width:64px;height:36px;padding:2px}.guide-actions{display:flex;gap:8px;flex-wrap:wrap}.guide-properties p{font-size:13px}.muted{line-height:1.5;color:#c4cede}@media(max-width:600px){.guide-editor{grid-template-columns:1fr}.guide-parts{height:160px}.guide-step>strong,.guide-step>span{display:block;margin:8px 0}.guide-actions button{flex:1 1 100%}}
</style>
