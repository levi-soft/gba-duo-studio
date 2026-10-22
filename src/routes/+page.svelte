<script lang="ts">
  import { t as uiText } from '../lib/studio/i18n.js';
  import { locale, setLanguage, restoreLanguage } from '../lib/studio/i18n.js';
  onMount(restoreLanguage);
  import { onMount } from 'svelte';
  import {loadProjectDraft,saveProjectDraft} from '../lib/studio/project-storage.js';
  import LiveMemoryBar from '../lib/studio/LiveMemoryBar.svelte';
  import ScriptEditor from '../lib/studio/ScriptEditor.svelte';
  import MemoryFields from '../lib/studio/MemoryFields.svelte';
  import RamInspector from '../lib/studio/RamInspector.svelte';
  import Preview from '../lib/studio/Preview.svelte';
  import TabFont from '../lib/studio/TabFont.svelte';
  import SkinEditor from '../lib/studio/SkinEditor.svelte';
  import TemplateLibrary from '../lib/studio/TemplateLibrary.svelte';
  import DataEditor from '../lib/studio/DataEditor.svelte';
  import BindingRules from '../lib/studio/BindingRules.svelte';
  import PulseRules from '../lib/studio/PulseRules.svelte';
  import { assetImportPath } from '../lib/studio/assets.js';
  import AssetBrowser from '../lib/studio/AssetBrowser.svelte';
  import { fontCatalog, applyNodeFont, fontValue, setTabLabelFont, tabLabelFont } from '../lib/studio/fonts.js';
  import StyleInspector from '../lib/studio/StyleInspector.svelte';
  import { setNodeStyles, cloneStyledTree } from '../lib/studio/style-model.js';
  import {sceneRows,revealAncestors} from '../lib/studio/scene.js';
  import {bindingFields,updateDataValue} from '../lib/studio/bindings.js';
  import { labels, clone, uid, widget, createProject, walk, removeNode, moveNode, validate, exportPack, importPack, dataPaths, ensureIds, migrateDefaultCanvasPadding, appendTab, createTabs } from '../lib/studio/project.js';
  import './studio.css';
  import type {Project,LayoutNode,LayoutEntry,TreeRef,DataValues,JsonValue,Skin,MemorySpec,StyleValues} from '../lib/studio/types.js';
  type InputEvent=Event & {currentTarget:HTMLInputElement};
  interface Transform {x?:number;y?:number;width:number;height:number;move?:boolean}
  const errorMessage=(error:unknown)=>error instanceof Error?error.message:String(error);
  const labelFor=(type:string)=>labels[type as keyof typeof labels]??type;
  function requiredNode(p:Project,id=selected){const result=walk(p.layout).find(r=>r.node.id===id);if(!result)throw Error($uiText("Thành phần không còn tồn tại."));return result.node;}
  function requiredEntry(p:Project){const ref=walk(p.layout).find(r=>r.node.id===selected);if(!ref?.parent||'type' in ref.parent)throw Error($uiText("Chọn gốc của trang hoặc tab."));return ref.parent;}
  function actionObject(action:JsonValue|undefined):Record<string,JsonValue|undefined>{return action&&typeof action==='object'&&!Array.isArray(action)?action:{};}
  function requiredTabs(p:Project){const result=requiredNode(p);if(!result.tabs)throw Error($uiText("Chọn khung chứa tab."));return result as LayoutNode & {tabs:NonNullable<LayoutNode['tabs']>};}
  function editableSiblings(ref:TreeRef){if(!ref.parent||ref.key!=='children'||!('children' in ref.parent)||!Array.isArray(ref.parent.children))throw Error($uiText("Chọn thành phần bên trong một khung chứa."));return ref.parent.children;}

  let project = $state<Project>(createProject());
  let selected = $state('');
  let liveEnabled=$state(false),liveData=$state<DataValues|null>(null),liveStatus=$state<{kind:string;message?:string}>({kind:'sample'});
  const previewData=$derived(liveEnabled ? (liveData ? {...project.data,...liveData} : {}) : project.data);
  function setMemoryFields(values:Record<string,MemorySpec>){edit(p=>{p.manifest.values=values;for(const name of Object.keys(values))if(!Object.hasOwn(p.data,name))Object.defineProperty(p.data,name,{value:0,enumerable:true,writable:true,configurable:true});},$uiText("Đã cập nhật trường RAM của dự án."));}

  let mode = $state('2d'), dock = $state('output'), leftTab = $state('scene');
  let zoom = $state(0.4), log = $state($uiText("Sẵn sàng. Kéo thành phần từ thư viện vào màn hình hoặc cây Scene."));
  let error = $state(''), saved = $state($uiText("Chưa lưu")), hydrated = $state(false);
  let history = $state<Project[]>([]), future = $state<Project[]>([]), dirty = $state(false);
  let showNew = $state(false), showSettings = $state(false), showProjectTools = $state(false);
  let inspectorTab = $state('content');
  let importInput:HTMLInputElement, assetInput:HTMLInputElement, projectInput:HTMLInputElement;
  let dataText = $state(''), cssText = $state(''), layoutText = $state('');
  let editorError = $state('');
  let leftWidth = $state(246), rightWidth = $state(340), outputHeight = $state(142), filesHeight = $state(340);
  let customSizeMode = $state(false);
  let tabCount = $state(2), tabPosition = $state('bottom');
  let showTemplates=$state(false),dataMode=$state('form'),fileView=$state<{path:string;text:string}|null>(null);
  let sceneSearch=$state(''),assetSearch=$state('');
  let fileTab=$state('assets'),collapsed=$state<Record<string,boolean>>({});
  let checkTransparency=$state(false);
  let lastRevealedId='';
  let effectiveFont=$state('');
  let styleTarget=$state('self'),styleState=$state('normal'),styleSnapshot=$state<{values:Record<string,string>;sources:Record<string,string>}>({values:{},sources:{}});
  let inspectedId='';
  $effect(()=>{if(selected!==inspectedId){inspectedId=selected;styleTarget='self';styleState='normal';}});
  function editStyles(changes:Record<string,string>){edit(p=>setNodeStyles(p.layout,selected,styleTarget,styleState,changes),$uiText("Đã cập nhật hình thức."));}
  let fontDescendants=$state(true);
  const fonts=$derived(fontCatalog(project));
  function applyFont(family:string,target=selected){edit(p=>applyNodeFont(p.layout,target,family,fontDescendants),$uiText("Đã cập nhật font chữ") + (fontDescendants?$uiText(" cho cả nội dung bên trong."):'.'));}
  function applyFontAsset(path:string){const font=fonts.find(f=>f.path===path);if(font)applyFont(font.family);}

  function actionMode(action:JsonValue|undefined){
    if(action==null)return 'none';if(action==='back')return 'back';
    if(typeof action!=='object'||Array.isArray(action))return 'custom';
    if(action.set||(Array.isArray(action.args)&&action.args.length))return 'custom';
    if(action.navigate)return 'navigate';if(action.back)return 'back';if(action.call)return 'call';return 'custom';
  }
  function setActionMode(mode:string){setProp('onClick',mode==='none'?'':mode==='back'?{back:true}:mode==='navigate'?{navigate:pages[0]??''}:mode==='call'?{call:'actionName'}:{});}
  function fitCanvas() {
    const area = document.querySelector('.canvas-area');
    if (area) zoom = Math.max(0.05, Math.min(1.5, (area.clientWidth-80)/project.width, (area.clientHeight-120)/project.height));
  }
  const entries = $derived(walk(project.layout));
  function nodeLabel(ref:TreeRef){return ref.title ? $uiText(ref.title) : ref.node.text?.slice(0,32)??(ref.node.class?'.'+ref.node.class: $uiText(labelFor(ref.node.type)));}
  const sceneEntries=$derived(sceneRows(entries,collapsed,sceneSearch,nodeLabel));
  function toggleGroup(id:string){const next={...collapsed};if(next[id])delete next[id];else next[id]=true;collapsed=next;}
  function collapseAll(){collapsed=Object.fromEntries(entries.filter((r,i)=>entries[i+1]?.depth>r.depth).map(r=>[r.node.id,true]));}
  $effect(()=>{if(selected&&selected!==lastRevealedId){lastRevealedId=selected;collapsed=revealAncestors(entries,selected,collapsed);}});
  function insertAsset(path:string,target=selected){if(!/\.(png|jpe?g|svg|webp|gif)$/i.test(path))return;const n=widget('image');n.src='asset:'+path.slice(7);edit((p)=>{const c=container(p,target);if(!c)throw Error($uiText("Chọn khung chứa để thêm ảnh."));c.children??=[];c.children.push(n);},$uiText("Đã thêm ảnh từ Assets."));selected=n.id;}
  function assignAsset(path:string){if(node?.type==='image')setProp('src','asset:'+path.slice(7));else log=$uiText("Chọn nút Hình ảnh trong Scene trước khi gán asset; hoặc bấm Tạo ảnh để thêm nút mới.");}
  function clearImageBackground(){edit((p)=>{const n=requiredNode(p);n.style??={};n.style.background='transparent';n.style['background-color']='transparent';n.style['background-image']='none';},$uiText("Đã bỏ nền của nút Hình ảnh; giữ nguyên pixel và alpha của file."));}
  const current = $derived(entries.find((r) => r.node.id === selected));
  const node = $derived(current?.node);
  const paths = $derived(bindingFields(project,selected));
  const assetPaths = $derived(Object.keys(project.files).filter((p) => p.startsWith('assets/') && !p.startsWith('assets/__studio_skins/') && !p.startsWith('assets/__studio_fonts/')));
  const imagePaths = $derived(assetPaths.filter((p) => /\.(png|jpe?g|webp|gif|svg)$/i.test(p)));
  const pages = $derived(entries.filter((r) => r.node.type === 'pages').flatMap((r) => (r.node.pages??[]).map((p) => p.name??'')));
  const grid = $derived(project.editorGrid ?? { visible: true, snap: true, size: 32 });
  const pageOwner = $derived(entries.find((r) => r.node.pages?.some((p) => p.child.id === selected))?.node);
  const mainPages = $derived(entries.find((r) => r.node.type === 'pages')?.node);
  function addTab() { edit((p) => { const tabs = walk(p.layout).find((r) => r.node.id === selected)?.node; if (tabs?.type !== 'tabs') throw new Error($uiText("Hãy chọn thành phần Các tab.")); appendTab(tabs); }, $uiText("Đã thêm tab. Chọn nút nội dung trong danh sách tab để thiết kế.")); }
  async function openTemplate(bytes:ArrayBuffer,file:string) {
    const p=await importPack(bytes);history=[...history.slice(-49),clone(project)];future=[];project=p;selected=p.layout.id;mode='2d';leftTab='scene';sceneSearch='';assetSearch='';collapsed={};fileTab='assets';editorError='';
    log=$uiText("Đã mở bản sao {0}. ZIP gốc không đổi; Lua và tài nguyên được giữ nguyên. Dữ liệu hiện tại là dữ liệu mẫu.", file);
    requestAnimationFrame(fitCanvas);
  }
  function inspectFile(path:string) {
    const bytes=Uint8Array.from(atob(project.files[path]),c=>c.charCodeAt(0));fileView={path,text:new TextDecoder().decode(bytes)};
  }
  const textFiles=$derived(Object.keys(project.files).filter(p=>/\.(lua|md|txt)$/i.test(p)));
  const themeVariables=$derived([...project.css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)].map(m=>({name:m[1],value:m[2].trim()})).filter((v,i,a)=>a.findIndex(x=>x.name===v.name)===i));
  const cssClasses=$derived([...new Set([...project.css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{/g)].flatMap(m=>[...m[1].matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(c=>c[1])))]);
  function setThemeVariable(name:string,value:string){edit((p)=>{const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');p.css=p.css.replace(new RegExp('('+escaped+'\\s*:\\s*)([^;}]+)','g'),(_,prefix)=>prefix+value);},$uiText("Đã chỉnh biến giao diện."));}
  function changeData(path:(string|number)[],value:JsonValue){edit((p)=>p.data=updateDataValue(p.data,path,value) as DataValues,$uiText("Đã cập nhật dữ liệu mẫu để xem trước."));}
  function renameTab(index:number,title:string) { edit((p) => { requiredTabs(p).tabs[index].title = title; }); }
  function tabOwner(id:string){return entries.find(r=>r.node.type==='tabs'&&r.node.tabs?.some(t=>t.child.id===id))?.node;}
  function setTabFont(index:number,value:string){edit(p=>{const owner=requiredTabs(p);setTabLabelFont(p.layout,owner.id,owner.tabs![index].child.id,value);});}
  function setCurrentTabFont(value:string){edit(p=>{const owner=walk(p.layout).find(r=>r.node.type==='tabs'&&r.node.tabs?.some(t=>t.child.id===selected))?.node;if(owner)setTabLabelFont(p.layout,owner.id,selected,value);});}

  function setTabSkin(index:number,value:Skin) { edit((p) => { requiredTabs(p).tabs[index].skin = value; }); }
  function setCurrentTabSkin(value:Skin) { edit((p) => { const parent=walk(p.layout).find((r) => r.node.id === selected)?.parent;if(parent&&'child' in parent)parent.skin = value; }); }
  function setButtonSkin(value:Skin) { edit((p) => { const n=requiredNode(p); for(const key of ['width','height']) if(value[key]!==n.buttonSkin?.[key] && n.style) delete n.style[key]; n.buttonSkin=value; }); }
  function deleteTab(index:number) { edit((p) => { const tabs = requiredNode(p); removeNode(p.layout,tabs.tabs![index].child.id); }, $uiText("Đã xóa tab. Ctrl+Z để khôi phục.")); }
  function setGrid(key:string,value:number|boolean) { edit((p) => { p.editorGrid = { visible: true, snap: true, size: 32, ...p.editorGrid, [key]: value }; if (!Number.isInteger(p.editorGrid.size) || p.editorGrid.size < 1 || p.editorGrid.size > 512) throw new Error($uiText("Bước lưới phải từ 1 đến 512 pixel.")); }); }
  onMount(() => {
    let stopped=false;
    (async()=>{
      try { const stored = await loadProjectDraft(); if (!stopped&&stored) { const p = migrateDefaultCanvasPadding(JSON.parse(stored)); validate(p); project = p; selected = p.layout.id; saved = $uiText("Đã khôi phục"); } else if(!stopped) project=createProject("rpg",$locale); } catch { log = $uiText("Không thể khôi phục bản lưu trước. Hãy mở file dự án nếu có."); }
      if(!stopped){hydrated = true;if (!selected) selected = project.layout.pages?.[0]?.child.id ?? project.layout.id;}
    })();
    return ()=>{stopped=true;};
  });
  $effect(() => {
    const value = JSON.stringify(project);
    if (!hydrated) return;
    saved = $uiText("Đang lưu…");
    let cancelled=false;
    const t = setTimeout(async() => { try { await saveProjectDraft(value); if(!cancelled)saved = $uiText("Đã lưu trên trình duyệt"); } catch { if(!cancelled)saved = $uiText("Không lưu được — tải file dự án để lưu"); } }, 450);
    return () => {cancelled=true;clearTimeout(t);};
  });
  function edit(fn:(project:Project)=>void,message = '') {
    const before = clone(project); const next = clone(project);
    try { fn(next); validate(next); history = [...history.slice(-49), before]; future = []; project = next; dirty = true; if (message) log = message; editorError = ''; } catch (e) { editorError = errorMessage(e); }
  }
  function setProp(key:string,value:unknown) { edit((p) => { const n = requiredNode(p); if (value === '') delete n[key]; else n[key] = value; }); }
  function setStyle(key:string,value:string) { edit((p) => { const n = requiredNode(p); n.style ??= {}; if (value === '') delete n.style[key]; else n.style[key] = value; }); }
  function transformNode(id:string,rect:Transform) {
    edit((p) => {
      const ref = walk(p.layout).find((r) => r.node.id === id);
      if (!ref?.parent || ref.index == null) throw new Error($uiText("Chỉ di chuyển tự do các nút bên trong một khung chứa."));
      const n = ref.node; n.style ??= {};
      if (rect.move) {
        if(!('type' in ref.parent))throw Error($uiText("Không thể di chuyển gốc của trang."));
        ref.parent.style ??= {}; ref.parent.style.position = 'relative';
        n.style.position = 'absolute'; n.style.left = Number(rect.x!.toFixed(4))+'px'; n.style.top = Number(rect.y!.toFixed(4))+'px';
      }
      n.style.width = Number(rect.width.toFixed(4))+'px'; n.style.height = Number(rect.height.toFixed(4))+'px';
    }, rect.move ? $uiText("Đã di chuyển tự do. Nút dùng vị trí absolute trong khung chứa.") : $uiText("Đã đổi kích thước."));
  }
  function container(p:Project,id:string) {
    const list = walk(p.layout); const ref = list.find((r) => r.node.id === id);
    if (ref?.node.children && ['column','row','box'].includes(ref.node.type)) return ref.node;
    if (ref?.node.type === 'pages') return ref.node.pages?.[0]?.child;
    for (let i = (ref?list.indexOf(ref):-1) - 1; i >= 0; i--) if (list[i].depth < (ref?.depth ?? 1) && ['column','row','box'].includes(list[i].node.type)) return list[i].node;
    return list.find((r) => ['column','row','box'].includes(r.node.type))?.node;
  }
  function add(type:string,target=selected) {
    let n;
    try { n = type === 'tabs' ? createTabs(Number(tabCount),tabPosition) : widget(type,$locale); } catch(e) { editorError=errorMessage(e); return; }
    edit((p) => { const c = container(p, target); if (!c) throw new Error($uiText("Hãy chọn một khung chứa trước.")); c.children ??= []; c.children.push(n); }, $uiText("Đã thêm {0}.", labelFor(type))); selected = n.id;
  }
  function drop(payload:string,target=selected) {
    if (!payload) return;
    if(payload.startsWith('font:')){const font=fonts.find(f=>f.path===payload.slice(5));if(font)applyFont(font.family,target);return;}
    if (payload.startsWith('asset:')) return insertAsset(payload.slice(6),target);
    if (payload.startsWith('new:')) return add(payload.slice(4), target);
    edit((p) => { const c = container(p, target); if (!c || !moveNode(p.layout, payload, c.id)) throw new Error($uiText("Không thể chuyển vào chính nó hoặc chuyển trang/mẫu lặp.")); }, $uiText("Đã chuyển thành phần vào khung chứa."));
  }
  function reorder(delta:number) {
    edit((p) => { const r = walk(p.layout).find((r) => r.node.id === selected); if (r?.index == null) throw new Error($uiText("Chỉ đổi thứ tự các thành phần cùng khung.")); const arr = editableSiblings(r); const to = r.index + delta; if (to < 0 || to >= arr.length) return; [arr[r.index], arr[to]] = [arr[to], arr[r.index]]; });
  }
  function duplicate() {
    edit((p) => { const r = walk(p.layout).find((r) => r.node.id === selected); if (r?.index == null) throw new Error($uiText("Chọn thành phần trong một khung để nhân bản.")); const n = cloneStyledTree(r.node,uid); editableSiblings(r).splice(r.index + 1, 0, n); selected = n.id; }, $uiText("Đã nhân bản thành phần."));
  }
  function erase() { edit((p) => { if (!removeNode(p.layout, selected)) throw new Error($uiText("Không xóa nút gốc của dự án hoặc mẫu lặp.")); selected = p.layout.id; }, pageOwner ? $uiText("Đã xóa trang và chuyển liên kết đến trang còn lại. Có thể hoàn tác bằng Ctrl+Z.") : $uiText("Đã xóa thành phần.")); }
  function undo() { if (!history.length) return; future = [...future, clone(project)]; project = history.at(-1)!; history = history.slice(0, -1); }
  function redo() { if (!future.length) return; history = [...history, clone(project)]; project = future.at(-1)!; future = future.slice(0, -1); }
  function keydown(e:KeyboardEvent) {
    if (e.target instanceof Element && e.target.closest('input,textarea,select,[contenteditable]')) return;
    if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveProject(); }
    if (e.key === 'Delete' && mode === '2d') erase();
  }
  function download(blob:Blob,name:string) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function saveProject() { download(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }), project.manifest.id + '.gbastudio.json'); dirty = false; log = $uiText("Đã tải file dự án, gồm giao diện, dữ liệu mẫu và tài nguyên."); }
  async function packExport() { try { const blob = await exportPack(project); download(blob, project.manifest.id + '.zip'); log = $uiText("Đã xuất ZIP pack. Chưa xác minh trên GBA Duo thật. Pack mới chỉ có giao diện; dữ liệu động cần Lua riêng cho game."); dock = 'output'; } catch (e) { editorError = errorMessage(e); showSettings = true; } }
  async function openFile(e:InputEvent,pack = false) {
    const input=e.currentTarget;
    const file = input.files?.[0]; if (!file) return;
    try { const p = pack ? await importPack(file) : migrateDefaultCanvasPadding(JSON.parse(await file.text())); validate(p); history = [...history, clone(project)]; future = []; project = p; selected = p.layout.id; dirty = false; log = $uiText("Đã mở {0}. Bản trước vẫn có thể khôi phục bằng Hoàn tác.", file.name); editorError = ''; } catch (e) { editorError = errorMessage(e); }
    input.value = '';
  }
  async function addAssetFiles(files:File[]) {
    try {
      const entries=await Promise.all(files.map(async f=>{
        const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error($uiText("Không đọc được ")+f.name));reader.readAsDataURL(f);});
        return [assetImportPath(f.name),data];
      }));
      edit(p=>{Object.assign(p.files,Object.fromEntries(entries));},$uiText("Đã thêm ")+files.length+$uiText(" tài nguyên; ảnh trong assets/images/, font trong assets/fonts/."));
    } catch(error){editorError=errorMessage(error);}
  }
  async function addAssets(e:InputEvent) {
    const input=e.currentTarget;
    try{await addAssetFiles([...input.files??[]]);}finally{input.value='';}
  }

  function openData() { dataText = JSON.stringify(project.data, null, 2); cssText = project.css; layoutText = JSON.stringify(project.layout, null, 2); mode = 'data'; }
  function applyData() { edit((p) => { p.data = JSON.parse(dataText); p.css = cssText; p.layout = ensureIds(JSON.parse(layoutText)); }, $uiText("Đã áp dụng dữ liệu và mã giao diện.")); }
  function newProject(kind:string) { history = [...history, clone(project)]; future = []; project = createProject(kind,$locale); selected = project.layout.pages?.[0]?.child.id??project.layout.id; showNew = false; dirty = false; mode = '2d'; log = $uiText("Dự án mới. Đặt tên và mã ROM trong mục Dự án trước khi xuất pack."); }
  function addPage() { edit((p) => { const r = walk(p.layout).find((r) => r.node.type === 'pages')?.node; if (!r) throw new Error($uiText("Giao diện này chưa có nút Các trang.")); const name = 'trang_' + uid().slice(1, 5); const child = widget('column'); (r.pages??=[]).push({ name, child }); r.initial = name; selected = child.id; }, $uiText("Đã thêm và mở trang mới. Chọn gốc trang rồi bấm Xóa để xóa trang.")); }
  function previewPage(name:string) { edit((p) => { const root = walk(p.layout).find((r) => r.node.type === 'pages')?.node; if (root) root.initial = name; }, $uiText("Đã đổi trang khởi đầu để thiết kế.")); }
  function resizeDock(e:PointerEvent,side:string) {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const values = { left: leftWidth, right: rightWidth, output: outputHeight, files: filesHeight };
    const move = (ev:PointerEvent) => {
      if (side === 'left') leftWidth = Math.max(180, Math.min(420, values.left + ev.clientX-startX));
      if (side === 'right') rightWidth = Math.max(230, Math.min(460, values.right - ev.clientX+startX));
      if (side === 'output') outputHeight = Math.max(80, Math.min(400, values.output - ev.clientY+startY));
      if (side === 'files') filesHeight = Math.max(130, Math.min(500, values.files - ev.clientY+startY));
    };
    const end = () => { window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',end); };
    window.addEventListener('pointermove',move); window.addEventListener('pointerup',end,{once:true});
  }
</script>

<svelte:head><title>{$uiText("GBA Duo Studio — Thiết kế companion")}</title><meta name="description" content={$uiText("Studio trực quan để thiết kế companion pack cho các game GBA, GBC và GB.")} /></svelte:head>
<svelte:window onkeydown={keydown} />
<div class="studio">
  <header class="menubar">
    <span class="brand-icon">◈</span><strong>GBA Duo Studio</strong>
    <select class="language-picker" aria-label="Studio language" value={$locale} onchange={(event)=>setLanguage(event.currentTarget.value)}><option value="en">English</option><option value="vi">Tiếng Việt</option></select>
    <button onclick={() => showSettings = true}>{$uiText("Dự án")}</button><button onclick={() => showNew = true}>{$uiText("Mới")}</button><button onclick={() => projectInput.click()}>{$uiText("Mở dự án")}</button><button onclick={saveProject}>{$uiText("Lưu dự án")}</button><button onclick={() => showTemplates = true}>{$uiText("Thư viện mẫu")}</button>
    <button onclick={()=>showProjectTools=true}>{$uiText("Công cụ dự án")}</button>
    <span class="project-title">{project.manifest.name}{dirty ? ' (*)' : ''}</span>
    <button class="primary compact" onclick={packExport}>{$uiText("Xuất pack ZIP ↗")}</button>
  </header>
  <div class="workspacebar">
    <span class="workspace-label">COMPANION EDITOR <span class="badge">{$uiText("BẢN THỬ UX")}</span></span>
    <nav aria-label={$uiText("Chế độ")}><button class:chosen={mode === '2d'} onclick={() => mode = '2d'}>▧ 2D</button><button class:chosen={mode === 'data'} onclick={openData}>{$uiText("▤ Dữ liệu")}</button><button class:chosen={mode === 'preview'} onclick={() => mode = 'preview'}>{$uiText("▶ Xem thử")}</button><button class:chosen={mode === 'ram'} onclick={() => mode = 'ram'}>◉ RAM Thor</button></nav>
    <span class="save-indicator">● {$uiText(saved)}</span>
  </div>
  <div class="workspace" style:grid-template-columns={`${leftWidth}px minmax(350px,1fr) ${rightWidth}px`}>
    <aside class="left-dock"><button class="dock-resizer left-resizer" aria-label={$uiText("Kéo đổi rộng Scene")} onpointerdown={(e) => resizeDock(e, "left")}></button>
      <div class="dock-tabs"><button class:chosen={leftTab === 'scene'} onclick={() => leftTab = 'scene'}>Scene</button><button class:chosen={leftTab === 'library'} onclick={() => leftTab = 'library'}>{$uiText("Thành phần")}</button></div>
      <div class="scene-tools"><button title={$uiText("Thêm thành phần")} onclick={() => leftTab = 'library'}>{$uiText("＋ Thêm")}</button><button title={$uiText("Thêm trang")} onclick={addPage}>{$uiText("▧ Trang")}</button><button title={$uiText("Nhân bản")} onclick={duplicate}>⧉</button></div>
      <div class="scene-content">
        {#if leftTab === 'scene'}
          <input class="dock-search" aria-label={$uiText("Tìm nút Scene")} placeholder={$uiText("Tìm tên, lớp, loại nút…")} bind:value={sceneSearch} />
          <div class="tree-controls"><button title={$uiText("Thu gọn toàn bộ layer")} onclick={collapseAll}>{$uiText("▸ Thu tất cả")}</button><button title={$uiText("Mở toàn bộ layer")} onclick={() => collapsed = {}}>{$uiText("▾ Mở tất cả")}</button></div>
          {#each sceneEntries as ref (ref.node.id)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="tree-row" class:tree-selected={selected === ref.node.id} style:padding-left={`${10 + ref.depth * 13}px`} draggable={ref.index != null} ondragstart={(e) => e.dataTransfer?.setData('text/plain', ref.node.id)} ondragover={(e) => e.preventDefault()} ondrop={(e) => { e.preventDefault(); drop(e.dataTransfer?.getData('text/plain')??'', ref.node.id); }}>
              {#if ref.hasChildren}<button class="tree-toggle" aria-label={$uiText("{0} nhóm {1}", collapsed[ref.node.id]&&!sceneSearch?$uiText("Mở"):$uiText("Thu"), nodeLabel(ref))} aria-expanded={!collapsed[ref.node.id]||!!sceneSearch} onclick={() => toggleGroup(ref.node.id)}>{collapsed[ref.node.id]&&!sceneSearch?'▸':'▾'}</button>{:else}<span class="tree-leaf"></span>{/if}
              <button title={`${nodeLabel(ref)} · ${ref.node.id}`} onclick={() => selected = ref.node.id}><span class="node-icon">{['column','row','box'].includes(ref.node.type) ? '▱' : ref.node.type === 'text' ? 'T' : ref.node.type === 'image' ? '▧' : '◇'}</span><span>{nodeLabel(ref)}</span><small>{ref.node.type}</small></button>
            </div>
          {/each}
          <p class="dock-hint">{$uiText("Kéo nút vào khung chứa để đổi cha. Dùng ↑ ↓ trong Inspector để đổi thứ tự.")}</p>
        {:else}
          <p class="dock-hint">{$uiText("Kéo vào màn hình hoặc bấm để thêm vào khung đang chọn.")}</p>
          <div class="tab-create-options"><label>{$uiText("Số tab khi tạo")}<input aria-label={$uiText("Số tab khi tạo")} type="number" min="1" step="1" bind:value={tabCount} /></label><label>{$uiText("Vị trí thanh tab")}<select bind:value={tabPosition}><option value="bottom">{$uiText("Phía dưới")}</option><option value="top">{$uiText("Phía trên")}</option></select></label><small>{$uiText("Cấu hình cho thành phần Thanh tab. Vẫn thêm/xóa được sau khi tạo.")}</small></div>
          <div class="palette">{#each Object.entries(labels).filter(([t]) => t !== 'pages') as [type, label]}
            <button draggable="true" ondragstart={(e) => e.dataTransfer?.setData('text/plain', 'new:' + type)} onclick={() => add(type)}><span>{type === 'text' ? 'T' : type === 'image' ? '▧' : type === 'bar' ? '▰' : '⊞'}</span>{$uiText(label)}</button>
          {/each}</div>
        {/if}
      </div>
      <div class="filesystem" style:height={`${filesHeight}px`}><button class="dock-resizer horizontal-resizer" aria-label={$uiText("Kéo đổi cao FileSystem")} onpointerdown={(e) => resizeDock(e, "files")}></button>
        <div class="asset-dock-tabs"><button class:chosen={fileTab === 'assets'} onclick={() => fileTab = 'assets'}>▧ Assets <span>{assetPaths.length}</span></button><button class:chosen={fileTab === 'files'} onclick={() => fileTab = 'files'}>{$uiText("▤ Tệp dự án")}</button></div>
        {#if fileTab === 'assets'}
          <AssetBrowser files={project.files} onadd={() => assetInput.click()} onfont={applyFontAsset} onassign={assignAsset} oninsert={insertAsset} onfiles={(files) => addAssetFiles(files)} />
        {:else}
          <div class="project-files"><div class="res-path">res://{project.manifest.id}/</div>
          <button class="file" onclick={() => showSettings = true}>▤ manifest.json</button><button class="file" onclick={() => mode = '2d'}>▧ layout.json</button><button class="file" onclick={openData}>▤ style.css</button><button class="file" onclick={openData}>▤ preview-data.json</button>
          {#each textFiles as path}<button class="file" onclick={() => inspectFile(path)}>▤ {path}</button>{/each}
          <button class="import-pack" onclick={() => importInput.click()}>{$uiText("↥ Nhập pack ZIP có sẵn")}</button></div>
        {/if}      </div>
    </aside>
    <main class="center">
      <div class="scene-tab">{#if mainPages}<label class="page-switcher">{$uiText("Trang")}<select aria-label={$uiText("Trang đang thiết kế")} value={mainPages.initial} onchange={(e) => { const name = e.currentTarget.value; previewPage(name); const child=walk(project.layout).find((r) => r.node.type === "pages")?.node.pages?.find((p) => p.name === name)?.child;if(child)selected=child.id; }}>{#each mainPages.pages as page}<option value={page.name}>{page.name}</option>{/each}</select></label>{/if}<span>▧ {project.manifest.name}</span><small>{project.manifest.match?.gameCode?.join(', ') || $uiText("Chưa gắn game")}</small></div>
      <div class="canvas-toolbar"><button title={$uiText("Chọn thành phần")} class:chosen={mode === '2d'} onclick={() => mode = '2d'}>↖</button><button title={$uiText("Hoàn tác Ctrl+Z")} disabled={!history.length} onclick={undo}>↶</button><button title={$uiText("Làm lại Ctrl+Shift+Z")} disabled={!future.length} onclick={redo}>↷</button><span class="divider"></span><label class="zoom"><input aria-label={$uiText("Thu phóng")} type="range" min="0.05" max="1.5" step="0.01" bind:value={zoom} />{Math.round(zoom * 100)}%</label><button title={$uiText("Vừa vùng thiết kế")} onclick={fitCanvas}>{$uiText("Vừa khung")}</button><button class:chosen={grid.visible} aria-pressed={grid.visible} title={$uiText("Hiện lưới trên bàn thiết kế")} onclick={() => setGrid("visible", !grid.visible)}>{$uiText("▦ Lưới")}</button><button class:chosen={grid.snap} aria-pressed={grid.snap} title={$uiText("Bắt dính theo lưới; giữ Alt để tạm bỏ")} onclick={() => setGrid("snap", !grid.snap)}>{$uiText("⌗ Bắt dính")}</button><label class="grid-step">{$uiText("Bước (px)")}<input aria-label={$uiText("Bước lưới (pixel)")} type="number" min="1" max="512" value={grid.size} onchange={(e) => setGrid("size", Number(e.currentTarget.value))} /></label><span class="spacer"></span><button title={$uiText("Đổi kích thước màn hình")} onclick={() => showSettings = true}>{project.width} {$uiText("×")} {project.height} ⚙</button></div>
      <LiveMemoryBar manifest={project.manifest} projectId={project.layout.id} enabled={liveEnabled} onenabled={(value)=>liveEnabled=value} ondata={(value)=>liveData=value} onstatus={(value)=>liveStatus=value} />
      {#if mode === 'ram'}
        <RamInspector />
      {:else if mode === 'data'}
        <div class="data-workspace"><div class="data-title"><h2>{$uiText("Dữ liệu & giao diện")}</h2><div><button class:chosen={dataMode === "form"} onclick={() => dataMode = "form"}>{$uiText("Biểu mẫu")}</button><button class:chosen={dataMode === "code"} onclick={() => { openData(); dataMode = "code"; }}>JSON / CSS</button></div>{#if dataMode === "code"}<button class="primary" onclick={applyData}>{$uiText("Áp dụng thay đổi")}</button>{/if}</div><p>{$uiText("Dữ liệu mẫu dùng để thiết kế. Đọc bộ nhớ game cần Lua riêng; studio không chạy ROM hoặc Lua.")}</p>{#if dataMode === "form"}<MemoryFields manifest={project.manifest} onchange={setMemoryFields} /><DataEditor value={project.data} onchange={changeData} /><details><summary>{$uiText("Bảng màu & biến giao diện (")}{themeVariables.length})</summary>{#each themeVariables as variable}<label>{variable.name}<input value={variable.value} onchange={(e) => setThemeVariable(variable.name,e.currentTarget.value)} /></label>{/each}</details>{:else}<label>{$uiText("Dữ liệu mẫu JSON")}<textarea spellcheck="false" bind:value={dataText} rows="13"></textarea></label><details><summary>{$uiText("CSS nâng cao")}</summary><textarea spellcheck="false" bind:value={cssText} rows="10"></textarea></details><details><summary>{$uiText("Cấu trúc layout JSON")}</summary><textarea spellcheck="false" bind:value={layoutText} rows="14"></textarea></details>{/if}</div>
      {:else}
        <div class="canvas-area">
          <div class="ruler-x">0 <span>100</span><span>200</span><span>300</span><span>400</span></div>
          <div class="canvas-meta"><span>{mode === 'preview' ? $uiText("▶ Tương tác với nút và trang") : $uiText("2D · Chọn trực tiếp trên màn hình")}</span><span class="mock-tag">{!liveEnabled?$uiText("DỮ LIỆU MẪU"):liveStatus.kind==='live'?$uiText("THOR · TRƯỜNG RAM THẬT"):liveStatus.kind==='stale'?$uiText("THOR · DỮ LIỆU CŨ"):$uiText("ĐANG CHỜ THOR")}</span></div>
          <Preview data={previewData} inspectTarget={styleTarget} inspectState={styleState} oninspect={(value)=>styleSnapshot=value} onfont={(value)=>effectiveFont=value} {project} {selected} {zoom} {grid} {checkTransparency} interactive={mode === 'preview'} onselect={(id) => selected = id} ontransform={transformNode} onerror={(value) => error = value} ondrop={(payload, id) => drop(payload, id ?? selected)} />
          <p class="canvas-caption">{mode === '2d' ? $uiText("Chọn nút → chỉnh Inspector. Kéo thành phần vào khung chứa.") : $uiText("Các nút gọi Lua chỉ được mô phỏng; kiểm tra dữ liệu thật trên thiết bị.")}</p>
        </div>
      {/if}
      <section class="bottom-dock" style:height={`${outputHeight}px`}><button class="dock-resizer horizontal-resizer" aria-label={$uiText("Kéo đổi cao Output")} onpointerdown={(e) => resizeDock(e, "output")}></button><div class="bottom-tabs"><button class:chosen={dock === 'output'} onclick={() => dock = 'output'}>Output</button><button class:chosen={dock === 'bindings'} onclick={() => dock = 'bindings'}>{$uiText("Trường dữ liệu")} <span>{paths.length}</span></button><span class="spacer"></span><small>{$uiText("Preview theo Thor · 369 dpi")}</small></div><div class="bottom-content">{#if editorError || error}<p class="error">⚠ {$uiText(editorError || error)}</p>{/if}{#if dock === 'output'}<p><span class="log-time">STUDIO</span> {$uiText(log)}</p><p class="muted">{project.manifest.script ? $uiText("Đã nhập script từ pack. Studio giữ file Lua khi xuất, không thực thi script.") : $uiText("Dự án thiết kế giao diện. Pack mới chưa có Lua đọc RAM.")}</p>{:else}<div class="binding-chips">{#each paths as field}<button title={JSON.stringify(field.value)} onclick={() => { if (node?.type === 'text') setProp('text', '{' + field.path + '}'); else if (node?.type === 'bar') setProp('value', '$' + field.path); else if (node?.type === 'list' && ('array' in field && field.array)) setProp('items', '$' + field.path); else log = $uiText("Chọn Văn bản, Thanh chỉ số hoặc Danh sách để gán trường."); }}>{('array' in field && field.array) ? '≡' : '◇'} {field.path}</button>{/each}</div>{/if}</div></section>
    </main>
    <aside class="inspector">
      <button class="dock-resizer right-resizer" aria-label={$uiText("Kéo đổi rộng Inspector")} onpointerdown={(e)=>resizeDock(e,"right")}></button>
      <div class="dock-tabs inspector-title"><strong>Inspector</strong><span class="muted">{$uiText("Thành phần đang chọn")}</span></div>
      {#if node}
        <div class="inspector-head"><span class="node-icon">◇</span><strong>{$uiText(labelFor(node.type)??node.type)}</strong><code title={node.id}>{node.id}</code></div>
        <div class="inspector-actions"><button title={$uiText("Lên trên")} onclick={()=>reorder(-1)}>↑</button><button title={$uiText("Xuống dưới")} onclick={()=>reorder(1)}>↓</button><button onclick={duplicate}>{$uiText("⧉ Nhân bản")}</button><button class="danger" onclick={erase}>{pageOwner?$uiText("Xóa trang"):$uiText("Xóa")}</button></div>
        <div class="inspector-tabbar" role="tablist" aria-label={$uiText("Nhóm thuộc tính")}>
          {#each [['content','Nội dung'],['appearance','Hình thức'],['behavior','Hành vi']] as [key,label]}
            <button role="tab" id={'inspector-tab-'+key} aria-selected={inspectorTab===key} aria-controls={'inspector-panel-'+key} class:chosen={inspectorTab===key} onclick={()=>inspectorTab=key}>{$uiText(label)}</button>
          {/each}
        </div>
        <div class="inspector-scroll">
          <div class="inspector-panel" id="inspector-panel-content" role="tabpanel" aria-labelledby="inspector-tab-content" hidden={inspectorTab!=='content'}>
          <details open><summary>{$uiText("Nội dung")}</summary>
            {#if node.type === 'tabs'}
              <p class="dock-hint">{$uiText("Hiện có")} <strong>{(node.tabs??[]).length} tab</strong>{$uiText(". Dùng Thêm tab hoặc × để đổi số lượng, nội dung các tab còn lại được giữ nguyên.")}</p>
              <label>{$uiText("Vị trí thanh tab")}<select value={node.style?.['flex-direction'] === 'column-reverse' ? 'bottom' : 'top'} onchange={(e) => setStyle('flex-direction', e.currentTarget.value === 'bottom' ? 'column-reverse' : 'column')}><option value="top">{$uiText("Phía trên")}</option><option value="bottom">{$uiText("Phía dưới")}</option></select></label>
              <div class="tab-editor">{#each node.tabs as tab, i (tab.child.id)}<div class="tab-editor-row"><input aria-label={$uiText("Tên tab {0}", i+1)} value={tab.title} onchange={(e) => renameTab(i,e.currentTarget.value)} /><button title={$uiText("Thiết kế nội dung tab {0}", i+1)} onclick={() => selected = tab.child.id}>{$uiText("Nội dung")}</button><button title={$uiText("Xóa tab {0}", i+1)} disabled={(node.tabs??[]).length === 1} onclick={() => deleteTab(i)}>{$uiText("×")}</button></div><TabFont value={tabLabelFont(node,tab)} {fonts} onchange={(value)=>setTabFont(i,value)} /><details><summary>{$uiText("Ảnh nút Tab")} {i+1} · {tab.title}</summary><SkinEditor name={`Tab ${i+1}`} value={tab.skin ?? {}} assets={imagePaths} files={project.files} allowSelected={true} onchange={(value) => setTabSkin(i,value)} onadd={() => assetInput.click()} /></details>{/each}</div>
              <button onclick={addTab}>{$uiText("＋ Thêm tab")}</button>
              <p class="dock-hint">{$uiText("Bấm Nội dung để thiết kế từng tab. Chuyển sang Xem thử để bấm đổi tab như khi chơi.")}</p>
            {/if}
            {#if ['text','button'].includes(node.type)}<label>{$uiText("Nội dung hiển thị")}<textarea rows="3" value={node.text ?? ''} onchange={(e) => setProp('text', e.currentTarget.value)}></textarea></label><label>{$uiText("Gắn trường dữ liệu")}<select value="" onchange={(e) => setProp('text', '{' + e.currentTarget.value + '}')}><option value="" disabled>{$uiText("Chọn trường…")}</option>{#each paths as field}<option value={field.path}>{field.label ?? field.path}</option>{/each}</select></label>{/if}
            {#if node.type === 'image'}<div class="alpha-controls"><button onclick={clearImageBackground}>{$uiText("Bỏ nền nút ảnh")}</button><label><input type="checkbox" bind:checked={checkTransparency} />{$uiText("Kiểm tra alpha (ô caro)")}</label><small>{$uiText("Ô caro chỉ dùng khi thiết kế, không xuất vào pack. Màu nền canvas vẫn nhìn thấy qua vùng trong suốt.")}</small></div><label>{$uiText("Tài nguyên")}<select value={node.src} onchange={(e) => setProp('src', e.currentTarget.value)}><option value="">{$uiText("Chọn hình ảnh…")}</option>{#each assetPaths as path}<option value={'asset:' + path.slice(7)}>{path}</option>{/each}</select></label><label>{$uiText("Ảnh theo trường dữ liệu")}<select aria-label={$uiText("Ảnh theo trường dữ liệu")} value={node.src?.startsWith("$") ? node.src : ""} onchange={(e) => { if(e.currentTarget.value) setProp("src",e.currentTarget.value); }}><option value="">{$uiText("Dùng ảnh tĩnh đã chọn")}</option>{#each paths.filter(f => typeof f.value === "string") as f}<option value={"$" + f.path}>{f.label}</option>{/each}</select></label><button onclick={() => assetInput.click()}>{$uiText("＋ Thêm ảnh / font")}</button>{/if}
            {#if node.type === 'button'}<SkinEditor name={$uiText("Nút bấm")} value={node.buttonSkin ?? {}} assets={imagePaths} files={project.files} onchange={setButtonSkin} onadd={() => assetInput.click()} />{/if}
            {#if node.type === 'bar'}<label>{$uiText("Giá trị")}<select value={node.value} onchange={(e) => setProp('value', e.currentTarget.value)}>{#each paths.filter((f) => typeof f.value === 'number') as f}<option value={'$' + f.path}>{f.label ?? f.path}</option>{/each}</select></label><label>{$uiText("Giá trị tối đa")}<select value={node.maxKey ?? ''} onchange={(e) => setProp('maxKey', e.currentTarget.value)}><option value="">{$uiText("Dùng số cố định")}</option>{#each paths.filter((f) => typeof f.value === 'number') as f}<option value={'$' + f.path}>{f.label ?? f.path}</option>{/each}</select></label>{#if !node.maxKey}<label>{$uiText("Số tối đa")}<input type="number" value={node.max ?? 100} onchange={(e) => setProp('max', Number(e.currentTarget.value))} /></label>{/if}<label>{$uiText("Nhãn")}<input value={node.label ?? ''} onchange={(e) => setProp('label', e.currentTarget.value)} /></label>{/if}
            {#if node.type === 'list'}<label>{$uiText("Thông báo khi danh sách trống")}<input aria-label={$uiText("Thông báo khi danh sách trống")} value={node.empty??''} onchange={(e)=>setProp('empty',e.currentTarget.value)} /></label><label>{$uiText("Dữ liệu danh sách")}<select value={node.items} onchange={(e) => setProp('items', e.currentTarget.value)}>{#each paths.filter((f) => ('array' in f && f.array)) as f}<option value={'$' + f.path}>{f.label ?? f.path}</option>{/each}</select></label><p class="dock-hint">{$uiText("Chọn “Mẫu lặp” trong Scene để thiết kế mỗi dòng. Dùng tên trường của phần tử, ví dụ")} {'{name}'}.</p>{/if}
            {#if node.type === 'pages'}<label>{$uiText("Tên trạng thái trang")}<input aria-label={$uiText("Tên trạng thái trang")} value={node.state??'page'} onchange={(e)=>setProp('state',e.currentTarget.value)} /></label><label>{$uiText("Trang thiết kế / khởi đầu")}<select value={node.initial} onchange={(e) => previewPage(e.currentTarget.value)}>{#each node.pages as p}<option value={p.name}>{p.name}</option>{/each}</select></label><button onclick={addPage}>{$uiText("＋ Thêm trang")}</button>{/if}
            {#if current?.title && current.parent?.name}<label>{$uiText("Tên trang")}<input value={current.parent.name} onchange={(e) => edit((p) => { const entry=requiredEntry(p); const old = entry.name; entry.name = e.currentTarget.value; for (const {node} of walk(p.layout)) if (node.type === 'pages' && node.initial === old) node.initial = e.currentTarget.value; })} /></label>{/if}
            {#if current?.parent && !('type' in current.parent) && current.parent.title}<label>{$uiText("Tên tab")}<input value={current.parent.title} onchange={(e) => edit((p) => { requiredEntry(p).title = e.currentTarget.value; })} /></label>{/if}
            {#if current?.parent && !('type' in current.parent) && current.parent.title}<TabFont value={tabOwner(selected)?tabLabelFont(tabOwner(selected)!,current.parent):''} {fonts} onchange={setCurrentTabFont} /><details><summary>{$uiText("Ảnh nút tab ·")} {current.parent.title}</summary><SkinEditor name={current.parent.title} value={current.parent.skin ?? {}} assets={imagePaths} files={project.files} allowSelected={true} onchange={setCurrentTabSkin} onadd={() => assetInput.click()} /></details>{/if}
            <label>{$uiText("Lớp CSS (tùy chọn)")}<input value={node.class ?? ''} onchange={(e) => setProp('class', e.currentTarget.value)} /></label>
          </details>

          </div>
          <div class="inspector-panel" id="inspector-panel-appearance" role="tabpanel" aria-labelledby="inspector-tab-appearance" hidden={inspectorTab!=='appearance'}>
<details open><summary>{$uiText("Font cho toàn bộ nội dung")}</summary>
            <label>{$uiText("Font chữ")}<select aria-label={$uiText("Font chữ")} value={node.style?.['font-family'] ?? ''} onchange={(e)=>applyFont(e.currentTarget.value ? e.currentTarget.value.startsWith('"') ? JSON.parse(e.currentTarget.value) : e.currentTarget.value : '')}><option value="">{$uiText("Kế thừa từ giao diện")}</option>{#each fonts as font}<option value={fontValue(font.family)}>{font.declared?font.family:font.path.split('/').pop()}</option>{/each}<option value='sans-serif'>{$uiText("Hệ thống · sans-serif")}</option><option value='serif'>{$uiText("Hệ thống · serif")}</option><option value='monospace'>{$uiText("Hệ thống · monospace")}</option></select></label>
            <label><input type="checkbox" bind:checked={fontDescendants} />{$uiText("Áp dụng font cho cả nội dung bên trong")}</label>
            <small>{$uiText("Đang dùng:")} {effectiveFont || $uiText("Chọn thành phần trên canvas")}{$uiText(". Bật áp dụng nội dung bên trong để thay cả font riêng của các dòng chữ trong template.")}</small>
            <button onclick={()=>assetInput.click()}>{$uiText("＋ Thêm font từ tệp")}</button>
          </details>

          <StyleInspector {node} snapshot={styleSnapshot} {fonts} assets={imagePaths} target={styleTarget} appearance={styleState} ontarget={(value)=>styleTarget=value} onstate={(value)=>styleState=value} onchange={editStyles} />

          </div>
          <div class="inspector-panel" id="inspector-panel-behavior" role="tabpanel" aria-labelledby="inspector-tab-behavior" hidden={inspectorTab!=='behavior'}>
            <details open><summary>{$uiText("Tương tác khi chạm")}</summary>
              <label>{$uiText("Hành động")}<select value={actionMode(node.onClick)} onchange={e=>setActionMode(e.currentTarget.value)}>
                {#each [['none','Không có'],['navigate','Mở trang'],['back','Quay lại'],['call','Gọi Lua'],['custom','Hành động tùy chỉnh']] as [key,label]}<option value={key}>{$uiText(label)}</option>{/each}
              </select></label>
              {#if actionMode(node.onClick)==='navigate'}<label>{$uiText("Trang đích")}<select value={actionObject(node.onClick).navigate} onchange={e=>setProp('onClick',{...actionObject(node.onClick),navigate:e.currentTarget.value})}>{#each pages as page}<option value={page}>{page}</option>{/each}</select></label>{/if}
              {#if actionMode(node.onClick)==='call'}<label>{$uiText("Tên hàm Lua")}<input value={actionObject(node.onClick).call} onchange={e=>setProp('onClick',{...actionObject(node.onClick),call:e.currentTarget.value})} /></label>{/if}
              {#if actionMode(node.onClick)==='custom'}<label>{$uiText("Hành động JSON")}<textarea rows="7" spellcheck="false" value={JSON.stringify(node.onClick,null,2)} onchange={e=>{try{setProp('onClick',JSON.parse(e.currentTarget.value));editorError='';}catch(error){editorError=errorMessage(error);}}}></textarea></label>{/if}
            </details>
          <details><summary>{$uiText("Điều kiện & dữ liệu động")}</summary><BindingRules {node} fields={paths} classes={cssClasses} onchange={setProp} /></details>
            <details><summary>{$uiText("Điều kiện hiển thị")}</summary><input aria-label={$uiText("Điều kiện hiển thị")} placeholder="$visible" value={node.visibleIf??''} onchange={e=>setProp('visibleIf',e.currentTarget.value)} /></details>
          </div>
        </div>
      {:else}<div class="inspector-empty"><strong>{$uiText("Chưa chọn thành phần")}</strong><p>{$uiText("Chọn một thành phần trên màn hình hoặc trong Scene.")}</p></div>{/if}
      <button class="inspector-project-link" onclick={()=>showProjectTools=true}>{$uiText("Công cụ dự án")} ↗</button>
    </aside>
  </div>
  <footer><span>{$uiText("◈ GBA Duo Studio · Cục bộ")}</span><span>{entries.length} {$uiText("nút ·")} {assetPaths.length} {$uiText("tài nguyên")}</span><span>{$uiText("Thiết kế dùng chung cho nhiều game · dữ liệu RAM theo từng game")}</span></footer>
</div>
<input bind:this={importInput} hidden type="file" accept=".zip" onchange={(e) => openFile(e, true)} />
<input bind:this={projectInput} hidden type="file" accept=".json" onchange={(e) => openFile(e)} />
<input bind:this={assetInput} hidden type="file" accept="image/*,.ttf,.otf,.woff,.woff2" multiple onchange={addAssets} />
{#if showNew || showSettings}
  <div class="modal-backdrop"><div role="dialog" tabindex="-1" aria-modal="true" aria-label={showNew ? $uiText("Dự án mới") : $uiText("Thiết lập dự án")} class="modal"><div class="modal-title"><h2>{showNew ? $uiText("Dự án companion mới") : $uiText("Thiết lập dự án")}</h2><button onclick={() => { showNew = false; showSettings = false; }}>✕</button></div>
    {#if showNew}<p>{$uiText("Chọn bố cục khởi đầu. Mọi mẫu đều dùng được cho nhiều game.")}</p><div class="template-cards"><button onclick={() => newProject('blank')}><span>＋</span><strong>{$uiText("Trang trống")}</strong><small>{$uiText("Tự thiết kế từ đầu")}</small></button><button onclick={() => newProject('rpg')}><span>♙</span><strong>{$uiText("Nhân vật & túi đồ")}</strong><small>{$uiText("RPG, chiến thuật")}</small></button><button onclick={() => newProject('adventure')}><span>◇</span><strong>{$uiText("Phiêu lưu")}</strong><small>{$uiText("Trạng thái & vật phẩm")}</small></button></div><p class="muted">{$uiText("Dự án hiện tại được giữ trong Hoàn tác. Tải file dự án để lưu lâu dài.")}</p>
    {:else}<label>{$uiText("Tên dự án")}<input value={project.manifest.name} onchange={(e) => edit((p) => p.manifest.name = e.currentTarget.value)} /></label><label>ID pack<input value={project.manifest.id} onchange={(e) => edit((p) => p.manifest.id = e.currentTarget.value)} /></label><label>{$uiText("Mã game (4 ký tự, cách nhau bằng dấu phẩy)")}<input placeholder="ABCD, WXYZ…" value={project.manifest.match?.gameCode?.join(', ') ?? ''} onchange={(e) => edit((p) => { p.manifest.match ??= {}; p.manifest.match.gameCode = e.currentTarget.value.toUpperCase().split(',').map((s) => s.trim()).filter(Boolean); })} /></label><label>{$uiText("CRC32 (tùy chọn, cách nhau bằng dấu phẩy)")}<input value={project.manifest.match?.crc32?.join(', ') ?? ''} onchange={(e) => edit((p) => { p.manifest.match ??= {}; p.manifest.match.crc32 = e.currentTarget.value.split(',').map((s) => s.trim()).filter(Boolean); })} /></label><div class="screen-settings"><strong>{$uiText("Màn hình thiết kế")}</strong><label>Preset<select value={!customSizeMode && project.width === 1240 && project.height === 1080 ? "thor" : "custom"} onchange={(e) => { customSizeMode = e.currentTarget.value === "custom"; if (!customSizeMode) edit((p) => { p.width = 1240; p.height = 1080; }); }}><option value="thor">{$uiText("AYN Thor · 1240 × 1080")}</option><option value="custom">{$uiText("Kích thước tùy chỉnh")}</option></select></label><div class="size-inputs"><label>{$uiText("Chiều rộng (px)")}<input type="number" min="64" max="8192" value={project.width} onchange={(e) => edit((p) => p.width = Number(e.currentTarget.value))} /></label><span>{$uiText("×")}</span><label>{$uiText("Chiều cao (px)")}<input type="number" min="64" max="8192" value={project.height} onchange={(e) => edit((p) => p.height = Number(e.currentTarget.value))} /></label></div></div><p class="dock-hint">{$uiText("Mặc định AYN Thor 1240 × 1080. Cho phép 64–8192 px mỗi chiều. Kích thước và tỷ lệ được lưu trong file dự án; pack tự sử dụng màn hình của thiết bị khi chạy. Bộ xem trước hiện dùng mật độ Thor 369 dpi.")}</p><p class="dock-hint">{project.manifest.script ? $uiText("Script và các file bổ sung của pack nhập vào được giữ khi xuất.") : $uiText("Pack mới không có script đọc RAM. Dữ liệu mẫu chỉ dùng trong studio.")}</p>{#if editorError}<p class="error">{$uiText(editorError)}</p>{/if}<button class="primary" onclick={() => showSettings = false}>{$uiText("Xong")}</button>{/if}
  </div></div>
{/if}






{#if showTemplates}<TemplateLibrary onopen={openTemplate} onclose={() => showTemplates = false} />{/if}
{#if fileView}<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-label={$uiText("Tệp tham khảo")} tabindex="-1"><div class="modal-title"><h2>{fileView.path}</h2><button onclick={() => fileView = null}>✕</button></div><p class="muted">{$uiText("Tệp gốc được giữ khi xuất. Xem mã tham khảo; studio không thực thi Lua.")}</p><pre class="source-view">{fileView.text}</pre></div></div>{/if}

{#if showProjectTools}
  <div class="modal-backdrop"><div class="modal project-tools-modal" role="dialog" aria-modal="true" tabindex="-1" aria-label={$uiText("Công cụ dự án")}>
    <div class="modal-title"><h2>{$uiText("Công cụ dự án")}</h2><button onclick={()=>showProjectTools=false} aria-label={$uiText("Đóng")}>✕</button></div>
    <p class="dock-hint">{$uiText("Thiết lập dùng chung cho toàn dự án, không phụ thuộc thành phần đang chọn.")}</p>
    <details open><summary>{$uiText("Trường bộ nhớ")}</summary><MemoryFields manifest={project.manifest} onchange={setMemoryFields} /></details>
    <ScriptEditor {project} onchange={(next)=>edit(p=>{p.manifest=next.manifest;p.files=next.files;},$uiText("Đã cập nhật Lua."))}/>
    <details><summary>{$uiText("Nhấp nháy và trạng thái")}</summary><PulseRules config={project.manifest.studioPulse} fields={dataPaths(project.data).map(f=>({...f,label:f.path}))} onchange={(config)=>edit(p=>{const old=p.manifest.studioPulse?.bindings??{};p.manifest.studioPulse=config;for(const key of new Set([...Object.keys(old),...Object.keys(config.bindings)]))p.data[key]=false;},$uiText("Đã cập nhật nhịp nhấp nháy."))} /></details>
    <p class="dock-hint">{$uiText("Lua được giữ nguyên khi nhập và xuất pack. Dữ liệu riêng của game thuộc companion, không thuộc mã nguồn Studio.")}</p>
  </div></div>
{/if}
