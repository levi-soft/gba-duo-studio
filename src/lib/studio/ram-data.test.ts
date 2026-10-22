import {it,expect} from 'vitest';
import {decodeRamRange,firstRamValues,asciiByte,ramText,ramPageAddress} from './ram-data.js';

it('validates raw dump length and decodes GBA little-endian values',()=>{
  const result=decodeRamRange({address:0x02000000,length:4,base64:'AQIDBA=='});
  expect(firstRamValues(result.bytes)).toEqual({u8:1,u16:513,u32:67305985});
  expect(()=>decodeRamRange({address:0x02000000,length:5,base64:'AQIDBA=='})).toThrow();
  expect(()=>decodeRamRange({address:0x0203FFFF,length:4,base64:'AQIDBA=='})).toThrow();
  expect(()=>decodeRamRange({address:0x04000000,length:4,base64:'AQIDBA=='})).toThrow();
  expect(firstRamValues(new Uint8Array([1]))).toEqual({u8:1,u16:null,u32:null});
});

it('shows printable ASCII and decodes selected Unicode without pretending binary is dialogue',()=>{
  expect([0,31,32,65,126,127,255].map(asciiByte).join('')).toBe('.. A~..');
  expect(ramText(new Uint8Array([65,66,0,255]))).toBe('AB..');
  expect(ramText(new TextEncoder().encode('Tiếng Việt'),'utf-8')).toBe('Tiếng Việt');
  expect(ramText(new Uint8Array([65,0,66,0,0,0]),'utf-16le')).toBe('AB·');
});

it('pages within RAM boundaries and does not cross into unmapped memory',()=>{
  expect(ramPageAddress(0x02000000,256,1)).toBe(0x02000100);
  expect(ramPageAddress(0x02000000,256,-1)).toBeNull();
  expect(ramPageAddress(0x0203FF00,256,1)).toBeNull();
  expect(ramPageAddress(0x03000010,256,-1)).toBe(0x03000000);
  expect(ramPageAddress(0x03007FF0,256,1)).toBeNull();
});
