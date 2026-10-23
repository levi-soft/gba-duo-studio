<script lang="ts">
  import {locale} from './i18n.js';
  import {parseFieldInfo} from './data-profiles.js';
  import type {Manifest,FieldInfo} from './types.js';
  let {manifest,onchange}:{manifest:Manifest;onchange:(info:Record<string,FieldInfo>)=>void}=$props();
  const copy=(en:string,vi:string)=>$locale==='vi'?vi:en;
  let key=$state(''),semantic=$state<FieldInfo['semantic']>('hp.current'),scope=$state<FieldInfo['scope']>('unknown'),subject=$state(''),label=$state(''),verified=$state(false),error=$state('');
  function load(){const meta=manifest.studioFieldInfo?.[key];semantic=meta?.semantic??'hp.current';scope=meta?.scope??'unknown';subject=meta?.subject??'';label=meta?.label??'';verified=meta?.verified??false;}
  function save(){
    try{error='';const info=parseFieldInfo({...manifest.studioFieldInfo,[key]:{semantic,scope,subject,label,verified}},manifest.values??{});onchange(info);}
    catch(e){error=e instanceof Error?e.message:String(e);}
  }
</script>
<details class="field-descriptions">
  <summary>{copy('Describe blocks for natural-language search','Mô tả block để tìm bằng lời')}</summary>
  <p>{copy('Profile authors describe a field once. Searching then uses this meaning; a numeric address alone does not identify its owner.','Người tạo profile mô tả trường một lần. Tìm kiếm dùng ý nghĩa này; chỉ địa chỉ số chưa xác định được trường thuộc unit nào.')}</p>
  <div class="form">
    <label>{copy('Data block','Block dữ liệu')}<select bind:value={key} onchange={(event)=>{key=event.currentTarget.value;load();}}><option value="">—</option>{#each Object.keys(manifest.values??{}) as name}<option value={name}>{name}</option>{/each}</select></label>
    <label>{copy('Meaning','Ý nghĩa')}<select bind:value={semantic}><option value="hp.current">{copy('Current HP','HP hiện tại')}</option><option value="hp.maximum">{copy('Maximum HP','HP tối đa')}</option></select></label>
    <label>{copy('Applies to','Áp dụng cho')}<select bind:value={scope}><option value="unknown">{copy('Unspecified','Chưa xác định')}</option><option value="fixed-unit">{copy('Fixed unit / slot','Unit / slot cố định')}</option><option value="selected-unit">{copy('Selected unit','Unit đang chọn')}</option></select></label>
    <label>{copy('Owner / group','Đối tượng / nhóm')}<input bind:value={subject} placeholder={copy('Same owner for current and maximum HP','Cùng đối tượng cho HP hiện tại và tối đa')} /></label>
    <label>{copy('Display label','Tên hiển thị')}<input bind:value={label} /></label>
  </div>
  <label class="verified"><input type="checkbox" bind:checked={verified} />{copy('I have checked this meaning and scope in game','Tôi đã kiểm tra ý nghĩa và đối tượng này trong game')}</label>
  <button disabled={!key||!subject.trim()} onclick={save}>{copy('Save block description','Lưu mô tả block')}</button>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</details>
<style>.field-descriptions{margin:16px 0;padding:12px;border:1px solid #4c6480;border-radius:5px;background:#29364a}.field-descriptions summary{font-size:13px;cursor:pointer}.field-descriptions p{font-size:12px;line-height:1.6;color:#afc2d8}.form{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:12px 0}.form label{font-size:12px;display:flex;flex-direction:column;gap:5px;margin:0}.form input,.form select{font-size:13px}.verified{display:flex;align-items:center;gap:8px;font-size:12px}.verified input{width:18px;height:18px}.field-descriptions button{font-size:12px;margin-top:10px}.error{color:#ffb4b4!important}</style>
