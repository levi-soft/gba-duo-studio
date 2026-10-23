<script lang="ts">
  import {locale} from './i18n.js';
  import {findDataBlocks,requireBlockSuggestion} from './block-search.js';
  import type {Manifest} from './types.js';
  let {manifest,onbar}:{manifest:Manifest;onbar:(current:string,maximum:string)=>void}=$props();
  let query=$state(''),error=$state('');
  const copy=(en:string,vi:string)=>$locale==='vi'?vi:en;
  const result=$derived(findDataBlocks(manifest,query));
  function create(current:string,maximum:string){
    try{error='';requireBlockSuggestion(manifest,query,current,maximum);onbar(current,maximum);}
    catch(e){error=e instanceof Error?e.message:String(e);}
  }
</script>
<section class="block-search" aria-label={copy('Find data blocks','Tìm block dữ liệu')}>
  <h3>{copy('Find data blocks','Tìm block dữ liệu')}</h3>
  <p>{copy('Describe what you need in English or Vietnamese. This local search uses the loaded profile; it does not discover unknown RAM addresses.','Nhập nhu cầu bằng tiếng Việt hoặc tiếng Anh. Công cụ tìm trong profile đã nạp; chưa tự dò địa chỉ RAM chưa biết.')}</p>
  <label>{copy('What do you want to show?','Bạn muốn hiển thị gì?')}<input type="search" bind:value={query} placeholder={copy('Find HP of the selected unit','Tìm HP của unit đang chọn')} /></label>
  <div class="examples"><button onclick={()=>query=copy('Find unit HP','Tìm máu của unit')}>{copy('Unit HP','Máu của unit')}</button><button onclick={()=>query=copy('Find HP of the selected unit','Tìm HP của unit đang chọn')}>{copy('Selected unit HP','HP của unit đang chọn')}</button></div>
  {#if query.trim()}
    {#if result.intent==='unknown'}<p role="status">{copy('This first version recognizes HP / health requests. Try “Find unit HP”.','Bản thử đầu nhận yêu cầu về HP / máu. Thử “Tìm máu của unit”.')}</p>
    {:else if !result.results.length}<p role="status">{copy('No complete HP block pair found. Import a data profile or save the two numeric blocks first.','Chưa tìm thấy cặp block HP đầy đủ. Hãy nhập profile hoặc lưu hai block số trước.')}</p>
    {:else}
      {#each result.results as suggestion}
        <article class:mismatch={!suggestion.compatible}>
          <div class="heading"><strong>{suggestion.subject}</strong><span>{suggestion.scope==='fixed-unit'?copy('Fixed unit','Unit cố định'):suggestion.scope==='selected-unit'?copy('Selected unit','Unit đang chọn'):copy('Scope unspecified','Chưa rõ đối tượng')}</span></div>
          <p class="source">{copy('Source','Nguồn')}: {manifest.studioProfileName??copy('Project fields','Trường dữ liệu dự án')} · {suggestion.verified?copy('Profile marked verified','Profile đánh dấu đã kiểm chứng'):copy('Needs verification','Cần kiểm chứng')}</p>
          <div class="pair"><span>{suggestion.currentLabel}<small>{suggestion.current}</small></span><span>{suggestion.maximumLabel}<small>{suggestion.maximum}</small></span></div>
          {#if !suggestion.compatible}<p class="notice">{copy('This profile cannot confirm HP of the selected unit. A fixed or unverified unit is not a substitute.','Profile này chưa xác nhận được HP của unit đang chọn. Không thể thay bằng unit cố định hoặc dữ liệu chưa kiểm chứng.')}</p>
          {:else if suggestion.scope==='fixed-unit'}<p class="notice">{copy('Follows this fixed unit/slot, not the game cursor.','Theo unit/slot cố định này, không theo con trỏ game.')}</p>
          {:else if suggestion.scope==='unknown'}<p class="notice">{copy('Field names suggest HP, but their owner has not been specified. Check the values in game.','Tên trường gợi ý HP nhưng chưa xác định thuộc unit nào. Cần đối chiếu trong game.')}</p>{/if}
          <button class="primary" disabled={!suggestion.compatible} onclick={()=>create(suggestion.current,suggestion.maximum)}>{copy('Create HP bar from these blocks','Tạo thanh HP từ các block này')}</button>
        </article>
      {/each}
    {/if}
  {/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</section>
<style>
  .block-search{border:1px solid #577da4;border-radius:6px;background:#233a51;padding:16px;margin-bottom:18px}.block-search h3{font-size:16px;margin:0 0 8px}.block-search p{font-size:12px;line-height:1.6;color:#c0d0e2}.block-search label{display:flex;flex-direction:column;gap:7px;font-size:13px}.block-search input{font-size:15px;padding:11px}.examples{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.examples button{font-size:12px}article{border:1px solid #52826f;border-radius:5px;background:#213c3a;padding:14px;margin-top:14px}article.mismatch{background:#433c30;border-color:#8e7950}.heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.heading strong{font-size:15px}.heading>span{font-size:12px;padding:3px 7px;background:#162c3e;border-radius:4px}.source{font-size:11px!important;color:#a6bfd5!important}.pair{display:flex;gap:12px;flex-wrap:wrap}.pair>span{padding:8px 12px;border:1px solid #55758a;border-radius:4px;font-size:14px}.pair small{display:block;font-size:11px;color:#b6c9db;margin-top:5px}.notice{color:#f2d299!important}.block-search .error{color:#ffb6b6}.primary{font-size:13px}
</style>
