import {it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import JSZip from 'jszip';
import {createProject,exportPack,importPack,validate,walk} from '../src/lib/studio/project.js';
import {applyDataWidget} from '../src/lib/studio/data-widgets.js';
import {applyTextParts} from '../src/lib/studio/text-parts.js';
import {applyAssetEdit,assetEditSnapshot} from '../src/lib/studio/asset-editing.js';
import {insertFunctionBlock} from '../src/lib/studio/function-block-authoring.js';
import {createRenderer} from '../src/lib/preview/dom.js';
import type {Project} from '../src/lib/studio/types.js';

interface BuilderAPI {
 CompanionBuild:{romIdentity:(rom:Uint8Array)=>{gameCode:string;crc32:string};inspectProject:(rom:Uint8Array,p:Project)=>{runtimeVerified:boolean};buildProject:(rom:Uint8Array,p:Project)=>Promise<{project:Project;zipBytes:Uint8Array;report:{runtimeVerified:boolean}}>};
 CompanionTemplates:{prepare:(p:Project,config:unknown)=>Project};
}
function engine(){
 const dir=process.env.GBA_DUO_BUILDER_DIR;if(!dir)throw Error('Run npm run test:builder.');
 const context={structuredClone,Uint8Array,JSZip};const c=vm.createContext({...context,globalThis:undefined});c.globalThis=c;
 for(const name of ['pack-compiler.js','function-blocks.js','builder-core.js','project-templates.js'])vm.runInContext(fs.readFileSync(path.join(dir,'site',name),'utf8'),c,{filename:name});
 return c as unknown as BuilderAPI;
}
function fixture(){
 const api=engine(),rom=new Uint8Array(192);rom.set(new TextEncoder().encode('TEST'),0xac);
 const p=createProject('blank','vi'),identity=api.CompanionBuild.romIdentity(rom);p.manifest.match={gameCode:[identity.gameCode],crc32:[identity.crc32]};p.manifest.id='roundtrip-test';p.manifest.name='Thử liên thông';p.manifest.script='scripts/main.lua';p.manifest.permissions=['read-ram'];p.manifest.values={hp:{type:'u8',addr:'02000000'}};
 p.width=832;p.height=608;p.editorGrid={visible:true,snap:false,size:20};
 p.data={pilot:'Aya',portrait:'asset:test.svg',hp:12,maxHp:30,energy:0,capacity:20,active:false,power:7,powerLabel:'Phép thuật',party:[{name:'One',hp:2},{name:'Two',hp:3}],crew:[{title:'Mẫu',health:0}]};
 p.files={'scripts/main.lua':Buffer.from('local helper=require("scripts/helper")\nfunction update() return helper end -- giữ nguyên').toString('base64'),'scripts/helper.lua':Buffer.from('return {hp=12}').toString('base64'),'assets/test.svg':Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="blue"/></svg>').toString('base64'),'assets/opaque.bin':Buffer.from([0,255,128,7]).toString('base64')};
 const root=p.layout.pages![0].child;root.children=[{type:'text',id:'summary',text:'HP {hp}/{maxHp} · {pilot}'},{type:'list',id:'party',items:'$party',template:{type:'text',id:'party-row',text:'{name}: {hp}'}},{type:'image',id:'picture',src:'asset:test.svg'}];
 return {api,rom,p,root};
}
function preserved(actual:Project,source:Project){
 expect(actual.manifest.script).toBe(source.manifest.script);expect(actual.manifest.values).toEqual(source.manifest.values);expect(actual.manifest.permissions).toEqual(source.manifest.permissions);expect(actual.manifest.match).toEqual(source.manifest.match);expect(actual.data).toEqual(source.data);
 for(const [file,bytes]of Object.entries(source.files))expect(actual.files[file],file).toBe(bytes);
 expect([actual.width,actual.height]).toEqual([source.width,source.height]);expect(actual.editorGrid).toEqual(source.editorGrid);
}
it('saves Studio JSON, packages with the actual Builder, reopens and edits again without losing canvas, bindings or reader bytes',async()=>{
 const {api,rom,p}=fixture(),before=structuredClone(p),saved=JSON.parse(JSON.stringify(p,null,2));
 const built=await api.CompanionBuild.buildProject(rom,saved);expect(built.report.runtimeVerified).toBe(false);
 const reopened=await importPack(built.zipBytes);preserved(reopened,p);expect(reopened.layout).toEqual(p.layout);
 applyDataWidget(reopened,{kind:'text',parentId:'',replaceId:'summary',field:'',keepText:true,textFields:{hp:'energy',maxHp:'capacity',pilot:'pilot'}});
 applyTextParts(reopened,'summary',{original:'HP {energy}/{capacity} · {pilot}',literals:['Pin ',' trên ',' · phi công ','']});
 applyAssetEdit(reopened,{nodeId:'picture',target:'src',snapshot:assetEditSnapshot(reopened,'picture','src'),descendants:false,replaceBinding:false,source:{type:'upload',name:'test.png',bytes:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4f50BAASvAdfA0BA+AAAAAElFTkSuQmCC'}});
 applyAssetEdit(reopened,{nodeId:'summary',target:'font',snapshot:assetEditSnapshot(reopened,'summary','font'),descendants:false,replaceBinding:false,source:{type:'upload',name:'test.ttf',bytes:btoa('synthetic font packaging fixture')}});
 applyDataWidget(reopened,{kind:'list',parentId:'',replaceId:'party',field:'crew',listFields:{'party:name':'title','party:hp':'health'}});
 const second=await importPack(await(await exportPack(reopened)).arrayBuffer());preserved(second,p);
 expect(walk(second.layout).find(r=>r.node.id==='summary')?.node.text).toBe('Pin {energy} trên {capacity} · phi công {pilot}');expect(walk(second.layout).find(r=>r.node.id==='party-row')?.node.text).toBe('{title}: {health}');expect(p).toEqual(before);
 const rebuilt=await api.CompanionBuild.buildProject(rom,second),last=await importPack(rebuilt.zipBytes);preserved(last,p);
 expect(walk(last.layout).find(r=>r.node.id==='picture')?.node.src).toBe('asset:images/test.png');expect(walk(last.layout).find(r=>r.node.id==='summary')?.node.style?.['font-family']).toContain('StudioFont_');expect(last.files['assets/fonts/test.ttf']).toBe(reopened.files['assets/fonts/test.ttf']);expect(last.files['assets/images/test.png']).toBe(reopened.files['assets/images/test.png']);
});
it('reopens Builder card/table output in Studio and keeps new edits through a second Builder package',async()=>{
 const {api,rom,p}=fixture(),before=structuredClone(p);
 const configured=api.CompanionTemplates.prepare(p,{kind:'overview',title:'Phi công',card:{nameField:'pilot',portraitField:'portrait',barEnabled:true,currentField:'energy',maximumField:'capacity',barLabel:'Năng lượng'},rows:[{field:'active',label:'Sẵn sàng'},{field:'power',label:'Sức mạnh'}]});
 const result=await api.CompanionBuild.buildProject(rom,configured),reopened=await importPack(result.zipBytes);preserved(reopened,p);
 applyDataWidget(reopened,{kind:'text',parentId:'',replaceId:'builder-stats-label-1',field:'powerLabel'});
 const rebuilt=await api.CompanionBuild.buildProject(rom,JSON.parse(JSON.stringify(reopened))),last=await importPack(rebuilt.zipBytes);preserved(last,p);expect(walk(last.layout).find(r=>r.node.id==='builder-stats-label-1')?.node.text).toBe('{powerLabel}');
 const renderer=createRenderer(path=>path),dom=renderer.build(last.layout);renderer.update(last.data);expect(dom.textContent).toContain('Phép thuật');expect(dom.textContent).toContain('false');expect(dom.querySelector<HTMLElement>('.fill')?.style.width).toBe('0%');expect(p).toEqual(before);
});
it('preserves authored conditional styles and native compiled output across Studio, Builder and Studio export',async()=>{
 const {api,rom,p,root}=fixture();insertFunctionBlock(p,{kind:'stats',parentId:root.id,position:'end',title:'Chỉ số',rows:[{label:'',labelField:'powerLabel',field:'power'}]},'vi','metrics');
 const node=walk(p.layout).find(r=>r.node.id==='summary')!.node;node.style={color:'#ffffff'};node.studioStyles={self:{pressed:{color:'#ffff00'}}};
 const result=await api.CompanionBuild.buildProject(rom,JSON.parse(JSON.stringify(p))),loaded=await importPack(result.zipBytes);expect(loaded.layout).toEqual(p.layout);preserved(loaded,p);
 const again=await importPack(await(await exportPack(loaded)).arrayBuffer());expect(again.layout).toEqual(p.layout);expect(again.css).toBe(p.css);preserved(again,p);expect(()=>validate(again,true)).not.toThrow();
});
it('keeps generated canvases, Unicode labels and opaque assets stable over repeated Builder/Studio cycles',async()=>{
 let seed=0x831f;const next=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 for(let n=0;n<12;n++){
  const {api,rom,p}=fixture();p.width=64+next()%2000;p.height=64+next()%2000;p.editorGrid!.size=1+next()%128;p.data.pilot='Tên Ω '+n;
  p.files['assets/opaque.bin']=Buffer.from(Array.from({length:next()%512},()=>next()>>>24)).toString('base64');
  let current=JSON.parse(JSON.stringify(p));
  for(let round=0;round<2;round++){const built=await api.CompanionBuild.buildProject(rom,current);current=await importPack(built.zipBytes);preserved(current,p);expect(current.layout).toEqual(p.layout);current=await importPack(await(await exportPack(current)).arrayBuffer());preserved(current,p);}
 }
});
