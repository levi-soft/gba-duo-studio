<script lang="ts">
  import {onMount} from 'svelte';
  import {locale} from './i18n.js';
  import type {AssetPreviewSource} from './asset-editing.js';
  let {source,onstate}:{source:AssetPreviewSource;onstate:(state:'loading'|'ready'|'error')=>void}=$props();
  let active=true,fontFamily=$state(''),failed=$state(false);
  const copy=(en:string,vi:string)=>$locale==='vi'?vi:en;
  const mime=$derived(({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',svg:'image/svg+xml',webp:'image/webp',gif:'image/gif',ttf:'font/ttf',otf:'font/otf',woff:'font/woff',woff2:'font/woff2'} as Record<string,string>)[source.path.split('.').pop()!.toLowerCase()]);
  const url=$derived(`data:${mime};base64,${source.bytes}`);
  function loaded(){if(active)onstate('ready');}
  function error(){if(active){failed=true;onstate('error');}}
  onMount(()=>{
    onstate('loading');let face:FontFace|undefined;
    if(source.kind==='font'){
      try{
        const family='StudioAssetPreview_'+crypto.randomUUID().replaceAll('-','');face=new FontFace(family,`url("${url}")`);
        void face.load().then(loadedFace=>{if(active){document.fonts.add(loadedFace);fontFamily=family;loaded();}}).catch(error);
      }catch{error();}
    }
    return()=>{active=false;if(face)document.fonts?.delete(face);};
  });
</script>
<div class="asset-preview" aria-label={copy('Selected asset preview','Xem trước tài nguyên đã chọn')}>
  {#if source.kind==='image'}<img src={url} alt={copy('Image to apply','Ảnh sẽ áp dụng')} onload={loaded} onerror={error} />
  {:else}<p class="font-sample" style:font-family={fontFamily?JSON.stringify(fontFamily):'sans-serif'}>Tiếng Việt: Trường học · Á Ắ Ậ Ê Ỗ Ư Ỹ Đ<br/>Aa Bb 0123456789</p>{/if}
  {#if failed}<p class="error" role="alert">{copy('The browser could not decode this file. Choose another asset.','Trình duyệt không đọc được ảnh/font này. Hãy chọn tệp khác.')}</p>{/if}
</div>
<style>.asset-preview{padding:14px;border:1px solid #526076;border-radius:5px;min-height:90px;background:repeating-conic-gradient(#445066 0% 25%,#303c50 0% 50%) 0/16px 16px}.asset-preview img{display:block;max-width:100%;max-height:220px;margin:auto;object-fit:contain}.font-sample{font-size:25px;line-height:1.6;overflow-wrap:anywhere;margin:0;color:#fff;background:#20334b;padding:8px}.error{background:#20334b;padding:8px}</style>
