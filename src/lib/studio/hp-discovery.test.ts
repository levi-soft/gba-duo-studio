import {it,expect} from 'vitest';
import {captureHp,hpCandidates,insertDiscoveredHp} from './hp-discovery.js';
import {createProject,exportPack,importPack} from './project.js';
import {readMemoryValues} from './memory-values.js';
import type {BridgeInfo,BridgeSend} from './types.js';
const base=0x02000000;
const info:BridgeInfo={gameCode:'TEST',crc32:'12345678',sessionId:'hp-session'};
function packet(values:number[]):BridgeInfo{return {...info,ranges:[{address:base,length:values.length,base64:btoa(String.fromCharCode(...values))}]};}
it('filters the same character across damage, healing and a third distinct sample',()=>{
  const first=captureHp(packet([20,1,20,2,5,0]),20);
  const second=captureHp(packet([13,1,13,2,5,0]),13,first);
  const third=captureHp(packet([18,1,13,2,5,0]),18,second);
  expect(hpCandidates(third)).toEqual([{address:base,type:'u8'}]);
  expect(third.values).toEqual([20,13,18]);expect(third.samples).toBe(3);
  expect(hpCandidates(first)).toHaveLength(2);
  expect(()=>captureHp({...packet([10,1]),sessionId:'other'},10,third)).toThrow('session');
});
it('finds 16-bit HP without asking for a number type and rejects invalid input',()=>{
  const first=captureHp(packet([44,1,1,0]),300);
  const next=captureHp(packet([24,1,1,0]),280,first);
  expect(hpCandidates(next)).toEqual([{address:base,type:'u16'}]);
  expect(()=>captureHp(packet([0,0]),-1)).toThrow('HP');
  expect(()=>captureHp(packet([0,0]),2.5)).toThrow('HP');
});
it('exports a discovered HP bar with a constant maximum and live RAM source, without captures',async()=>{
  const project=createProject('blank');project.data={};const parent=project.layout.pages![0].child;
  const id=insertDiscoveredHp(project,parent.id,info,{address:base,type:'u8'},13,20,'Character A');
  const pack=await importPack(await (await exportPack(project)).arrayBuffer());
  expect(pack.layout.pages![0].child.children!.find(n=>n.id===id)).toMatchObject({value:'$hp',max:20,label:'{hp} / 20'});
  expect(pack.layout.pages![0].child.children!.find(n=>n.id===id)?.maxKey).toBeUndefined();
  expect(pack.manifest.studioFieldInfo?.hp).toMatchObject({scope:'fixed-unit',subject:'Character A',verified:false});
  expect(pack.manifest.script).toBeUndefined();expect(Object.keys(pack.files).sort()).toEqual(['layout.json','manifest.json','preview-data.json','style.css']);
  const send:BridgeSend=async(command,params)=>command==='info'?info:{...info,ranges:params!.ranges.map(range=>({...range,base64:btoa(String.fromCharCode(9))}))};
  expect((await readMemoryValues(pack.manifest,send)).values.hp).toBe(9);
  insertDiscoveredHp(project,parent.id,info,{address:base+1,type:'u8'},8,20,'Character B');
  expect(project.manifest.values?.hp2).toMatchObject({addr:'0x2000001'});
});
it('preserves projects when bounds or custom-script constraints reject an HP bar',()=>{
  const p=createProject('blank');const parent=p.layout.pages![0].child;
  const original=JSON.stringify(p);
  expect(()=>insertDiscoveredHp(p,parent.id,info,{address:base,type:'u8'},21,20,'')).toThrow('Maximum');
  expect(JSON.stringify(p)).toBe(original);
  p.manifest.script='scripts/custom.lua';const custom=JSON.stringify(p);
  expect(()=>insertDiscoveredHp(p,parent.id,info,{address:base,type:'u8'},13,20,'')).toThrow('custom script');
  expect(JSON.stringify(p)).toBe(custom);
});
