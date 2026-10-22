<script lang="ts">
  import { t as uiText } from './i18n.js';
  import {validatePulse} from './pulse-values.js';
  import type {PulseConfig} from './types.js';
  interface Props {config?:PulseConfig;fields?:{path:string;label:string}[];onchange:(config:PulseConfig)=>void}
  let {config,fields=[],onchange}:Props=$props();
  let output=$state(''),source=$state(''),error=$state('');
  const sources=$derived(fields.filter(f=>/^[A-Za-z_][A-Za-z0-9_]*$/.test(f.path)));
  function commit(next:PulseConfig){try{validatePulse(next);onchange(next);error='';return true;}catch(e){error=e instanceof Error?e.message:String(e);return false;}}
  function binding(name:string,value:string){const bindings={...config?.bindings};if(value)bindings[name]=value;else delete bindings[name];commit({periodMs:config?.periodMs??1000,bindings});}
</script>
<p class="hint">{$uiText("Chu kỳ dùng chung cho dự án. Trường đầu ra bật/tắt theo nhịp khi điều kiện có giá trị; dùng nó trong “Đổi lớp CSS theo dữ liệu” để đổi màu.")}</p>
<label>{$uiText("Chu kỳ (ms)")}<input aria-label={$uiText("Chu kỳ nhấp nháy")} type="number" min="400" max="10000" step="100" value={config?.periodMs??1000} onchange={(e)=>commit({periodMs:Number(e.currentTarget.value),bindings:{...config?.bindings}})} /></label>
{#each Object.entries(config?.bindings??{}) as [name,condition]}
  <div class="pulse-rule"><code>{name}</code><select aria-label={$uiText("Điều kiện nhấp nháy {0}", name)} value={condition} onchange={(e)=>binding(name,e.currentTarget.value)}>{#each sources as f}<option value={f.path}>{f.path}</option>{/each}{#if !sources.some(f=>f.path===condition)}<option value={condition}>{condition}</option>{/if}</select><button aria-label={$uiText("Xóa nhấp nháy {0}", name)} onclick={()=>binding(name,'')}>{$uiText("×")}</button></div>
{/each}
<label>{$uiText("Trường đầu ra mới")}<input aria-label={$uiText("Trường nhấp nháy mới")} placeholder={$uiText("Ví dụ: damageFlash")} bind:value={output} /></label>
<label>{$uiText("Bật khi trường có giá trị")}<select aria-label={$uiText("Điều kiện nhấp nháy mới")} bind:value={source}><option value="">{$uiText("Chọn trường…")}</option>{#each sources as f}<option value={f.path}>{f.label}</option>{/each}</select></label>
<button disabled={!output.trim()||!source} onclick={()=>{const bindings={...config?.bindings,[output.trim()]:source};if(commit({periodMs:config?.periodMs??1000,bindings})){output='';source='';}}}>{$uiText("＋ Thêm nhấp nháy")}</button>
{#if error}<p class="error" role="alert">{$uiText(error)}</p>{/if}
<style>.hint{font-size:10px;line-height:1.5;color:#8da2bc}.pulse-rule{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:4px;margin:7px 0;align-items:center}.pulse-rule code{overflow-wrap:anywhere;font-size:10px}.pulse-rule select{min-width:0;font-size:10px}.pulse-rule button{padding:3px 7px}button{font-size:10px}</style>
