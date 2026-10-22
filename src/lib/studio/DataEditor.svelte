<script lang="ts">
  import { t as uiText } from './i18n.js';
  import type {JsonValue} from './types.js';
  interface Props {value:JsonValue;onchange:(path:(string|number)[],value:JsonValue)=>void}
  let {value,onchange}:Props=$props();
</script>
{#snippet field(v:JsonValue|undefined,path:(string|number)[],label:string,depth:number)}
  {#if v!==null&&typeof v==='object'}
    <details class="data-group" open={depth<2}><summary>{label} <small>{Array.isArray(v)?$uiText("{0} phần tử", v.length):$uiText("{0} trường", Object.keys(v).length)}</small></summary>
      {#if Array.isArray(v)}<div class="array-tools"><button onclick={()=>onchange(path,[...v,v.length?JSON.parse(JSON.stringify(v.at(-1))):{}])}>{$uiText("＋ Thêm phần tử")}</button>{#if v.length}<button onclick={()=>onchange(path,v.slice(0,-1))}>{$uiText("− Bỏ phần tử cuối")}</button>{/if}</div>{/if}
      {#each Object.entries(v) as [key,child]}{@render field(child,[...path,Array.isArray(v)?Number(key):key],Array.isArray(v)?$uiText("Phần tử {0}", Number(key)+1):key,depth+1)}{/each}
    </details>
  {:else}
    <label class="data-field"><span>{label}</span>{#if typeof v==='boolean'}<input type="checkbox" aria-label={$uiText("Dữ liệu {0}", path.join('.'))} checked={v} onchange={(e)=>onchange(path,e.currentTarget.checked)} />{:else if typeof v==='number'}<input aria-label={$uiText("Dữ liệu {0}", path.join('.'))} type="number" step="any" value={v} onchange={(e)=>{if(e.currentTarget.value!=='')onchange(path,Number(e.currentTarget.value));}} />{:else}<input aria-label={$uiText("Dữ liệu {0}", path.join('.'))} value={v??''} onchange={(e)=>onchange(path,e.currentTarget.value)} />{/if}</label>
  {/if}
{/snippet}
{@render field(value,[],$uiText("Dữ liệu mẫu"),0)}
<style>.data-group{padding:6px 10px;border:1px solid #45566d;border-radius:4px;margin:6px 0;background:#283447}.data-group summary{cursor:pointer;font-size:12px;padding:7px 0}.data-group small{color:#879db9;margin-left:8px;font-size:10px}.data-field{display:grid;grid-template-columns:minmax(90px,1fr) minmax(100px,2fr);gap:12px;align-items:center;margin:6px 0}.data-field>span{font:11px Consolas,monospace;overflow-wrap:anywhere}.data-field input{font-size:12px}.data-field input[type=checkbox]{width:18px;height:18px;accent-color:#69aaed}.array-tools{display:flex;gap:6px;margin:8px 0}.array-tools button{font-size:10px}</style>
