<script lang="ts">
  import {locale} from './i18n.js';
  import {readGameGraphics,validateGraphicsSpec,validateGraphicsSpecs,complexGraphics,graphicsPage,graphicsPalette} from './rom-graphics.js';
  import {memoryHex} from './memory-values.js';
  import type {Manifest,GraphicsSpec,GraphicsPart,BridgeInfo} from './types.js';
  let {manifest,info,request,oncreate}:{manifest:Manifest;info:BridgeInfo|null;request:(command:string,params?:Record<string,unknown>)=>Promise<BridgeInfo>;oncreate:(key:string,spec:GraphicsSpec,info:BridgeInfo,preview:string)=>void}=$props();
  const copy=(en:string,vi:string)=>$locale==='vi'?vi:en;
  let tiles=$state('0x06010000'),palette=$state('0x05000200'),width=$state(128),height=$state(128),lz77=$state(false),key=$state('romImage');
  let mode=$state<'tiles'|'sprite'>('tiles'),tilesIndirect=$state(false),paletteIndirect=$state(false),tilesOffset=$state(0),paletteOffset=$state(0);
  let parts=$state<GraphicsPart[]>([{x:0,y:0,w:16,h:16,tile:0,bank:0,hflip:false,vflip:false}]);
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
    applySpec(item.spec);preview=item.preview;loaded={spec:{...item.spec},info:item.info};colorSource=JSON.stringify(item.spec);
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
      applySpec(chosen);gallerySource=JSON.stringify(chosen);
    }catch(e){error=e instanceof Error?e.message:String(e);}finally{busy=false;}
  }
  function chooseImage(index:number){
    const item=gallery[index];if(!galleryCurrent||!item)return;
    applySpec(item.spec);preview=item.preview;loaded={spec:{...item.spec},info:item.info};
    gallerySource=JSON.stringify(item.spec);
  }
  const spec=$derived<GraphicsSpec>({tiles,palette,width:Number(width),height:Number(height),lz77:mode==='sprite'?false:lz77,
    ...(tilesIndirect?{tilesIndirect:true}:{}),...(paletteIndirect?{paletteIndirect:true}:{}),
    ...(tilesOffset?{tilesOffset:Number(tilesOffset)}:{}),...(paletteOffset?{paletteOffset:Number(paletteOffset)}:{}),
    ...(mode==='sprite'?{kind:'sprite',parts:parts.map(p=>({...p}))}:{})});
  const complex=$derived(complexGraphics(spec));
  function sameSession(a:BridgeInfo|undefined,b:BridgeInfo|null){return !!a&&!!b&&a.sessionId===b.sessionId&&a.crc32===b.crc32&&a.gameCode===b.gameCode&&a.deviceSerial===b.deviceSerial;}
  const colorsCurrent=$derived(colorSource===JSON.stringify(spec)&&sameSession(colors[0]?.info,info));
  const galleryCurrent=$derived(gallerySource===JSON.stringify(spec)&&sameSession(gallery[0]?.info,info));
  const current=$derived(!!loaded&&JSON.stringify(loaded.spec)===JSON.stringify(spec)&&sameSession(loaded.info,info));
  const supported=$derived(info?.capabilities?.inspect===true);
  const exportable=$derived.by(()=>{try{validateGraphicsSpecs({image:spec});return true;}catch{return false;}});
  function preset(kind:string){
    tiles=kind==='obj'?'0x06010000':kind==='bg'?'0x06000000':'0x08000000';
    palette=kind==='obj'?'0x05000200':kind==='bg'?'0x05000000':'0x08000000';width=128;height=128;lz77=false;tilesIndirect=false;paletteIndirect=false;tilesOffset=0;paletteOffset=0;mode='tiles';
  }
  function applySpec(saved:GraphicsSpec){tiles=saved.tiles;palette=saved.palette;width=saved.width;height=saved.height;lz77=saved.lz77;mode=saved.kind??'tiles';tilesIndirect=saved.tilesIndirect??false;paletteIndirect=saved.paletteIndirect??false;tilesOffset=saved.tilesOffset??0;paletteOffset=saved.paletteOffset??0;if(saved.parts)parts=saved.parts.map(p=>({...p}));}
  function restore(name:string){const saved=manifest.studioGraphics?.[name];if(!saved)return;key=name;applySpec(saved);error='';}
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
    }catch(e){loaded=null;error=e instanceof Error?e.message:String(e);}finally{busy=false;}
  }
  function create(){try{error='';if(!loaded||!current)throw Error('Preview the current settings and game session first.');oncreate(key.trim(),loaded.spec,loaded.info,preview);}catch(e){error=e instanceof Error?e.message:String(e);}}
</script>
<section class="rom-graphics">
  <h3>{copy('ROM & graphics inspector','Xem ROM và đồ họa game')}</h3>
  <p>{copy('Read graphics from the running game. Adding an image stores its source configuration, not the decoded game artwork.','Đọc ảnh từ game đang chạy. Khi thêm ảnh, dự án chỉ lưu cấu hình nguồn, không lưu hình đã trích từ game.')}</p>
  {#if info}<p class="capability">{info.gameCode} · {copy('Bridge','Bridge')} v{info.bridgeVersion??1} · ROM {((info.romSize??0)/1048576).toFixed(1)} MiB · {supported?copy('ROM / VRAM / palette / OAM available','Đọc được ROM / VRAM / palette / OAM'):copy('Update Plus for graphics inspection','Cần cập nhật Plus để xem đồ họa')}</p>{/if}
  {#if Object.keys(manifest.studioGraphics??{}).length}<label>{copy('Saved image source','Nguồn ảnh đã lưu')}<select bind:value={savedSource} onchange={event=>restore(event.currentTarget.value)}><option value="">—</option>{#each Object.keys(manifest.studioGraphics??{}) as name}<option value={name}>{name}</option>{/each}</select></label>{/if}
  <div class="presets"><button onclick={()=>preset('obj')}>OBJ VRAM</button><button onclick={()=>preset('bg')}>BG VRAM</button><button onclick={()=>preset('rom')}>ROM</button></div>
  <label>{copy('Image layout','Bố cục ảnh')}<select bind:value={mode}><option value="tiles">{copy('Sequential tiles','Tile tuần tự')}</option><option value="sprite">{copy('Sprite parts · 1D tiles','Ghép mảnh · tile 1D')}</option></select></label>
  <div class="fields">
    <label>{copy('Tile source address','Địa chỉ nguồn tile')}<input bind:value={tiles} /></label><label>{copy('Palette address','Địa chỉ palette')}<input bind:value={palette} /></label>
    <label>{copy('Width','Rộng')}<input type="number" min="8" max="256" step="8" bind:value={width} /></label><label>{copy('Height','Cao')}<input type="number" min="8" max="256" step="8" bind:value={height} /></label>
  </div>
  <div class="fields"><label class="check"><input type="checkbox" bind:checked={tilesIndirect} />{copy('Tile address contains a ROM pointer','Địa chỉ tile chứa con trỏ ROM')}</label><label class="check"><input type="checkbox" bind:checked={paletteIndirect} />{copy('Palette address contains a ROM pointer','Địa chỉ palette chứa con trỏ ROM')}</label><label>{copy('Tile offset in bytes (after pointer)','Độ lệch tile theo byte (sau con trỏ)')}<input type="number" step="1" bind:value={tilesOffset} /></label><label>{copy('Palette offset in bytes (after pointer)','Độ lệch palette theo byte (sau con trỏ)')}<input type="number" step="1" bind:value={paletteOffset} /></label></div>
  {#if mode==='tiles'}<label class="check"><input type="checkbox" bind:checked={lz77} />{copy('LZ77 compressed ROM tiles','Tile ROM nén LZ77')}</label>{:else}
    <p>{copy('Parts use raw 1D-mapped tiles. Tile numbers count 32-byte tiles; palette banks count 32-byte palettes. Earlier parts cover later parts.','Mảnh dùng tile thô theo ánh xạ 1D. Số tile tính theo khối 32 byte; bank palette tính theo bảng màu 32 byte. Mảnh trước nằm trên mảnh sau.')}</p>
    <div class="part-list">{#each parts as part,index}<fieldset><legend>{copy('Part','Mảnh')} {index+1}</legend><div class="fields">
      <label>X<input type="number" min="-64" max="256" bind:value={part.x} /></label><label>Y<input type="number" min="-64" max="256" bind:value={part.y} /></label>
      <label>{copy('Width','Rộng')}<select bind:value={part.w}>{#each [8,16,32,64] as size}<option value={size}>{size}</option>{/each}</select></label><label>{copy('Height','Cao')}<select bind:value={part.h}>{#each [8,16,32,64] as size}<option value={size}>{size}</option>{/each}</select></label>
      <label>{copy('First tile number','Số tile đầu')}<input type="number" min="0" max="65535" bind:value={part.tile} /></label><label>{copy('Palette bank','Bank palette')}<input type="number" min="0" max="15" bind:value={part.bank} /></label>
      <label class="check"><input type="checkbox" bind:checked={part.hflip} />{copy('Flip horizontally','Lật ngang')}</label><label class="check"><input type="checkbox" bind:checked={part.vflip} />{copy('Flip vertically','Lật dọc')}</label>
      <button disabled={parts.length===1} onclick={()=>parts=parts.filter((_,i)=>i!==index)}>{copy('Remove part','Bỏ mảnh')}</button>
      <button disabled={index===0} onclick={()=>{const next=[...parts];[next[index-1],next[index]]=[next[index],next[index-1]];parts=next;}}>{copy('Move forward','Đưa lên trước')}</button>
    </div></fieldset>{/each}</div>
    <button disabled={parts.length>=32} onclick={()=>parts=[...parts,{x:0,y:0,w:16,h:16,tile:0,bank:0,hflip:false,vflip:false}]}>{copy('Add part','Thêm mảnh')}</button>
  {/if}
  <button disabled={busy||!supported} onclick={load}>{busy?copy('Reading…','Đang đọc…'):copy('Preview from game','Xem ảnh từ game')}</button>
  <button disabled={busy||!supported||lz77||complex} onclick={()=>browse()}>{copy('Browse consecutive images','Duyệt các ảnh liên tiếp')}</button>
  <button disabled={busy||!supported||complex} onclick={compareColors}>{copy('Compare 8 palettes','So sánh 8 bảng màu')}</button>
  {#if colors.length}
    <h4>{copy('Choose a palette','Chọn bảng màu')}</h4>
    <p>{copy('Same image, eight consecutive 16-color palettes starting at the palette address above. Click the version with the correct colors.','Cùng một ảnh với tám palette 16 màu liên tiếp, bắt đầu từ địa chỉ bảng màu ở trên. Bấm phiên bản có màu đúng.')}</p>
    <div class="gallery">{#each colors as item,i}<button disabled={busy||!colorsCurrent} onclick={()=>chooseColor(i)} title={item.spec.palette}><img src={item.preview} alt={copy('Palette','Bảng màu')+' '+(i+1)} /><span>{item.spec.palette}</span></button>{/each}</div>
    {#if !colorsCurrent}<p>{copy('Settings or game session changed. Compare palettes again.','Cấu hình hoặc phiên game đã đổi. Hãy so sánh bảng màu lại.')}</p>{/if}
  {/if}
  <div class="presets">
    <button disabled={busy||!supported||lz77||complex} onclick={()=>browse(-1)}>{copy('Previous page','Trang trước')}</button>
    <button disabled={busy||!supported||lz77||complex} onclick={()=>browse(1)}>{copy('Next page','Trang sau')}</button>
    <button disabled={busy||!supported||lz77||complex} onclick={()=>browse(0,-1)}>{copy('Previous palette','Bảng màu trước')}</button>
    <button disabled={busy||!supported||lz77||complex} onclick={()=>browse(0,1)}>{copy('Next palette','Bảng màu sau')}</button>
  </div>
  <p>{copy('Uses the selected width, height and palette to show up to 16 consecutive uncompressed images. Click an image to select its source. This does not automatically recognize game assets.','Dùng kích thước và palette đã chọn để xem tối đa 16 ảnh không nén liên tiếp. Bấm ảnh để chọn nguồn. Công cụ chưa tự nhận dạng tài nguyên game.')}</p>
  {#if gallery.length}
    <div class="gallery">{#each gallery as item,i}<button disabled={busy||!galleryCurrent} onclick={()=>chooseImage(i)} title={item.spec.tiles}><img src={item.preview} alt={copy('Image','Ảnh')+' '+(i+1)} /><span>{item.spec.tiles}</span></button>{/each}</div>
    {#if !galleryCurrent}<p>{copy('Previous results retained. Browse again for the current settings and session.','Đang giữ kết quả cũ. Duyệt lại theo cấu hình và phiên game hiện tại.')}</p>{/if}
  {/if}
  {#if preview}<div class="image-preview" class:stale={!current}><img src={preview} alt={copy('Decoded game graphics','Ảnh giải mã từ game')} /></div><p>{current?copy('Preview matches current settings.','Ảnh khớp cấu hình hiện tại.'):copy('Keeping the previous preview. Read again before adding.','Đang giữ ảnh lần trước. Cần đọc lại trước khi thêm.')}</p>{/if}
  <div class="actions"><label>{copy('Image block key','Khóa block ảnh')}<input bind:value={key} placeholder="romImage" /></label><button class="primary" disabled={busy||!current||!exportable} onclick={create}>{manifest.studioGraphics?.[key.trim()]?copy('Refresh linked image preview','Làm mới ảnh liên kết'):copy('Add bound image','Thêm ảnh liên kết')}</button></div>
  {#if preview&&!exportable}<p>{copy('VRAM is a live inspection preview. To export stable artwork, choose tiles and palette from ROM.','VRAM dùng để xem bộ nhớ đồ họa hiện tại. Để xuất ảnh ổn định, hãy chọn tile và palette từ ROM.')}</p>{/if}
  <p>{copy('Supports 4bpp tile images, ROM pointers and up to 32 sprite parts. LZ77 applies to sequential images only. Raw 2D sprite sheets need row-sized parts; tilemaps and automatic asset discovery are separate workflows.','Hỗ trợ ảnh tile 4bpp, con trỏ ROM và tối đa 32 mảnh. LZ77 chỉ áp dụng cho ảnh tuần tự. Sheet 2D cần chia mảnh theo từng hàng; tilemap và tự tìm tài nguyên là các quy trình riêng.')}</p>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</section>
<style>.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));gap:8px;margin:12px 0}.gallery button{display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px;background:#192c3b;border:1px solid #628094}.gallery img{width:64px;height:64px;object-fit:contain;image-rendering:pixelated;background:repeating-conic-gradient(#293546 0% 25%,#1b2533 0% 50%) 0 0/12px 12px}.gallery span{font-size:11px}.gallery button:focus-visible{outline:2px solid #a7dcc7}.rom-graphics{margin:18px 0;padding:16px;background:#263b49;border:1px solid #527b87;border-radius:6px}.rom-graphics h3{font-size:16px;margin:0}.rom-graphics p{font-size:12px;line-height:1.6;color:#b8cadb}.capability{color:#a7dcc7!important}.presets{display:flex;gap:8px;margin:12px 0}.fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}.fields label,.actions label{display:flex;flex-direction:column;font-size:12px;gap:5px;margin:0}.fields input,.actions input{font-size:13px}.check{display:flex;align-items:center;gap:8px;font-size:12px}.check input{width:18px;height:18px}.rom-graphics button{font-size:12px}.image-preview{display:flex;align-items:center;justify-content:center;min-height:160px;max-height:360px;padding:14px;margin-top:12px;border:1px solid #53778d;background:repeating-conic-gradient(#293546 0% 25%,#1b2533 0% 50%) 0 0/20px 20px;overflow:auto}.image-preview img{image-rendering:pixelated;object-fit:contain;width:auto;max-width:100%;height:256px}.image-preview.stale{opacity:.6}.actions{display:flex;gap:12px;align-items:end;margin:12px 0}.error{color:#ffb6b6!important}</style>
