import {it,expect} from 'vitest';
import JSZip from 'jszip';
import {safePackPath,readZipEntry,validatePreviewData} from './pack-safety.js';
import {createProject,exportPack,importPack} from './project.js';
it('rejects traversal, drive, absolute and prototype paths on export',async()=>{
  for(const path of ['../secret','/absolute','C:/drive','folder\\secret','__proto__/x']){
    expect(()=>safePackPath(path)).toThrow();
    const p=createProject();p.manifest.match={gameCode:['TEST']};p.files[path]=btoa('file');
    await expect(exportPack(p)).rejects.toThrow('path');
  }
});
it('stops ZIP inflation when actual expanded data exceeds its budget',async()=>{
  const zip=new JSZip();zip.file('large.txt','x'.repeat(100000));
  const input=await JSZip.loadAsync(await zip.generateAsync({type:'uint8array',compression:'DEFLATE'}));
  await expect(readZipEntry(input.file('large.txt')!,{used:0,fileMax:1024})).rejects.toThrow('expanded');
});
it('rejects deeply nested layout before assigning IDs',async()=>{
  const p=createProject('blank');let node=p.layout;
  for(let i=0;i<180;i++){const child={id:'node'+i,type:'column'};node.children=[child];node=child;}
  const zip=new JSZip();zip.file('manifest.json',JSON.stringify(p.manifest));zip.file('layout.json',JSON.stringify(p.layout));
  await expect(importPack(await zip.generateAsync({type:'uint8array'}))).rejects.toThrow();
});
it('bounds nested preview data before form rendering',()=>{
 const data:Record<string,unknown>={};let current=data;
 for(let i=0;i<80;i++){const next={};current.next=next;current=next;}
 expect(()=>validatePreviewData(data)).toThrow('complexity');
});
