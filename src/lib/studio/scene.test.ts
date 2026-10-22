import {describe,it,expect} from 'vitest';
import {sceneRows,revealAncestors} from './scene.js';
import {createProject,widget,walk} from './project.js';
describe('Scene group folding',()=>{
  it('folds children and preserves following siblings without changing layout',()=>{
    const p=createProject(),entries=walk(p.layout),box=entries.find(r=>r.node.type==='box')!;const original=JSON.stringify(p);
    const rows=sceneRows(entries,{[box.node.id]:true});
    expect(rows.some(r=>r.node.id===box.node.children![0].id)).toBe(false);
    expect(rows.some(r=>r.node.type==='list')).toBe(true);
    expect(rows.find(r=>r.node.id===box.node.id)!.hasChildren).toBe(true);
    expect(JSON.stringify(p)).toBe(original);
  });
  it('supports collapse-all and reveals selected node ancestors only',()=>{
    const p=createProject(),entries=walk(p.layout);const collapsed=Object.fromEntries(entries.filter((r,i)=>entries[i+1]?.depth>r.depth).map(r=>[r.node.id,true]));
    expect(sceneRows(entries,collapsed).length).toBe(1);
    const child=entries.find(r=>r.node.type==='box')!.node.children![0];
    const open=revealAncestors(entries,child.id,collapsed);
    expect(sceneRows(entries,open).some(r=>r.node.id===child.id)).toBe(true);
    const list=entries.find(r=>r.node.type==='list')!.node;expect(open[list.id]).toBe(true);
  });
  it('search reveals matching nodes plus ancestors even when groups were folded',()=>{
    const p=createProject(),entries=walk(p.layout),child=entries.find(r=>r.node.type==='box')!.node.children![0];child.class='unique-portrait';
    const rows=sceneRows(entries,{[p.layout.id]:true},'unique-portrait');
    expect(rows.at(-1)!.node.id).toBe(child.id);expect(rows[0].node.id).toBe(p.layout.id);
    expect(rows.some(r=>r.node.type==='list')).toBe(false);
  });
});
