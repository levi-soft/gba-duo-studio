import {afterEach,describe,it,expect} from 'vitest';
import JSZip from 'jszip';
import {createProject,createTabs,widget,exportPack,importPack} from './project.js';
import {compileSkins} from './skins.js';
import {compileDesign} from './compiler.js';
import {parseLayout} from '../preview/layout.js';
import {createRenderer} from '../preview/dom.js';
import {prepareStylesheetCss} from '../preview/css.js';

function fixture() {
  const p=createProject('blank');
  for(const state of ['normal','pressed','selected']) p.files[`assets/${state} (1).svg`]=btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="${state==='normal'?'red':state==='pressed'?'blue':'green'}"/></svg>`);
  const skin={normal:'assets/normal (1).svg',pressed:'assets/pressed (1).svg',selected:'assets/selected (1).svg',height:96,showLabel:false,fit:'contain'};
  const tabs=createTabs(2);tabs.tabs!.forEach(t=>t.skin={...skin});
  const button=widget('button');button.buttonSkin={...skin,selected:''};
  p.layout.pages![0].child.children=[tabs,button];
  p.manifest.match!.gameCode=['TEST'];return {p,tabs,button};
}
afterEach(()=>document.body.replaceChildren());
describe('Image state skins',()=>{
  it('preserves pack identity, data and canvas dimensions through the full design pipeline',()=>{
    const {p}=fixture();p.width=800;p.height=1280;p.data={hp:19};
    p.manifest.studioComputed={double:{op:'mul',args:[{field:'hp'},2]}};
    const compiled=compileDesign(p);
    expect(compiled.manifest).toEqual(p.manifest);
    expect(compiled.data).toEqual({hp:19});
    expect([compiled.width,compiled.height]).toEqual([800,1280]);
    expect(compiled.hasEditorMetadata).toBe(true);
  });
  it('compiles to native CSS without changing source or losing filenames with spaces/parentheses',()=>{
    const {p,button}=fixture();const before=JSON.stringify(p);const out=compileSkins(p);
    expect(JSON.stringify(p)).toBe(before);
    expect(out.css).toContain(':nth-child(1):active');expect(out.css).toContain(':nth-child(1):pressed');
    expect(out.css.indexOf(':nth-child(1):pressed')).toBeGreaterThan(out.css.indexOf(':nth-child(1):active'));
    expect(out.css).not.toContain('(1).svg');expect(Object.keys(out.files).filter(k=>k.startsWith('assets/__studio_skins/')).length).toBe(8);
    expect(JSON.stringify(out.layout)).not.toContain('buttonSkin');
    expect(out.layout.pages![0].child.children![1].style!.background).toBeUndefined();
    expect(button.style!.background).toBe('#365d79');
  });
  it('shows normal/pressed/selected separately and maintains mutually exclusive active tabs',()=>{
    const {p}=fixture();const out=compileSkins(p),host=document.createElement('div');document.body.appendChild(host);
    const style=document.createElement('style');style.textContent=prepareStylesheetCss(out.css,'/test');host.appendChild(style);
    const renderer=createRenderer('/test');host.appendChild(renderer.build(parseLayout(JSON.stringify(out.layout))));renderer.update(p.data);
    const tabs=host.querySelectorAll<HTMLElement>('[data-type=tab]'),button=host.querySelector<HTMLElement>('[data-type=button]')!;
    expect(getComputedStyle(tabs[0]).backgroundImage).toContain('-selected.svg');
    expect(getComputedStyle(tabs[1]).backgroundImage).toContain('-normal.svg');
    tabs[1].dispatchEvent(new Event('pointerdown'));expect(getComputedStyle(tabs[1]).backgroundImage).toContain('-pressed.svg');
    tabs[1].dispatchEvent(new Event('pointerup'));tabs[1].click();
    expect(getComputedStyle(tabs[1]).backgroundImage).toContain('-selected.svg');expect(tabs[0].classList.contains('active')).toBe(false);
    expect(getComputedStyle(button).backgroundImage).toContain('-normal.svg');button.dispatchEvent(new Event('pointerdown'));
    expect(getComputedStyle(button).backgroundImage).toContain('-pressed.svg');button.dispatchEvent(new Event('pointercancel'));
    expect(getComputedStyle(button).backgroundImage).toContain('-normal.svg');
  });
  it('round-trips editor selections while exporting executable layout, CSS and original binary assets',async()=>{
    const {p}=fixture();const out=await exportPack(p),bytes=await out.arrayBuffer(),zip=await JSZip.loadAsync(bytes);
    const runtime=JSON.parse(await zip.file('layout.json')!.async('string'));
    expect(runtime.pages![0].child.children![0].tabs![0].skin).toBeUndefined();
    expect(await zip.file('style.css')!.async('string')).toContain(':pressed');
    const restored=await importPack(bytes);expect(restored.layout).toEqual(p.layout);expect(restored.css).toBe(p.css);
    expect(restored.files['assets/normal (1).svg']).toBe(p.files['assets/normal (1).svg']);
    zip.file('style.css','text { color: red; }');
    const edited=await importPack(await zip.generateAsync({type:'uint8array'}));expect(edited.css).toBe('text { color: red; }');
  });
  it('rejects missing state assets instead of exporting broken image URLs',()=>{
    const {p}=fixture();delete p.files['assets/normal (1).svg'];expect(()=>compileSkins(p)).toThrow(/Thiếu ảnh/);
  });
});
