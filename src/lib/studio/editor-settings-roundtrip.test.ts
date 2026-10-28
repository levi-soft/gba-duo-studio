import {expect,it} from 'vitest';
import JSZip from 'jszip';
import {createProject,exportPack,importPack} from './project.js';

function fixture(){const p=createProject('blank');p.manifest.match={gameCode:['TEST']};p.width=750;p.height=1334;p.editorGrid={size:24,visible:false,snap:true};p.data={hp:0,active:false};return p;}
async function pack(){const p=fixture(),zip=await JSZip.loadAsync(await(await exportPack(p)).arrayBuffer());return {p,zip,design:JSON.parse(await zip.file('studio-design.json')!.async('string'))};}
it('stores and reopens a custom canvas and grid even with no fonts, skins or conditional styles',async()=>{
 const p=fixture(),before=structuredClone(p),zip=await exportPack(p),after=await importPack(await zip.arrayBuffer());
 expect([after.width,after.height,after.editorGrid]).toEqual([p.width,p.height,p.editorGrid]);expect(after.layout).toEqual(p.layout);expect(after.data).toEqual(p.data);expect(p).toEqual(before);
 const files=await JSZip.loadAsync(await zip.arrayBuffer()),metadata=JSON.parse(await files.file('studio-design.json')!.async('string'));expect(metadata).toMatchObject({version:1,width:750,height:1334,editorGrid:{size:24,visible:false,snap:true}});
 expect(JSON.parse(await files.file('manifest.json')!.async('string')).width).toBeUndefined();
});
it('keeps legacy defaults when metadata is absent or no longer matches runtime layout/CSS',async()=>{
 const a=await pack();a.zip.remove('studio-design.json');const legacy=await importPack(await a.zip.generateAsync({type:'uint8array'}));const defaults=createProject('blank');expect([legacy.width,legacy.height]).toEqual([defaults.width,defaults.height]);expect(legacy.editorGrid).toBeUndefined();
 const b=await pack();b.design.generatedCss+='/* stale */';b.zip.file('studio-design.json',JSON.stringify(b.design));const stale=await importPack(await b.zip.generateAsync({type:'uint8array'}));expect([stale.width,stale.height]).toEqual([defaults.width,defaults.height]);expect(stale.editorGrid).toBeUndefined();
});
it('ignores malformed optional editor settings instead of accepting unsafe sizes or blocking a runtime pack',async()=>{
 for(const settings of [{width:0,height:8193,editorGrid:{size:0,visible:true,snap:true}},{width:'750',height:1334,editorGrid:{size:24,visible:'false',snap:true}},{width:750,height:1334,editorGrid:{size:513,visible:true,snap:true}}]){
  const {zip,design}=await pack();zip.file('studio-design.json',JSON.stringify({...design,...settings}));const after=await importPack(await zip.generateAsync({type:'uint8array'}));expect(after.editorGrid).toBeUndefined();
  expect([after.width,after.height]).toEqual(typeof settings.width==='number'&&settings.width===750?[750,1334]:[1240,1080]);
 }
});
it('handles older matching metadata with layout/CSS but no canvas settings',async()=>{
 const {p,zip,design}=await pack();delete design.width;delete design.height;delete design.editorGrid;zip.file('studio-design.json',JSON.stringify(design));const after=await importPack(await zip.generateAsync({type:'uint8array'}));expect(after.layout).toEqual(p.layout);expect(after.css).toBe(p.css);expect([after.width,after.height]).toEqual([1240,1080]);
});
