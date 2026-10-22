<script lang="ts">
  import { t as uiText } from './i18n.js';
  import {asciiByte,ramText,firstRamValues} from './ram-data.js';
  interface Props {memory:{address:number;bytes:Uint8Array};changed?:number[]}
  let {memory,changed=[]}:Props=$props();
  let encoding=$state('ascii'),selectedOffset=$state(0),previousKey='';
  $effect(()=>{const key=memory.address+':'+memory.bytes.length;if(key!==previousKey){previousKey=key;selectedOffset=0;}});
  const rows=$derived(Array.from({length:Math.ceil(memory.bytes.length/16)},(_,i)=>({offset:i*16,address:memory.address+i*16,bytes:memory.bytes.slice(i*16,i*16+16)})));
  const values=$derived(firstRamValues(memory.bytes.subarray(selectedOffset)));
  const text=$derived(ramText(memory.bytes,encoding));
  const changedSet=$derived(new Set(changed));
  const hex=(n:number,width=8)=>Number(n).toString(16).toUpperCase().padStart(width,'0');
</script>
<div class="memory-summary"><strong>0x{hex(memory.address)}–0x{hex(memory.address+memory.bytes.length-1)}</strong><span>{memory.bytes.length} byte · {rows.length} {$uiText("dòng ·")} {changed.length} {$uiText("byte đổi ở lần đọc gần nhất")}</span></div>
<p class="selected-value">{$uiText("Ô chọn 0x")}{hex(memory.address+selectedOffset)}: u8 = {values.u8??'—'} · u16 = {values.u16??'—'} · u32 = {values.u32??'—'} (little-endian)</p>
<div class="hex-table"><table aria-label={$uiText("Bảng RAM hex và ASCII")}><thead><tr><th>{$uiText("Địa chỉ")}</th>{#each Array.from({length:16},(_,i)=>i) as i}<th>{hex(i,2)}</th>{/each}<th class="ascii">{$uiText("Chữ ASCII")}</th></tr></thead><tbody>{#each rows as row}<tr><th>0x{hex(row.address)}</th>{#each Array.from({length:16},(_,i)=>i) as i}<td class:changed={changedSet.has(row.offset+i)} class:selected={selectedOffset===row.offset+i}>{#if i<row.bytes.length}<button aria-label={`Byte 0x${hex(row.address+i)}`} title={$uiText("Thập phân: {0} · ASCII: {1}", row.bytes[i], asciiByte(row.bytes[i]))} onclick={()=>selectedOffset=row.offset+i}>{hex(row.bytes[i],2)}</button>{/if}</td>{/each}<td class="ascii">{#each row.bytes as byte,i}<span class:changed={changedSet.has(row.offset+i)} class:selected={selectedOffset===row.offset+i}>{asciiByte(byte)}</span>{/each}</td></tr>{/each}</tbody></table></div>
<p class="text-hint">{$uiText("Mỗi dòng là 16 byte. Dấu “.” là byte không in được bằng ASCII; ô vàng là byte vừa thay đổi. Bấm ô hex để xem giá trị số tại địa chỉ đó.")}</p>
<div class="text-heading"><strong>{$uiText("Xem vùng nhớ dưới dạng chữ")}</strong><select aria-label={$uiText("Bảng mã xem RAM")} bind:value={encoding}><option value="ascii">ASCII</option><option value="utf-8">UTF-8</option><option value="utf-16le">UTF-16 LE</option></select></div>
<pre class="text-preview" aria-label={$uiText("Nội dung RAM dạng chữ")}>{text}</pre>
<p class="text-hint">{$uiText("Đây là cách diễn giải byte thành chữ. Nếu game dùng bảng mã riêng hoặc dữ liệu nén, cần bộ giải mã tương ứng để đọc đúng nội dung hội thoại.")}</p>
<style>
  .memory-summary{display:flex;gap:15px;flex-wrap:wrap;color:#b9d5f3;font-size:12px;margin:10px 0}.memory-summary span,.selected-value{font-size:11px;color:#a5b6cb}.hex-table{overflow:auto;max-height:480px;border:1px solid #46566e;border-radius:4px}.hex-table table{border-collapse:separate;border-spacing:0;font:12px/1.6 Consolas,monospace;white-space:nowrap;width:max-content;min-width:100%}.hex-table th,.hex-table td{padding:3px 5px;border-bottom:1px solid #3b495d;text-align:center}.hex-table th{color:#92bfea;background:#2c394e}.hex-table thead th{position:sticky;top:0;z-index:2}.hex-table tbody th{position:sticky;left:0;z-index:1;text-align:left}.hex-table td{color:#d2dfef}.hex-table td button{font:inherit;padding:0 2px;background:none;border:0;color:inherit;cursor:pointer}.hex-table td.selected,.ascii span.selected{outline:1px solid #87baff;outline-offset:-1px;background:#365b80}.hex-table .changed{background:#665125;color:#ffe29b}.hex-table .ascii{border-left:1px solid #506078;padding-left:12px;text-align:left;letter-spacing:1px}.ascii span{display:inline-block;min-width:1ch}.text-hint{font-size:10px;color:#98aac2;line-height:1.6}.text-heading{display:flex;align-items:center;gap:15px;margin:16px 0 8px;font-size:12px}.text-heading select{width:145px;font-size:11px}.text-preview{white-space:pre-wrap;overflow-wrap:anywhere;max-height:200px;overflow:auto;background:#1e2837;border:1px solid #42536c;padding:10px;color:#c9d9ec;font:12px/1.7 Consolas,monospace}
</style>
