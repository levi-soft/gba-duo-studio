<script lang="ts">
  import { t as uiText } from './i18n.js';
  interface Props {value?:string;label:string;allowPercent?:boolean;allowAuto?:boolean;allowNegative?:boolean;onchange:(value:string)=>void}
  let {value='',label,allowPercent=false,allowAuto=false,allowNegative=false,onchange}:Props=$props();
  let emptyUnit=$state('px');
  const text=$derived(String(value??'').trim());
  const match=$derived(text.match(/^(-?(?:\d+\.?\d*|\.\d+))(px|%)?$/i));
  const unit=$derived(emptyUnit==='custom'?'custom':!text?emptyUnit:text==='auto'?'auto':match&&(!match[2]||match[2].toLowerCase()==='px')?'px':match?.[2]==='%'?'%':'custom');
  const number=$derived(match?match[1]:'');
  function changeNumber(e:Event & {currentTarget:HTMLInputElement}){const v=e.currentTarget.value;if(v===''){onchange('');return;}const n=Number(v);if(Number.isFinite(n)&&(allowNegative||n>=0))onchange(`${n}${unit==='%'?'%':'px'}`);}
  function changeUnit(e:Event & {currentTarget:HTMLSelectElement}){const next=e.currentTarget.value;emptyUnit=next;if(next==='auto'){onchange('auto');return;}if(next==='custom')return;onchange(number!==''?`${number}${next}`:'');}
</script>
<div class="length-input">
  {#if unit==='custom'}<input class="advanced" aria-label={label} value={text} placeholder={$uiText("Giá trị CSS nâng cao")} onchange={(e)=>onchange(e.currentTarget.value)} />
  {:else}<input aria-label={label} type="number" step="any" min={allowNegative?undefined:0} disabled={unit==='auto'} value={number} placeholder={unit==='auto'?$uiText("Tự động"):$uiText("Mặc định")} onchange={changeNumber} />{/if}
  <select aria-label={$uiText("Đơn vị {0}", label)} title={$uiText("Đơn vị được giữ riêng, không cần gõ lại")} value={unit} onchange={changeUnit}><option value="px">px</option>{#if allowPercent||unit==='%'}<option value="%">%</option>{/if}{#if allowAuto||unit==='auto'}<option value="auto">auto</option>{/if}<option value="custom">CSS…</option></select>
</div>
<style>.length-input{display:flex;width:100%;min-width:0;border:1px solid #465166;border-radius:4px;background:#202632;overflow:hidden}.length-input input{flex:1;width:0;min-width:0;border:0;border-radius:0;font-size:11px;padding:6px}.length-input select{flex:0 0 51px;width:51px;min-width:0;border:0;border-left:1px solid #465166;border-radius:0;font-size:10px;padding:4px;color:#9fc5ef;background:#2c3b50}.length-input:focus-within{outline:1px solid #79b5fa}.length-input input:focus-visible,.length-input select:focus-visible{outline:none}.advanced{font-family:Consolas,monospace}</style>
