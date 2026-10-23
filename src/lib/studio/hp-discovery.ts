import {startScan,refineScan,scanSamples,scanIdentity,registerMemoryBlock} from './memory-scan.js';
import {widget,walk} from './project.js';
import type {BridgeInfo,MemoryType,Project} from './types.js';
export type HpCandidate={address:number;type:MemoryType};
export type HpDiscovery={scans:ReturnType<typeof startScan>[];samples:number;values:number[];identity:string};
export function hpNumber(value:number){
  if(!Number.isInteger(value)||value<0||value>65535)throw Error('HP must be a whole number from 0 to 65535.');
  return value;
}
export function captureHp(packet:BridgeInfo,value:number,previous?:HpDiscovery):HpDiscovery{
  hpNumber(value);const identity=scanIdentity(packet),ranges=scanSamples(packet,'all');
  const scans=previous?previous.scans.map(scan=>refineScan(scan,ranges,identity,'equal',value)):
    (['u8','u16'] as const).map(type=>startScan(ranges,type,identity,value));
  return {scans,samples:(previous?.samples??0)+1,values:[...new Set([...(previous?.values??[]),value])],identity};
}
export function hpCandidates(discovery:HpDiscovery):HpCandidate[]{
  return discovery.scans.flatMap(scan=>scan.candidates.map(address=>({address,type:scan.type})));
}
export function insertDiscoveredHp(project:Project,parentId:string,info:BridgeInfo,candidate:HpCandidate,current:number,maximum:number,subject:string){
  hpNumber(current);hpNumber(maximum);if(maximum<1||current>maximum)throw Error('Maximum HP must be positive and at least current HP.');
  const parent=walk(project.layout).find(ref=>ref.node.id===parentId)?.node;
  if(!parent||!['row','column','box'].includes(parent.type))throw Error('Select a container in Scene first.');
  if(!['u8','u16'].includes(candidate.type))throw Error('Unsupported HP type.');
  let key='hp',suffix=2;
  while(Object.hasOwn(project.data,key)||Object.hasOwn(project.manifest.values??{},key)||Object.hasOwn(project.manifest.studioGraphics??{},key)||Object.hasOwn(project.manifest.studioComputed??{},key))key='hp'+suffix++;
  registerMemoryBlock(project,info,key,candidate.address,candidate.type,current);
  project.manifest.studioFieldInfo={...project.manifest.studioFieldInfo,[key]:{semantic:'hp.current',scope:'fixed-unit',subject:subject.trim()||'Character',verified:false,description:'Direct RAM address found through value filtering; verify after loading and changing scenes.'}};
  const bar=widget('bar');bar.value='$'+key;delete bar.maxKey;bar.max=maximum;bar.label='{'+key+'} / '+maximum;
  parent.children??=[];parent.children.push(bar);return bar.id;
}
