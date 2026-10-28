import {afterEach,expect,it} from 'vitest';
import {mount,unmount,flushSync,tick} from 'svelte';
import PackReadiness from './PackReadiness.svelte';
import SourceWorkspace from './SourceWorkspace.svelte';
import {createProject} from './project.js';
import {locale} from './i18n.js';
import {packFixDestination,type PackIssue} from './pack-readiness.js';

let components:ReturnType<typeof mount>[]=[];
afterEach(async()=>{for(const component of components)await unmount(component);components=[];locale.set('en');document.body.replaceChildren();});
const fixture=()=>{const p=createProject('blank');p.manifest.match={gameCode:['TEST']};return p;};
const button=(text:string)=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent?.trim()===text);expect(b,text).toBeTruthy();return b!;};
const input=()=>document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Source code"]')!;

it('shows localized file/property details and sends the actual issue to the repair action',async()=>{
  locale.set('vi');const p=fixture();p.layout.pages![0].child.children=[{id:'portrait',type:'image',src:'asset:missing.png'}];const before=JSON.stringify(p);let fixed:PackIssue|undefined,exports=0;
  components.push(mount(PackReadiness,{target:document.body,props:{project:p,sourceDirty:false,onclose:()=>{},onfix:issue=>{fixed=issue;},onexport:()=>{exports++;}}}));flushSync();await tick();
  const row=[...document.querySelectorAll('li')].find(el=>el.textContent?.includes('assets/missing.png'));expect(row?.textContent).toContain('portrait · src');expect(row?.textContent).toContain('Thiếu ảnh/font');
  expect(button('Xuất bản sao companion').disabled).toBe(true);row!.querySelector<HTMLButtonElement>('button')!.click();flushSync();
  expect(fixed).toMatchObject({code:'missing-asset',nodeId:'portrait',property:'src',detail:'assets/missing.png'});expect(packFixDestination(fixed!)).toEqual({mode:'2d',nodeId:'portrait',inspector:'content'});expect(exports).toBe(0);expect(JSON.stringify(p)).toBe(before);
  locale.set('en');flushSync();expect(row?.textContent).toContain('directly referenced');
});

it('allows warning-only exports and shows full diagnostic totals with a bounded list',async()=>{
  const p=fixture();p.data.empty=[];p.layout.pages![0].child.children=Array.from({length:130},(_,i)=>({id:'n'+i,type:'text',text:'{unknown'+i+'}'}));
  let exports=0;components.push(mount(PackReadiness,{target:document.body,props:{project:p,sourceDirty:false,onclose:()=>{},onfix:()=>{},onexport:()=>{exports++;}}}));flushSync();await tick();
  expect(document.body.textContent).toContain('131 notes');expect(document.body.textContent).toContain('Showing up to 100 entries');expect(document.querySelectorAll('li')).toHaveLength(100);
  expect(button('Export companion copy').disabled).toBe(false);button('Export companion copy').click();expect(exports).toBe(1);
});

it('opens the requested CSS file and restores another file draft without applying, deleting or changing source',async()=>{
  const p=fixture(),before=JSON.stringify(p);let changes=0,dirty=false;
  const editor=mount(SourceWorkspace,{target:document.body,props:{project:p,onchange:()=>{changes++;},ondirty:value=>{dirty=value;}}});components.push(editor);flushSync();await tick();
  const original=input().value,draft=original+'\n';input().value=draft;input().dispatchEvent(new Event('input',{bubbles:true}));flushSync();await tick();expect(dirty).toBe(true);
  editor.openSource('style.css');flushSync();await tick();expect(input().value).toBe(p.css);expect(document.activeElement).toBe(input());
  editor.openSource('layout.json');flushSync();await tick();expect(input().value).toBe(draft);expect(dirty).toBe(true);expect(changes).toBe(0);expect(JSON.stringify(p)).toBe(before);
  editor.openSource('../unsafe.lua');flushSync();await tick();expect(input().value).toBe(draft);expect(document.querySelector('[role="alert"]')).toBeTruthy();expect(changes).toBe(0);
});

it('opens a missing Lua entry for editing without creating a file or replacing any draft',async()=>{
  const p=fixture();p.manifest.script='scripts/missing.lua';let changes=0;const before=JSON.stringify(p);
  const editor=mount(SourceWorkspace,{target:document.body,props:{project:p,onchange:()=>{changes++;}}});components.push(editor);flushSync();await tick();
  editor.openSource('scripts/missing.lua');flushSync();await tick();expect(input().value).toBe('');expect(document.body.textContent).toContain('scripts/missing.lua');expect(changes).toBe(0);expect(JSON.stringify(p)).toBe(before);
});
