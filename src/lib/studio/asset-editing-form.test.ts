import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {mount,unmount,flushSync,tick} from 'svelte';
import AssetEditDialog from './AssetEditDialog.svelte';
import {createProject,walk} from './project.js';
import * as assets from './asset-editing.js';
import {locale} from './i18n.js';
import type {AssetSource,AssetEditRequest} from './asset-editing.js';

// DOM/event checks: image load events and FontFace decoding are controlled here,
// not evidence that a real browser or Android decodes the synthetic font fixture.
let component:ReturnType<typeof mount>|undefined;
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4f50BAASvAdfA0BA+AAAAAElFTkSuQmCC';
const fonts=new Set<unknown>();let deferFonts=false,fontLoads:{face:unknown;resolve:()=>void;reject:()=>void}[]=[],fontDescriptor:PropertyDescriptor|undefined;
beforeEach(()=>{
  fonts.clear();fontLoads=[];deferFonts=false;fontDescriptor=Object.getOwnPropertyDescriptor(document,'fonts');Object.defineProperty(document,'fonts',{configurable:true,value:{add:(face:unknown)=>fonts.add(face),delete:(face:unknown)=>fonts.delete(face)}});
  vi.stubGlobal('FontFace',class{constructor(public family:string,public source:string){}load(){if(!deferFonts)return Promise.resolve(this);return new Promise((resolve,reject)=>fontLoads.push({face:this,resolve:()=>resolve(this),reject:()=>reject(Error('decode failed'))}));}});
});
afterEach(async()=>{if(component)await unmount(component);component=undefined;expect(fonts.size).toBe(0);if(fontDescriptor)Object.defineProperty(document,'fonts',fontDescriptor);else Reflect.deleteProperty(document,'fonts');vi.restoreAllMocks();vi.unstubAllGlobals();locale.set('en');document.body.replaceChildren();});
function fixture(){const p=createProject('blank');p.files={'assets/old.png':png,'assets/new.png':png,'assets/font.ttf':btoa('synthetic font fixture'),'assets/other.ttf':btoa('other synthetic font fixture')};p.layout.pages![0].child.children=[{id:'image',type:'image',src:'asset:old.png'},{id:'group',type:'column',children:[{id:'label',type:'text',text:'Text',style:{'font-family':'serif'}}]},{id:'button',type:'button',text:'Go'}];return p;}
function control<T extends HTMLInputElement|HTMLSelectElement>(label:string):T{const el=[...document.querySelectorAll('label')].find(el=>el.firstChild?.textContent?.trim()===label||el.textContent?.trim()===label)?.querySelector('input,select');expect(el,label).toBeTruthy();return el as T;}
async function select(label:string,value:string){const el=control<HTMLSelectElement>(label);el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));flushSync();await tick();}
const button=(text:string)=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent?.trim()===text);expect(b,text).toBeTruthy();return b!;};
async function settle(){flushSync();await tick();await Promise.resolve();flushSync();await tick();}
async function open(p=fixture(),nodeId='image',onapply:(request:AssetEditRequest)=>string=()=>'',sourceDirty=false,onclose:()=>void=()=>{}){locale.set('vi');component=mount(AssetEditDialog,{target:document.body,props:{project:p,nodeId,onapply,sourceDirty,onclose}});await settle();return p;}
async function imageLoad(type='load'){const img=document.querySelector<HTMLImageElement>('.asset-preview img');expect(img).toBeTruthy();img!.dispatchEvent(new Event(type));await settle();}

it('previews an existing image before applying exactly one selected asset target',async()=>{
  const p=fixture(),before=structuredClone(p);let calls=0,closed=false;
  await open(p,'image',request=>{calls++;assets.applyAssetEdit(p,request);return '';},false,()=>{closed=true;});await select('Tài nguyên sẽ dùng','assets/new.png');
  expect(button('Áp dụng tài nguyên').disabled).toBe(true);expect(p).toEqual(before);await imageLoad();expect(button('Áp dụng tài nguyên').disabled).toBe(false);
  locale.set('en');await settle();expect(control<HTMLSelectElement>('Asset to use').value).toBe('assets/new.png');button('Apply asset').click();await settle();expect(calls).toBe(1);expect(closed).toBe(true);expect(walk(p.layout).find(r=>r.node.id==='image')?.node.src).toBe('asset:new.png');expect(p.files).toEqual(before.files);
});

it('blocks decode failure and requires the static-image choice for a bound image',async()=>{
  const p=fixture();p.layout.pages![0].child.children![0].src='$portrait';const before=structuredClone(p);let calls=0;
  await open(p,'image',request=>{calls++;assets.applyAssetEdit(p,request);return '';});await select('Tài nguyên sẽ dùng','assets/new.png');await imageLoad('error');expect(button('Áp dụng tài nguyên').disabled).toBe(true);expect(document.querySelector('[role="alert"]')?.textContent).toContain('không đọc được');
  await select('Tài nguyên sẽ dùng','assets/old.png');await imageLoad();expect(button('Áp dụng tài nguyên').disabled).toBe(true);expect(calls).toBe(0);
  const choice=control<HTMLInputElement>('Dùng ảnh tĩnh thay cho ảnh từ dữ liệu game này');choice.click();await settle();expect(button('Áp dụng tài nguyên').disabled).toBe(false);expect(p).toEqual(before);button('Áp dụng tài nguyên').click();expect(calls).toBe(1);expect(walk(p.layout).find(r=>r.node.id==='image')?.node.src).toBe('asset:old.png');expect(p.data).toEqual(before.data);
});

it('decodes the chosen font for preview, defaults to local scope and expands scope only when chosen',async()=>{
  const p=fixture(),before=structuredClone(p);let request:AssetEditRequest|undefined;
  await open(p,'group',value=>{request=value;assets.applyAssetEdit(p,value);return '';});expect(control<HTMLInputElement>('Áp dụng font cho cả nội dung bên trong thành phần này').checked).toBe(false);
  await select('Tài nguyên sẽ dùng','assets/font.ttf');await settle();expect(fonts.size).toBe(1);expect(document.querySelector('.font-sample')?.textContent).toContain('Tiếng Việt');expect(button('Áp dụng tài nguyên').disabled).toBe(false);expect(p).toEqual(before);
  control<HTMLInputElement>('Áp dụng font cho cả nội dung bên trong thành phần này').click();await settle();button('Áp dụng tài nguyên').click();await settle();expect(request?.descendants).toBe(true);expect(walk(p.layout).find(r=>r.node.id==='label')?.node.style?.['font-family']).toContain('StudioFont_');expect(p.files).toEqual(before.files);
});

it('ignores a superseded font decode and removes preview fonts on close',async()=>{
  deferFonts=true;await open(fixture(),'group');await select('Tài nguyên sẽ dùng','assets/font.ttf');await select('Tài nguyên sẽ dùng','assets/other.ttf');expect(fontLoads).toHaveLength(2);
  fontLoads[0].resolve();await settle();expect(fonts.size).toBe(0);expect(button('Áp dụng tài nguyên').disabled).toBe(true);
  fontLoads[1].reject();await settle();expect(fonts.size).toBe(0);expect(button('Áp dụng tài nguyên').disabled).toBe(true);expect(document.querySelector('[role="alert"]')?.textContent).toContain('không đọc được');
  await select('Tài nguyên sẽ dùng','assets/font.ttf');fontLoads[2].resolve();await settle();expect(fonts.size).toBe(1);expect(button('Áp dụng tài nguyên').disabled).toBe(false);
  await unmount(component!);component=undefined;expect(fonts.size).toBe(0);
});

it('cancels an in-flight file when switching targets and cannot apply its late result',async()=>{
  const reads:{file:File;signal?:AbortSignal;resolve:(source:AssetSource)=>void}[]=[];
  vi.spyOn(assets,'readAssetUpload').mockImplementation((file,_kind,signal)=>new Promise(resolve=>reads.push({file,signal,resolve})));
  let request:AssetEditRequest|undefined;await open(fixture(),'button',value=>{request=value;return '';});await select('Nguồn tài nguyên','upload');
  async function choose(name:string){const input=document.querySelector<HTMLInputElement>('input[type="file"]')!;Object.defineProperty(input,'files',{configurable:true,value:[new File(['x'],name)]});input.dispatchEvent(new Event('change',{bubbles:true}));await settle();}
  await choose('old.png');await select('Phần cần đổi','font');expect(reads[0].signal?.aborted).toBe(true);await select('Nguồn tài nguyên','upload');await choose('new.ttf');
  reads[0].resolve({type:'upload',name:'old.png',bytes:png});await settle();expect(document.body.textContent).not.toContain('old.png');expect(button('Áp dụng tài nguyên').disabled).toBe(true);
  reads[1].resolve({type:'upload',name:'new.ttf',bytes:btoa('font fixture')});await settle();expect(button('Áp dụng tài nguyên').disabled).toBe(false);button('Áp dụng tài nguyên').click();expect(request).toMatchObject({target:'font',source:{name:'new.ttf'}});
});

it('keeps draft-blocked controls disabled and cancellation leaves source unchanged',async()=>{
  const p=fixture(),before=structuredClone(p);let calls=0,closed=false;await open(p,'image',()=>{calls++;return '';},true,()=>{closed=true;});
  expect(control<HTMLSelectElement>('Phần cần đổi').matches(':disabled')).toBe(true);expect(button('Áp dụng tài nguyên').disabled).toBe(true);button('Áp dụng tài nguyên').click();button('Hủy').click();expect(calls).toBe(0);expect(closed).toBe(true);expect(p).toEqual(before);
});

it('explains Android-incompatible existing assets before preview or apply',async()=>{
 const p=fixture();p.files['assets/vector.svg']=btoa('<svg/>');p.files['assets/web.woff2']=btoa('web font');const before=structuredClone(p);let calls=0;
 await open(p,'button',()=>{calls++;return '';});await select('Tài nguyên sẽ dùng','assets/vector.svg');
 expect(document.querySelector('[role="alert"]')?.textContent).toContain('SVG');expect(document.querySelector('.asset-preview')).toBeNull();expect(button('Áp dụng tài nguyên').disabled).toBe(true);
 await select('Phần cần đổi','font');await select('Tài nguyên sẽ dùng','assets/web.woff2');
 expect(document.querySelector('[role="alert"]')?.textContent).toContain('TTF hoặc OTF');expect(document.querySelector('.font-sample')).toBeNull();expect(fonts.size).toBe(0);expect(button('Áp dụng tài nguyên').disabled).toBe(true);expect(calls).toBe(0);expect(p).toEqual(before);
});

it('keeps a corrupt PNG out of preview and Apply while retaining the original project',async()=>{
 const p=fixture(),bytes=atob(png);p.files['assets/broken.png']=btoa(bytes.slice(0,-1));const before=structuredClone(p);let calls=0;
 await open(p,'image',()=>{calls++;return '';});await select('Tài nguyên sẽ dùng','assets/broken.png');
 expect(document.querySelector('[role="alert"]')?.textContent).toContain('sai checksum');expect(document.querySelector('.asset-preview')).toBeNull();expect(button('Áp dụng tài nguyên').disabled).toBe(true);expect(calls).toBe(0);expect(p).toEqual(before);
});
