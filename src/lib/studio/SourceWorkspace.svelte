<script lang="ts">
  import {tick} from 'svelte';
  import {locale} from './i18n.js';
  import type {Project} from './types.js';
  import {applySourceText,sourcePaths,sourceText,cloneProject} from './source-project.js';
  let {project,onchange,ondirty}:{project:Project;onchange:(next:Project)=>void;ondirty?:(value:boolean)=>void}=$props();
  let path=$state('layout.json'),query=$state(''),newPath=$state(''),error=$state('');
  let drafts=$state<Record<string,string>>({}),bases=$state<Record<string,string>>({});
  const paths=$derived(sourcePaths(project));
  const current=$derived(sourceText(project,path));
  const text=$derived(drafts[path]??current);
  const changed=$derived(drafts[path]!==undefined&&drafts[path]!==current);
  const conflict=$derived(changed&&bases[path]!==current);
  const copy=(en:string,vi:string)=>$locale==='vi'?vi:en;
  let sourceInput:HTMLTextAreaElement;
  // A navigation request switches files without applying or dropping other drafts.
  export function openSource(requestedPath:string){
    try{sourceText(project,requestedPath);path=requestedPath;query='';error='';}catch(e){error=e instanceof Error?e.message:String(e);return;}
    void tick().then(()=>{if(sourceInput?.isConnected)sourceInput.focus();});
  }
  $effect(()=>{ondirty?.(Object.entries(drafts).some(([file,value])=>value!==sourceText(project,file)));});
  function update(value:string){if(drafts[path]===undefined)bases[path]=current;drafts[path]=value;error='';}
  function apply(){try{onchange(applySourceText(project,path,text));delete drafts[path];delete bases[path];error='';}catch(e){error=e instanceof Error?e.message:String(e);}}
  function discard(){delete drafts[path];delete bases[path];error='';}
  function addFile(){try{if(!newPath.trim())return;const name=newPath.trim();if(paths.includes(name)||project.files[name])throw Error(copy('This file already exists.','Tệp này đã tồn tại.'));onchange(applySourceText(project,name,name.endsWith('.lua')?'-- Companion module\nreturn {}\n':''));path=name;newPath='';error='';}catch(e){error=String(e);}}
  function useEntry(){const next=cloneProject(project);next.manifest.script=path;onchange(next);}
</script>

<section class="source-workspace" aria-label={copy('Project source editor','Trình sửa mã nguồn dự án')}>
  <aside class="source-files">
    <div class="source-files-title">{copy('PROJECT FILES','TỆP DỰ ÁN')} <span>{paths.length}</span></div>
    <input aria-label={copy('Search source files','Tìm tệp mã nguồn')} placeholder={copy('Find a file…','Tìm tệp…')} bind:value={query} />
    <nav aria-label={copy('Source files','Tệp mã nguồn')}>
      {#each paths.filter(value=>value.toLowerCase().includes(query.toLowerCase())) as file}
        <button class:chosen={path===file} aria-current={path===file?'page':undefined} onclick={()=>{path=file;error='';}}><span class="file-kind">{file.endsWith('.lua')?'Lua':file.endsWith('.css')?'CSS':'{}'}</span><span>{file}</span>{#if drafts[file]!==undefined}<i aria-label={copy('Unsaved source draft','Bản nháp mã chưa áp dụng')}>●</i>{/if}{#if file===project.manifest.script}<small>{copy('entry','gốc')}</small>{/if}</button>
      {/each}
    </nav>
    <form onsubmit={e=>{e.preventDefault();addFile();}}><label for="new-source-path">{copy('New module or text file','Module hoặc tệp văn bản mới')}</label><input id="new-source-path" bind:value={newPath} placeholder="game.reader.lua" spellcheck="false"/><button type="submit">＋ {copy('Add file','Thêm tệp')}</button></form>
  </aside>
  <div class="source-document">
    <div class="source-document-bar"><strong>{path}</strong><span>{copy('Entry script','Script gốc')}: <code>{project.manifest.script??'—'}</code></span>{#if path.endsWith('.lua')&&path!==project.manifest.script&&project.files[path]}<button onclick={useEntry}>{copy('Use as entry','Dùng làm script gốc')}</button>{/if}<button disabled={!changed||conflict} class="primary" onclick={apply}>{copy('Apply changes','Áp dụng thay đổi')}</button></div>
    {#if conflict}<div class="source-message conflict" role="alert">{copy('This file changed outside the editor. Your draft is kept. Reload this file before editing again.','Tệp đã thay đổi ngoài trình sửa. Bản nháp được giữ lại. Nạp lại tệp trước khi sửa tiếp.')}<button onclick={discard}>{copy('Reload file','Nạp lại tệp')}</button></div>{/if}
    {#if error}<p class="source-message error" role="alert">{error}</p>{/if}
    <div class="code-surface"><textarea bind:this={sourceInput} aria-label={copy('Source code','Mã nguồn')} value={text} oninput={e=>update(e.currentTarget.value)} onkeydown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();if(!conflict)apply();}}} spellcheck="false" wrap="off"></textarea></div>
    <div class="source-status"><span>{text.split('\n').length} {copy('lines','dòng')} · {changed?copy('Unapplied draft','Bản nháp chưa áp dụng'):copy('Matches project','Khớp dự án')}</span><span>Ctrl+Enter · {copy('Apply','Áp dụng')}{#if changed&&!conflict}<button onclick={discard}>{copy('Discard draft','Bỏ bản nháp')}</button>{/if}</span></div>
  </div>
</section>
<style>
  .source-workspace{display:grid;grid-template-columns:220px minmax(0,1fr);flex:1;min-height:0;background:#161d27;border:1px solid #354355;border-radius:6px;overflow:hidden}.source-files{display:flex;flex-direction:column;min-height:0;background:#202936;border-right:1px solid #354355;padding:12px 8px;gap:10px}.source-files-title{display:flex;justify-content:space-between;font-size:10px;letter-spacing:1px;color:#9aafc4}.source-files input{font-size:12px}.source-files nav{flex:1;overflow:auto;min-height:100px}.source-files nav button{display:flex;align-items:center;gap:7px;width:100%;text-align:left;background:transparent;padding:9px 6px;min-width:0;font-size:12px}.source-files nav button>span:nth-child(2){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.file-kind{color:#79c7b9;font-size:10px;flex-shrink:0}.source-files i{color:#e8b66b}.source-files small{margin-left:auto;color:#9bb0c6;font-size:9px}.source-files form{display:grid;gap:7px;border-top:1px solid #354355;padding-top:10px}.source-files label{font-size:11px;margin:0}.source-document{display:flex;flex-direction:column;min-width:0;min-height:0}.source-document-bar{display:flex;align-items:center;gap:12px;padding:9px 12px;border-bottom:1px solid #354355;min-height:44px;flex-wrap:wrap}.source-document-bar strong{font:12px Consolas,monospace}.source-document-bar>span{margin-left:auto;font-size:10px;color:#98a9bc}.source-document-bar button{font-size:11px}.code-surface{flex:1;min-height:180px;display:flex}.code-surface textarea{resize:none;flex:1;min-width:0;border:0;border-radius:0;background:#161d27;padding:18px;color:#d7e1ee;font:13px/1.65 Consolas,"Cascadia Code",monospace;tab-size:2}.source-status{display:flex;justify-content:space-between;align-items:center;padding:6px 12px;background:#202936;border-top:1px solid #354355;color:#a0b1c5;font-size:10px;gap:10px}.source-status button{padding:3px 6px;margin-left:8px}.source-message{padding:10px 12px;margin:0;font-size:12px;line-height:1.5}.conflict{background:#50432c;color:#f0d399}.conflict button{margin-left:10px}@media(max-width:700px){.source-workspace{grid-template-columns:135px minmax(0,1fr)}.source-files{padding:8px 4px}.source-files nav button{gap:4px;font-size:10px}.source-document-bar{gap:7px;padding:8px}.source-document-bar>span{margin-left:0}.code-surface textarea{font-size:12px;padding:10px}.source-status{flex-wrap:wrap}}
</style>
