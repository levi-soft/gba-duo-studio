import {describe,it,expect} from 'vitest';
import {appendEvidence,parseEvidence,validateEvidence,replayBytes,evidenceRange} from './ram-evidence.js';
const packet=(bytes=new Uint8Array([0,127,128,255]),address=0x02000000)=>({gameCode:'TEST',crc32:'1234ABCD',sessionId:'session',packId:'test-pack',frame:10,deviceSerial:'private',ranges:[{address,length:bytes.length,base64:btoa(String.fromCharCode(...bytes))}]});
describe('portable RAM evidence',()=>{
  it('exports bounded snapshots, strips unrelated metadata, and roundtrips bytes',()=>{
    const doc=appendEvidence(null,packet(),'Map','2026-10-27T00:00:00Z');
    const round=parseEvidence(JSON.stringify(doc));
    expect(round).toEqual(doc);expect(round.samples[0].packet).not.toHaveProperty('deviceSerial');
    expect([...replayBytes(round.samples[0],0x02000001,3)]).toEqual([127,128,255]);
    const bytes=replayBytes(round.samples[0],0x02000000,4);bytes[0]=99;
    expect(replayBytes(round.samples[0],0x02000000,1)[0]).toBe(0);
  });
  it('rejects ROM/session/pack changes without mutating the last valid set',()=>{
    const doc=appendEvidence(null,packet(),'Map');const before=JSON.stringify(doc);
    for(const change of [{gameCode:'NEXT'},{crc32:'00000000'},{sessionId:'next'},{packId:'next'}])expect(()=>appendEvidence(doc,{...packet(),...change},'Next')).toThrow('changed');
    expect(JSON.stringify(doc)).toBe(before);
    const ambiguous=appendEvidence(null,{...packet(),sessionId:'a/b',packId:'c'},'First');
    expect(()=>appendEvidence(ambiguous,{...packet(),sessionId:'a',packId:'b/c'},'Next')).toThrow('changed');
  });
  it('rejects malformed, overlapping, oversized and out-of-range captures',()=>{
    const p=packet();
    for(const ranges of [[{...p.ranges[0],length:3}], [{...p.ranges[0],base64:'AB=='}], [{...p.ranges[0],address:0x08000000}], [p.ranges[0],p.ranges[0]]])expect(()=>appendEvidence(null,{...p,ranges},'Map')).toThrow();
    expect(()=>parseEvidence(' '.repeat(8*1024*1024+1))).toThrow('large');
    const doc=appendEvidence(null,p,'Map');expect(()=>replayBytes(doc.samples[0],0x02000003,2)).toThrow('outside');
    expect(()=>validateEvidence({...doc,version:2})).toThrow();
    expect(()=>validateEvidence({...doc,samples:Array(17).fill(doc.samples[0])})).toThrow();
  });
  it('seeded properties preserve arbitrary RAM bytes and reject any crossing of a region boundary',()=>{
    let state=0x71b2c3d4;const next=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0;};
    for(let run=0;run<250;run++){
      const start=run%2?0x03000000:0x02000000,size=run%2?0x8000:0x40000,length=1+next()%1024;
      const offset=next()%(size-length+1),bytes=Uint8Array.from({length},()=>next()&255),p=packet(bytes,start+offset);
      const doc=parseEvidence(JSON.stringify(appendEvidence(null,p,'Generated')));
      expect(replayBytes(doc.samples[0],start+offset,length)).toEqual(bytes);
      expect(()=>evidenceRange({...p.ranges[0],address:start+size-length+1})).toThrow('outside');
    }
  });
});
