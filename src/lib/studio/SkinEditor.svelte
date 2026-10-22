<script lang="ts">
  import { t as uiText } from './i18n.js';
  import type {Skin,JsonValue} from './types.js';
  interface Props {value?:Skin;assets?:string[];files?:Record<string,string>;onchange:(value:Skin)=>void;allowSelected?:boolean;name?:string;onadd?:()=>void}
  let { value = {}, assets = [], files = {}, onchange, allowSelected = false, name = $uiText("Nút"), onadd }:Props = $props();
  const states = $derived([['normal',$uiText("Bình thường (Normal)")],['pressed',$uiText("Đang nhấn (Pressed)")],['selected',$uiText("Đang chọn (Selected)")]]);
  function update(key:string, v:JsonValue) { onchange({height:96,fit:'contain',showLabel:false,...value,[key]:v}); }
  function imageUrl(path:unknown) {
    if(typeof path!=='string')return '';
    const ext=path.split('.').pop()?.toLowerCase()??'';
    const mime=({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',svg:'image/svg+xml',gif:'image/gif',webp:'image/webp'} as Record<string,string>)[ext];
    return mime && files[path] ? `data:${mime};base64,${files[path]}` : '';
  }
</script>
<div class="skin-editor">
  <strong>{$uiText("Ảnh cho")} {name}</strong>
  {#each states.filter(([key]) => allowSelected || key !== 'selected') as [key,label]}
    <label>{label}<div class="asset-row"><select aria-label={`${name}: ${label}`} value={value[key] ?? ''} onchange={(e) => update(key,e.currentTarget.value)}><option value="">{key === 'normal' ? $uiText("Không dùng ảnh") : $uiText("Giữ hình trạng thái trước")}</option>{#each assets as path}<option value={path}>{path.slice(7)}</option>{/each}</select>{#if value[key] && imageUrl(value[key])}<img src={imageUrl(value[key])} alt={$uiText("Ảnh {0}", label)} />{/if}</div></label>
  {/each}
  <button onclick={onadd}>{$uiText("＋ Thêm ảnh")}</button>
  <div class="dimensions"><label>{$uiText("Rộng (px)")}<input aria-label={$uiText("{0}: Rộng (px)", name)} type="number" min="1" placeholder={$uiText("Tự động")} value={value.width ?? ''} onchange={(e) => update('width',e.currentTarget.value ? Number(e.currentTarget.value) : null)} /></label><label>{$uiText("Cao (px)")}<input aria-label={$uiText("{0}: Cao (px)", name)} type="number" min="1" placeholder="96" value={value.height ?? ''} onchange={(e) => update('height',e.currentTarget.value ? Number(e.currentTarget.value) : null)} /></label></div>
  <label>{$uiText("Cách hiển thị ảnh")}<select aria-label={$uiText("{0}: Cách hiển thị ảnh", name)} value={value.fit ?? 'contain'} onchange={(e) => update('fit',e.currentTarget.value)}><option value="contain">{$uiText("Giữ tỷ lệ, vừa nút")}</option><option value="cover">{$uiText("Phủ kín, cắt phần dư")}</option><option value="stretch">{$uiText("Kéo giãn theo nút")}</option></select></label>
  <label class="checkbox"><input type="checkbox" checked={value.showLabel ?? false} onchange={(e) => update('showLabel',e.currentTarget.checked)} />{$uiText("Hiện chữ trên ảnh")}</label>
  <label class="checkbox"><input type="checkbox" checked={value.transparentBackground ?? true} onchange={(e) => update('transparentBackground',e.currentTarget.checked)} />{$uiText("Nền nút trong suốt")}</label>
  <button onclick={() => onchange({})}>{$uiText("Bỏ các ảnh trạng thái")}</button>
  <p>{$uiText("Pressed chỉ hiện khi giữ.")} {allowSelected ? $uiText("Selected giữ nguyên khi tab đang được chọn.") : $uiText("Chọn hành động khi chạm ở phần Tương tác.")}</p>
</div>
<style>
  .skin-editor{border:1px solid #4c6078;border-radius:4px;background:#263246;padding:9px;margin:9px 0}.skin-editor>strong{font-size:11px;color:#b9d8fa}.skin-editor label{font-size:10px}.asset-row{display:flex;align-items:center;gap:5px}.asset-row select{flex:1;font-size:10px}.asset-row img{width:32px;height:32px;object-fit:contain;background:repeating-conic-gradient(#637080 0% 25%,#394655 0% 50%) 0/10px 10px;border:1px solid #58697f}.dimensions{display:flex;gap:6px}.dimensions label{flex:1;min-width:0}.checkbox{flex-direction:row;align-items:center;gap:6px}.checkbox input{width:auto}.skin-editor p{font-size:10px;line-height:1.5;color:#91a7c3}.skin-editor button{font-size:10px}
</style>
