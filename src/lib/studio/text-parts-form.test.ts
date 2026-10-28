import {afterEach,expect,it} from 'vitest';
import {mount,unmount,flushSync,tick} from 'svelte';
import TextPartsEditor from './TextPartsEditor.svelte';
import CompanionGuide from './CompanionGuide.svelte';
import {createProject,walk} from './project.js';
import {locale} from './i18n.js';
import {applyTextParts,type TextPartsRequest} from './text-parts.js';

let component:ReturnType<typeof mount>|undefined;
afterEach(async()=>{if(component)await unmount(component);component=undefined;locale.set('en');document.body.replaceChildren();});
const button=(text:string)=>{const el=[...document.querySelectorAll('button')].find(el=>el.textContent?.trim()===text);expect(el,text).toBeTruthy();return el!;};
async function input(index:number,text:string){const el=document.querySelectorAll<HTMLTextAreaElement>('.text-parts textarea')[index];expect(el).toBeTruthy();el.value=text;el.dispatchEvent(new Event('input',{bubbles:true}));flushSync();await tick();}

it('edits Vietnamese wording, keeps protected tokens and literal drafts through language changes, and rejects newly typed bindings',async()=>{
  locale.set('vi');let request:TextPartsRequest|undefined,calls=0;const original='HP {hp}/{maxHp}';
  component=mount(TextPartsEditor,{target:document.body,props:{text:original,onapply:value=>{request=value;calls++;return '';}}});flushSync();await tick();
  expect(document.querySelectorAll('textarea')).toHaveLength(3);expect([...document.querySelectorAll('.kept-data code')].map(el=>el.textContent)).toEqual(['{hp}','{maxHp}']);expect(button('Áp dụng phần chữ').disabled).toBe(true);
  await input(0,'Sinh lực ');await input(1,' trên ');expect(document.querySelector('pre')?.textContent).toBe('Sinh lực {hp} trên {maxHp}');expect(calls).toBe(0);
  locale.set('en');flushSync();await tick();expect(document.querySelector('textarea')?.value).toBe('Sinh lực ');button('Apply wording').click();flushSync();expect(request).toEqual({original,literals:['Sinh lực ',' trên ','']});expect(calls).toBe(1);
  await input(2,'{newField}');expect(button('Apply wording').disabled).toBe(true);expect(document.querySelector('[role="alert"]')?.textContent).toContain('same data values');button('Apply wording').click();expect(calls).toBe(1);
  locale.set('vi');flushSync();expect(document.querySelector('[role="alert"]')?.textContent).toContain('giữ nguyên');expect(document.querySelectorAll<HTMLTextAreaElement>('textarea')[2].value).toBe('{newField}');
});

it('keeps source-draft controls disabled and presents a failed application without dropping the wording',async()=>{
  let calls=0;component=mount(TextPartsEditor,{target:document.body,props:{text:'HP {hp}',disabled:true,onapply:()=>{calls++;return '';}}});flushSync();await tick();
  expect(document.querySelector('textarea')?.matches(':disabled')).toBe(true);expect(button('Apply wording').matches(':disabled')).toBe(true);button('Apply wording').click();expect(calls).toBe(0);
  await unmount(component);component=undefined;
  component=mount(TextPartsEditor,{target:document.body,props:{text:'HP {hp}',onapply:()=>{calls++;return 'Component changed. Reopen its controls.';}}});flushSync();await tick();
  await input(0,'Energy ');button('Apply wording').click();flushSync();expect(calls).toBe(1);expect(document.querySelector('[role="alert"]')?.textContent).toContain('Component changed');expect(document.querySelector('textarea')?.value).toBe('Energy ');
});

it('uses the guided editor for bound labels and bars, resets an unapplied draft on selection and changes only the chosen component',async()=>{
  locale.set('vi');const p=createProject('blank');p.layout.pages![0].child.children=[{id:'first',type:'text',text:'HP {hp}'},{id:'second',type:'button',text:'HP {hp}',onClick:{call:'literal',args:['$hp']}},{id:'bar',type:'bar',label:'HP {hp}/{maxHp}',value:'$hp',maxKey:'$maxHp'}];const before=structuredClone(p);let calls=0;
  component=mount(CompanionGuide,{target:document.body,props:{project:p,sourceDirty:false,onopen:()=>{},onclose:()=>{},onselect:()=>{},ontext:()=>{},oncolor:()=>{},ontest:()=>{},onexport:()=>{},onsave:()=>{},onbind:()=>{},onwording:(id,request)=>{calls++;applyTextParts(p,id,request);return '';}}});flushSync();await tick();
  const choices=[...document.querySelectorAll<HTMLButtonElement>('.guide-parts button')].filter(el=>el.querySelector('span')?.textContent==='HP {hp}');expect(choices).toHaveLength(2);
  choices[0].click();flushSync();await tick();await input(0,'Unapplied ');choices[1].click();flushSync();await tick();expect(document.querySelector('textarea')?.value).toBe('HP ');expect(calls).toBe(0);expect(p).toEqual(before);
  const bar=[...document.querySelectorAll<HTMLButtonElement>('.guide-parts button')].find(el=>el.querySelector('span')?.textContent==='HP {hp}/{maxHp}');bar!.click();flushSync();await tick();await input(0,'Sinh lực ');await input(1,' trên ');button('Áp dụng phần chữ').click();flushSync();await tick();
  expect(calls).toBe(1);expect(walk(p.layout).find(r=>r.node.id==='bar')?.node).toEqual({...before.layout.pages![0].child.children![2],label:'Sinh lực {hp} trên {maxHp}'});expect(p.manifest).toEqual(before.manifest);expect(p.data).toEqual(before.data);expect(p.files).toEqual(before.files);
  expect(walk(p.layout).find(r=>r.node.id==='first')?.node).toEqual(before.layout.pages![0].child.children![0]);expect(walk(p.layout).find(r=>r.node.id==='second')?.node).toEqual(before.layout.pages![0].child.children![1]);
});
