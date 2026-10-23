<script lang="ts">
  import {onDestroy} from 'svelte';
  import {locale} from './i18n.js';
  import {captureHp,hpCandidates,hpNumber,type HpDiscovery,type HpCandidate} from './hp-discovery.js';
  import {scanIdentity} from './memory-scan.js';
  import {decodeMemoryValue,memoryTypes} from './memory-values.js';
  import {decodeRamRange} from './ram-data.js';
  import type {BridgeInfo} from './types.js';
  let {info,request,oncreate}:{info:BridgeInfo|null;request:(command:string,params?:Record<string,unknown>)=>Promise<BridgeInfo>;oncreate:(info:BridgeInfo,candidate:HpCandidate,current:number,maximum:number,subject:string)=>void}=$props();
  const copy=(en:string,vi:string)=>$locale==='vi'?vi:en;
  let discovery=$state<HpDiscovery|null>(null),value=$state<number|undefined>(),maximum=$state<number|undefined>(),subject=$state('');
  let picked=$state<HpCandidate|null>(null),live=$state<number|null>(null),confirmed=$state(false),busy=$state(false),watching=$state(false),error=$state('');
  let timer:ReturnType<typeof setTimeout>|undefined,disposed=false,generation=0;
  let liveReady=$state(false);
  const candidates=$derived(discovery?hpCandidates(discovery):[]);
  const stale=$derived(!!discovery&&(!info?.sessionId||discovery.identity!==scanIdentity(info)));
  function stop(){watching=false;liveReady=false;generation++;clearTimeout(timer);confirmed=false;}
  function reset(){stop();discovery=null;picked=null;live=null;error='';}
  async function capture(){
    stop();busy=true;error='';picked=null;live=null;
    try{
      if(!info)throw Error(copy('Connect a game first.','Hãy kết nối game trước.'));
      if(value===undefined)throw Error(copy('Enter the HP shown in the game.','Nhập HP đang hiển thị trong game.'));
      hpNumber(value);const expected=scanIdentity(info),chosen=value,packet=await request('capture');
      if(disposed)return;
      if(scanIdentity(packet)!==expected)throw Error(copy('Game session changed. Start again.','Phiên game đã đổi. Hãy bắt đầu lại.'));
      discovery=captureHp(packet,chosen,discovery??undefined);
    }catch(e){error=e instanceof Error?e.message:String(e);}finally{busy=false;}
  }
  function pick(candidate:HpCandidate){stop();picked=candidate;live=null;}
  async function follow(token:number){
    if(!watching||disposed||token!==generation||!picked||!discovery||stale)return;
    const selected={...picked};
    try{
      const address=selected.address,length=memoryTypes[selected.type],packet=await request('read',{ranges:[{address,length}]});
      if(disposed||token!==generation)return;
      if(scanIdentity(packet)!==discovery.identity)throw Error(copy('Game session changed. Start again.','Phiên game đã đổi. Hãy bắt đầu lại.'));
      const range=packet.ranges?.[0];if(packet.ranges?.length!==1||!range||range.address!==address||range.length!==length)throw Error('HP response does not match the request.');
      live=decodeMemoryValue(decodeRamRange(range).bytes,{type:selected.type});
      liveReady=true;
      if(maximum!==undefined&&live>maximum)confirmed=false;
    }catch(e){if(token===generation){error=e instanceof Error?e.message:String(e);stop();}return;}
    if(watching&&!disposed&&token===generation)timer=setTimeout(()=>follow(token),750);
  }
  function toggle(){if(watching){stop();return;}error='';watching=true;follow(++generation);}
  function create(){
    try{
      if(!info||!discovery||stale||!picked||live===null||!liveReady||!confirmed||!watching||discovery.values.length<2||maximum===undefined)throw Error(copy('Verify a live candidate first.','Hãy kiểm tra ứng viên trực tiếp trước.'));
      oncreate(info,picked,live,maximum,subject);stop();
    }catch(e){error=e instanceof Error?e.message:String(e);}
  }
  onDestroy(()=>{disposed=true;stop();});
</script>
<section class="hp-wizard">
  <h3>{copy('Find character HP — guided','Tìm HP nhân vật — từng bước')}</h3>
  <p>{copy('Keep following the same character. No address or number format is needed.','Luôn theo dõi cùng một nhân vật. Không cần nhập địa chỉ hoặc chọn kiểu số.')}</p>
  <ol><li>{copy('Enter the HP currently shown, then capture.','Nhập HP hiện tại rồi chụp.')}</li><li>{copy('Let that character take damage or heal. Enter the new HP and capture again. Repeat to narrow results.','Cho nhân vật mất máu hoặc hồi máu. Nhập HP mới rồi chụp lại. Lặp lại để thu hẹp kết quả.')}</li><li>{copy('Select a result, watch its HP live, and check that it follows the game before creating a bar.','Chọn kết quả, theo dõi HP trực tiếp và đối chiếu với game trước khi tạo thanh máu.')}</li></ol>
  <div class="controls"><label>{copy('HP shown now','HP đang thấy')}<input type="number" min="0" max="65535" step="1" bind:value disabled={busy} /></label><button disabled={busy||!info||stale} onclick={capture}>{busy?copy('Reading…','Đang đọc…'):discovery?copy('Capture new HP & narrow results','Chụp HP mới và lọc'):copy('Capture starting HP','Chụp HP ban đầu')}</button><button disabled={busy} onclick={reset}>{copy('Start again','Bắt đầu lại')}</button></div>
  {#if stale}<p role="alert">{copy('The game session changed. Start again.','Phiên game đã đổi. Hãy bắt đầu lại.')}</p>{/if}
  {#if discovery}
    <p role="status">{discovery.samples} {copy('captures','lần chụp')} · {candidates.length} {copy('candidates','ứng viên')}</p>
    {#if discovery.values.length<2}<p>{copy('Capture a different HP value before choosing a candidate.','Cần chụp thêm một giá trị HP khác trước khi chọn ứng viên.')}</p>
    {:else}
      {#if !candidates.length}<p>{copy('No matches. Check the same character and HP value, then start again. The game may use a different data format.','Không có kết quả. Kiểm tra đúng nhân vật và HP rồi bắt đầu lại. Game có thể dùng cách lưu dữ liệu khác.')}</p>{/if}
      <div class="results">{#each candidates.slice(0,60) as candidate,i}<button disabled={busy||stale} class:chosen={picked?.address===candidate.address&&picked?.type===candidate.type} onclick={()=>pick(candidate)}>{copy('Candidate','Ứng viên')} {i+1}<small>0x{candidate.address.toString(16).toUpperCase()} · {candidate.type}</small></button>{/each}</div>
      {#if candidates.length>60}<p>{copy('Showing 60 results. Change HP again and capture to narrow further.','Đang hiện 60 kết quả. Thay đổi HP rồi chụp tiếp để lọc thêm.')}</p>{/if}
    {/if}
  {/if}
  {#if picked}
    <div class="verify"><button disabled={busy||stale} onclick={toggle}>{watching?copy('Stop live check','Dừng theo dõi'):copy('Watch this candidate','Theo dõi ứng viên này')}</button><strong>HP: {live??'—'}{live!==null&&(!watching||stale)?copy(' (last reading)',' (lần đọc cuối)'):''}</strong>
    <label>{copy('Maximum HP (fixed for now)','HP tối đa (cố định tạm thời)')}<input type="number" min="1" max="65535" bind:value={maximum} onchange={()=>confirmed=false} /></label>
    <label>{copy('Character name (optional)','Tên nhân vật (tùy chọn)')}<input bind:value={subject} /></label>
    <label class="confirm"><input type="checkbox" bind:checked={confirmed} disabled={!watching||!liveReady||live===null||stale} />{copy('I checked this value against the game after HP changed.','Tôi đã đối chiếu giá trị này với game sau khi HP thay đổi.')}</label>
    <button disabled={!confirmed||!watching||!liveReady||stale||live===null||maximum===undefined} onclick={create}>{copy('Create HP bar','Tạo thanh HP')}</button></div>
  {/if}
  <p>{copy('This finds a direct RAM address, not the selected-character pointer. Test after changing scenes and loading saves. Maximum HP stays fixed until edited; finding its live source is a separate step.','Công cụ tìm địa chỉ RAM trực tiếp, chưa tự theo nhân vật đang chọn. Cần thử sau khi đổi cảnh và nạp save. HP tối đa giữ cố định cho đến khi sửa; tìm nguồn HP tối đa trực tiếp là bước riêng.')}</p>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</section>
<style>.hp-wizard{padding:18px;margin:18px 0;border:1px solid #67a995;border-radius:8px;background:#203c3f}.hp-wizard h3{margin:0;font-size:17px}.hp-wizard p,.hp-wizard li{font-size:13px;line-height:1.6}.controls,.verify{display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin:14px 0}label{display:flex;flex-direction:column;gap:6px;font-size:13px}input{max-width:220px}.confirm{flex-direction:row;align-items:center;width:100%}.confirm input{width:18px}.results{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;max-height:270px;overflow:auto}.results button{display:flex;flex-direction:column;gap:4px}.results small{font:11px monospace}.chosen{outline:2px solid #a1e7d0}.error{color:#ffb2b2!important}</style>
