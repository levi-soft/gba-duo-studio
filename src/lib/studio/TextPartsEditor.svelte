<script lang="ts">
  import {locale} from './i18n.js';
  import {textParts,editedTextParts,textPartsError,type TextPartsRequest} from './text-parts.js';
  let {text,disabled=false,onapply}:{text:string;disabled?:boolean;onapply:(request:TextPartsRequest)=>string}=$props();
  const copy=(en:string,vi:string)=>$locale==='vi'?vi:en;
  const parts=$derived(textParts(text));
  let original=$state(''),literals=$state<string[]>([]),applyError=$state('');
  $effect(()=>{if(original!==text){original=text;literals=[...parts.literals];applyError='';}});
  const preview=$derived.by(()=>{try{return {text:editedTextParts({original,literals}),error:''};}catch(error){return {text:'',error:textPartsError(error,$locale)};}});
  function apply(){if(disabled||preview.error||preview.text===text)return;applyError=onapply({original,literals:[...literals]});}
</script>
{#if parts.supported}
  <fieldset class="text-parts" {disabled}>
    <legend>{copy('Edit wording around game data','Sửa chữ quanh dữ liệu game')}</legend>
    <p>{copy('Edit the text boxes. Data values stay in their original order.','Sửa các ô chữ. Giá trị dữ liệu giữ nguyên thứ tự ban đầu.')}</p>
    {#each literals as literal,index}
      <label>{index<parts.tokens.length?copy('Text before data value ','Chữ trước dữ liệu ')+(index+1):copy('Text after the last value','Chữ sau dữ liệu cuối')}
        <textarea rows="2" maxlength="16384" value={literal} oninput={e=>{literals[index]=e.currentTarget.value;applyError='';}}></textarea>
      </label>
      {#if parts.tokens[index]}<div class="kept-data"><span>{copy('Data kept','Giữ dữ liệu')}</span><code>{parts.tokens[index]}</code></div>{/if}
    {/each}
    {#if preview.error||applyError}<p class="error" role="alert">{applyError||preview.error}</p>{:else}<p>{copy('Text to save','Chuỗi sẽ lưu')}</p><pre>{preview.text}</pre>{/if}
    <button disabled={disabled||!!preview.error||preview.text===text} onclick={apply}>{copy('Apply wording','Áp dụng phần chữ')}</button>
  </fieldset>
{/if}
<style>
  .text-parts{min-width:0;padding:12px;margin:0 0 12px;border:1px solid #526076;border-radius:5px}.text-parts legend{font-weight:600}.text-parts p{font-size:13px;line-height:1.5}.text-parts label{display:block;margin:10px 0;font-size:13px}.text-parts textarea{width:100%;box-sizing:border-box;resize:vertical;margin-top:5px}.kept-data{display:flex;gap:8px;align-items:center;flex-wrap:wrap;color:#c4cede;font-size:12px}.kept-data code{padding:4px 6px;background:#20334b;overflow-wrap:anywhere}.text-parts pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;background:#20334b;padding:8px}
</style>
