import {describe,it,expect,afterEach} from 'vitest';
import JSZip from 'jszip';
import {styleFields,styleTargets} from './style-schema.js';
import {setNodeStyles,styleValues,expandFour,splitCss,cloneStyledTree} from './style-model.js';
import {resolveStyles,declarations} from './style-resolver.js';
import {createRenderer} from '../preview/dom.js';
import {parseLayout} from '../preview/layout.js';
import {compileDesign} from './compiler.js';
import {importPack,exportPack,walk,createProject} from './project.js';
import {prepareStylesheetCss,prepareStyleDeclarations} from '../preview/css.js';

afterEach(()=>document.body.replaceChildren());
describe('template-matched style editing',()=>{
  it('resolves asymmetric radii, variables, shorthands and selector priority in source units',()=>{
    document.body.innerHTML='<div id="screen" style="--thread:rgba(150,100,50,0.6)"><div class="paper hero" id="hero"><span class="title"></span></div></div>';
    const css='.paper.hero {border-radius:22px 8px 22px 8px;border:2px dashed var(--thread);padding:14px 16px 12px 16px;font-family:Mali} .paper {border-radius:16px} .title {color:red}';
    const el=document.getElementById('hero')!;
    const result=resolveStyles(el,css);
    expect(expandFour(result.values['border-radius'])).toEqual(['22px','8px','22px','8px']);
    expect(result.values['padding-top']).toBe('14px');
    expect(result.sources['border']).toContain('var(--thread)');
    expect(expandFour(resolveStyles(el,css,'',{'border-radius':'5px'}).values['border-radius'])).toEqual(['5px','5px','5px','5px']);
    expect(resolveStyles(el.firstElementChild,css).values['font-family']).toBe('Mali');
  });
  it('edits normal and pressed styles independently and compiles a native state baseline',()=>{
    const p=createProject('blank');p.layout={type:'button',id:'button',text:'Go',style:{background:'#ff0000',width:'80px'}};
    setNodeStyles(p.layout,'button','self','pressed',{background:'#00ff00',transform:'scale(0.95)'});
    expect(styleValues(p.layout,'self','normal').background).toBe('#ff0000');
    const compiled=compileDesign(p);
    expect(compiled.css).toContain(':pressed { background: #00ff00; transform: scale(0.95); }');
    expect(compiled.layout.style!).toBeUndefined();
    expect(compiled.css).toContain('background: #ff0000; width: 80px;');
    expect(compiled.layout.studioStyles!).toBeUndefined();
    expect(p.layout.style!.background).toBe('#ff0000');
    expect(prepareStylesheetCss(compiled.css,'/pack')).toContain('.pressed');
  });
  it('keeps tab styles attached to their content when a preceding tab is deleted',()=>{
    const p=createProject('blank');p.layout={type:'tabs',id:'tabs',tabs:[{title:'A',child:{type:'text',id:'a',text:'A'}},{title:'B',child:{type:'text',id:'b',text:'B'}}]};
    const target=styleTargets(p.layout).find(t=>t.label.includes('· B'))!;
    setNodeStyles(p.layout,'tabs',target.key,'active',{'border-radius':'12px 4px 12px 4px'});
    p.layout.tabs!.shift();
    expect(compileDesign(p).css).toContain('#tabs > tab-bar > tab:nth-child(1):active');
  });
  it('does not split rgba, gradients or filenames at internal separators',()=>{
    expect(splitCss('color 200ms ease, transform 150ms ease')).toHaveLength(2);
    expect(splitCss('linear-gradient(170deg, rgba(1, 2, 3, .2), #fff)')).toHaveLength(1);
    const prepared=prepareStyleDeclarations('background-image:url("assets/My Image (1).png");padding:2px 4px;',p=>'/asset/'+p);
    expect(prepared).toContain('url("/asset/My Image (1).png")');
    expect(prepared).toContain('padding:5px 9px');
  });
  it('reads native lengths from theme variables without scaling them a second time',()=>{
    document.body.innerHTML='<div id="screen" data-gbaduo-root style="--shape:51px 18px"><div class="hero"></div></div>';
    const result=resolveStyles(document.querySelector<HTMLElement>('.hero')!,':root {--shape:22px 8px 22px 8px} .hero {border-radius:var(--shape)}');
    expect(expandFour(result.values['border-radius'])).toEqual(['22px','8px','22px','8px']);
  });
  it('shows effective sides when the template only declares top/bottom overrides',()=>{
    const el=document.createElement('div');el.className='weather';document.body.appendChild(el);
    const result=resolveStyles(el,'.weather {padding-top:8px;margin-top:4px;margin-bottom:6px;border:2px dashed red;border-color:blue}');
    expect(result.values.padding).toBe('8px 0px 0px 0px');
    expect(result.values.margin).toBe('4px 0px 6px 0px');
    expect(result.values.border).toContain('blue');
  });
  it('scales inline and bound styles for every repeated item including new rows',()=>{
    const layout={type:'list',id:'list',items:'$items',template:{type:'text',id:'item',text:'{name}',style:{'border-radius':'17px'},bindStyle:{padding:'{pad}px'}}};
    const renderer=createRenderer('/pack',{prepareInlineStyle:values=>Object.fromEntries(declarations(prepareStyleDeclarations(Object.entries(values).map(([k,v])=>`${k}:${v}`).join(';'),'/pack')))});
    const root=renderer.build(parseLayout(JSON.stringify(layout)));document.body.appendChild(root);
    renderer.update({items:[{name:'A',pad:2},{name:'B',pad:3}]});
    expect([...root.querySelectorAll<HTMLElement>('#item')].map(e=>e.style!.borderRadius)).toEqual(['39px','39px']);
    expect([...root.querySelectorAll<HTMLElement>('#item')].map(e=>e.style!.padding)).toEqual(['5px','7px']);
    renderer.update({items:[{name:'A',pad:2},{name:'B',pad:3},{name:'C',pad:4}]});
    expect([...root.querySelectorAll<HTMLElement>('#item')].map(e=>e.style!.borderRadius)).toEqual(['39px','39px','39px']);
  });
  it('remaps tab appearance targets when duplicating a tree',()=>{
    const layout={type:'tabs',id:'tabs',tabs:[{title:'A',child:{type:'text',id:'a',text:'A'}}],studioStyles:{'tab:a':{normal:{color:'red'}}}};
    let sequence=0;const copy=cloneStyledTree(layout,()=>`copy${++sequence}`);
    expect(copy.studioStyles!['tab:copy2'].normal.color).toBe('red');
    expect(layout.studioStyles!['tab:a'].normal.color).toBe('red');
  });
  it('preserves visual overrides through a game-neutral ZIP roundtrip',async()=>{
    const project=createProject();project.manifest.match={gameCode:['TEST']};
    const bar=walk(project.layout).find(r=>r.node.type==='bar')!.node;
    setNodeStyles(project.layout,bar.id,'fill','normal',{'background-image':'linear-gradient(90deg, #123456, #abcdef)'});
    const restored=await importPack(await (await exportPack(project)).arrayBuffer());
    expect(walk(restored.layout).find(r=>r.node.id===bar.id)!.node.studioStyles!).toEqual(bar.studioStyles!);
  });
});
