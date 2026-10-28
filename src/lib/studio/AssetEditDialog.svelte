<script lang="ts">
  import {onMount} from 'svelte';
  import {locale} from './i18n.js';
  import {isImageAsset,isFontAsset} from './assets.js';
  import {assetTargets,assetEditSnapshot,assetPreviewSource,readAssetUpload,assetEditError,type AssetTarget,type AssetSource,type AssetPreviewSource,type AssetEditRequest} from './asset-editing.js';
  import AssetPreview from './AssetPreview.svelte';
  import type {Project} from './types.js';
  let {project,nodeId,sourceDirty,onclose,onapply}:{project:Project;nodeId:string;sourceDirty:boolean;onclose:()=>void;onapply:(request:AssetEditRequest)=>string}=$props();
  const copy=(en:string,vi:string)=>$locale==='vi'?vi:en;
  let key=$state(''),snapshot=$state(''),mode=$state('existing'),path=$state(''),upload=$state<AssetSource|null>(null),descendants=$state(false),replaceBinding=$state(false),search=$state('');
  let reading=$state(false),readError=$state<unknown>(null),applyError=$state(''),previewStatus=$state.raw<{source:AssetPreviewSource;state:string}|null>(null);
  let controller:AbortController|undefined,readVersion=0,fileInput:HTMLInputElement,closeButton:HTMLButtonElement;
  const targets=$derived(assetTargets(project,nodeId)),target=$derived(targets.find(t=>t.key===key));
  const paths=$derived(Object.keys(project.files).filter(p=>p.startsWith('assets/')&&(target?.kind==='image'?isImageAsset(p):isFontAsset(p))).sort());
  const shown=$derived(paths.filter(p=>!search||p.toLocaleLowerCase().includes(search.toLocaleLowerCase())));
  const source=$derived(mode==='upload'?upload:path?{type:'existing' as const,path,bytes:project.files[path]}:null);
  const preview=$derived.by(()=>{try{return {source:source&&target?assetPreviewSource(project,source,target.kind):null,error:''};}catch(error){return {source:null,error:assetEditError(error,$locale)};}});
  const ready=$derived(!!preview.source&&previewStatus?.source===preview.source&&previewStatus?.state==='ready');
  const canApply=$derived(!sourceDirty&&!reading&&!readError&&!preview.error&&!!source&&!!target&&ready&&(!target.binding||replaceBinding));
  function targetName(t:AssetTarget){
    if(t.key==='src')return copy('Image','Ảnh');
    if(t.kind==='font')return t.tabId?copy('Tab label font: ','Font tên tab: ')+(t.tabTitle||t.tabId):copy('Component font','Font thành phần');
    const state=t.state==='normal'?copy('Normal','Bình thường'):t.state==='pressed'?copy('Pressed','Đang nhấn'):copy('Selected','Đang chọn');
    return (t.tabId?copy('Tab image: ','Ảnh tab: ')+(t.tabTitle||t.tabId):copy('Button image','Ảnh nút'))+' · '+state;
  }
  function cancelRead(){readVersion++;controller?.abort();controller=undefined;reading=false;}
  function setTarget(value:string){cancelRead();key=value;mode='existing';path='';upload=null;descendants=false;replaceBinding=false;readError=null;applyError='';previewStatus=null;search='';try{snapshot=assetEditSnapshot(project,nodeId,value);}catch(error){readError=error;}}
  function setScope(value:boolean){descendants=value;applyError='';try{snapshot=assetEditSnapshot(project,nodeId,key,value);readError=null;}catch(error){snapshot='';readError=error;}}
  async function chooseFile(){
    const file=fileInput.files?.[0];fileInput.value='';if(!file||!target)return;
    cancelRead();const version=readVersion;controller=new AbortController();reading=true;mode='upload';upload=null;readError=null;applyError='';
    try{const result=await readAssetUpload(file,target.kind,controller.signal);if(version===readVersion)upload=result;}
    catch(error){if(version===readVersion)readError=error;}
    finally{if(version===readVersion){reading=false;controller=undefined;}}
  }
  function apply(){if(!canApply||!source)return;applyError=onapply({nodeId,target:key,snapshot,source,descendants,replaceBinding});if(!applyError)onclose();}
  function keys(e:KeyboardEvent){
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onclose();}
    if(e.key==='Tab'){const all=[...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)')].filter(el=>el.offsetParent!==null);if(e.shiftKey&&document.activeElement===all[0]){e.preventDefault();all.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===all.at(-1)){e.preventDefault();all[0]?.focus();}}
  }
  onMount(()=>{const previous=document.activeElement;if(targets[0])setTarget(targets[0].key);closeButton?.focus();return()=>{cancelRead();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};});
</script>
<div class="modal-backdrop"><div class="modal asset-edit" role="dialog" aria-modal="true" aria-label={copy('Change image or font','Thay ảnh hoặc font')} tabindex="-1" onkeydown={keys}>
  <div class="modal-title"><h2>{copy('Change image or font','Thay ảnh hoặc font')}</h2><button bind:this={closeButton} aria-label={copy('Close asset editor','Đóng phần thay ảnh/font')} onclick={onclose}>✕</button></div>
  <p>{copy('Selected component: ','Thành phần đang chọn: ')}<code>{nodeId}</code></p>
  <fieldset disabled={sourceDirty}>
    <label>{copy('Part to change','Phần cần đổi')}<select value={key} onchange={e=>setTarget(e.currentTarget.value)}>{#each targets as option}<option value={option.key}>{targetName(option)}</option>{/each}</select></label>
    {#if !targets.length}<p>{copy('Select an editable image or text component first.','Chọn thành phần ảnh hoặc chữ có thể sửa trước.')}</p>{/if}
    <label>{copy('Asset source','Nguồn tài nguyên')}<select bind:value={mode} onchange={()=>{cancelRead();applyError='';readError=null;}}><option value="existing">{copy('Use an existing asset','Dùng tài nguyên có sẵn')}</option><option value="upload">{copy('Choose a new file','Chọn tệp mới')}</option></select></label>
    {#if mode==='existing'}
      <label>{copy('Find an asset','Tìm tài nguyên')}<input type="search" bind:value={search} /></label>
      <label>{copy('Asset to use','Tài nguyên sẽ dùng')}<select bind:value={path} onchange={()=>{applyError='';}}><option value="">{copy('Choose…','Chọn…')}</option>{#if path&&!shown.includes(path)}<option value={path}>{path}</option>{/if}{#each shown as item}<option value={item}>{item.slice(7)}</option>{/each}</select></label>
      {#if !paths.length}<p>{copy('No matching assets yet. Choose a new file.','Chưa có tài nguyên phù hợp. Hãy chọn tệp mới.')}</p>{/if}
    {:else}<button disabled={reading} onclick={()=>fileInput.click()}>{copy('Choose image/font file…','Chọn tệp ảnh/font…')}</button>{#if upload?.type==='upload'}<p>{upload.name}</p>{/if}{#if reading}<p role="status">{copy('Reading file…','Đang đọc tệp…')}</p>{/if}{/if}
    <input bind:this={fileInput} hidden type="file" accept={target?.kind==='image'?'.png,.jpg,.jpeg,.webp,.gif':'.ttf,.otf'} onchange={chooseFile} />
    <p class="hint">{target?.kind==='image'?copy('Android images: PNG, JPEG, WebP or still GIF. Convert SVG to PNG before choosing it.','Ảnh Android: PNG, JPEG, WebP hoặc GIF tĩnh. Chuyển SVG sang PNG trước khi chọn.'):copy('Android fonts: TTF or OTF. Web fonts (WOFF/WOFF2) cannot be applied.','Font Android: TTF hoặc OTF. Không áp dụng font web WOFF/WOFF2.')}</p>
    {#if target?.binding}<label class="check"><input type="checkbox" bind:checked={replaceBinding} />{copy('Use a static image in place of this game-data image','Dùng ảnh tĩnh thay cho ảnh từ dữ liệu game này')}</label>{/if}
    {#if target?.key==='font'}<label class="check"><input type="checkbox" checked={descendants} onchange={e=>setScope(e.currentTarget.checked)} />{copy('Apply font to all content inside this component','Áp dụng font cho cả nội dung bên trong thành phần này')}</label>{/if}
    {#if preview.source}{@const viewed=preview.source}{#key viewed}<AssetPreview source={viewed} onstate={state=>{previewStatus={source:viewed,state};}} />{/key}{/if}
  </fieldset>
  <p class="hint">{copy('Only the chosen component/state changes. New files with an existing name are kept separately. Undo restores the previous selection.','Chỉ đổi thành phần/trạng thái đã chọn. Tệp mới trùng tên được lưu riêng. Hoàn tác khôi phục lựa chọn trước.')}</p>
  {#if target?.kind==='font'}<p class="hint">{copy('The sample shows this font. Conditional styles and explicit child fonts can affect the final appearance; check the full preview after applying.','Mẫu chữ hiển thị font này. Style theo điều kiện và font riêng của thành phần con có thể ảnh hưởng kết quả; xem thử giao diện sau khi áp dụng.')}</p>{/if}
  {#if sourceDirty}<p class="error" role="alert">{copy('Apply or discard the Code draft before changing assets.','Áp dụng hoặc bỏ bản nháp Mã nguồn trước khi thay tài nguyên.')}</p>{/if}
  {#if readError||preview.error||applyError}<p class="error" role="alert">{applyError||preview.error||assetEditError(readError,$locale)}</p>{/if}
  <div class="actions"><button onclick={onclose}>{copy('Cancel','Hủy')}</button><button class="primary" disabled={!canApply} onclick={apply}>{copy('Apply asset','Áp dụng tài nguyên')}</button></div>
</div></div>
<style>.asset-edit{width:min(640px,calc(100vw - 24px));max-height:calc(100dvh - 32px);overflow:auto}.asset-edit fieldset{border:0;min-width:0;margin:0;padding:0}.asset-edit label{display:block;margin-bottom:12px}.asset-edit label>input,.asset-edit label>select{width:100%;margin-top:5px;box-sizing:border-box}.asset-edit .check{display:flex;flex-direction:row;align-items:start;gap:8px;line-height:1.5}.asset-edit .check>input{width:auto;flex-shrink:0}.asset-edit code{overflow-wrap:anywhere}.hint{font-size:13px;line-height:1.5;color:#c4cede}.actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}</style>
