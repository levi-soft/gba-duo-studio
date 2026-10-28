<script lang="ts">
  import { t as uiText, locale } from './i18n.js';
  import {onMount,onDestroy} from 'svelte';
  import JSZip from 'jszip';
  import RamMemoryTable from './RamMemoryTable.svelte';
  import RomGraphics from './RomGraphics.svelte';
  import {decodeRamRange,ramPageAddress} from './ram-data.js';
  import {appendEvidence,parseEvidence,replayBytes,evidenceLimits} from './ram-evidence.js';
  import type {RamEvidence} from './ram-evidence.js';
  import type {BridgeInfo,EncodedRamRange,DataValues,Manifest,GraphicsSpec} from './types.js';
  let {manifest,onimage,onidentity}:{manifest:Manifest;onimage:(key:string,spec:GraphicsSpec,info:BridgeInfo,preview:string)=>void;onidentity:(info:BridgeInfo)=>void}=$props();
  interface Packet extends BridgeInfo {ranges?: (EncodedRamRange & {name?:string})[];frame?:number;paused?:boolean}
  let devices=$state<{serial:string;state:string;model:string}[]>([]),serial=$state(''),info=$state<Packet|null>(null),error=$state(''),busy=$state(false),stale=$state(false);
  let address=$state('0x02000000'),length=$state(256),watching=$state(false),memory=$state<{address:number;bytes:Uint8Array}|null>(null),updated=$state('');
  let changed=$state<number[]>([]);
  let captures=$state<{frame?:number;name:string}[]>([]),lua=$state<DataValues|undefined>(undefined),disposed=false;
  let timer:ReturnType<typeof setTimeout>|undefined;
  let evidence=$state<RamEvidence|null>(null),sampleIndex=$state(0),sampleLabel=$state(''),offline=$state(false);
  function showSample(index:number){
    if(!evidence)return;
    const sample=evidence.samples[index];if(!sample)return;
    watching=false;clearTimeout(timer);offline=true;sampleIndex=index;lua=undefined;changed=[];
    const range=sample.packet.ranges![0];address='0x'+hex(range.address);length=Math.min(256,range.length);
    memory={address:range.address,bytes:replayBytes(sample,range.address,Number(length))};error='';
  }
  async function recordSample(){
    busy=true;try{const result=await request('capture');evidence=appendEvidence(evidence,result,sampleLabel.trim()||`Frame ${result.frame}`);sampleIndex=evidence.samples.length-1;offline=false;sampleLabel='';}
    catch(e){error=e instanceof Error?e.message:String(e);}finally{busy=false;}
  }
  async function importEvidence(event:Event){
    const input=event.currentTarget as HTMLInputElement,file=input.files?.[0];if(!file)return;
    try{if(file.size>evidenceLimits.bytes)throw Error('Evidence file is too large.');const next=parseEvidence(await file.text());evidence=next;showSample(0);}
    catch(e){error=e instanceof Error?e.message:String(e);}finally{input.value='';}
  }
  function hex(n:number,width=8){return Number(n).toString(16).toUpperCase().padStart(width,'0');}
  async function request(command:string,values:Record<string,unknown>={}):Promise<Packet>{
    offline=false;
    const response=await fetch('/api/thor',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({command,...values,language:$locale})});
    const result:Packet & {error?:string}=await response.json();if(!response.ok)throw Error(result.error||$uiText("Không kết nối được Thor."));
    if(disposed)throw Error($uiText("Đã đóng bảng RAM."));
    if(info?.sessionId&&info.sessionId!==result.sessionId){memory=null;changed=[];lua=undefined;captures=[];}
    info=result;onidentity(result);stale=false;error='';updated=new Date().toLocaleTimeString('vi-VN');return result;
  }
  async function refreshDevices(){try{const response=await fetch('/api/thor?language='+$locale);const data=await response.json();if(!response.ok)throw Error(data.error);devices=data.devices;serial=devices.some(d=>d.serial===serial)?serial:devices.find(d=>d.state==='device')?.serial??'';}catch(e){error=e instanceof Error?e.message:String(e);}}
  async function connect(){busy=true;try{await request('connect',{serial});}catch(e){error=e instanceof Error?e.message:String(e);stale=!!info;}finally{busy=false;}}
  async function read(){
    const start=Number(address),count=Number(length);
    if(!Number.isInteger(start)||!Number.isInteger(count)||count<1||count>4096)throw Error($uiText("Địa chỉ cần là số; độ dài từ 1 đến 4096 byte."));
    if(offline&&evidence){memory={address:start,bytes:replayBytes(evidence.samples[sampleIndex],start,count)};changed=[];return;}
    const result=await request('read',{ranges:[{address:start,length:count}]});
    const range=result.ranges?.[0];if(!range)throw Error('No memory range returned.');
    if(range.address!==start||range.length!==count)throw Error($uiText("Vùng RAM trả về không khớp yêu cầu."));
    const next=decodeRamRange(range),previous=memory;
    changed=previous&&previous.address===next.address&&previous.bytes.length===next.bytes.length?Array.from(next.bytes,(_,i)=>i).filter(i=>previous.bytes[i]!==next.bytes[i]):[];
    memory=next;
  }
  async function changePage(direction:number){const next=ramPageAddress(Number(address),Number(length),direction);if(next==null)return;address='0x'+hex(next);await readOnce();}
  async function readOnce(){busy=true;try{await read();}catch(e){error=e instanceof Error?e.message:String(e);stale=!!info;}finally{busy=false;}}
  async function watchLoop(){
    if(!watching||disposed)return;
    if(busy){timer=setTimeout(watchLoop,200);return;}
    try{await read();}catch(e){error=e instanceof Error?e.message:String(e);stale=!!info;watching=false;return;}
    if(watching&&!disposed)timer=setTimeout(watchLoop,200);
  }
  function toggleWatch(){watching=!watching;clearTimeout(timer);if(watching)watchLoop();}
  function download(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function capture(){
    busy=true;try{
      const result=await request('capture');const zip=new JSZip();
      const metadata={...result};delete metadata.ranges;
      for(const range of result.ranges??[]){const {bytes}=decodeRamRange(range);zip.file(range.name+'.bin',bytes);}
      zip.file('metadata.json',JSON.stringify(metadata,null,2));
      const name=`${result.gameCode||'GBA'}-frame-${result.frame}.ram.zip`;
      download(await zip.generateAsync({type:'blob'}),name);
      captures=[...captures.slice(-7),{frame:result.frame,name}];
    }catch(e){error=e instanceof Error?e.message:String(e);stale=!!info;}finally{busy=false;}
  }
  async function readLua(){busy=true;try{const result=await request('data');lua=result.data;}catch(e){error=e instanceof Error?e.message:String(e);stale=!!info;}finally{busy=false;}}
  onMount(refreshDevices);
  onDestroy(()=>{disposed=true;watching=false;clearTimeout(timer);});
</script>
<section class="ram-panel">

  <h2>{$locale==='vi'?'Kiểm tra companion trên thiết bị':'Companion runtime inspection'}</h2>
  <p>{$uiText("Mở game trong GBA Duo Plus, bật Studio Connection, kết nối USB và cho phép gỡ lỗi USB.")}</p>
  <div class="ram-actions"><select aria-label={$uiText("Thiết bị Thor")} bind:value={serial}><option value="">{$uiText("Chọn thiết bị…")}</option>{#each devices as device}<option value={device.serial} disabled={device.state!=='device'}>{device.model} · {device.state}</option>{/each}</select><button onclick={refreshDevices}>{$uiText("Làm mới thiết bị")}</button><button class="primary" disabled={busy||!serial} onclick={connect}>{$uiText("Kết nối Thor")}</button></div>
  {#if error}<p class="error" role="alert">{$uiText(error)}</p>{/if}
  {#if info&&!offline}<div class:stale class="ram-info"><strong>{info.gameCode||'GBA'} · Frame {info.frame}</strong><span>CRC32: {info.crc32} {$uiText("(tùy chọn)")}</span><span>{info.paused?$uiText("Game đang tạm dừng"):$uiText("Game đang chạy")} · {stale?$uiText("Mất kết nối · đang giữ dữ liệu lần cuối"):$uiText("Cập nhật ")+updated}</span></div>{/if}
  <div class="ram-actions"><button disabled={busy||!info||offline} onclick={readLua}>{$uiText("Đọc dữ liệu Lua hiện tại")}</button></div>
  <details><summary>{$locale==='vi'?'Nâng cao: ảnh từ ROM':'Advanced: ROM graphics'}</summary><RomGraphics {manifest} info={offline?null:info} {request} oncreate={onimage} /></details>
  <details><summary>{$locale==='vi'?'Nâng cao: đọc và chụp RAM':'Advanced: read and capture RAM'}</summary>
  <fieldset><legend>{$locale==='vi'?'Mẫu kiểm chứng RAM':'RAM evidence samples'}</legend>
    <p>{$locale==='vi'?'Ghi các trạng thái có nhãn để phát lại ngoại tuyến. Mỗi file chỉ chứa một ROM, phiên game và companion.':'Record labeled states for offline replay. Each file belongs to one ROM, game session and companion.'}</p>
    <div class="ram-actions"><label>{$locale==='vi'?'Tên trạng thái':'State label'}<input bind:value={sampleLabel} maxlength="120" placeholder="Map / Forecast / Growth" /></label><button disabled={busy||watching||!info||offline||(evidence?.samples.length??0)>=evidenceLimits.samples} onclick={recordSample}>{$locale==='vi'?'Ghi mẫu RAM':'Record RAM sample'}</button><label>{$locale==='vi'?'Mở mẫu đã lưu':'Open evidence file'}<input type="file" accept=".json" disabled={busy||watching} onchange={importEvidence} /></label></div>
    {#if evidence}<div class="ram-actions"><select aria-label={$locale==='vi'?'Trạng thái phát lại':'Replay state'} value={sampleIndex} disabled={busy||watching} onchange={(e)=>showSample(Number(e.currentTarget.value))}>{#each evidence.samples as sample,index}<option value={index}>{sample.label} · frame {sample.packet.frame}</option>{/each}</select><button disabled={busy||watching} onclick={()=>showSample(sampleIndex)}>{$locale==='vi'?'Phát lại RAM':'Replay RAM'}</button><button disabled={busy} onclick={()=>download(new Blob([JSON.stringify(evidence,null,2)],{type:'application/json'}),`${evidence!.samples[0].packet.gameCode}.ram-evidence.json`)}>{$locale==='vi'?'Lưu bộ mẫu':'Save evidence'}</button><button disabled={busy||watching} onclick={()=>{evidence=null;offline=false;memory=null;changed=[];}}>{$locale==='vi'?'Bộ mẫu mới':'New evidence set'}</button></div>{/if}
    {#if offline&&evidence}<p role="status">{$locale==='vi'?'Ngoại tuyến · không đọc thiết bị':'Offline · device reads disabled'} · {evidence.samples[sampleIndex].packet.gameCode} / {evidence.samples[sampleIndex].packet.crc32} · {evidence.samples[sampleIndex].label}</p>{/if}
  </fieldset>
  <div class="ram-actions"><label>{$uiText("Địa chỉ")}<input aria-label={$uiText("Địa chỉ RAM")} bind:value={address} placeholder="0x02000000" /></label><label>{$uiText("Số byte")}<input aria-label={$uiText("Số byte RAM")} type="number" min="1" max="4096" bind:value={length} /></label><button disabled={busy||(!info&&!offline)||watching} onclick={readOnce}>{$uiText("Đọc một lần")}</button><button class:chosen={watching} disabled={!info||offline} onclick={toggleWatch}>{watching?$uiText("Dừng theo dõi"):$uiText("Theo dõi 5 lần/giây")}</button></div>
  <p class="ram-hint">{$uiText("EWRAM: 0x02000000–0x0203FFFF · IWRAM: 0x03000000–0x03007FFF. Dữ liệu byte thô, chưa tự biết ý nghĩa HP/tiền/trạng thái.")}</p>
  <div class="ram-actions"><label>{$uiText("Độ rộng vùng đọc")}<select aria-label={$uiText("Kích thước vùng RAM")} value={length} onchange={(e)=>length=Number(e.currentTarget.value)}>{#each [16,64,256,1024,4096] as count}<option value={count}>{count} byte · {count/16} {$uiText("dòng")}</option>{/each}{#if ![16,64,256,1024,4096].includes(Number(length))}<option value={length}>{length} byte</option>{/if}</select></label><button disabled={busy||watching||(!info&&!offline)||ramPageAddress(Number(address),Number(length),-1)==null} onclick={()=>changePage(-1)}>{$uiText("← Vùng trước")}</button><button disabled={busy||watching||(!info&&!offline)||ramPageAddress(Number(address),Number(length),1)==null} onclick={()=>changePage(1)}>{$uiText("Vùng tiếp →")}</button></div>
  {#if memory}<RamMemoryTable {memory} {changed} />{:else}<p class="ram-hint">{$uiText("Mặc định 256 byte = 16 dòng. Bấm Đọc một lần hoặc Theo dõi để xem bảng địa chỉ, hex và chữ ASCII.")}</p>{/if}
  <div class="ram-actions"><button disabled={busy||!info} onclick={capture}>{$uiText("Chụp EWRAM + IWRAM → ZIP")}</button></div>
  {#if captures.length}<ul>{#each captures as item}<li>{item.name}</li>{/each}</ul>{/if}
  </details>
  {#if lua}<pre>{JSON.stringify(lua,null,2)}</pre>{:else if info}<p class="ram-hint">{$uiText("Không có dữ liệu Lua đã lấy. Game chưa gán pack vẫn có thể đọc/chụp RAM.")}</p>{/if}
</section>
<style>.ram-panel{padding:20px;overflow:auto;flex:1;min-width:0;background:#252d3a}.ram-panel h2{margin:0;font-size:18px}.ram-panel p{font-size:12px;color:#a5b6cb;line-height:1.6}.ram-actions{display:flex;align-items:end;gap:9px;flex-wrap:wrap;margin:16px 0}.ram-actions input,.ram-actions select{font-size:12px}.ram-actions label{max-width:180px;font-size:11px;margin:0}.ram-info{display:flex;flex-wrap:wrap;gap:16px;padding:14px;background:#254333;border:1px solid #4b7f65;color:#bde1c9;border-radius:5px;font-size:12px}.ram-info.stale{background:#514029;border-color:#98764b;color:#efcc99}.ram-panel pre{max-height:400px;overflow:auto;background:#1e2837;padding:12px;font:11px/1.6 Consolas,monospace}.ram-hint,.ram-panel li{font-size:11px!important;color:#98aac2}.ram-actions button{font-size:12px}</style>
