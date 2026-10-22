import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { createProject, widget, walk, moveNode, removeNode, snappedTransform, DEVICE_DENSITY, validate, exportPack, importPack, migrateDefaultCanvasPadding, appendTab, createTabs } from './project.js';

describe('Studio project compatibility', () => {
  it('creates arbitrary tab counts with independent contents and configurable placement', () => {
    for(const count of [2,4,5,12]) {
      const p=createProject('blank'),tabs=createTabs(count,'bottom');
      p.layout.pages![0].child.children!.push(tabs);
      expect(tabs.tabs!.length).toBe(count); expect(new Set(tabs.tabs!.map(t=>t.child.id)).size).toBe(count);
      tabs.tabs![0].child.children!.push(widget('text'));
      appendTab(tabs); expect(tabs.tabs![0].child.children!.length).toBe(1);
      removeNode(p.layout,tabs.tabs!.at(-1)!.child.id); expect(tabs.tabs!.length).toBe(count);
      expect(validate(p).warnings).toEqual([]);
    }
    expect(createTabs(4,'top').style!['flex-direction']).toBe('column');
    expect(()=>createTabs(0)).toThrow(); expect(()=>createTabs(2.5)).toThrow();
  });
  it('builds bottom navigation with native tabs and independently editable content', () => {
    const p=createProject('blank'), tabs=widget('bottom-tabs');
    p.layout.pages![0].child.children!.push(tabs);
    expect(tabs.type).toBe('tabs'); expect(tabs.style!['flex-direction']).toBe('column-reverse');
    expect(tabs.tabs!.map(t=>t.title)).toEqual(['Character','Inventory','Information']);
    expect(new Set(tabs.tabs!.map(t=>t.child.id)).size).toBe(3);
    const extra=appendTab(tabs,'Bản đồ'); expect(tabs.tabs!.at(-1)!.title).toBe('Bản đồ');
    expect(removeNode(p.layout,extra)).toBe(true); expect(tabs.tabs!.length).toBe(3);
    expect(validate(p).warnings).toEqual([]);
  });
  it('removes only the known old default canvas gutter, preserving custom CSS', () => {
    const p=createProject(); expect(p.css).toContain('padding: 0px');
    p.css=p.css.replace('padding: 0px','padding: 24px');
    expect(migrateDefaultCanvasPadding(p).css).toContain('padding: 0px');
    p.css=':root { padding: 20px; color: red; }';
    expect(migrateDefaultCanvasPadding(p).css).toBe(':root { padding: 20px; color: red; }');
  });
  it('deletes a second page, repairs its initial page and navigation, and keeps one page', () => {
    const p = createProject(); const second = widget('column');
    p.layout.pages!.push({name:'second',child:second}); p.layout.initial='second';
    const button = {...widget('button'),onClick:[{navigate:'second'},{navigate:'second',state:'other'}]};
    p.layout.pages![0].child.children!.push(button);
    expect(removeNode(p.layout,second.id)).toBe(true);
    expect(p.layout.initial).toBe('overview');
    expect(button.onClick).toEqual([{navigate:'overview'},{navigate:'second',state:'other'}]);
    expect(() => validate(p)).not.toThrow();
    expect(() => removeNode(p.layout,p.layout.pages![0].child.id)).toThrow(/ít nhất một trang/);
    expect(removeNode(p.layout,p.layout.id)).toBe(false);
  });
  it('snaps moves to canvas pixels even inside an offset parent', () => {
    const d=DEVICE_DENSITY;
    const result=snappedTransform({x:10,y:10,width:50,height:20},{x:13,y:12},{snap:true,step:32/d,origin:{x:55/d,y:55/d}});
    if(!('x' in result))throw Error('Expected a move result');
    expect((result.x+55/d)*d/32).toBeCloseTo(Math.round((result.x+55/d)*d/32));
    expect((result.y+55/d)*d/32).toBeCloseTo(Math.round((result.y+55/d)*d/32));
  });
  it('uses custom steps for resize and allows unsnapped movement', () => {
    const start={x:1,y:2,width:50,height:22};
    expect(snappedTransform(start,{x:3,y:5},{snap:false})).toMatchObject({x:4,y:7});
    expect(snappedTransform(start,{x:3,y:5},{snap:true,step:8,resize:true})).toEqual({width:56,height:24});
    const fine = snappedTransform(start,{x:3,y:5},{snap:true,step:1/DEVICE_DENSITY});
    if(!('x' in fine))throw Error('Expected a move result');
    expect(fine.x*DEVICE_DENSITY).toBeCloseTo(Math.round(fine.x*DEVICE_DENSITY));
    expect(fine.y*DEVICE_DENSITY).toBeCloseTo(Math.round(fine.y*DEVICE_DENSITY));
  });
  it('creates game-neutral templates at Thor landscape size', () => {
    for (const kind of ['blank', 'rpg', 'adventure']) {
      const p = createProject(kind);
      expect(p.width).toBe(1240); expect(p.height).toBe(1080);
      expect(p.manifest.match!.gameCode).toEqual([]);
      expect(validate(p).warnings).toEqual([]);
    }
  });
  it('allows custom landscape and portrait sizes and rejects invalid bounds', () => {
    const p = createProject(); p.width = 800; p.height = 1280; expect(() => validate(p)).not.toThrow();
    p.width = 0; expect(() => validate(p)).toThrow(/64/);
    p.width = 8193; expect(() => validate(p)).toThrow(/64/);
  });
  it('moves nodes without allowing cycles or deleting page roots', () => {
    const p = createProject(); const page = p.layout.pages![0].child;
    const box = page.children!.find((n) => n.type === 'box')!;
    expect(moveNode(p.layout, box.id, box.children![0].id)).toBe(false);
    expect(moveNode(p.layout, page.id, box.id)).toBe(false);
    const heading = page.children![0];
    expect(moveNode(p.layout, heading.id, box.id)).toBe(true);
    expect(box.children!.at(-1)!.id).toBe(heading.id);
    expect(page.children!.some((n) => n.id === heading.id)).toBe(false);
  });
  it('requires a game match for export and validates CRC32', () => {
    const p = createProject(); expect(() => validate(p, true)).toThrow(/mã game/);
    p.manifest.match!.gameCode = ['TEST']; expect(() => validate(p, true)).not.toThrow();
    p.manifest.match!.crc32 = ['bad']; expect(() => validate(p, true)).toThrow(/CRC32/);
  });
  it('exports native pack files and no fake Lua memory reader', async () => {
    const p = createProject(); p.manifest.match!.gameCode = ['TEST'];
    const blob = await exportPack(p);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const m = JSON.parse(await zip.file('manifest.json')!.async('string'));
    expect(m.layout).toBe('layout.json'); expect(m.styles).toEqual(['style.css']);
    expect(m.script).toBeUndefined(); expect(zip.file('main.lua')!).toBeNull();
    const layout = JSON.parse(await zip.file('layout.json')!.async('string'));
    expect(walk(layout).length).toBe(walk(p.layout).length);
  });
  it('preserves imported Lua, modules and binary assets through export', async () => {
    const zip = new JSZip(); const root = zip.folder('pack')!;
    root.file('manifest.json', JSON.stringify({id:'example',name:'Example',formatVersion:2,match:{gameCode:['BPRE']},layout:'ui.json',styles:['a.css','b.css'],script:'scripts/main.lua'}));
    root.file('ui.json',JSON.stringify(widget('column'))); root.file('a.css','text{color:white}'); root.file('b.css','box{padding:8px}');
    root.file('scripts/main.lua','function update() return {} end'); root.file('scripts/helpers.lua','return {}');
    root.file('assets/test.png',new Uint8Array([0, 255, 1, 128]));
    const p = await importPack(await zip.generateAsync({type:'uint8array'}));
    const out = await exportPack(p); const z = await JSZip.loadAsync(await out.arrayBuffer());
    expect(await z.file('scripts/main.lua')!.async('string')).toBe('function update() return {} end');
    expect(await z.file('scripts/helpers.lua')!.async('string')).toBe('return {}');
    expect([...await z.file('assets/test.png')!.async('uint8array')]).toEqual([0,255,1,128]);
    expect(await z.file('style.css')!.async('string')).toContain('box{padding:8px}');
  });
});
