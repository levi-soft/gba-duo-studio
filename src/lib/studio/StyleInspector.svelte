<script lang="ts">
  import { t as uiText } from './i18n.js';
  import StyleField from './StyleField.svelte';
  import {styleGroups,styleTargets} from './style-schema.js';
  import {styleValues} from './style-model.js';
  import type {LayoutNode} from './types.js';
  interface Props {node:LayoutNode;snapshot?:{values:Record<string,string>;sources:Record<string,string>};fonts?:{family:string;path:string;declared?:boolean}[];assets?:string[];target?:string;appearance?:string;ontarget:(value:string)=>void;onstate:(value:string)=>void;onchange:(changes:Record<string,string>)=>void}
  let {node,snapshot={values:{},sources:{}},fonts=[],assets=[],target='self',appearance='normal',ontarget,onstate,onchange}:Props=$props();
  let search=$state('');
  let styleError=$state('');
  const overrides=$derived(styleValues(node,target,appearance));
  const targets=$derived(styleTargets(node));
  const related=(key:string)=>key==='border-radius'?['border-top-left-radius','border-top-right-radius','border-bottom-right-radius','border-bottom-left-radius']:['padding','margin'].includes(key)?['top','right','bottom','left'].map(s=>`${key}-${s}`):key==='border'?['border-top','border-right','border-bottom','border-left','border-color','border-width','border-style']:key==='background'?['background-color','background-image','background-size','background-position','background-repeat']:[];
  function change(key:string,value:string){
    if(value && !(key==='display'&&value==='stack') && !CSS.supports(key,value)){styleError=$uiText("Giá trị chưa hợp lệ cho {0}: {1}", key, value);return;}
    styleError='';const changes=Object.fromEntries(related(key).map(k=>[k,'']));changes[key]=value;onchange(changes);
  }
  const groupShown=(group:{name:string})=>!search||$uiText(group.name).toLocaleLowerCase().includes(search.toLocaleLowerCase())||group.name.toLocaleLowerCase().includes(search.toLocaleLowerCase());
</script>
<section class="style-inspector">
  <div class="style-scope"><label>{$uiText("Phần cần chỉnh")}<select aria-label={$uiText("Phần cần chỉnh")} value={target} onchange={(e)=>ontarget(e.currentTarget.value)}>{#each targets as t}<option value={t.key}>{$uiText(t.label)}</option>{/each}</select></label><label>{$uiText("Trạng thái")}<select aria-label={$uiText("Trạng thái hình thức")} value={appearance} onchange={(e)=>onstate(e.currentTarget.value)}>{#each [['normal',$uiText("Bình thường")],['active',$uiText("Đang chọn")],['pressed',$uiText("Đang nhấn")],['disabled',$uiText("Vô hiệu hóa")]] as [key,label]}<option value={key}>{label}</option>{/each}</select></label></div>
  <p class="hint">{$uiText("Giá trị đọc từ CSS của template. Sửa ở đây chỉ tác động phần đang chọn; ↶ bỏ sửa riêng để trở về CSS. Đơn vị px của pack là dp Android.")}</p>
  {#if node.bindStyle&&Object.keys(node.bindStyle).length}<p class="hint dynamic">{$uiText("Có style động theo dữ liệu:")} {Object.keys(node.bindStyle).join(', ')}{$uiText(". Chỉnh quy tắc trong “Điều kiện & dữ liệu động” khi dữ liệu đang ghi đè hình thức.")}</p>{/if}
  <input aria-label={$uiText("Tìm thuộc tính hình thức")} placeholder={$uiText("Tìm viền, bo góc, nền, bóng…")} bind:value={search} />
  {#if styleError}<p class="error" role="alert">{styleError}</p>{/if}
  {#each styleGroups as group}
    {@const fields=group.fields.filter(f=>groupShown(group)||$uiText(f.label).toLocaleLowerCase().includes(search.toLocaleLowerCase())||f.key.includes(search.toLocaleLowerCase()))}
    {#if fields.length}<details open={group.name==="Kích thước & vị trí"||!!search}><summary>{$uiText(group.name)}</summary>{#each fields as field}
      <div class="style-property" data-style-key={field.key}><div class="property-title"><span>{$uiText(field.label)}</span><span class:edited={overrides[field.key]!=null}>{overrides[field.key]!=null?$uiText("Sửa riêng"):'CSS'}</span><button title={$uiText("Trả {0} về CSS gốc", $uiText(field.label))} aria-label={$uiText("Trả {0} về CSS gốc", $uiText(field.label))} disabled={![field.key,...related(field.key)].some(k=>overrides[k]!=null)} onclick={()=>change(field.key,'')}>↶</button></div>
      <StyleField {field} value={String(snapshot.values?.[field.key]??overrides[field.key]??'')} {fonts} {assets} onchange={(value)=>change(field.key,value)} />
      {#if snapshot.sources?.[field.key]}<small class="source" title={snapshot.sources[field.key]}>{snapshot.sources[field.key]}</small>{/if}</div>
    {/each}</details>{/if}
  {/each}
</section>
<style>
  .style-inspector{min-width:0}.style-scope{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 8px;background:#253246;border:1px solid #405776;border-radius:4px}.style-scope select{font-size:11px}.hint{font-size:10px;line-height:1.6;color:#9ab0cc}.dynamic{color:#e6c38a}.style-inspector>input{font-size:11px;margin:3px 0 8px}.style-property{padding:8px 0 10px;border-top:1px solid #43516a}.property-title{display:flex;gap:5px;align-items:center;margin-bottom:6px;font-size:11px}.property-title>span:first-child{flex:1}.property-title>span:nth-child(2){font-size:9px;color:#8aa1bd}.property-title>span.edited{color:#91d3b1}.property-title button{font-size:12px;padding:2px 6px}.source{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;color:#879fbe;margin-top:5px}
</style>
