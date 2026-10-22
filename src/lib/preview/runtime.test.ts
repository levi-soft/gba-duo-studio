import type {DataValues} from '../studio/types.js';
import {afterEach,describe,expect,it} from 'vitest';
import {parseLayout,parseLayoutWithWarnings} from './layout.js';
import {resolve,scopedValues,interpolate} from './data.js';
import {createRenderer} from './dom.js';
import {prepareStylesheetCss,extractFontFaceCss,previewSelector} from './css.js';
import {createProject,widget,exportPack,importPack,walk} from '../studio/project.js';

afterEach(()=>{document.body.replaceChildren();});
function preview(layout:unknown,data:DataValues={},options:Parameters<typeof createRenderer>[1]={}) {
 const runtime=createRenderer(path=>'/assets/'+path,options);
 const node=runtime.build(parseLayout(layout));document.body.append(node);runtime.update(data);
 return {runtime,node};
}
describe('Independent Studio preview runtime',()=>{
 it('validates the raw format without changing it and reports unsupported nodes',()=>{
  const source={type:'pages',state:'screen',pages:[{name:'a',child:{type:'text',text:'A'}}]};
  expect(parseLayout(source)).toEqual(source);
  expect(()=>parseLayout({type:'script',source:'anything'})).toThrow();
  expect(()=>parseLayout({type:'pages',pages:[{name:'a',child:{type:'text'}},{name:'a',child:{type:'text'}}]})).toThrow();
  expect(parseLayoutWithWarnings({type:'text',onClick:{unknown:1}}).warnings).toHaveLength(1);
 });
 it('resolves nested rows and global state without traversing prototypes',()=>{
  const row=scopedValues({name:'Unit',stats:{hp:8}},2,{chapter:'Map',ui:{selected:2}});
  expect(interpolate('{name}: {stats.hp}, {chapter}, {@index}',row)).toBe('Unit: 8, Map, 2');
  expect(resolve('ui.selected',row)).toBe(2);
  expect(resolve('__proto__.polluted',row)).toBeNull();
 });
 it('adapts selectors, viewport units, stack layout and font assets without altering quoted values',()=>{
  const css=prepareStylesheetCss('/*comment*/ :root{width:50vw} text.active{font-size:2vmin} .box{display:stack;background:url(asset:images/frame.png);content:"12px"}',p=>'/a/'+p,'');
  expect(css).toContain('width:50cqw');expect(css).toContain('font-size:2cqmin');
  expect(css).toContain('--studio-stack:1');expect(css).toContain('/a/images/frame.png');expect(css).toContain('"12px"');
  expect(previewSelector('box > text.label, .text:pressed')).toBe('[data-type="box"] > [data-type="text"].label, .text.pressed');
  expect(extractFontFaceCss('@font-face{font-family:Demo;src:url(assets/font.woff)}',p=>'/a/'+p)).toContain('/a/font.woff');
 });
 it('keeps the chosen page after initial script commands and supports back navigation',()=>{
  const layout={type:'column',children:[{type:'pages',state:'screen',pages:[{name:'Units',child:{type:'text',id:'units',text:'Units'}},{name:'Map',child:{type:'text',id:'map',text:'Map'}}]},
   {type:'button',id:'go',onClick:{navigate:'Map',state:'screen'}},{type:'button',id:'back',onClick:{back:true,state:'screen'}}]};
  const {runtime,node}=preview(layout,{ui:{set:{screen:'Units'}}});
  node.querySelector<HTMLElement>('#go')!.click();expect(runtime.ui.screen).toBe('Map');
  runtime.update({hp:5});expect(node.querySelector<HTMLElement>('#map')!.hasAttribute('data-gbaduo-hidden')).toBe(false);
  node.querySelector<HTMLElement>('#back')!.click();expect(runtime.ui.screen).toBe('Units');
 });
 it('retains repeated rows and image elements as values change, and resolves tap arguments in row scope',()=>{
  const calls:[string,(import('../studio/types.js').JsonValue|undefined)[]][]=[];
  const {node,runtime}=preview({type:'list',items:'$roster',template:{type:'row',onClick:{set:{selected:'{id}'},call:'focus',args:['{id}','{@index}']},children:[{type:'image',src:'{portrait}'},{type:'text',text:'{name} {hp}'}]}},
   {roster:[{id:7,name:'A',hp:8,portrait:'asset:portrait.png'}]},{onCall:(...args)=>calls.push(args)});
  const row=node.querySelector<HTMLElement>('[data-list-item]')!,image=row.querySelector<HTMLElement>('img')!;
  runtime.update({roster:[{id:7,name:'A',hp:6,portrait:'asset:portrait.png'}]});
  expect(node.querySelector<HTMLElement>('[data-list-item]')!).toBe(row);expect(row.querySelector<HTMLElement>('img')!).toBe(image);
  expect(row.textContent).toBe('A 6');row.click();expect(runtime.ui.selected).toBe(7);expect(calls).toEqual([['focus',[7,0]]]);
 });
 it('keeps page selection independent from conditional visibility and clamps bars',()=>{
  const {node,runtime}=preview({type:'pages',pages:[{name:'a',child:{type:'bar',id:'bar',value:'$hp',maxKey:'$max',visibleIf:'$show'}},{name:'b',child:{type:'text',text:'Other'}}]},
   {hp:30,max:20,show:false});
  expect(node.querySelector<HTMLElement>('#bar')!.hasAttribute('data-studio-invisible')).toBe(true);
  expect(node.querySelector<HTMLElement>('[data-type=fill]')!.style!.width).toBe('100%');
  runtime.update({hp:-5,max:20,show:true});expect(node.querySelector<HTMLElement>('#bar')!.hasAttribute('data-studio-invisible')).toBe(false);
  expect(node.querySelector<HTMLElement>('[data-type=fill]')!.style!.width).toBe('0%');
 });
 it('creates new examples in English or Vietnamese without translating an existing project',()=>{
  const en=createProject(),vi=createProject('rpg','vi');
  expect(en.manifest.name).toBe('My Companion');expect(resolve('items.0.name',en.data)).toBe('Iron sword');
  expect(resolve('items.0.name',vi.data)).toBe('Kiếm sắt');expect(widget('text').text).toBe('New text');
  expect(en.layout.pages![0].name).toBe('overview');
 });
});
