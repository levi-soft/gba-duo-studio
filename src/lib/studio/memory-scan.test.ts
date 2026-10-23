import {describe,it,expect} from 'vitest';
import {scanIdentity,scanSamples,startScan,refineScan,registerMemoryBlock} from './memory-scan.js';
import {insertBoundBar} from './data-blocks.js';
import {createProject,exportPack,importPack} from './project.js';
import {readMemoryValues} from './memory-values.js';
import type {BridgeInfo,BridgeSend} from './types.js';

const base=0x02000000;
const info:BridgeInfo={gameCode:'TEST',crc32:'12345678',sessionId:'session-a'};
const sample=(bytes:number[])=>[{address:base,bytes:new Uint8Array(bytes)}];
const encoded=(bytes:number[])=>({address:base,length:bytes.length,base64:btoa(String.fromCharCode(...bytes))});
describe('read-only RAM discovery',()=>{
  it('narrows unknown values through multiple snapshots without widening old candidates',()=>{
    const id=scanIdentity(info),first=startScan(sample([20,20,0,40]),'u8',id);
    const second=refineScan(first,sample([18,20,1,40]),id,'decreased');
    expect(second.candidates).toEqual([base]);
    expect(refineScan(second,sample([18,19,1,40]),id,'unchanged').candidates).toEqual([base]);
    expect(first.candidates).toHaveLength(4);
  });
  it('handles zero, signed values, aligned little-endian words and truncated ranges',()=>{
    expect(startScan(sample([0,255]),'u8','x',0).candidates).toEqual([base]);
    expect(startScan(sample([0,255]),'s8','x',-1).candidates).toEqual([base+1]);
    expect(startScan(sample([0,1,255]),'u16','x',256).candidates).toEqual([base]);
  });
  it('rejects session changes and incomplete/overlapping snapshots',()=>{
    const scan=startScan(sample([1,2]),'u8','old');
    expect(()=>refineScan(scan,sample([1,2]),'new','equal',1)).toThrow('session');
    expect(()=>refineScan(scan,sample([1]),'old','changed')).toThrow('cover');
    expect(()=>scanSamples({...info,ranges:[encoded([1,2]),encoded([3,4])]},'all')).toThrow('Overlapping');
    expect(()=>refineScan(scan,sample([1,2]),'old','equal')).toThrow('numeric');
  });
});
it('exports a no-code progress bar with matching live RAM fields and no embedded capture or game art',async()=>{
  const project=createProject('blank');project.data={};
  registerMemoryBlock(project,info,'health',base,'u8',12);
  registerMemoryBlock(project,info,'healthLimit',base+1,'u8',20);
  const parent=project.layout.pages![0].child;
  insertBoundBar(project,parent.id,'health','healthLimit');
  const roundtrip=await importPack(await (await exportPack(project)).arrayBuffer());
  expect(roundtrip.manifest.match).toEqual({gameCode:['TEST'],crc32:['12345678']});
  expect(roundtrip.manifest.script).toBeUndefined(); // Native manifest reads are sufficient.
  expect(Object.keys(roundtrip.files).filter(k=>/\.(bin|png|gba)$/.test(k))).toEqual([]);
  const bar=roundtrip.layout.pages![0].child.children![0];
  expect(bar).toMatchObject({type:'bar',value:'$health',maxKey:'$healthLimit',label:'{health} / {healthLimit}'});
  const send:BridgeSend=async(command,params)=>command==='info'?info:{...info,ranges:params!.ranges.map(r=>({...r,base64:btoa(String.fromCharCode(r.address===base?9:20))}))};
  expect((await readMemoryValues(roundtrip.manifest,send)).values).toEqual({health:9,healthLimit:20});
});
it('preserves custom scripts and refuses duplicate keys or a different game',()=>{
  const p=createProject('blank');registerMemoryBlock(p,info,'health',base,'u8',12);
  expect(()=>registerMemoryBlock(p,info,'health',base+1,'u8',20)).toThrow('already');
  expect(()=>registerMemoryBlock(p,{...info,crc32:'87654321'},'limit',base+1,'u8',20)).toThrow('CRC32');
  expect(()=>insertBoundBar(p,p.layout.id,'health','limit')).toThrow('Choose');
  p.manifest.script='custom.lua';
  expect(()=>registerMemoryBlock(p,info,'limit',base+1,'u8',20)).toThrow('custom script');
});
