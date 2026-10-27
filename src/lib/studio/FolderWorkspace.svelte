<script lang="ts">
  import {locale} from './i18n.js';
  import type {Project} from './types.js';
  import {readProjectFolder,saveProjectFolder,inspectProjectFolder,incomingSourceAction,type ProjectFolder} from './project-folder.js';
  interface Props {project:Project;dirty:boolean;sourceDirty?:boolean;onreplace:(project:Project,reason:string)=>void;onsaved:(saved:Project)=>void}
  let {project,dirty,sourceDirty=false,onreplace,onsaved}:Props=$props();
  let folder=$state<ProjectFolder|null>(null),version=$state(''),busy=$state(false),conflict=$state(false),message=$state(''),error=$state('');
  const copy=(en:string,vi:string)=>$locale==='vi'?vi:en;
  type Picker=(options:{mode:'readwrite';id:string})=>Promise<ProjectFolder>;
  function picker():Picker {const fn=(window as unknown as {showDirectoryPicker?:Picker}).showDirectoryPicker;if(!fn)throw Error(copy('Folder editing needs desktop Chrome or Edge. JSON and ZIP still work.','Sửa thư mục cần Chrome hoặc Edge trên máy tính. Vẫn dùng được JSON và ZIP.'));return fn.bind(window);}
  function failed(e:unknown){if(e instanceof DOMException&&e.name==='AbortError')return;error=e instanceof Error?e.message:String(e);}
  async function open(){busy=true;error='';try{const selected=await picker()({mode:'readwrite',id:'companion-project'});const next=await readProjectFolder(selected);folder=selected;version=next.version;conflict=false;onreplace(next.project,copy('Opened source folder','Đã mở thư mục mã nguồn'));message=copy('Watching source files','Đang theo dõi tệp nguồn');}catch(e){failed(e);}finally{busy=false;}}
  async function save(){if(busy||conflict)return;if(sourceDirty){error=copy('Apply or discard your Code drafts before saving the folder.','Áp dụng hoặc bỏ bản nháp trong Mã nguồn trước khi lưu thư mục.');return;}busy=true;error='';try{const saving=project;const target=folder??await picker()({mode:'readwrite',id:'companion-project'});const result=await saveProjectFolder(target,saving,folder?version:undefined);folder=target;version=result.version;conflict=false;onsaved(saving);message=copy('Saved to source folder','Đã lưu vào thư mục nguồn');}catch(e){failed(e);}finally{busy=false;}}
  async function reload(){if(!folder)return;busy=true;error='';try{const next=await readProjectFolder(folder);version=next.version;conflict=false;onreplace(next.project,copy('Reloaded external changes; Undo keeps the previous document','Đã nạp thay đổi bên ngoài; Hoàn tác giữ tài liệu trước'));message=copy('External changes loaded','Đã nạp thay đổi bên ngoài');}catch(e){failed(e);}finally{busy=false;}}
  export function saveWorkspace(){return save();}
  export function connected(){return folder!==null;}
  export function clearWorkspace(){folder=null;version='';conflict=false;message='';error='';}
  $effect(()=>{
    const target=folder,baseline=version,modified=dirty||sourceDirty;
    if(!target||busy)return;
    let stopped=false,timer:ReturnType<typeof setTimeout>;
    async function poll(){
      try{
        if(document.hidden)return;
        const actual=await inspectProjectFolder(target!);if(stopped)return;
        const decision=incomingSourceAction(modified,baseline,actual);
        if(decision==='conflict'){conflict=true;message=copy('External changes + unsaved visual edits','Tệp bên ngoài thay đổi và giao diện chưa lưu');}
        else if(decision==='reload'){const next=await readProjectFolder(target!);if(stopped)return;version=next.version;error='';conflict=false;onreplace(next.project,copy('Updated from source files','Đã cập nhật từ tệp nguồn'));message=copy('Updated from source files','Đã cập nhật từ tệp nguồn');}
      }catch(e){if(!stopped)failed(e);}finally{if(!stopped)timer=setTimeout(poll,1800);}
    }
    timer=setTimeout(poll,1800);return()=>{stopped=true;clearTimeout(timer);};
  });
</script>
<div class="folder-workspace" class:has-error={!!error} class:has-conflict={conflict} aria-label={copy('Source folder connection','Kết nối thư mục nguồn')}>
  <div class="folder-actions"><button disabled={busy} onclick={open}>{copy('Open folder','Mở thư mục')}</button><button disabled={busy||conflict} onclick={save}>{copy('Save to folder','Lưu vào thư mục')}</button>{#if folder}<button disabled={busy} onclick={reload}>{copy('Reload','Nạp lại')}</button>{/if}</div>
  <span class="folder-state" role="status">{busy?copy('Working…','Đang xử lý…'):folder?'▣ '+folder.name+' · '+message:copy('Codex workflow · open a source folder or save this project to an empty folder','Luồng Codex · mở thư mục nguồn hoặc lưu dự án vào thư mục trống')}</span>
  {#if conflict}<span class="folder-conflict" role="alert">{copy('Review before saving. Reload preserves your current document in Undo.','Xem lại trước khi lưu. Nạp lại giữ tài liệu hiện tại trong Hoàn tác.')}</span>{/if}
  {#if error}<span class="folder-error" role="alert">{error}</span>{/if}
</div>
<style>
  .folder-workspace{display:flex;align-items:center;flex-wrap:wrap;gap:8px 14px;padding:7px 12px;border-bottom:1px solid #364354;background:#1e2934;font-size:11px;flex-shrink:0}.folder-actions{display:flex;gap:5px;flex-wrap:wrap}.folder-actions button{font-size:11px;padding:5px 9px;border:1px solid #465668;background:#2a3746}.folder-state{color:#a4b9c9;min-width:0;overflow-wrap:anywhere}.folder-conflict,.folder-error{flex-basis:100%;color:#f1cc88;line-height:1.5}.has-conflict,.has-error{background:#3c3428;border-color:#8b6e40}.folder-error{color:#ffbfad}@media(max-width:700px){.folder-workspace{padding:7px 8px;gap:7px}.folder-state{font-size:10px}}
</style>
