<script lang="ts">
  import { t as uiText } from './i18n.js';
  interface Props {value?:string;label:string;onchange:(value:string)=>void}
  let {value='',label,onchange}:Props=$props();
  function parse(text:string){
    const hex=text.match(/^#([\da-f]{3,8})$/i)?.[1];
    if(hex&&[3,4,6,8].includes(hex.length)){
      const full=hex.length<5?[...hex].map(c=>c+c).join(''):hex;
      return {hex:'#'+full.slice(0,6),alpha:full.length===8?parseInt(full.slice(6),16)/255:1};
    }
    const rgb=text.match(/^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
    if(rgb)return {hex:'#'+rgb.slice(1,4).map(n=>Math.round(Number(n)).toString(16).padStart(2,'0')).join(''),alpha:Number(rgb[4]??1)};
    return {hex:'#888888',alpha:text==='transparent'?0:1};
  }
  const color=$derived(parse(String(value)));
  function change(hex=color.hex,alpha=color.alpha){const channels=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));onchange(alpha>=1?hex:`rgba(${channels.join(', ')}, ${Number(alpha.toFixed(3))})`);}
</script>
<div class="color-input"><div><input aria-label={label} {value} placeholder="#rrggbb, rgba(…), var(…)" onchange={(e)=>onchange(e.currentTarget.value)} /><input type="color" aria-label={$uiText("Chọn {0}", label)} value={color.hex} onchange={(e)=>change(e.currentTarget.value)} /></div><label>{$uiText("Độ đục")} <input aria-label={$uiText("Độ đục {0}", label)} type="range" min="0" max="100" step="1" value={Math.round(color.alpha*100)} onchange={(e)=>change(color.hex,Number(e.currentTarget.value)/100)} /><span>{Math.round(color.alpha*100)}%</span></label></div>
<style>.color-input>div{display:flex;gap:5px}.color-input input{min-width:0;width:100%;font-size:11px;padding:6px}.color-input input[type=color]{width:30px;flex:0 0 30px;padding:2px;height:29px}.color-input label{display:flex;flex-direction:row;align-items:center;gap:5px;margin:4px 0 0;font-size:9px;color:#9db0ca}.color-input input[type=range]{padding:0;flex:1;width:0}.color-input span{width:29px;text-align:right}</style>
