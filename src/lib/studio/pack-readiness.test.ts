import {it,expect} from 'vitest';
import {createProject,exportPack,walk} from './project.js';
import {packReadiness,packReadinessReport,packFixDestination,issueText} from './pack-readiness.js';
import {computedScriptPath} from './computed-values.js';

it('keeps Studio-specific readiness messages readable in Vietnamese',()=>{
  const messages={
    'code-draft':'Áp dụng hoặc bỏ bản nháp Mã nguồn trước khi xuất.',
    'invalid-project':'Dự án có thiết lập hoặc dữ liệu không hợp lệ.',
    'missing-script':'Thiếu tệp Lua khởi chạy đã khai báo.',
    'export-settings':'Hoàn thiện thiết lập dự án trước khi xuất.',
    'sample-only':'Dự án chỉ có dữ liệu mẫu. Xuất ZIP không tự tạo bộ đọc game.'
  };
  for(const [code,text]of Object.entries(messages))expect(issueText({level:'error',code,target:'project'},'vi')).toBe(text);
});

function fixture(){const p=createProject('blank');p.manifest.match={gameCode:['TEST']};return p;}
it('finds missing Lua and static images at their actual source without mutating the project',async()=>{
  const p=fixture();p.manifest.script='missing.lua';const root=p.layout.pages![0].child;
  root.children=[{id:'portrait',type:'image',src:'asset:portrait.png'},{id:'button',type:'button',text:'Go',buttonSkin:{normal:'assets/button.png'}}];
  const before=JSON.stringify(p),issues=packReadiness(p);
  expect(issues.filter(i=>i.code==='missing-script')).toHaveLength(1);
  expect(issues.filter(i=>i.code==='missing-asset').map(i=>i.nodeId)).toEqual(['portrait','button']);
  expect(JSON.stringify(p)).toBe(before);await expect(exportPack(p)).rejects.toThrow('Lua');
  p.files['missing.lua']=btoa('function update() return {} end');p.files['assets/portrait.png']='';p.files['assets/button.png']='';
  expect(packReadiness(p).filter(i=>i.level==='error')).toEqual([]);
});
it('keeps missing sample data separate from fields supplied by a runtime reader',()=>{
  const p=fixture();p.layout.pages![0].child.children=[{id:'live',type:'text',text:'{runtimeOnly}'},{id:'ui',type:'text',text:'{ui.selection}'}];
  expect(packReadiness(p).find(i=>i.field==='runtimeOnly')).toMatchObject({level:'warning',code:'missing-field',nodeId:'live'});
  p.manifest.script='main.lua';p.files['main.lua']=btoa('function update() return {} end');
  expect(packReadiness(p).find(i=>i.field==='runtimeOnly')).toMatchObject({level:'info',code:'runtime-field'});
  expect(packReadiness(p).some(i=>i.field==='ui.selection')).toBe(false);
  p.manifest.studioDataFields={runtimeOnly:{kind:'number',labelVi:'Giá trị trực tiếp'}};
  expect(packReadiness(p).some(i=>i.field==='runtimeOnly')).toBe(false);
});
it('checks list row scope, native fields and dynamic images without blocking valid runtime bindings',()=>{
  const p=fixture();p.data={hp:30,party:[{hp:0,name:'One'}]};p.manifest.values={hp:{type:'u8',addr:'02000000'}};
  p.layout.pages![0].child.children=[{id:'party',type:'list',items:'$party',template:{id:'row',type:'text',text:'{name}: {hp} · {@index}'}},{id:'dynamic-image',type:'image',src:'$portrait'}];
  const issues=packReadiness(p);expect(issues.some(i=>i.code==='missing-asset')).toBe(false);expect(issues.some(i=>i.nodeId==='row')).toBe(false);
  expect(issues.find(i=>i.field==='portrait')?.level).toBe('warning'); // Native HP alone cannot supply a portrait field.
});
it('blocks pending source drafts and incomplete export settings, but accepts generated Studio Lua',async()=>{
  const p=fixture();expect(packReadiness(p,true).some(i=>i.code==='code-draft'&&i.level==='error')).toBe(true);
  p.manifest.match={};expect(packReadiness(p).some(i=>i.code==='export-settings')).toBe(true);
  p.manifest.match={gameCode:['TEST']};p.manifest.script=computedScriptPath;p.manifest.studioComputed={hp:3};
  p.layout.pages![0].child.children=[{type:'text',id:'computed',text:'{hp}'}];expect(packReadiness(p).some(i=>i.field==='hp')).toBe(false);
  expect(packReadiness(p).some(i=>i.code==='missing-script')).toBe(false);await expect(exportPack(p)).resolves.toBeDefined();
});
it('deduplicates repeated tokens, includes inactive pages and supplies Vietnamese messages',()=>{
  const p=fixture();p.manifest.script='main.lua';p.files['main.lua']=btoa('function update() return {} end');
  p.layout.pages!.push({name:'hidden',child:{id:'other',type:'text',text:'{unknown} {unknown}'}});
  const matches=packReadiness(p).filter(i=>i.field==='unknown');expect(matches).toHaveLength(1);expect(matches[0].nodeId).toBe('other');expect(issueText(matches[0],'vi')).toContain('Lua');
  expect(walk(p.layout).some(r=>r.node.id==='other')).toBe(true);
});
it('checks CSS, relative images and compiler-required skins with exact repair destinations',()=>{
  const p=fixture(),root=p.layout.pages![0].child;p.css+='\n@font-face{font-family:demo;src:url(fonts/missing.woff2)}';p.data.show=false;
  root.children=[{id:'relative',type:'image',src:'missing.png'},{id:'skin',type:'button',visibleIf:'$show',buttonSkin:{normal:'assets/skin.png'}},{id:'style',type:'text',style:{background:'url(background.png)'},text:'Ready'}];
  const before=JSON.stringify(p),issues=packReadiness(p);expect(issues.filter(i=>i.level==='error')).toHaveLength(4);
  const css=issues.find(i=>i.location==='style.css')!;expect(css).toMatchObject({target:'code',property:'css',detail:'assets/fonts/missing.woff2'});expect(packFixDestination(css)).toEqual({mode:'code',path:'style.css'});
  expect(issues.find(i=>i.nodeId==='skin')).toMatchObject({level:'error',property:'buttonSkin.normal'});
  expect(packFixDestination(issues.find(i=>i.nodeId==='style')!)).toEqual({mode:'2d',nodeId:'style',inspector:'appearance'});expect(JSON.stringify(p)).toBe(before);
});
it('checks action and bare-path bindings while empty lists do not invent absent row values',()=>{
  const p=fixture();p.data={hp:0,active:false,empty:[],party:[{name:'Aya',hp:0}]};p.layout.pages![0].child.children=[
    {id:'bare',type:'bar',value:'hp',maxKey:'missingMax',visibleIf:'active'},
    {id:'empty',type:'list',items:'empty',template:{id:'unobserved',type:'text',text:'{notObserved}'}},
    {id:'party',type:'list',items:'party',template:{id:'row',type:'button',text:'{name} {hp} {@index}',onClick:{set:{selected:'{name}'},call:'literal',args:['$missingArg',{literal:'{ignore}'}]}}}
  ];const issues=packReadiness(p);expect(issues.some(i=>i.field==='notObserved')).toBe(false);expect(issues.find(i=>i.code==='row-sample')).toMatchObject({nodeId:'empty',level:'warning'});
  expect(issues.filter(i=>i.field?.startsWith('missing')).map(i=>i.field).sort()).toEqual(['missingArg','missingMax']);expect(packFixDestination(issues.find(i=>i.field==='missingArg')!)).toEqual({mode:'2d',nodeId:'row',inspector:'behavior'});
});
it('honors generated computed/graphics declarations without mutating the manifest or treating custom Lua as generated',()=>{
  const p=fixture();p.manifest.script=computedScriptPath;p.manifest.studioComputed={energy:3};p.manifest.studioGraphics={avatar:{tiles:'08000100',palette:'08000200',width:8,height:8,lz77:false}};
  p.layout.pages![0].child.children=[{id:'generated',type:'text',text:'{energy}'},{id:'avatar',type:'image',src:'$avatar'},{id:'unknown',type:'text',text:'{readerUnknown}'}];const before=JSON.stringify(p);
  const report=packReadinessReport(p);expect(report.errors).toBe(0);expect(report.issues.filter(i=>i.field).map(i=>i.field)).toEqual(['readerUnknown']);expect(report.issues.find(i=>i.field==='readerUnknown')?.level).toBe('warning');expect(JSON.stringify(p)).toBe(before);
  p.manifest.script='custom.lua';p.files['custom.lua']=btoa('return {}');expect(packReadiness(p).find(i=>i.field==='energy')?.level).toBe('info');
});
it('keeps accurate totals when the display is capped and routes script/settings/data fixes without edits',()=>{
  const p=fixture();p.layout.pages![0].child.children=Array.from({length:120},(_,i)=>({id:'n'+i,type:'text',text:'{field'+i+'}'}));p.layout.pages![0].child.children.push({id:'late-error',type:'image',src:'asset:missing.png'});
  const report=packReadinessReport(p);expect(report).toMatchObject({errors:1,warnings:121,info:0,truncated:true,complete:true});expect(report.issues).toHaveLength(100);expect(report.issues[0].nodeId).toBe('late-error');
  expect(packFixDestination({level:'error',code:'missing-script',target:'code',detail:'scripts/missing.lua'})).toEqual({mode:'code',path:'scripts/missing.lua'});
  expect(packFixDestination({level:'error',code:'code-draft',target:'code'})).toEqual({mode:'code'});
  expect(packFixDestination({level:'warning',code:'sample-only',target:'data'})).toEqual({mode:'data'});
  expect(packFixDestination({level:'error',code:'export-settings',target:'project'})).toEqual({mode:'project'});
});
it('reports missing art in conditional branches as review notes without suppressing ordinary missing-image errors',()=>{
  const p=fixture();p.data.enabled=false;
  p.layout.pages![0].child.children=[{type:'column',id:'optional',visibleIf:'$enabled',children:[{id:'optional-art',type:'image',src:'asset:optional.png'}]},{id:'normal-art',type:'image',src:'asset:normal.png'}];
  const issues=packReadiness(p);expect(issues.find(i=>i.nodeId==='optional-art')).toMatchObject({level:'warning',code:'conditional-asset'});
  expect(issues.find(i=>i.nodeId==='normal-art')).toMatchObject({level:'error',code:'missing-asset'});
  p.layout.pages![0].child.children[0].visibleIf=undefined;
  expect(packReadiness(p).find(i=>i.nodeId==='optional-art')).toMatchObject({level:'error',code:'missing-asset'});
});
