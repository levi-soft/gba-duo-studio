<script lang="ts">
  import {locale} from './i18n.js';
  import {readGameGraphics,validateGraphicsSpec,graphicsPage,graphicsPalette} from './rom-graphics.js';
  import {memoryHex} from './memory-values.js';
  import type {Manifest,GraphicsSpec,BridgeInfo} from './types.js';
  let {manifest,info,request,oncreate}:{manifest:Manifest;info:BridgeInfo|null;request:(command:string,params?:Record<string,unknown>)=>Promise<BridgeInfo>;oncreate:(key:string,spec:GraphicsSpec,info:BridgeInfo,preview:string)=>void}=$props();
  const copy=(en:string,vi:string)=>$locale==='vi'?vi:en;
  let tiles=$state('0x06010000'),palette=$state('0x05000200'),width=$state(128),height=$state(128),lz77=$state(false),key=$state('romImage');
  let busy=$state(false),error=$state(''),preview=$state(''),loaded=$state<{spec:GraphicsSpec;info:BridgeInfo}|null>(null);
  let savedSource=$state('');
  let gallery=$state<{spec:GraphicsSpec;info:BridgeInfo;preview:string}[]>([]);
  let gallerySource=$state('');
  let colors=$state<{spec:GraphicsSpec;info:BridgeInfo;preview:string}[]>([]);
  let colorSource=$state('');
  async function compareColors(){
    busy=true;error='';
    try{
      const chosen={...spec};
      const image=await readGameGraphics(chosen,(command,params)=>request(command,params),manifest,8);
      if(JSON.stringify(chosen)!==JSON.stringify(spec))throw Error('Settings changed during the read. Preview again.');
      colors=image.variants.map(item=>({spec:item.spec,info:image.info,preview:png(item.rgba,item.width,item.height)}));
      colorSource=JSON.stringify(chosen);
    }catch(e){error=e instanceof Error?e.message:String(e);}finally{busy=false;}
  }
  function chooseColor(index:number){
    const item=colors[index];if(!colorsCurrent||!item)return;
    palette=item.spec.palette;preview=item.preview;loaded={spec:{...item.spec},info:item.info};colorSource=JSON.stringify(item.spec);
  }

  function png(rgba:Uint8ClampedArray,w:number,h:number){
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const context=canvas.getContext('2d');if(!context)throw Error('Canvas is unavailable.');
    const pixels=context.createImageData(w,h);pixels.data.set(rgba);context.putImageData(pixels,0,0);return canvas.toDataURL('image/png');
  }
  async function browse(direction=0,paletteDirection=0){
    busy=true;error='';
    try{
      const original=JSON.stringify(spec);
      const base=(direction||paletteDirection)&&galleryCurrent?gallery[0].spec:{...spec};
      const page=graphicsPage(paletteDirection?graphicsPalette(base,paletteDirection):base,direction);
      const chosen=page.spec,count=page.count;
      const image=await readGameGraphics({...chosen,height:chosen.height*count},(command,params)=>request(command,params),manifest);
      if(original!==JSON.stringify(spec))throw Error('Settings changed during the read. Preview again.');
      gallery=Array.from({length:count},(_,i)=>({spec:{...chosen,tiles:'0x'+(memoryHex(chosen.tiles)+i*chosen.width*chosen.height/2).toString(16).toUpperCase()},info:image.info,preview:png(image.rgba.slice(i*chosen.width*chosen.height*4,(i+1)*chosen.width*chosen.height*4),chosen.width,chosen.height)}));
      tiles=chosen.tiles;palette=chosen.palette;gallerySource=JSON.stringify(chosen);
    }catch(e){error=e instanceof Error?e.message:String(e);}finally{busy=false;}
  }
  function chooseImage(index:number){
    const item=gallery[index];if(!galleryCurrent||!item)return;
    tiles=item.spec.tiles;preview=item.preview;loaded={spec:{...item.spec},info:item.info};
    gallerySource=JSON.stringify(item.spec);
  }
  const spec=$derived<GraphicsSpec>({tiles,palette,width:Number(width),height:Number(height),lz77});
  const colorsCurrent=$derived(colorSource===JSON.stringify(spec)&&colors[0]?.info.sessionId===info?.sessionId&&colors[0]?.info.crc32===info?.crc32);
  const galleryCurrent=$derived(gallerySource===JSON.stringify(spec)&&gallery[0]?.info.sessionId===info?.sessionId&&gallery[0]?.info.crc32===info?.crc32);
  const current=$derived(!!loaded&&JSON.stringify(loaded.spec)===JSON.stringify(spec)&&loaded.info.sessionId===info?.sessionId&&loaded.info.crc32===info?.crc32);
  const supported=$derived(info?.capabilities?.inspect===true);
  const exportable=$derived.by(()=>{try{return memoryHex(spec.tiles)>=0x08000000&&memoryHex(spec.palette)>=0x08000000;}catch{return false;}});
  function preset(kind:string){
    tiles=kind==='obj'?'0x06010000':kind==='bg'?'0x06000000':'0x08000000';
    palette=kind==='obj'?'0x05000200':kind==='bg'?'0x05000000':'0x08000000';width=128;height=128;lz77=false;
  }
  function restore(name:string){const saved=manifest.studioGraphics?.[name];if(!saved)return;key=name;tiles=saved.tiles;palette=saved.palette;width=saved.width;height=saved.height;lz77=saved.lz77;error='';}
  async function load(){
    busy=true;error='';
    try{
      const chosen={...spec};validateGraphicsSpec(chosen);
      const image=await readGameGraphics(chosen,(command,params)=>request(command,params),manifest);
      if(JSON.stringify(chosen)!==JSON.stringify(spec))throw Error('Settings changed during the read. Preview again.');
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      const context=canvas.getContext('2d');if(!context)throw Error('Canvas is unavailable.');
      const pixels=context.createImageData(image.width,image.height);pixels.data.set(image.rgba);context.putImageData(pixels,0,0);
      preview=canvas.toDataURL('image/png');loaded={spec:chosen,info:image.info};
    }catch(e){error=e instanceof Error?e.message:String(e);}finally{busy=false;}
  }
  function create(){try{error='';if(!loaded||!current)throw Error('Preview the current settings and game session first.');oncreate(key.trim(),loaded.spec,loaded.info,preview);}catch(e){error=e instanceof Error?e.message:String(e);}}
</script>
<section class="rom-graphics">
  <h3>{copy('ROM & graphics inspector','Xem ROM và đồ họa game')}</h3>
  <p>{copy('Read graphics from the running game. Adding an image stores its source configuration, not the decoded game artwork.','Đọc ảnh từ game đang chạy. Khi thêm ảnh, dự án chỉ lưu cấu hình nguồn, không lưu hình đã trích từ game.')}</p>
  {#if info}<p class="capability">{info.gameCode} · {copy('Bridge','Bridge')} v{info.bridgeVersion??1} · ROM {((info.romSize??0)/1048576).toFixed(1)} MiB · {supported?copy('ROM / VRAM / palette / OAM available','Đọc được ROM / VRAM / palette / OAM'):copy('Update Plus for graphics inspection','Cần cập nhật Plus để xem đồ họa')}</p>{/if}
  {#if Object.keys(manifest.studioGraphics??{}).length}<label>{copy('Saved image source','Nguồn ảnh đã lưu')}<select bind:value={savedSource} onchange={event=>restore(event.currentTarget.value)}><option value="">—</option>{#each Object.keys(manifest.studioGraphics??{}) as name}<option value={name}>{name}</option>{/each}</select></label>{/if}
  <div class="presets"><button onclick={()=>preset('obj')}>OBJ VRAM</button><button onclick={()=>preset('bg')}>BG VRAM</button><button onclick={()=>preset('rom')}>ROM</button></div>
  <div class="fields">
    <label>{copy('Tile source address','Địa chỉ nguồn tile')}<input bind:value={tiles} /></label><label>{copy('Palette address','Địa chỉ palette')}<input bind:value={palette} /></label>
    <label>{copy('Width','Rộng')}<input type="number" min="8" max="256" step="8" bind:value={width} /></label><label>{copy('Height','Cao')}<input type="number" min="8" max="256" step="8" bind:value={height} /></label>
  </div>
  <label class="check"><input type="checkbox" bind:checked={lz77} />{copy('LZ77 compressed ROM tiles','Tile ROM nén LZ77')}</label>
  <button disabled={busy||!supported} onclick={load}>{busy?copy('Reading…','Đang đọc…'):copy('Preview from game','Xem ảnh từ game')}</button>
  <button disabled={busy||!supported||lz77} onclick={()=>browse()}>{copy('Browse consecutive images','Duyệt các ảnh liên tiếp')}</button>
  <button disabled={busy||!supported} onclick={compareColors}>{copy('Compare 8 palettes','So sánh 8 bảng màu')}</button>
  {#if colors.length}
    <h4>{copy('Choose a palette','Chọn bảng màu')}</h4>
    <p>{copy('Same image, eight consecutive 16-color palettes starting at the palette address above. Click the version with the correct colors.','Cùng một ảnh với tám palette 16 màu liên tiếp, bắt đầu từ địa chỉ bảng màu ở trên. Bấm phiên bản có màu đúng.')}</p>
    <div class="gallery">{#each colors as item,i}<button disabled={busy||!colorsCurrent} onclick={()=>chooseColor(i)} title={item.spec.palette}><img src={item.preview} alt={copy('Palette','Bảng màu')+' '+(i+1)} /><span>{item.spec.palette}</span></button>{/each}</div>
    {#if !colorsCurrent}<p>{copy('Settings or game session changed. Compare palettes again.','Cấu hình hoặc phiên game đã đổi. Hãy so sánh bảng màu lại.')}</p>{/if}
  {/if}
  <div class="presets">
    <button disabled={busy||!supported||lz77} onclick={()=>browse(-1)}>{copy('Previous page','Trang trước')}</button>
    <button disabled={busy||!supported||lz77} onclick={()=>browse(1)}>{copy('Next page','Trang sau')}</button>
    <button disabled={busy||!supported||lz77} onclick={()=>browse(0,-1)}>{copy('Previous palette','Bảng màu trước')}</button>
    <button disabled={busy||!supported||lz77} onclick={()=>browse(0,1)}>{copy('Next palette','Bảng màu sau')}</button>
  </div>
  <p>{copy('Uses the selected width, height and palette to show up to 16 consecutive uncompressed images. Click an image to select its source. This does not automatically recognize game assets.','Dùng kích thước và palette đã chọn để xem tối đa 16 ảnh không nén liên tiếp. Bấm ảnh để chọn nguồn. Công cụ chưa tự nhận dạng tài nguyên game.')}</p>
  {#if gallery.length}
    <div class="gallery">{#each gallery as item,i}<button disabled={busy||!galleryCurrent} onclick={()=>chooseImage(i)} title={item.spec.tiles}><img src={item.preview} alt={copy('Image','Ảnh')+' '+(i+1)} /><span>{item.spec.tiles}</span></button>{/each}</div>
    {#if !galleryCurrent}<p>{copy('Previous results retained. Browse again for the current settings and session.','Đang giữ kết quả cũ. Duyệt lại theo cấu hình và phiên game hiện tại.')}</p>{/if}
  {/if}
  {#if preview}<div class="image-preview" class:stale={!current}><img src={preview} alt={copy('Decoded game graphics','Ảnh giải mã từ game')} /></div><p>{current?copy('Preview matches current settings.','Ảnh khớp cấu hình hiện tại.'):copy('Keeping the previous preview. Read again before adding.','Đang giữ ảnh lần trước. Cần đọc lại trước khi thêm.')}</p>{/if}
  <div class="actions"><label>{copy('Image block key','Khóa block ảnh')}<input bind:value={key} placeholder="romImage" /></label><button class="primary" disabled={busy||!current||!exportable} onclick={create}>{manifest.studioGraphics?.[key.trim()]?copy('Refresh linked image preview','Làm mới ảnh liên kết'):copy('Add bound image','Thêm ảnh liên kết')}</button></div>
  {#if preview&&!exportable}<p>{copy('VRAM is a live inspection preview. To export stable artwork, choose tiles and palette from ROM.','VRAM dùng để xem bộ nhớ đồ họa hiện tại. Để xuất ảnh ổn định, hãy chọn tile và palette từ ROM.')}</p>{/if}
  <p>{copy('This first viewer supports sequential 4bpp tiles, a 16-color palette and ROM LZ77. Portraits assembled from multiple parts and tilemaps need their corresponding layout configuration.','Bản xem đầu hỗ trợ tile 4bpp tuần tự, palette 16 màu và LZ77 từ ROM. Portrait ghép nhiều phần và tilemap cần thêm cấu hình bố cục tương ứng.')}</p>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</section>
<style>.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));gap:8px;margin:12px 0}.gallery button{display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px;background:#192c3b;border:1px solid #628094}.gallery img{width:64px;height:64px;object-fit:contain;image-rendering:pixelated;background:repeating-conic-gradient(#293546 0% 25%,#1b2533 0% 50%) 0 0/12px 12px}.gallery span{font-size:11px}.gallery button:focus-visible{outline:2px solid #a7dcc7}.rom-graphics{margin:18px 0;padding:16px;background:#263b49;border:1px solid #527b87;border-radius:6px}.rom-graphics h3{font-size:16px;margin:0}.rom-graphics p{font-size:12px;line-height:1.6;color:#b8cadb}.capability{color:#a7dcc7!important}.presets{display:flex;gap:8px;margin:12px 0}.fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}.fields label,.actions label{display:flex;flex-direction:column;font-size:12px;gap:5px;margin:0}.fields input,.actions input{font-size:13px}.check{display:flex;align-items:center;gap:8px;font-size:12px}.check input{width:18px;height:18px}.rom-graphics button{font-size:12px}.image-preview{display:flex;align-items:center;justify-content:center;min-height:160px;max-height:360px;padding:14px;margin-top:12px;border:1px solid #53778d;background:repeating-conic-gradient(#293546 0% 25%,#1b2533 0% 50%) 0 0/20px 20px;overflow:auto}.image-preview img{image-rendering:pixelated;object-fit:contain;width:auto;max-width:100%;height:256px}.image-preview.stale{opacity:.6}.actions{display:flex;gap:12px;align-items:end;margin:12px 0}.error{color:#ffb6b6!important}</style>
