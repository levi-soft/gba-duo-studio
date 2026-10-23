<script lang="ts">
  import {locale} from './i18n.js';
  import {memoryTypes} from './memory-values.js';
  import {scanIdentity,scanSamples,startScan,refineScan,scanValue} from './memory-scan.js';
  import {parseDataProfile} from './data-profiles.js';
  import BlockSearch from './BlockSearch.svelte';
  import type {BridgeInfo,MemoryType,Manifest} from './types.js';
  type Scan=ReturnType<typeof startScan>;
  let {info,request,manifest,onsave,onbar,onprofile}:{info:BridgeInfo|null;request:(command:string)=>Promise<BridgeInfo>;manifest:Manifest;onsave:(info:BridgeInfo,name:string,address:number,type:MemoryType,value:number)=>void;onbar:(current:string,maximum:string)=>void;onprofile:(text:string)=>void}=$props();
  const copy=(en:string,vi:string)=>$locale==='vi'?vi:en;
  let scan=$state<Scan|null>(null),busy=$state(false),error=$state(''),message=$state('');
  let region=$state('ewram'),type=$state<MemoryType>('u8'),comparison=$state('equal'),value=$state<number|undefined>(undefined),name=$state('hp'),picked=$state<number|null>(null);
  let current=$state(''),maximum=$state('');
  let profileInput:HTMLInputElement;
  const fields=$derived(Object.keys(manifest.values??{}));
  const identity=$derived(info?.sessionId?scanIdentity(info):'');
  const stale=$derived(!!scan&&scan.identity!==identity);
  async function capture(first:boolean){
    busy=true;error='';message='';
    try{
      if(!info)throw Error('Connect a game first.');
      const expected=scanIdentity(info),packet=await request('capture'),nextIdentity=scanIdentity(packet);
      if(expected!==nextIdentity)throw Error('Game session changed. Start a new scan.');
      const ranges=scanSamples(packet,region);
      scan=first?startScan(ranges,type,nextIdentity,value??null):refineScan(scan!,ranges,nextIdentity,comparison,value??null);
      picked=null;
    }catch(e){error=e instanceof Error?e.message:String(e);}finally{busy=false;}
  }
  function save(){
    try{error='';if(!scan||stale||picked===null||!info)throw Error('Select a candidate from the current session.');
      onsave(info,name.trim(),picked,scan.type,scanValue(scan.ranges,picked,scan.type));
      message=copy('Block saved. Select it below to create a progress bar.','Đã lưu block. Chọn block bên dưới để tạo thanh chỉ số.');
    }catch(e){error=e instanceof Error?e.message:String(e);}
  }
  async function importProfile(event:Event){
    const input=event.currentTarget as HTMLInputElement,file=input.files?.[0];if(!file)return;
    try{error='';if(file.size>256*1024)throw Error('Data profile is too large.');onprofile(await file.text());message=copy('Data profile imported. Choose its blocks below.','Đã nhập profile dữ liệu. Chọn các block bên dưới.');}
    catch(e){error=e instanceof Error?e.message:String(e);}finally{input.value='';}
  }
  function exportProfile(){
    try{error='';const profile=parseDataProfile(JSON.stringify({profileVersion:1,name:manifest.studioProfileName??manifest.name,match:manifest.match,values:manifest.values,fieldInfo:manifest.studioFieldInfo}));
      const url=URL.createObjectURL(new Blob([JSON.stringify(profile,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='data-profile.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(e){error=e instanceof Error?e.message:String(e);}
  }
</script>
<section class="scanner">
  <BlockSearch {manifest} {onbar} />
  <h3>{copy('Reusable data profiles','Profile dữ liệu dùng lại')}</h3>
  <p>{copy('Already know the game data? Import a profile and use its blocks directly; scanning is optional. Profiles contain addresses and types, without game graphics or RAM dumps.','Đã có cấu hình dữ liệu game? Nhập profile và dùng block ngay, không cần dò lại. Profile chỉ chứa địa chỉ và kiểu dữ liệu, không chứa ảnh game hay bản chụp RAM.')}</p>
  <input type="file" accept=".json,application/json" bind:this={profileInput} onchange={importProfile} hidden />
  <div class="controls"><button onclick={()=>profileInput.click()}>{copy('Import data profile','Nhập profile dữ liệu')}</button><button disabled={!fields.length} onclick={exportProfile}>{copy('Export data profile','Xuất profile dữ liệu')}</button></div>
  <h3>{copy('Discover data blocks','Khám phá block dữ liệu')}</h3>
  <p>{copy('Capture RAM, change a value in the game, then filter. A match is a candidate, not a confirmed meaning. Scans are read-only and are not exported.','Chụp RAM, thay đổi giá trị trong game rồi lọc. Kết quả chỉ là ứng viên, chưa xác nhận ý nghĩa. Công cụ chỉ đọc; bản chụp không được xuất cùng companion.')}</p>
  <div class="controls">
    <label>{copy('Region','Vùng nhớ')}<select bind:value={region} disabled={busy||!!scan}><option value="ewram">EWRAM</option><option value="iwram">IWRAM</option><option value="all">EWRAM + IWRAM</option></select></label>
    <label>{copy('Type','Kiểu')}<select bind:value={type} disabled={busy||!!scan}>{#each Object.keys(memoryTypes) as kind}<option value={kind}>{kind}</option>{/each}</select></label>
    <label>{copy('Value (blank = unknown)','Giá trị (trống = chưa biết)')}<input type="number" step="1" bind:value /></label>
    <button disabled={busy||!info} onclick={()=>capture(true)}>{copy('New scan','Dò mới')}</button>
    <button disabled={busy||!scan} onclick={()=>{scan=null;picked=null;error='';message='';}}>{copy('Reset','Đặt lại')}</button>
  </div>
  {#if scan}<div class="controls">
    <label>{copy('Filter','Lọc')}<select bind:value={comparison}><option value="equal">{copy('Equals value','Bằng giá trị')}</option><option value="decreased">{copy('Decreased','Đã giảm')}</option><option value="increased">{copy('Increased','Đã tăng')}</option><option value="changed">{copy('Changed','Đã đổi')}</option><option value="unchanged">{copy('Unchanged','Không đổi')}</option></select></label>
    <button disabled={busy||stale||!info} onclick={()=>capture(false)}>{copy('Capture & filter','Chụp và lọc')}</button>
    <strong>{scan.candidates.length.toLocaleString()} {copy('candidates','ứng viên')}</strong>
  </div>
  {#if stale}<p role="alert">{copy('Session changed. Start a new scan before saving.','Phiên game đã đổi. Hãy dò mới trước khi lưu.')}</p>{/if}
  <div class="candidates" role="group" aria-label={copy('RAM candidates','Ứng viên RAM')}>
    {#each scan.candidates.slice(0,100) as address}<button class:chosen={picked===address} disabled={stale} onclick={()=>picked=address}>0x{address.toString(16).toUpperCase()} <strong>{scanValue(scan.ranges,address,scan.type)}</strong></button>{/each}
  </div>
  {#if scan.candidates.length>100}<p>{copy('Showing the first 100; filter again to narrow the results.','Hiện 100 kết quả đầu; tiếp tục lọc để thu hẹp.')}</p>{/if}
  <div class="controls"><label>{copy('Block key','Khóa block')}<input bind:value={name} placeholder="hp" /></label><button disabled={busy||stale||picked===null} onclick={save}>{copy('Save data block','Lưu block dữ liệu')}</button></div>
  {/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}{#if message}<p role="status">{message}</p>{/if}
  <h3>{copy('Create a bound progress bar','Tạo thanh chỉ số từ block')}</h3>
  <div class="controls">
    <label>{copy('Current value','Giá trị hiện tại')}<select bind:value={current}><option value="">—</option>{#each fields as key}<option value={key}>{key}</option>{/each}</select></label>
    <label>{copy('Maximum value','Giá trị tối đa')}<select bind:value={maximum}><option value="">—</option>{#each fields as key}<option value={key}>{key}</option>{/each}</select></label>
    <button disabled={!current||!maximum} onclick={()=>{try{error='';onbar(current,maximum);}catch(e){error=e instanceof Error?e.message:String(e);}}}>{copy('Create progress bar','Tạo thanh chỉ số')}</button>
  </div>
</section>
<style>
  .scanner{border:1px solid #4a607d;background:#29364a;border-radius:6px;padding:16px;margin:18px 0}.scanner h3{margin:0 0 8px;font-size:15px}.scanner h3:not(:first-child){margin-top:20px}.scanner p{font-size:12px;line-height:1.6;color:#afc2d9}.controls{display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin:12px 0}.controls label{display:flex;flex-direction:column;gap:5px;font-size:12px;max-width:230px}.controls input,.controls select{font-size:13px}.controls button{font-size:13px}.controls strong{padding:8px}.candidates{max-height:240px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:5px}.candidates button{font:12px monospace;text-align:left;display:flex;justify-content:space-between}.candidates button.chosen{outline:2px solid #8bc2ff;background:#365c84}.error{color:#ffb3b3!important}
</style>
