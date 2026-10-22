<script lang="ts">
  import { t as uiText, locale } from './i18n.js';
  import {readMemoryValues} from './memory-values.js';
  import type {Manifest,DataValues,BridgeInfo,BridgeSend} from './types.js';
  interface Status {kind:string;message:string;info?:BridgeInfo}
  interface Props {manifest:Manifest;projectId:string;enabled?:boolean;onenabled:(enabled:boolean)=>void;ondata:(data:DataValues|null)=>void;onstatus?:(status:Status)=>void}
  let {manifest,projectId,enabled=false,onenabled,ondata,onstatus}:Props=$props();
  let state=$state<Status>({kind:'sample',message:''});
  const signature=$derived(JSON.stringify({id:manifest.id,script:manifest.script,values:manifest.values,match:manifest.match,studioComputed:manifest.studioComputed}));
  function status(value:Status){state=value;onstatus?.(value);}
  $effect(()=>{
    const active=enabled;
    const config=JSON.parse(signature);
    if(!active){status({kind:'sample',message:''});return;}
    let stopped=false,good=false,failures=0;
    let timer:ReturnType<typeof setTimeout>|undefined,session:string|undefined;
    const readContext={};
    const abort=new AbortController();
    ondata(null);status({kind:'waiting',message:$uiText("Đang kết nối Thor…")});
    const send:BridgeSend=async (command,params)=>{
      const response=await fetch('/api/thor',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({command,...params,language:$locale}),signal:abort.signal});
      const packet=await response.json();if(!response.ok)throw Error(packet.error||$uiText("Không đọc được Thor."));return packet;
    }
    async function tick(){
      if(stopped)return;
      try{
        if(failures%4===0&&!good)await send('connect');
        const result=await readMemoryValues(config,send,readContext);if(stopped)return;
        if(session&&session!==result.info.sessionId)ondata(null);
        session=result.info.sessionId;good=true;failures=0;
        ondata(result.values);
        status({kind:'live',info:result.info,message:`${result.info.gameCode} · frame ${result.info.frame}`});
      }catch(error){
        if(stopped)return;
        failures++;
        if(error instanceof Error && 'identityMismatch' in error && error.identityMismatch){good=false;ondata(null);}
        if(failures%4===0){try{await send('connect');}catch{/* Retry on the next scheduled read. */}}
        status({kind:good?'stale':'waiting',message:error instanceof Error?error.message:String(error)});
      }
      if(!stopped)timer=setTimeout(tick,250);
    }
    tick();
    return()=>{stopped=true;clearTimeout(timer);abort.abort();};
  });
</script>
<div class:live={state.kind==='live'} class:stale={state.kind==='stale'} class="live-source"><label>{$uiText("Nguồn dữ liệu")}<select aria-label={$uiText("Nguồn dữ liệu xem trước")} value={enabled?'thor':'sample'} onchange={(e)=>onenabled(e.currentTarget.value==='thor')}><option value="sample">{$uiText("Dữ liệu mẫu")}</option><option value="thor">{$uiText("Thor trực tiếp · trường RAM")}</option></select></label><span>{state.kind==='sample'?$uiText("Dùng dữ liệu mẫu của dự án"):state.kind==='stale'?$uiText("Dữ liệu cũ · giữ lần đọc thành công gần nhất"):state.kind==='waiting'?$uiText("Đang chờ dữ liệu thật"):state.message}</span>{#if enabled&&state.kind!=='live'}<small>{$uiText(state.message)}</small>{/if}</div>
<style>.live-source{display:flex;align-items:center;flex-wrap:wrap;gap:10px;padding:7px 12px;background:#29364a;border-bottom:1px solid #455776;flex-shrink:0;font-size:11px;color:#a8bdd6}.live-source label{display:flex;flex-direction:row;align-items:center;gap:8px;margin:0;font-size:10px}.live-source select{font-size:11px;width:205px;padding:4px}.live-source.live{background:#244333;color:#b5e9c9}.live-source.stale{background:#51432d;color:#efd19f}.live-source small{width:100%;font-size:10px}</style>
