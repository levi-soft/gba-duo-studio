<script lang="ts">
  import { t as uiText } from './i18n.js';
  import { onMount, untrack } from 'svelte';
  import { parseLayoutWithWarnings } from '../preview/layout.js';
  import { createRenderer, applyStackChildPlacement, applyBarAccentColors, applyScrollContainers } from '../preview/dom.js';
  import { prepareStylesheetCss, extractFontFaceCss } from '../preview/css.js';
  import { DEFAULT_CSS as DEFAULT_CSS_FALLBACK } from '../preview/css.js';
  import { walk, snappedTransform, DEVICE_DENSITY } from './project.js';
  import { compileDesign } from './compiler.js';
  import { previewSelector, prepareStyleDeclarations } from '../preview/css.js';
  import { resolveStyles, declarations } from './style-resolver.js';
  import { styleTargets } from './style-schema.js';
  import { styleValues } from './style-model.js';
  import {applyPulseValues} from './pulse-values.js';
  import {dropPosition,type DropPosition} from './drop-placement.js';
  import type {Project,DataValues,StyleValues} from './types.js';
  interface Rect {x:number;y:number;w:number;h:number}
  interface Transform {x?:number;y?:number;width:number;height:number;move?:boolean}
  interface Props {project:Project;data?:DataValues;selected?:string;inspectTarget?:string;inspectState?:string;oninspect?:(snapshot:{values:Record<string,string>;sources:Record<string,string>})=>void;checkTransparency?:boolean;grid?:{visible:boolean;snap:boolean;size:number};interactive?:boolean;onselect?:(id:string)=>void;onfont?:(font:string)=>void;ondrop?:(payload:string,id?:string,position?:DropPosition)=>void;onerror?:(message:string)=>void;ontransform?:(id:string,result:Transform)=>void;zoom?:number}
  let { project, data, selected, inspectTarget='self', inspectState='normal', oninspect, checkTransparency=false, grid = {visible:true,snap:true,size:32}, interactive = false, onselect, onfont, ondrop, onerror, ontransform, zoom = 0.4 }:Props = $props();
  const runtimeData=$derived(data??project.data);
  let activeRenderer:ReturnType<typeof createRenderer>|undefined,refreshLayout:(()=>void)|undefined;
  let selectionRect = $state<Rect|null>(null);
  let host:HTMLDivElement, ready = $state(false), baseCss = DEFAULT_CSS_FALLBACK;
  let fontStyle:HTMLStyleElement;
  let keptUi:DataValues = {};
  let previousRootId = '';
  function runtimeSnapshot(withCommands=true){
    const source=withCommands?runtimeData:Object.fromEntries(Object.entries(runtimeData).filter(([key])=>key!=='ui'));
    return applyPulseValues(source,project.manifest.studioPulse,interactive?Date.now():0);
  }
  onMount(() => {
    ready = true;
    fetch('/api/default-css').then((r) => r.json()).then((r) => { baseCss = r.css; render(); }).catch(() => {});
    fontStyle = document.createElement('style'); document.head.appendChild(fontStyle);
    return () => fontStyle?.remove();
  });
  function render() {
    if (!host || !ready) return;
    try {
      if (previousRootId !== project.layout.id) { previousRootId = project.layout.id; keptUi = {}; }
      // Inline style uses the same Android dp units as stylesheet declarations.
      // Feed it through the stylesheet translator too (upstream renderer leaves it in raw browser px).
      const compiled = compileDesign(project);
      const layout = compiled.layout;
      let inlineCss = '';
      for (const {node} of walk(layout)) {
        if (node.style && node.id) {
          inlineCss += `\n#${CSS.escape(node.id)} {${Object.entries(node.style).map(([k,v]) => `${k}:${v}`).join(';')}}`;
        }
      }
      const { root, warnings } = parseLayoutWithWarnings(JSON.stringify(layout));
      const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
      shadow.removeEventListener('click',handleClick,{capture:true});
      const asset = (path:string) => {
        const data = compiled.files['assets/' + path];
        const ext = path.split('.').pop()?.toLowerCase()??'';
        const mime = ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml', woff: 'font/woff', otf: 'font/otf', woff2: 'font/woff2', ttf: 'font/ttf' } as Record<string,string>)[ext] ?? 'application/octet-stream';
        return data ? `data:${mime};base64,${data}` : '';
      };
      const prepareInlineStyle = (values:StyleValues) => Object.fromEntries(declarations(prepareStyleDeclarations(Object.entries(values).map(([k,v])=>`${k}:${v}`).join(';'),asset)));
      // A tap must rebind data without replaying the snapshot's one-shot ui commands.
      // Replaying the initial mainTab here immediately undoes navigation to Map.
      const renderer = createRenderer(asset, { prepareInlineStyle, initialUi: interactive ? keptUi : {}, onUiChange: (ui) => { keptUi = ui; renderer.update(runtimeSnapshot(false)); post(); }, onCall: (name) => onerror?.($uiText("Xem thử không chạy Lua: actions.{0}", name)) });
      const style = document.createElement('style');
      style.textContent = prepareStylesheetCss(compiled.css, asset, baseCss) + (!interactive ? '\n[data-type]{cursor:default}[data-studio-selected]{outline:3px solid #77bcff!important;outline-offset:2px}' : '');
      if (fontStyle) fontStyle.textContent = extractFontFaceCss(compiled.css, asset);
      const element = renderer.build(root); element.setAttribute('data-gbaduo-root', '');
      shadow.replaceChildren(style, element);
      renderer.update(untrack(()=>runtimeSnapshot()));
      activeRenderer=renderer;
      refreshLayout=post;
      if (!interactive) {
        for (const {node} of walk(layout)) {
          if (node.type !== 'tabs') continue;
          const index = (node.tabs??[]).findIndex((tab) => walk(tab.child).some((r) => r.node.id === selected));
          if (index >= 0) shadow.getElementById(node.id)?.querySelectorAll<HTMLElement>(':scope > [data-type="tab-bar"] > [data-type="tab"]')[index]?.click();
        }
      }
      function post() { applyStackChildPlacement(element); applyScrollContainers(element); applyBarAccentColors(element); }
      post();
      if (!interactive) {
        const original = walk(project.layout).find(r=>r.node.id===selected)?.node;
        const selectedElement = selected ? shadow.getElementById(selected) : null;
        const target = original && styleTargets(original).find(t=>t.key===inspectTarget);
        const inspected = selectedElement && target ? (target.selector ? selectedElement.querySelector(':scope '+previewSelector(target.selector)) : selectedElement) : null;
        if (inspected) {
          // A selected tab's runtime active class must not hide its normal appearance.
          inspected.classList.remove('active','pressed','disabled');
          if(inspectState!=='normal') inspected.classList.add(inspectState);
          oninspect?.(resolveStyles(inspected,compiled.css+inlineCss,baseCss,styleValues(original!,inspectTarget,inspectState)));
        } else oninspect?.({values:{},sources:{}});
      }
      selectionRect = null;
      if (!interactive) {
        const sel = selected ? shadow.getElementById(selected) : null;
        if (sel) {
          sel.setAttribute('data-studio-selected', '');
          onfont?.(getComputedStyle(sel).fontFamily);
          if(checkTransparency&&sel.dataset.type==='image') {
            sel.style.setProperty('background-image','repeating-conic-gradient(#b9bec6 0% 25%,#707986 0% 50%)','important');
            sel.style.setProperty('background-size','24px 24px','important');
          }
          const b = sel.getBoundingClientRect(), h = host.getBoundingClientRect();
          const ref = walk(project.layout).find((r) => r.node.id === selected);
          if (b.width && b.height && ref?.index != null) selectionRect = { x: (b.x-h.x)/zoom, y: (b.y-h.y)/zoom, w: b.width/zoom, h: b.height/zoom };
        }
        shadow.addEventListener('click', handleClick, { capture: true });
      } else shadow.removeEventListener('click', handleClick, { capture: true });
      onerror?.(warnings.join('\n'));
    } catch (e) { onerror?.(e instanceof Error?e.message:String(e)); }
  }
  function transform(e:PointerEvent, resize = false) {
    if (!selectionRect || !selected) return;
    e.preventDefault(); e.stopPropagation();
    const sel = host.shadowRoot?.getElementById(selected);
    const parent = sel?.parentElement;
    if (!sel || !parent) return;
    const b = sel.getBoundingClientRect(), pb = parent.getBoundingClientRect();
    const factor = zoom * DEVICE_DENSITY;
    const start = { x: (b.x-pb.x)/factor, y: (b.y-pb.y)/factor, width: b.width/factor, height: b.height/factor };
    const hb = host.getBoundingClientRect();
    const origin = {x:(pb.x-hb.x)/factor,y:(pb.y-hb.y)/factor};
    const x0 = e.clientX, y0 = e.clientY, rect0 = {...selectionRect};
    let dx = 0, dy = 0;
    let result:Transform|undefined;
    const move = (event:PointerEvent) => {
      dx = (event.clientX-x0)/factor; dy = (event.clientY-y0)/factor;
      result = snappedTransform(start,{x:dx,y:dy},{resize,snap:grid.snap&&!event.altKey,step:grid.size/DEVICE_DENSITY,origin});
      selectionRect = resize ? {...rect0,w:result.width*DEVICE_DENSITY,h:result.height*DEVICE_DENSITY} : {...rect0,x:((result.x??start.x)+origin.x)*DEVICE_DENSITY,y:((result.y??start.y)+origin.y)*DEVICE_DENSITY};
    };
    const end = () => { window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',end); if(result) ontransform?.(selected!,result); };
    window.addEventListener('pointermove',move); window.addEventListener('pointerup',end,{once:true});
  }
  function handleClick(e:Event) {
    if (interactive) return;
    const el = e.composedPath().find((el):el is HTMLElement => el instanceof HTMLElement && !!el.id && !!el.dataset.type);
    if (el) { e.preventDefault(); e.stopImmediatePropagation(); onselect?.(el.id); }
  }
  let dropGuide=$state<{x:number;y:number;w:number;h:number;position:DropPosition;horizontal:boolean}|null>(null);
  function dropTarget(e:DragEvent){
    const el=e.composedPath().find((item):item is HTMLElement=>item instanceof HTMLElement&&!!item.id&&!!item.dataset.type);
    if(!el)return {id:project.layout.id,position:'inside' as DropPosition};
    const ref=walk(project.layout).find(r=>r.node.id===el.id),rect=el.getBoundingClientRect();
    const parent=ref?.parent&&'type'in ref.parent?ref.parent:undefined;
    const horizontal=parent?.type==='row'||parent?.style?.['flex-direction']==='row';
    const fraction=horizontal?(e.clientX-rect.x)/Math.max(1,rect.width):(e.clientY-rect.y)/Math.max(1,rect.height);
    const position=dropPosition(['row','column','box','pages'].includes(el.dataset.type??''),fraction,el.id===project.layout.id);
    const bounds=host.getBoundingClientRect();
    dropGuide={x:rect.x-bounds.x,y:rect.y-bounds.y,w:rect.width,h:rect.height,position,horizontal};
    return {id:el.id,position};
  }
  function dragOver(e:DragEvent){e.preventDefault();if(!interactive)dropTarget(e);}
  function drop(e:DragEvent) {
    e.preventDefault();
    if(interactive)return;
    const target=dropTarget(e);dropGuide=null;
    ondrop?.(e.dataTransfer?.getData('text/plain')??'',target.id,target.position);
  }
  $effect(() => { JSON.stringify(project); selected; inspectTarget; inspectState; interactive; ready; render(); });
  $effect(() => { JSON.stringify(runtimeData); if(activeRenderer){activeRenderer.update(runtimeSnapshot());refreshLayout?.();} });
  $effect(() => {
    const config=project.manifest.studioPulse;
    if(!config||!interactive)return;
    const timer=setInterval(()=>{
      // Script UI commands are one-shot; blinking must preserve the user's current item/tab.
      activeRenderer?.update(runtimeSnapshot(false));refreshLayout?.();
    },100);
    return ()=>clearInterval(timer);
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="viewport" style:width={`${project.width * zoom}px`} style:height={`${project.height * zoom}px`} ondragover={dragOver} ondragleave={()=>dropGuide=null} ondrop={drop}>
  <div class="device" bind:this={host} style:width={`${project.width}px`} style:height={`${project.height}px`} style:transform={`scale(${zoom})`}></div>
  {#if grid.visible && !interactive}<div class="design-grid" style:background-size={`${grid.size*zoom}px ${grid.size*zoom}px`}></div>{/if}
  {#if dropGuide&&!interactive}<div class="drop-guide" class:inside={dropGuide.position==='inside'} style:left={`${dropGuide.x+(dropGuide.horizontal&&dropGuide.position==='after'?dropGuide.w:0)}px`} style:top={`${dropGuide.y+(!dropGuide.horizontal&&dropGuide.position==='after'?dropGuide.h:0)}px`} style:width={`${dropGuide.position==='inside'||!dropGuide.horizontal?dropGuide.w:3}px`} style:height={`${dropGuide.position==='inside'||dropGuide.horizontal?dropGuide.h:3}px`}></div>{/if}
  {#if selectionRect && !interactive}
    <div class="transform-box" style:left={`${selectionRect.x*zoom}px`} style:top={`${selectionRect.y*zoom}px`} style:width={`${selectionRect.w*zoom}px`} style:height={`${selectionRect.h*zoom}px`}>
      <button class="move-handle" title={$uiText("Kéo để di chuyển tự do")} onpointerdown={(e) => transform(e)}>✥</button>
      <button class="resize-handle" title={$uiText("Kéo để đổi kích thước")} onpointerdown={(e) => transform(e,true)}></button>
    </div>
  {/if}
</div>
<style>
  .drop-guide{position:absolute;pointer-events:none;background:#89d9c0;z-index:5;box-shadow:0 0 0 1px #152a37}.drop-guide.inside{background:#89d9c022;border:2px solid #89d9c0}
  .viewport { position: relative; flex-shrink: 0; box-shadow: 0 0 0 1px #647286, 0 12px 48px #0007; background: #101e30; }
  .device { container-type:size; transform-origin: top left; overflow: hidden; position: absolute; left: 0; top: 0; }
  .design-grid{position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(#9bbce126 1px,transparent 1px),linear-gradient(90deg,#9bbce126 1px,transparent 1px);z-index:1}
  .transform-box{position:absolute;pointer-events:none;border:1px solid #85baff;z-index:2}
  .move-handle{position:absolute;right:0;top:-23px;pointer-events:auto;cursor:move;padding:2px 6px;background:#396c9d;color:white;touch-action:none;font-size:13px;height:22px}
  .resize-handle{position:absolute;right:-5px;bottom:-5px;pointer-events:auto;cursor:nwse-resize;width:10px;height:10px;border:1px solid white;background:#4c8bcc;padding:0;border-radius:1px;touch-action:none}
</style>
