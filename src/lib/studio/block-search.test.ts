import {it,expect} from 'vitest';
import {findDataBlocks,requireBlockSuggestion} from './block-search.js';
import {parseDataProfile,applyDataProfile,reconcileFieldInfo} from './data-profiles.js';
import {createProject,exportPack,importPack} from './project.js';
import type {Manifest} from './types.js';
const manifest=():Manifest=>({id:'test',name:'Test',version:'1',values:{hp:{addr:'0x02000012',type:'u8'},maxHp:{addr:'0x02000013',type:'u8'}},studioProfileName:'Known profile',studioFieldInfo:{
  hp:{semantic:'hp.current',scope:'fixed-unit',subject:'Unit A',verified:true,aliases:['sinh lực']},
  maxHp:{semantic:'hp.maximum',scope:'fixed-unit',subject:'Unit A',verified:true},
}});
it('understands Vietnamese with/without accents, English and profile aliases without altering addresses',()=>{
  const m=manifest(),before=JSON.stringify(m);
  for(const text of ['tìm HP của Unit','TÌM MÁU CỦA NHÂN VẬT','tim mau cua nhan vat','find unit health','Find hit points','tìm sinh lực']){
    const result=findDataBlocks(m,text);
    expect(result.intent).toBe('hp');expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({current:'hp',maximum:'maxHp',compatible:true,scope:'fixed-unit'});
  }
  expect(JSON.stringify(m)).toBe(before);
});
it('never substitutes a fixed unit for a selected-unit request',()=>{
  const m=manifest();
  for(const query of ['tìm HP của unit đang chọn','máu của nhân vật được chọn','HP đơn vị hiện tại','find selected unit HP','HP under the cursor']){
    expect(findDataBlocks(m,query).selectedOnly).toBe(true);
    expect(findDataBlocks(m,query).results[0].compatible).toBe(false);
    expect(()=>requireBlockSuggestion(m,query,'hp','maxHp')).toThrow('matching');
  }
  for(const meta of Object.values(m.studioFieldInfo!))meta.scope='selected-unit';
  expect(findDataBlocks(m,'HP unit đang chọn').results[0].compatible).toBe(true);
  m.studioFieldInfo!.maxHp.verified=false;
  expect(findDataBlocks(m,'HP unit đang chọn').results[0].compatible).toBe(false);
});
it('requires matching subjects and unambiguous pairs, and does not invent fields for unknown requests',()=>{
  const m=manifest();m.studioFieldInfo!.maxHp.subject='Unit B';
  expect(findDataBlocks(m,'find HP').results).toEqual([]);
  m.studioFieldInfo!.maxHp.subject='Unit A';
  m.values!.otherHp={addr:'0x02000014',type:'u8'};m.studioFieldInfo!.otherHp={...m.studioFieldInfo!.hp};
  expect(findDataBlocks(m,'find HP').results).toEqual([]);
  expect(findDataBlocks(m,'find inventory gold').intent).toBe('unknown');
  expect(findDataBlocks({...m,values:{}},'find HP').results).toEqual([]);
});
it('labels legacy name-only fields as unspecified and refuses stale suggestions',()=>{
  const m=manifest();delete m.studioFieldInfo;
  expect(findDataBlocks(m,'find HP').results[0]).toMatchObject({scope:'unknown',verified:false,explicit:false});
  expect(findDataBlocks(m,'selected unit HP').results[0].compatible).toBe(false);
  delete m.values!.maxHp;
  expect(()=>requireBlockSuggestion(m,'HP','hp','maxHp')).toThrow();
});
it('preserves searchable metadata through profile import, pack export and reimport',async()=>{
  const m=manifest(),p=createProject('blank');
  const profile=parseDataProfile(JSON.stringify({profileVersion:1,name:m.studioProfileName,match:{gameCode:['TEST']},values:m.values,fieldInfo:m.studioFieldInfo}));
  applyDataProfile(p,profile);
  const result=await importPack(await (await exportPack(p)).arrayBuffer());
  expect(findDataBlocks(result.manifest,'tìm HP').results[0]).toMatchObject({subject:'Unit A',scope:'fixed-unit',verified:true});
  expect(result.manifest.studioProfileName).toBe('Known profile');
  expect(result.manifest.script).toBeUndefined();
});
it('rejects malformed or orphan metadata without importing scripts or arbitrary properties',()=>{
  const m=manifest(),base={profileVersion:1,name:'Test',match:{gameCode:['TEST']},values:m.values};
  expect(()=>parseDataProfile(JSON.stringify({...base,fieldInfo:{missing:m.studioFieldInfo!.hp}}))).toThrow('matching');
  expect(()=>parseDataProfile(JSON.stringify({...base,fieldInfo:{hp:{...m.studioFieldInfo!.hp,verified:'yes'}}}))).toThrow('verification');
  expect(()=>parseDataProfile(JSON.stringify({...base,fieldInfo:{hp:{...m.studioFieldInfo!.hp,scope:'invented'}}}))).toThrow('scope');
  const profile=parseDataProfile(JSON.stringify({...base,fieldInfo:{hp:{...m.studioFieldInfo!.hp,script:'do not import'}}}));
  expect(profile.fieldInfo.hp).not.toHaveProperty('script');
});
it('invalidates verification when an address changes and removes metadata for deleted fields',()=>{
  const m=manifest(),next={hp:{addr:'0x02000020',type:'u8' as const}};
  const meta=reconcileFieldInfo(m.values!,next,m.studioFieldInfo);
  expect(meta.hp.verified).toBe(false);expect(meta).not.toHaveProperty('maxHp');
  expect(reconcileFieldInfo(m.values!,m.values!,m.studioFieldInfo).hp.verified).toBe(true);
});
