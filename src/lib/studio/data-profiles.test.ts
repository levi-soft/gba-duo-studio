import {it,expect} from 'vitest';
import {parseDataProfile,applyDataProfile} from './data-profiles.js';
import {createProject} from './project.js';
const source={profileVersion:1,name:'Test profile',match:{gameCode:['TEST'],crc32:['12345678']},values:{health:{addr:'0x02000012',type:'u8'},limit:{ptr:'0x03000000',offset:18,type:'u8'}}};
it('imports reusable direct/pointer blocks without scripts, assets or captures',()=>{
  const p=createProject('blank');
  const profile=parseDataProfile(JSON.stringify({...source,files:{'art.png':'not imported'},capture:'not imported',script:'not imported'}));
  applyDataProfile(p,profile);
  expect(p.manifest.match).toEqual(source.match);
  expect(p.manifest.values).toEqual(source.values);
  expect(p.data.health).toBe(0);expect(p.files).toEqual({});expect(p.manifest.script).toBeUndefined();
  expect(profile).not.toHaveProperty('files');expect(profile).not.toHaveProperty('capture');
  expect(()=>applyDataProfile(p,profile)).toThrow('already exists');
});
it('rejects unsafe addresses, unsupported versions and mismatching ROM filters',()=>{
  expect(()=>parseDataProfile(JSON.stringify({...source,profileVersion:2}))).toThrow();
  expect(()=>parseDataProfile(JSON.stringify({...source,values:{bad:{addr:'0x08000000',type:'u8'}}}))).toThrow('RAM');
  expect(()=>parseDataProfile(JSON.stringify({...source,match:{gameCode:['bad']}}))).toThrow('codes');
  const p=createProject('blank');p.manifest.match={gameCode:['OTHR']};
  expect(()=>applyDataProfile(p,parseDataProfile(JSON.stringify(source)))).toThrow('game');
  expect(p.manifest.values).toEqual({});
});
