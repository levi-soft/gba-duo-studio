/** @typedef {import('../studio/types.js').JsonValue} JsonValue */
/** @typedef {import('../studio/types.js').DataValues} DataValues */
/** @typedef {import('../studio/types.js').LayoutNode} LayoutNode */
/** @typedef {import('../studio/types.js').StyleValues} StyleValues */
/** @typedef {ReturnType<typeof scopedValues> | JsonValue | undefined} Context */
/** @typedef {{node:HTMLElement,update:(context:Context)=>void}} RenderRecord */
/** @typedef {{initialUi?:DataValues, prepareInlineStyle?:(value:StyleValues)=>StyleValues,onUiChange?:(ui:DataValues)=>void,onCall?:(name:string,args:(JsonValue|undefined)[])=>void}} RendererOptions */
import {asList,asNumber,bound,interpolate,isTruthy,resolve,scopedValues,rootValues} from './data.js';
import {assetUrl} from './css.js';
import {stateKey} from './layout.js';

// A retained DOM tree: every record owns its children and latest binding context.
// Repeated rows are reused while the list length stays stable.
/** @param {string | ((path:string)=>string)} assets @param {RendererOptions} [options] */
export function createRenderer(assets, options = {}) {
  /** @type {RenderRecord|undefined} */
  let rootRecord;
  /** @type {DataValues} */
  let snapshot = {};let updating = false;
  const ui = {...options.initialUi};
  /** @type {Map<string,(JsonValue|undefined)[]>} */
  const history = new Map();
  /** @type {Map<string,JsonValue|undefined>} */
  const initial = new Map();
  const inline = options.prepareInlineStyle ?? (value => value);
  const refresh = () => rootRecord?.update({...snapshot,ui:{...ui}});

  /** @param {JsonValue | undefined} input @param {Context} context @param {boolean} [allowCalls] */
  function execute(input, context, allowCalls = true) {
    const actions = Array.isArray(input) ? input : [input];
    /** @type {[string,(JsonValue|undefined)[]][]} */
    const calls = [];
    let changed = false;
    /** @param {string} key @param {JsonValue | undefined} value */
    const assign = (key,value) => {
      if (!stateKey(key) || ['__proto__','prototype','constructor'].includes(key) || Object.is(ui[key],value)) return;
      Object.defineProperty(ui,key,{value,enumerable:true,writable:true,configurable:true}); changed = true;
    };
    for (let action of actions) {
      if (action === 'back') action = {back:true};
      if (!action || typeof action !== 'object' || Array.isArray(action)) continue;
      const state = action.state ?? 'page';
      if (typeof state!=='string' || !stateKey(state)) continue;
      if (action.set && typeof action.set === 'object') for (const [key,value] of Object.entries(action.set)) assign(key,bound(value,context));
      if (typeof action.navigate === 'string' && !action.back) {
        const page = interpolate(action.navigate,context);
        if (ui[state] !== page) {
          const stack = history.get(state) ?? [];
          if (ui[state] != null) stack.push(ui[state]);
          history.set(state,stack.slice(-32)); assign(state,page);
        }
      } else if (action.back) {
        const key = typeof action.back === 'string' ? action.back : state;
        assign(key,history.get(key)?.pop() ?? initial.get(key));
      }
      if (allowCalls && typeof action.call === 'string' && stateKey(action.call)) {
        const args = action.args == null ? [] : Array.isArray(action.args) ? action.args : [action.args];
        calls.push([action.call,args.map(value=>bound(value,context))]);
      }
    }
    if (changed && !updating) { refresh(); options.onUiChange?.({...ui}); }
    for (const [name,args] of calls) options.onCall?.(name,args);
    return changed;
  }

  /** @param {string} type @returns {HTMLElement} */
  function element(type) {
    const node = document.createElement(type === 'image' ? 'img' : 'div');
    node.dataset.type = type;
    return node;
  }
  /** @param {HTMLElement} node @param {StyleValues} values */
  function styles(node, values) {
    for (const [key,value] of Object.entries(inline(values))) node.style.setProperty(key,String(value));
  }
  /** @param {LayoutNode} widget @returns {RenderRecord} */
  function mount(widget) {
    const node = element(widget.type);
    /** @type {RenderRecord[]} */
    const records = [];
    /** @type {Context} */
    let context = {};
    /** @type {RenderRecord[]} */
    let rows = [];let currentTab = 0;
    /** @type {((ctx:Context)=>void)[]} */
    const ownUpdate = [];
    if (widget.id) node.id = widget.id;
    node.className = widget.class ?? '';
    /** @type {StyleValues} */
    const legacy = {};
    /** @param {unknown} value */
    const length = value => typeof value === 'number' ? value+'px' : String(value);
    for (const key of ['width','height','padding','gap']) if (widget[key] != null) legacy[key] = length(widget[key]);
    for (const [old,key] of Object.entries({background:'background',cornerRadius:'border-radius',borderColor:'border-color',borderWidth:'border-width'}))
      if (widget[old] != null) legacy[key] = ['cornerRadius','borderWidth'].includes(old) ? length(widget[old]) : String(widget[old]);
    if (widget.type === 'text') {
      if (widget.size != null) legacy['font-size'] = length(widget.size);
      if (widget.color != null) legacy.color = widget.color;
      if (widget.bold != null) legacy['font-weight'] = widget.bold ? 'bold' : 'normal';
      if (widget.font != null) legacy['font-family'] = widget.font;
    }
    if (['image','spacer'].includes(widget.type) && widget.size != null) legacy.width = legacy.height = length(widget.size);
    styles(node,{...legacy,...widget.style});
    /** @param {LayoutNode} child @param {HTMLElement} [parent] */
    const append = (child,parent = node) => { const record = mount(child); records.push(record); parent.append(record.node); return record; };
    if (widget.onClick != null || widget.type === 'button') {
      node.addEventListener('click', event => { event.stopPropagation(); if (widget.onClick != null) execute(widget.onClick,context); });
      node.style.cursor = 'pointer';
      for (const event of ['pointerup','pointerleave','pointercancel']) node.addEventListener(event,()=>node.classList.remove('pressed'));
      node.addEventListener('pointerdown',()=>node.classList.add('pressed'));
    }
    if (widget.type === 'text') {
      ownUpdate.push(ctx=>{ const value = interpolate(widget.text,ctx); if (node.textContent !== value) node.textContent = value; });
    } else if (widget.type === 'image') {
      node.setAttribute('alt','');
      /** @type {string|undefined} */
      let previous;
      ownUpdate.push(ctx=>{
        const path = bound(widget.src ?? '',ctx) ?? '';
        const url = path ? assetUrl(assets,path) : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E';
        if (url !== previous) { node.setAttribute('src',url); previous = url; }
      });
    } else if (widget.type === 'bar') {
      const fill = element('fill'); fill.className = 'fill'; node.append(fill);
      const label = widget.label != null ? element('label') : null;
      if (label) { label.className = 'label'; node.append(label); }
      ownUpdate.push(ctx=>{
        const current = asNumber(typeof widget.value === 'number' ? widget.value : resolve(widget.value,ctx));
        const max = asNumber(widget.maxKey != null ? resolve(widget.maxKey,ctx) : widget.max ?? 1);
        fill.style.width = (max > 0 ? Math.max(0,Math.min(1,current/max))*100 : 0)+'%';
        if (label) label.textContent = interpolate(widget.label,ctx);
      });
    } else if (widget.type === 'pages') {
      const state = widget.state ?? 'page', first = widget.initial ?? widget.pages?.[0]?.name ?? '';
      initial.set(state,first); if (!Object.hasOwn(ui,state)) ui[state] = first;
      const panels = (widget.pages??[]).map(page=>append(page.child));
      ownUpdate.push(()=>{
        const selected = (widget.pages??[]).some(page=>page.name===String(ui[state])) ? String(ui[state]) : first;
        panels.forEach((panel,index)=>panel.node.toggleAttribute('data-gbaduo-hidden',widget.pages?.[index]?.name!==selected));
      });
    } else if (widget.type === 'tabs') {
      const strip = element('tab-bar'), body = element('tab-content');
      strip.className = 'tab-bar'; body.className = 'tab-content'; node.append(strip,body);
      /** @type {HTMLElement[]} */
      const buttons = [];
      /** @type {RenderRecord[]} */
      const panels = [];
      /** @param {number} index */
      function choose(index) {
        currentTab = index;
        panels.forEach((panel,i)=>panel.node.toggleAttribute('data-gbaduo-hidden',i!==index));
        buttons.forEach((button,i)=>button.classList.toggle('active',i===index));
        if (node.isConnected) { applyStackChildPlacement(node); applyBarAccentColors(node); applyScrollContainers(node); }
      }
      (widget.tabs??[]).forEach((tab,index)=>{
        const button = element('tab'); button.className = 'tab'; strip.append(button); buttons.push(button);
        button.addEventListener('pointerdown',()=>button.classList.add('pressed'));
        for (const event of ['pointerup','pointerleave','pointercancel']) button.addEventListener(event,()=>button.classList.remove('pressed'));
        const text = element('text'); text.className = 'label'; button.append(text);
        ownUpdate.push(ctx=>{text.textContent = interpolate(tab.title,ctx);});
        panels.push(append(tab.child,body));
        button.addEventListener('click',event=>{event.stopPropagation();choose(index);});
      });
      ownUpdate.push(()=>choose(currentTab));
    } else if (widget.type === 'list') {
      const empty = element('empty'); empty.className = 'empty'; node.append(empty);
      ownUpdate.push(ctx=>{
        const items = asList(resolve(widget.items,ctx));
        while (rows.length > items.length) rows.pop()?.node.remove();
        while (rows.length < items.length) {
          const row = mount(widget.template??{id:'',type:'box'}); row.node.setAttribute('data-list-item',''); rows.push(row); node.append(row.node);
        }
        empty.toggleAttribute('data-gbaduo-hidden',items.length>0 || widget.empty == null);
        empty.textContent = interpolate(widget.empty ?? '',ctx);
        rows.forEach((row,index)=>row.update(scopedValues(items[index],index,rootValues(ctx))));
      });
    } else {
      if (widget.type === 'button' && widget.text != null) append({id:'',type:'text',class:'label',text:String(widget.text)});
      for (const child of widget.child ? [widget.child] : widget.children ?? []) append(child);
    }
    return {node,update(ctx) {
      context = ctx;
      // Visibility has a separate marker from page selection; neither can unhide the other.
      node.toggleAttribute('data-studio-invisible',widget.visibleIf != null && !isTruthy(resolve(widget.visibleIf,ctx)));
      for (const [name,path] of Object.entries(widget.classIf ?? {})) node.classList.toggle(name,isTruthy(resolve(path,ctx)));
      for (const [key,value] of Object.entries(widget.bindStyle ?? {})) {
        const computed = bound(value,ctx); styles(node,{[key]:computed == null ? '' : String(computed)});
      }
      ownUpdate.forEach(update=>update(ctx));
      records.forEach(record=>record.update(ctx));
    }};
  }
  return {
    /** @param {LayoutNode} widget */
    build(widget) { rootRecord = mount(widget); refresh(); return rootRecord.node; },
    /** @param {DataValues} [data] */
    update(data = {}) {
      const {ui:commands,...fields} = data ?? {}; snapshot = fields;
      updating = true; try { if (commands) execute(commands,{...snapshot,ui:{...ui}},false); } finally { updating = false; }
      refresh();
    },
    get ui() { return {...ui}; },
    /** @param {JsonValue | undefined} commands */
    applyScriptResult(commands) { execute(commands,{...snapshot,ui:{...ui}},false); },
    resetUi() { for (const key of Object.keys(ui)) delete ui[key]; for (const[key,value]of initial) ui[key]=value; history.clear();refresh();options.onUiChange?.({...ui}); },
  };
}

/** @param {HTMLElement} root @returns {HTMLElement[]} */
function elements(root) { return [root,...root.querySelectorAll('[data-type]')].filter((element)=>element instanceof HTMLElement); }
/** @type {WeakMap<HTMLElement,string>} */
const placement = new WeakMap();
/** @param {HTMLElement} root */
export function applyStackChildPlacement(root) {
  for (const parent of elements(root)) {
    const stack = getComputedStyle(parent).getPropertyValue('--studio-stack').trim() === '1';
    for (const child of parent.children) {
      if (!(child instanceof HTMLElement)) continue;
      if (stack && getComputedStyle(child).position !== 'absolute' && getComputedStyle(child).position !== 'fixed') {
        if (!placement.has(child)) placement.set(child,child.style.gridArea);
        child.style.gridArea = '1 / 1';
      } else if (placement.has(child)) { child.style.gridArea = placement.get(child)??''; placement.delete(child); }
    }
  }
}
/** @param {HTMLElement} root */
export function applyBarAccentColors(root) {
  for (const node of elements(root)) if (node.dataset.type === 'bar') {
    const fill = [...node.children].find(child=>child instanceof HTMLElement && child.dataset.type==='fill');
    const color = getComputedStyle(node).accentColor;
    if (fill instanceof HTMLElement && color && color !== 'auto') fill.style.backgroundColor = color;
  }
}
/** @type {WeakMap<HTMLElement,number>} */
const scrollSizes = new WeakMap();
/** @param {HTMLElement} root */
export function applyScrollContainers(root) {
  for (const node of elements(root)) {
    if (getComputedStyle(node).getPropertyValue('--studio-scroll-follow').trim() !== 'end') continue;
    if (node.scrollHeight !== scrollSizes.get(node)) { node.scrollTop = node.scrollHeight; scrollSizes.set(node,node.scrollHeight); }
  }
}
