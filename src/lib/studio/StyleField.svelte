<script lang="ts">
  import { t as uiText } from './i18n.js';
  import LengthInput from './LengthInput.svelte';
  import ColorInput from './ColorInput.svelte';
  import {expandFour,splitCss} from './style-model.js';
  import {fontValue} from './fonts.js';
  interface Field {key:string;label:string;kind:string;options?:string[];percent?:boolean;auto?:boolean;negative?:boolean}
  interface Props {field:Field;value?:string;fonts?:{family:string;path:string;declared?:boolean}[];assets?:string[];onchange:(value:string)=>void}
  let {field,value='',fonts=[],assets=[],onchange}:Props=$props();
  const tokens=$derived(splitCss(String(value),' '));
  const four=$derived(expandFour(String(value)));
  const borderStyle=$derived(tokens.find(t=>/^(none|solid|dashed|dotted|double|groove|ridge|inset|outset)$/.test(t))??'solid');
  const borderWidth=$derived(tokens.find(t=>/^\d/.test(t))??'1px');
  const borderColor=$derived(tokens.filter(t=>t!==borderStyle&&t!==borderWidth).join(' ')||'#888888');
  const linear=$derived(String(value).match(/^linear-gradient\((.*)\)$/i));
  const stops=$derived(linear?splitCss(linear[1]):[]);
  const angle=$derived(stops[0]?.match(/^(-?[\d.]+)deg$/)?.[1]??'180');
  const colors=$derived(stops[0]?.endsWith('deg')||stops[0]?.startsWith('to ')?stops.slice(1):stops);
  const shadow=$derived(splitCss(splitCss(String(value))[0]??'',' '));
  const shadowLengths=$derived(shadow.filter(t=>/^-?(\d*\.)?\d+(px)?$/.test(t)));
  const shadowColor=$derived(shadow.filter(t=>!shadowLengths.includes(t)&&t!=='inset'&&t!=='none').join(' ')||'#00000055');
  function setFour(index:number,next:string){const p=[...four];while(p.length<4)p.push('0px');p[index]=next||'0px';onchange(p.join(' '));}
  function setShadow(index:number,next:string){const p=[...shadowLengths];const count=field.kind==='shadow'?4:3;while(p.length<count)p.push('0px');p[index]=next||'0px';onchange([...p,shadowColor,...(shadow.includes('inset')?['inset']:[])].join(' '));}
  function gradient(deg=angle,a=colors[0]??'#ffffff',b=colors[1]??'#000000'){onchange(`linear-gradient(${deg}deg, ${a}, ${b})`);}
  const imagePath=(p:string)=>`url("${p.replaceAll('"','%22')}")`;
  const assetValue=$derived(assets.find(p=>String(value).includes(p))??'');
  const known=$derived(field.options?.includes(value));
  const transformAngle=$derived(String(value).match(/^rotate\((-?[\d.]+)deg\)$/)?.[1]);
  const transformScale=$derived(String(value).match(/^scale\(([\d.]+)\)$/)?.[1]);
  const transitions=$derived(splitCss(String(value)).filter(v=>v!=='none').map(v=>splitCss(v,' ')));
  function setTransition(index:number,part:number,next:string){const rows=transitions.map(r=>[...r]);rows[index]??=['all','200ms','ease'];rows[index][part]=next;onchange(rows.map(r=>r.join(' ')).join(', '));}
</script>
<div class="style-field">
{#if field.kind==='length'}
  <LengthInput label={$uiText(field.label)} {value} allowPercent={field.percent??false} allowAuto={field.auto??false} allowNegative={field.negative??false} {onchange} />
{:else if field.kind==='select'}
  <select aria-label={$uiText(field.label)} {value} onchange={(e)=>onchange(e.currentTarget.value)}><option value="">{$uiText("Theo template")}</option>{#if value&&!known}<option {value}>{value}</option>{/if}{#each field.options??[] as option}<option value={option}>{option}</option>{/each}</select>
{:else if field.kind==='font'}
  <select aria-label={$uiText(field.label)} {value} onchange={(e)=>onchange(e.currentTarget.value)}><option value="">{$uiText("Theo template")}</option>{#if value}<option {value}>{value}</option>{/if}{#each fonts as font}<option value={fontValue(font.family)}>{font.declared?font.family:font.path.split('/').pop()}</option>{/each}{#each ['sans-serif','serif','monospace'] as family}<option value={family}>{family}</option>{/each}</select>
{:else if field.kind==='sides'||field.kind==='corners'}
  <div class="four-values">{#each (field.kind==='corners'?[$uiText("Trên trái"),$uiText("Trên phải"),$uiText("Dưới phải"),$uiText("Dưới trái")]:[$uiText("Trên"),$uiText("Phải"),$uiText("Dưới"),$uiText("Trái")]) as name,i}<div><span>{name}</span><LengthInput label={`${field.label} ${name}`} value={four[i]??''} allowPercent={true} allowAuto={field.kind==='sides'} allowNegative={field.key==='margin'} onchange={(next)=>setFour(i,next)} /></div>{/each}</div>
  <details class="raw"><summary>{$uiText("Giá trị ghép / góc elip")}</summary><input aria-label={`${field.label} CSS`} {value} onchange={(e)=>onchange(e.currentTarget.value)} /></details>
{:else if field.kind==='border'}
  <div class="border-controls"><LengthInput label={$uiText("{0} độ dày", field.label)} value={borderWidth} onchange={(v)=>onchange(`${v||'0px'} ${borderStyle} ${borderColor}`)} /><select aria-label={$uiText("{0} kiểu nét", field.label)} value={borderStyle} onchange={(e)=>onchange(`${borderWidth} ${e.currentTarget.value} ${borderColor}`)}>{#each ['none','solid','dashed','dotted','double','groove','ridge','inset','outset'] as v}<option value={v}>{({none:$uiText("Không viền"),solid:$uiText("Nét liền"),dashed:$uiText("Nét đứt"),dotted:$uiText("Chấm"),double:$uiText("Hai nét")} as Record<string,string>)[v]??v}</option>{/each}</select></div>
  <ColorInput label={$uiText("{0} màu", field.label)} value={borderColor} onchange={(v)=>onchange(`${borderWidth} ${borderStyle} ${v}`)} />
{:else if field.kind==='color'}
  <ColorInput label={$uiText(field.label)} {value} {onchange} />
{:else if ['background','image'].includes(field.kind)}
  <select aria-label={$uiText("Kiểu {0}", field.label)} value={linear?'gradient':value.includes('url(')?'image':value==='none'||value==='transparent'?'none':'solid'} onchange={(e)=>{const kind=e.currentTarget.value;if(kind==='gradient')gradient();else if(kind==='image')onchange(assets[0]?imagePath(assets[0]):'none');else onchange(kind==='none'?(field.kind==='image'?'none':'transparent'):'#ffffff');}}><option value="none">{$uiText("Trong suốt / không có")}</option>{#if field.kind==='background'}<option value="solid">{$uiText("Màu đơn")}</option>{/if}<option value="gradient">{$uiText("Chuyển màu tuyến tính")}</option><option value="image">{$uiText("Ảnh từ Assets")}</option></select>
  {#if linear}<div class="gradient-controls"><label>{$uiText("Góc (độ)")}<input aria-label={$uiText("Góc {0}", field.label)} type="number" value={angle} onchange={(e)=>gradient(e.currentTarget.value)} /></label>{#each colors.slice(0,2) as color,i}<ColorInput label={field.label+$uiText(" màu ")+(i+1)} value={color} onchange={(v)=>gradient(angle,i===0?v:colors[0],i===1?v:colors[1])} />{/each}</div>{/if}
  {#if value.includes('url(')}<select aria-label={`Asset ${field.label}`} value={assetValue} onchange={(e)=>onchange(imagePath(e.currentTarget.value))}><option value="">{$uiText("Chọn ảnh…")}</option>{#each assets as path}<option value={path}>{path.slice(7)}</option>{/each}</select>{/if}
  <input aria-label={$uiText("{0} giá trị", field.label)} {value} placeholder={$uiText("Màu, gradient hoặc url(…)")} onchange={(e)=>onchange(e.currentTarget.value)} />
{:else if field.kind==='columns'}
  <label>{$uiText("Số cột đều")}<input aria-label={$uiText("Số cột đều")} type="number" min="1" value={String(value).match(/^repeat\((\d+),\s*1fr\)$/)?.[1]??''} onchange={(e)=>{if(Number(e.currentTarget.value)>0)onchange(`repeat(${Number(e.currentTarget.value)}, 1fr)`);}} /></label><input aria-label={$uiText(field.label)} {value} placeholder={$uiText("repeat(2, 1fr) hoặc 1fr 2fr")} onchange={(e)=>onchange(e.currentTarget.value)} />
{:else if field.kind==='pair'}
  <div class="border-controls">{#each [$uiText("Dọc"),$uiText("Ngang")] as name,i}<select aria-label={`${field.label} ${name}`} value={tokens[i]??tokens[0]??'center'} onchange={(e)=>{const p=[tokens[0]??'center',tokens[1]??tokens[0]??'center'];p[i]=e.currentTarget.value;onchange(p.join(' '));}}>{#each ['start','center','end','stretch'] as option}<option value={option}>{option}</option>{/each}</select>{/each}</div><input aria-label={$uiText(field.label)} {value} onchange={(e)=>onchange(e.currentTarget.value)} />
{:else if field.kind==='flex'}
  <div class="four-values"><label>{$uiText("Nở")}<input aria-label={$uiText("Hệ số nở")} type="number" min="0" value={tokens[0]??1} onchange={(e)=>onchange(`${e.currentTarget.value} ${tokens[1]??1} ${tokens[2]??'0%'}`)} /></label><label>{$uiText("Co")}<input aria-label={$uiText("Hệ số co")} type="number" min="0" value={tokens[1]??1} onchange={(e)=>onchange(`${tokens[0]??1} ${e.currentTarget.value} ${tokens[2]??'0%'}`)} /></label></div><input aria-label={$uiText(field.label)} {value} placeholder={$uiText("1 hoặc 1 1 auto")} onchange={(e)=>onchange(e.currentTarget.value)} />
{:else if field.kind==='opacity'}
  <div class="opacity"><input aria-label={$uiText(field.label)} type="range" min="0" max="1" step="0.01" value={value||1} oninput={(e)=>onchange(e.currentTarget.value)} /><input aria-label={$uiText("{0} số", field.label)} type="number" min="0" max="1" step="0.01" value={value||1} onchange={(e)=>onchange(e.currentTarget.value)} /></div>
{:else if field.kind==='shadow'||field.kind==='text-shadow'}
  <div class="four-values">{#each (field.kind==='shadow'?['X','Y',$uiText("Mờ"),$uiText("Lan rộng")]:['X','Y',$uiText("Mờ")]) as name,i}<div><span>{name}</span><LengthInput label={`${field.label} ${name}`} value={shadowLengths[i]??'0px'} allowNegative={i<2||i===3} onchange={(next)=>setShadow(i,next)} /></div>{/each}</div>
  <ColorInput label={$uiText("{0} màu", field.label)} value={shadowColor} onchange={(v)=>onchange([...shadowLengths,v,...(shadow.includes('inset')?['inset']:[])].join(' '))} />
  {#if field.kind==='shadow'}<label class="check"><input type="checkbox" checked={shadow.includes('inset')} onchange={(e)=>onchange([...shadowLengths,shadowColor,...(e.currentTarget.checked?['inset']:[])].join(' '))} />{$uiText("Bóng bên trong")}</label>{/if}
  <input aria-label={$uiText("{0} giá trị", field.label)} {value} placeholder={$uiText("none hoặc nhiều bóng cách nhau bằng dấu phẩy")} onchange={(e)=>onchange(e.currentTarget.value)} />
{:else if field.kind==='transform'}
  <label>{$uiText("Xoay (độ)")}<input aria-label={$uiText("Xoay (độ)")} type="number" value={transformAngle??''} placeholder="0" onchange={(e)=>onchange(`rotate(${Number(e.currentTarget.value)}deg)`)} /></label>
  <label>{$uiText("Phóng / thu (1 = nguyên cỡ)")}<input aria-label={$uiText("Hệ số phóng thu")} type="number" min="0" step="0.01" value={transformScale??''} placeholder="1" onchange={(e)=>onchange(`scale(${Number(e.currentTarget.value)})`)} /></label>
  <input aria-label={$uiText(field.label)} {value} placeholder="rotate(-3deg), scale(1.1), translate(…)" onchange={(e)=>onchange(e.currentTarget.value)} />
{:else if field.kind==='transition'}
  {#each transitions as parts,i}<div class="transition-row"><div class="border-controls"><select aria-label={$uiText("Thuộc tính chuyển tiếp {0}", i+1)} value={parts[0]??'all'} onchange={(e)=>setTransition(i,0,e.currentTarget.value)}>{#each [...new Set(['all','color','background-color','opacity','transform','width','height',parts[0]].filter(Boolean))] as key}<option value={key}>{key}</option>{/each}</select><label>{$uiText("Thời gian (ms)")}<input aria-label={$uiText("Thời gian chuyển tiếp {0}", i+1)} type="number" min="0" value={parts[1]?.endsWith('ms')?parseFloat(parts[1]):parts[1]?.endsWith('s')?parseFloat(parts[1])*1000:200} onchange={(e)=>setTransition(i,1,`${Number(e.currentTarget.value)}ms`)} /></label></div><div class="border-controls"><select aria-label={$uiText("Đường cong chuyển tiếp {0}", i+1)} value={parts[2]??'ease'} onchange={(e)=>setTransition(i,2,e.currentTarget.value)}>{#each [...new Set(['linear','ease','ease-in','ease-out','ease-in-out',parts[2]].filter(Boolean))] as curve}<option value={curve}>{curve}</option>{/each}</select><button aria-label={$uiText("Xóa chuyển tiếp {0}", i+1)} onclick={()=>onchange(transitions.filter((_,j)=>j!==i).map(r=>r.join(' ')).join(', ')||'none')}>{$uiText("× Bỏ")}</button></div></div>{/each}
  <button onclick={()=>onchange([...transitions.map(r=>r.join(' ')),'all 200ms ease'].join(', '))}>{$uiText("＋ Thêm chuyển tiếp")}</button>
  <input aria-label={$uiText(field.label)} {value} placeholder="color 200ms ease-out, transform 150ms ease-out" onchange={(e)=>onchange(e.currentTarget.value)} />
{:else if field.kind==='background-size'}
  <select aria-label={$uiText("Chế độ kích thước nền")} value={['cover','contain','auto'].includes(value)?value:'custom'} onchange={(e)=>{if(e.currentTarget.value!=='custom')onchange(e.currentTarget.value);}}><option value="cover">{$uiText("Phủ kín (cover)")}</option><option value="contain">{$uiText("Vừa khung (contain)")}</option><option value="auto">{$uiText("Tự nhiên (auto)")}</option><option value="custom">{$uiText("Kích thước riêng")}</option></select><input aria-label={$uiText(field.label)} {value} placeholder={$uiText("84px 34px hoặc 100% 100%")} onchange={(e)=>onchange(e.currentTarget.value)} />
  <div class="four-values">{#each [$uiText("Rộng"),'Cao'] as name,i}<div><span>{name}</span><LengthInput label={`${field.label} ${name}`} value={['cover','contain'].includes(value)?'':tokens[i]??'auto'} allowPercent={true} allowAuto={true} onchange={(v)=>{const p=['cover','contain'].includes(value)?['auto','auto']:[tokens[0]??'auto',tokens[1]??'auto'];p[i]=v||'auto';onchange(p.join(' '));}} /></div>{/each}</div>
{:else}
  <input aria-label={$uiText(field.label)} {value} onchange={(e)=>onchange(e.currentTarget.value)} />
{/if}
</div>
<style>
  .style-field{display:flex;flex-direction:column;gap:5px;min-width:0}.style-field input,.style-field select{font-size:11px;min-width:0;width:100%;padding:6px}.four-values{display:grid;grid-template-columns:1fr 1fr;gap:6px}.four-values span{display:block;color:#9db0ca;font-size:10px;margin-bottom:3px}.border-controls{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:5px;align-items:center}.opacity{display:flex;gap:5px;align-items:center}.border-controls>*{flex:1;min-width:0}.opacity>input[type=number]{width:65px}.raw{border:0!important;padding:0!important;margin:0!important;background:transparent!important}.raw summary{padding:5px 0!important;font-size:10px!important;color:#9db0ca}.style-field label{font-size:10px;margin:0}.check{display:flex;flex-direction:row;align-items:center;gap:6px}.check input{width:auto}
</style>
