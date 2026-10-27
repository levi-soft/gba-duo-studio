<script lang="ts">
  import {locale} from './i18n.js';import type {LayoutNode} from './types.js';
  let {node,onstyle}:{node:LayoutNode;onstyle:(changes:Record<string,string>)=>void}=$props();
  const copy=(en:string,vi:string)=>$locale==='vi'?vi:en;
</script>
<section class="quick-layout" aria-label={copy('Quick layout','Bố cục nhanh')}>
  <h3>{copy('Layout','Bố cục')}</h3>
  <div class="size-fields"><label>{copy('Width','Rộng')}<input aria-label={copy('Quick width','Chiều rộng nhanh')} value={String(node.style?.width??'')} placeholder={copy('Inherited','Kế thừa')} onchange={e=>onstyle({width:e.currentTarget.value})}/></label><label>{copy('Height','Cao')}<input aria-label={copy('Quick height','Chiều cao nhanh')} value={String(node.style?.height??'')} placeholder={copy('Inherited','Kế thừa')} onchange={e=>onstyle({height:e.currentTarget.value})}/></label></div>
  <div class="sizing"><button onclick={()=>onstyle({width:'100%'})}>{copy('Fill width','Đầy chiều rộng')}</button><button onclick={()=>onstyle({width:'auto',height:'auto'})}>{copy('Hug content','Vừa nội dung')}</button></div>
  {#if ['row','column'].includes(node.type)}<div class="sizing"><button aria-pressed={node.style?.['flex-direction']==='row'||(!node.style?.['flex-direction']&&node.type==='row')} onclick={()=>onstyle({'flex-direction':'row'})}>↔ {copy('Row','Hàng')}</button><button aria-pressed={node.style?.['flex-direction']==='column'||(!node.style?.['flex-direction']&&node.type==='column')} onclick={()=>onstyle({'flex-direction':'column'})}>↕ {copy('Column','Cột')}</button></div>{/if}
  {#if node.children}<div class="size-fields"><label>Gap<input value={String(node.style?.gap??'')} placeholder="0" onchange={e=>onstyle({gap:e.currentTarget.value})}/></label><label>Padding<input value={String(node.style?.padding??'')} placeholder="0" onchange={e=>onstyle({padding:e.currentTarget.value})}/></label></div>{/if}
</section>
<style>.quick-layout{padding:12px;border-bottom:1px solid #425064}.quick-layout h3{font-size:11px;text-transform:uppercase;letter-spacing:.8px;margin:0 0 8px;color:#a5b9cc}.size-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px}.size-fields label{margin:0 0 8px;font-size:10px;gap:4px}.size-fields input{font-size:12px;padding:6px}.sizing{display:flex;gap:6px;margin-bottom:8px}.sizing button{font-size:10px;flex:1;padding:6px}.sizing button[aria-pressed=true]{background:#2d635e;color:#d8fff4}</style>
