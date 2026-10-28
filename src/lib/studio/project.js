/** @typedef {import('./types.js').Project} Project */
/** @typedef {import('./types.js').LayoutNode} LayoutNode */
/** @typedef {import('./types.js').JsonValue} JsonValue */
import JSZip from 'jszip';
import { parseLayoutWithWarnings } from '../preview/layout.js';
import { clone, walk, DEVICE_DENSITY } from './tree.js';
import { compileDesign } from './compiler.js';
import { validateMemorySpecs } from './memory-values.js';
import {computedLua,computedScriptPath,shouldGenerateScript} from './computed-values.js';
import {graphicsLua} from './rom-graphics.js';
import {templateCopy} from './template-copy.js';
import {validateDataFields} from './data-catalog.js';
import {PACK_LIMITS,safePackPath,boundedZipInput,readZipEntry,validatePreviewData} from './pack-safety.js';
export { clone, walk, DEVICE_DENSITY } from './tree.js';

export const labels = { text: 'Văn bản', bar: 'Thanh chỉ số', image: 'Hình ảnh', button: 'Nút bấm', row: 'Hàng ngang', column: 'Cột dọc', box: 'Khung', list: 'Danh sách', spacer: 'Khoảng trống', pages: 'Các trang', tabs: 'Thanh tab' };
export const uid = () => 'n' + crypto.randomUUID().replaceAll('-', '').slice(0, 12);
/** @param {string} type @param {string} [language] @returns {LayoutNode} */
export function widget(type, language = 'en') {
  const copy=templateCopy(language);
  if (type === 'bottom-tabs') return {
    type: 'tabs', id: uid(), style: { 'flex-direction': 'column-reverse', width: '100%', height: '100%', flex: '1 1 auto' },
    tabs: copy.tabs.map((title) => ({title,child:{...widget('column',language),children:[{...widget('text',language),text:title}]}})),
  };
  const id = uid();
  const base = { type, id };
  if (type === 'text') return { ...base, text: copy.text, style: { 'font-size': '18px' } };
  if (type === 'bar') return { ...base, value: '$hp', maxKey: '$maxHp', label: '{hp} / {maxHp}', style: { height: '24px', 'accent-color': '#5ed7a3', 'border-radius': '8px' } };
  if (type === 'image') return { ...base, src: '', style: { width: '80px', height: '80px', 'object-fit': 'contain', background: 'transparent' } };
  if (type === 'button') return { ...base, text: copy.button, style: { padding: '12px', background: '#365d79', 'border-radius': '8px' } };
  if (type === 'spacer') return { ...base, style: { height: '16px' } };
  if (type === 'list') return { ...base, items: '$items', empty: copy.empty, template: { type: 'text', id: uid(), text: '{name} · {value}', style: { padding: '10px', background: '#20334b', 'border-radius': '8px' } }, style: { gap: '8px' } };
  if (type === 'tabs') return createTabs();
  if (type === 'pages') return { ...base, initial: 'trang1', pages: [{ name: 'trang1', child: widget('column') }] };
  return { ...base, children: [], style: { gap: '12px', padding: '12px', 'min-height': '40px', ...(type === 'box' ? { background: '#20334b', 'border-radius': '12px' } : {}) } };
}
/** @param {number} [count] @param {string} [position] @returns {LayoutNode} */
export function createTabs(count = 2, position = 'bottom') {
  if (!Number.isSafeInteger(count) || count < 1) throw new Error('Số tab phải là số nguyên lớn hơn 0.');
  return {type:'tabs',id:uid(),style:{'flex-direction':position === 'bottom' ? 'column-reverse' : 'column',width:'100%',height:'100%',flex:'1 1 auto'},tabs:Array.from({length:count},(_,i)=>({title:`Tab ${i+1}`,child:widget('column')}))};
}
/** @param {LayoutNode} tabs @param {string} [title] */
export function appendTab(tabs, title = `Tab ${(tabs.tabs?.length??0) + 1}`) {
  const child = widget('column');
  (tabs.tabs??=[]).push({title,child}); return child.id;
}
/** @param {string} [kind] @param {string} [language] @returns {Project} */
export function createProject(kind = 'rpg', language = 'en') {
  const copy=templateCopy(language);
  const page = widget('column');
  page.style = { gap: '16px' };
  if (kind !== 'blank') page.children = [
    { ...widget('text'), text: '{gameTitle}', style: { 'font-size': '14px', color: '#7ed8c3', 'letter-spacing': '2px' } },
    { ...widget('text'), text: kind === 'adventure' ? copy.journey : copy.heading, style: { 'font-size': '30px', 'font-weight': '700' } },
    { ...widget('text'), text: '{chapter}', style: { color: '#a2b4cd', 'font-size': '14px' } },
    { ...widget('box'), children: [
      { ...widget('text'), text: '{character}', style: { 'font-size': '24px', 'font-weight': '700' } },
      { ...widget('text'), text: copy.level, style: { color: '#a2b4cd', 'font-size': '14px' } },
      widget('bar'),
    ] },
    { ...widget('text'), text: kind === 'adventure' ? copy.collect : copy.inventory, style: { color: '#a2b4cd', 'font-size': '12px', 'letter-spacing': '2px' } },
    widget('list',language),
  ];
  return { studioVersion: 1, manifest: { id: 'my-companion', name: copy.project, version: '0.1.0', author: '', formatVersion: 2, match: { gameCode: [], crc32: [] }, tickHz: 4, layout: 'layout.json', styles: ['style.css'], values: {} },
    layout: { type: 'pages', id: uid(), initial: 'overview', pages: [{ name: 'overview', child: page }] },
    css: ':root { background: #101e30; color: #edf4ff; padding: 0px; font-size: 16px; }\n',
    data: { gameTitle: copy.title, chapter: copy.chapter, character: copy.character, level: 5, role: copy.role, hp: 28, maxHp: 40, items: copy.items.map((name,index)=>({name,value:['32 / 40','3','1'][index]})) }, files: {}, width: 1240, height: 1080 };
}
/** @param {Project} project */
export function migrateDefaultCanvasPadding(project) {
  const original = ':root { background: #101e30; color: #edf4ff; padding: 24px; font-size: 16px; }\n';
  if (project.css === original) project.css = original.replace('padding: 24px', 'padding: 0px');
  return project;
}
/** @param {LayoutNode} root */
export function ensureIds(root) {
  const seen = new Set();
  for (const { node } of walk(root)) { if (!node.id || seen.has(node.id)) node.id = uid(); seen.add(node.id); }
  return root;
}
/** @param {LayoutNode} root @param {string} id */
export function removeNode(root, id) {
  const ref = walk(root).find((r) => r.node.id === id);
  if (!ref?.parent) return false;
  if (ref.key === 'child') {
    const parent=ref.parent;
    const owner = walk(root).find((r) => r.node.pages?.some(entry=>entry===parent) || r.node.tabs?.some(entry=>entry===parent))?.node;
    if (!owner) return false;
    const entries=owner.pages??owner.tabs;
    if(!entries)return false;
    if (entries.length === 1) throw new Error(owner.pages ? 'Cần giữ ít nhất một trang.' : 'Cần giữ ít nhất một tab.');
    const index = entries.findIndex(entry=>entry===parent);
    if(index<0)return false;
    const deletedName = entries[index].name;
    entries.splice(index, 1);
    if (owner.pages) {
      const fallback = entries[Math.min(index, entries.length - 1)].name;
      if (owner.initial === deletedName) owner.initial = fallback;
      for (const { node } of walk(root)) repairPageActions(node.onClick, deletedName, fallback, owner.state ?? 'page');
    }
    return true;
  }
  if (ref.index == null||ref.key!=='children'||!('type' in ref.parent)||!ref.parent.children) return false;
  ref.parent.children.splice(ref.index, 1); return true;
}
/** @param {JsonValue | undefined} actions @param {string | undefined} deletedName @param {string | undefined} fallback @param {string} state */
function repairPageActions(actions, deletedName, fallback, state) {
  for (const action of Array.isArray(actions) ? actions : [actions]) {
    if (action && typeof action === 'object' && !Array.isArray(action) && action.navigate === deletedName && (action.state ?? 'page') === state) action.navigate = fallback;
  }
}
/** @param {{x:number,y:number,width:number,height:number}} start @param {{x:number,y:number}} delta @param {{resize?:boolean,snap?:boolean,step?:number,origin?:{x:number,y:number}}} [options] */
export function snappedTransform(start, delta, { resize = false, snap = false, step = 16, origin = { x: 0, y: 0 } } = {}) {
  const unit = Number.isFinite(step) && step > 0 ? step : 1;
  /** @param {number} n */
  const quantize = (n) => snap ? Math.round(n / unit) * unit : n;
  const minimumSize = snap ? Math.ceil(8 / unit) * unit : 8;
  if (resize) return { width: Math.max(minimumSize, quantize(start.width + delta.x)), height: Math.max(minimumSize, quantize(start.height + delta.y)) };
  /** @param {number} value @param {number} offset */
  const position = (value, offset) => snap ? Math.max(Math.ceil(offset / unit) * unit, quantize(value + offset)) - offset : Math.max(0,value);
  return { ...start, x: position(start.x + delta.x, origin.x), y: position(start.y + delta.y, origin.y), move: true };
}
/** @param {LayoutNode} root @param {string} id @param {string} targetId */
export function moveNode(root, id, targetId) {
  const source = walk(root).find((r) => r.node.id === id);
  const target = walk(root).find((r) => r.node.id === targetId)?.node;
  if (!source?.parent || source.index == null || !target || walk(source.node).some((r) => r.node === target)) return false;
  if (!['row', 'column', 'box'].includes(target.type)) return false;
  if(source.key!=='children'||!('type' in source.parent)||!source.parent.children)return false;
  source.parent.children.splice(source.index, 1);
  (target.children ??= []).push(source.node); return true;
}
/** @param {Project} project @param {boolean} [forExport] */
export function validate(project, forExport = false) {
  if(!project.manifest||typeof project.manifest.id!=='string'||typeof project.manifest.name!=='string'||typeof project.manifest.version!=='string')throw Error('Manifest needs an id, name and version.');
  const manifest=project.manifest;
  for(const path of [manifest.layout,...(manifest.styles??[]),manifest.script].filter(path=>path!==undefined))safePackPath(path);
  const paths=Object.keys(project.files??{});
  if(paths.length>PACK_LIMITS.entries)throw Error('Too many pack files.');
  let fileBytes=0;
  for(const path of paths){safePackPath(path);const value=project.files[path];if(typeof value!=='string')throw Error('Pack files must be base64 strings.');const bytes=Math.ceil(value.length*3/4);if(bytes>PACK_LIMITS.file)throw Error('Pack file exceeds the size limit.');fileBytes+=bytes;}
  if(fileBytes>PACK_LIMITS.expanded)throw Error('Pack files exceed the size limit.');
  if(manifest.tickHz!==undefined&&(!Number.isInteger(manifest.tickHz)||manifest.tickHz<1||manifest.tickHz>30))throw Error('Update rate must be an integer between 1 and 30 Hz.');
  validateMemorySpecs(project.manifest.values??{});
  validateDataFields(project.manifest.studioDataFields);
  if (![project.width, project.height].every((n) => Number.isInteger(n) && n >= 64 && n <= 8192)) throw new Error('Chiều rộng và cao phải là số nguyên từ 64 đến 8192 pixel.');
  if (project.editorGrid && (!Number.isInteger(project.editorGrid.size) || project.editorGrid.size < 1 || project.editorGrid.size > 512)) throw new Error('Bước lưới phải từ 1 đến 512 pixel.');
  const parsed = parseLayoutWithWarnings(JSON.stringify(project.layout));
  if (!project.data || typeof project.data !== 'object' || Array.isArray(project.data)) throw new Error('Dữ liệu mẫu phải là một đối tượng JSON.');
  validatePreviewData(project.data);
  if (forExport && !/^[a-z0-9-]{1,64}$/.test(project.manifest.id)) throw new Error('ID pack cần 1–64 ký tự: chữ thường không dấu, số hoặc dấu -.');
  if (forExport && !project.manifest.match?.gameCode?.length) throw new Error('Hãy nhập mã game ở mục Dự án trước khi xuất pack. CRC32 chỉ là bộ lọc bổ sung.');
  if (forExport && manifest.script && !Object.hasOwn(project.files,manifest.script) && !shouldGenerateScript(project)) throw new Error('Declared Lua entry point is missing.');
  if(shouldGenerateScript(project))computedLua(project.manifest);
  if(forExport && project.manifest.script && !project.files[project.manifest.script] && !shouldGenerateScript(project))throw Error('The project is missing its declared Lua script. Import the complete pack.');
  if ((project.manifest.match?.gameCode ?? []).some((c) => !/^[A-Z0-9]{4}$/.test(c))) throw new Error('Mã game cần đúng 4 ký tự, ví dụ TEST.');
  if ((project.manifest.match?.crc32 ?? []).some((c) => !/^[0-9a-fA-F]{8}$/.test(c))) throw new Error('CRC32 cần đúng 8 ký tự hexadecimal.');
  return parsed;
}
/** @param {Project} project */
export async function exportPack(project) {
  validate(project, true);
  graphicsLua(project.manifest);
  if(Object.keys(project.manifest.studioGraphics??{}).length&&!shouldGenerateScript(project))throw Error('ROM image blocks require a Studio-generated script; custom Lua is preserved.');
  const compiled = compileDesign(project);
  const zip = new JSZip();
  for (const [path, data] of Object.entries(compiled.files)) if (path !== 'studio-design.json') zip.file(path, data, { base64: true });
  const manifest = clone(project.manifest);
  if(shouldGenerateScript(project)){manifest.script=computedScriptPath;zip.file(computedScriptPath,computedLua(manifest));}
  manifest.layout = 'layout.json'; manifest.styles = ['style.css']; manifest.formatVersion = 2;
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  const generatedLayout = JSON.stringify(compiled.layout, null, 2);
  zip.file('layout.json', generatedLayout);
  zip.file('style.css', compiled.css);
  zip.file('studio-design.json',JSON.stringify({version:1,layout:project.layout,css:project.css,generatedLayout,generatedCss:compiled.css,width:project.width,height:project.height,...(project.editorGrid?{editorGrid:project.editorGrid}:{})}));
  zip.file('preview-data.json', JSON.stringify(project.data, null, 2));
  return zip.generateAsync({ type: 'blob' });
}
/** @param {Parameters<typeof JSZip.loadAsync>[0]} file @returns {Promise<Project>} */
export async function importPack(file) {
  const zip = await JSZip.loadAsync(await boundedZipInput(file));
  if(Object.keys(zip.files).length>PACK_LIMITS.entries)throw Error('Too many ZIP entries.');
  for(const entry of Object.values(zip.files))safePackPath((entry.unsafeOriginalName??entry.name).replace(/\/$/,''));
  const entries = Object.values(zip.files).filter((e) => !e.dir);
  const manifests=entries.filter(e=>/(^|\/)manifest.json$/.test(e.name));
  if(manifests.length!==1)throw Error('ZIP must contain exactly one manifest.json.');
  const entry=manifests[0];
  const base = entry.name.slice(0, -'manifest.json'.length);
  /** @type {Map<string,Uint8Array<ArrayBuffer>>} */
  const bytes=new Map();const budget={used:0};
  for(const entry of entries)bytes.set(entry.name,await readZipEntry(entry,budget));
  /** @param {string} name @param {string} [fallback] */
  const text = (name, fallback = '') => {safePackPath(name);const data=bytes.get(base+name);return data?new TextDecoder().decode(data):fallback;};
  /** @type {import('./types.js').Manifest} */
  const manifest = JSON.parse(new TextDecoder().decode(bytes.get(entry.name)));
  if(!manifest||typeof manifest!=='object'||Array.isArray(manifest))throw Error('Invalid manifest.');
  manifest.name??=manifest.id;manifest.version??='0.0.0';
  if(manifest.styles!==undefined&&(!Array.isArray(manifest.styles)||!manifest.styles.every(path=>typeof path==='string')))throw Error('Manifest styles must be a list of paths.');
  for(const path of [manifest.layout,...(manifest.styles??[]),manifest.script].filter(path=>path!==undefined))safePackPath(path);
  const project = createProject('blank');
  project.manifest = manifest;
  const rawLayout = text(manifest.layout ?? 'layout.json');
  project.layout = ensureIds(parseLayoutWithWarnings(rawLayout).root);
  project.css = (manifest.styles ?? []).map(p=>text(p)).join('\n');
  const designText = text('studio-design.json');
  if(designText) {
    try {
      const design=JSON.parse(designText);
      if(design.version===1 && design.generatedLayout===rawLayout && design.generatedCss===project.css) {
        project.layout=ensureIds(parseLayoutWithWarnings(design.layout).root); project.css=design.css;
        // Canvas/grid settings are editor-only. Restore them only when the
        // authored design matches the actual runtime files, and ignore invalid
        // optional values so old or externally edited packs remain openable.
        if([design.width,design.height].every(n=>Number.isInteger(n)&&n>=64&&n<=8192)){project.width=design.width;project.height=design.height;}
        const grid=design.editorGrid;
        if(grid&&typeof grid==='object'&&!Array.isArray(grid)&&typeof grid.visible==='boolean'&&typeof grid.snap==='boolean'&&Number.isInteger(grid.size)&&grid.size>=1&&grid.size<=512)project.editorGrid={visible:grid.visible,snap:grid.snap,size:grid.size};
      }
    } catch { /* Invalid/stale editor metadata must not prevent opening the runtime pack. */ }
  }
  project.data = JSON.parse(text('preview-data.json', '{}'));
  for (const entry of entries) {
    if (!entry.name.startsWith(base)) continue;
    const path = entry.name.slice(base.length);
    safePackPath(path);
    const data=bytes.get(entry.name);if(!data)continue;
    let binary='';for(let offset=0;offset<data.length;offset+=32768)binary+=String.fromCharCode(...data.subarray(offset,offset+32768));
    project.files[path] = btoa(binary);
  }
  validate(project); return project;
}
/** @param {import('./types.js').DataValues | undefined} data @param {string} [prefix] @returns {{path:string,value:JsonValue|undefined,array:boolean}[]} */
export function dataPaths(data, prefix = '') {
  /** @type {{path:string,value:JsonValue|undefined,array:boolean}[]} */
  const out = [];
  for (const [key, value] of Object.entries(data ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    out.push({ path, value, array: Array.isArray(value) });
    if (value && typeof value === 'object' && !Array.isArray(value)) out.push(...dataPaths(value, path));
  }
  return out;
}
