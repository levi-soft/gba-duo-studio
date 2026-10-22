import { describe, it, expect } from 'vitest';
import { fontCatalog, applyNodeFont, setTabLabelFont, tabLabelFont } from './fonts.js';
import { compileDesign } from './compiler.js';

describe('font assets', () => {
  it('uses one source for the quick tab font picker and the complete Inspector',()=>{
    const layout={type:'tabs',id:'tabs',tabs:[{title:'A',labelFont:'Old',child:{type:'text',id:'a',text:'A'}}],studioStyles:{'tab:a':{normal:{'font-family':'monospace'}}}};
    setTabLabelFont(layout,'tabs','a','Mali');
    expect(tabLabelFont(layout,layout.tabs![0])).toBe('Mali');
    expect(layout.tabs![0].labelFont).toBeUndefined();
    const compiled=compileDesign({layout,files:{},css:''});
    expect(compiled.css).toContain('font-family: "Mali"');
    expect(compiled.css).not.toContain('font-family: monospace');
  });
  it('exports separate tab label fonts and keeps editor fields in the source', () => {
    const project={css:'',files:{},layout:{type:'tabs',id:'tabs',tabs:[{title:'One',labelFont:'monospace',child:{type:'text',id:'one',text:'Body'}},{title:'Two',labelFont:'serif',child:{type:'text',id:'two',text:'Body'}}]}};
    const compiled=compileDesign(project);
    expect(compiled.css).toContain('tab:nth-child(1) { font-family: monospace; }');
    expect(compiled.css).toContain('tab:nth-child(2) { font-family: serif; }');
    expect(compiled.layout.tabs![0].labelFont).toBeUndefined();
    expect(project.layout.tabs![0].labelFont).toBe('monospace');
    expect(compiled.hasEditorMetadata).toBe(true);
    applyNodeFont(project.layout,'tabs','Mali',true);
    expect(project.layout.tabs!.every(t=>t.labelFont==='Mali')).toBe(true);
  });
  it('can replace template child font overrides while preserving other styles', () => {
    const layout = {type:'column',id:'root',children:[{type:'text',id:'title',font:'old.ttf',style:{'font-family':'Old',color:'red'}}]};
    applyNodeFont(layout,'root','Mali',false);
    expect(layout.children![0].style!['font-family']).toBe('Old');
    applyNodeFont(layout,'root','monospace',true);
    expect(layout.children![0].style!).toEqual({'font-family':'monospace',color:'red'});
    expect(layout.children![0].font).toBeUndefined();
  });
  it('recognizes declared template families without duplicating the file', () => {
    const project = {css:'@font-face {font-family: "Farm Body";src:url("body.ttf");}',files:{'assets/body.ttf':'YWJj'},layout:{type:'text',id:'text',text:'Hello'} as import('./types.js').LayoutNode};
    expect(fontCatalog(project)).toEqual([{family:'Farm Body',path:'assets/body.ttf',declared:true}]);
    expect(compileDesign(project).css).toBe(project.css);
  });
  it('registers selected files with safe URLs and preserves bytes', () => {
    const project = {css:'',files:{'assets/My Font (1).otf':'YWJj'},layout:{type:'text',id:'text',text:'Hello'} as import('./types.js').LayoutNode};
    const font = fontCatalog(project)[0];
    project.layout.style = {'font-family':JSON.stringify(font.family)};
    const compiled = compileDesign(project);
    expect(compiled.hasEditorMetadata).toBe(true);
    expect(compiled.css).toContain(`font-family: "${font.family}"`);
    expect(compiled.files[`assets/__studio_fonts/${font.family}.otf`]).toBe('YWJj');
    expect(project.css).toBe('');
    expect(project.layout.style!['font-family']).toBe(JSON.stringify(font.family));
  });
});
