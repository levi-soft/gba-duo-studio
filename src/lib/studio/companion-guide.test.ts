import {it,expect} from 'vitest';
import {createProject,exportPack,importPack,walk} from './project.js';
import {guideParts,guideStatus,applyGuideText,applyGuideColor} from './companion-guide.js';
import {computedScriptPath} from './computed-values.js';

it('finds existing static labels while keeping bound text out of simple text edits',()=>{
  const p=createProject('rpg','vi'),before=JSON.stringify(p);
  const labels=guideParts(p);expect(labels.some(part=>part.editable)).toBe(true);
  const bound=labels.find(part=>part.dynamic)!;expect(bound.editable).toBe(false);
  expect(()=>applyGuideText(p,bound.id,'replace binding')).toThrow('binding');
  const label=labels.find(part=>part.editable)!;expect(guideParts(p,label.text.toLocaleUpperCase()).map(part=>part.id)).toContain(label.id);
  expect(JSON.stringify(p)).toBe(before);
  applyGuideText(p,label.id,'');expect(guideParts(p).find(part=>part.id===label.id)?.editable).toBe(true);
  applyGuideText(p,label.id,'Túi đồ của tôi');expect(guideParts(p,'Túi đồ').some(part=>part.id===label.id)).toBe(true);
});
it('roundtrips a simple edit without changing Lua, native values, opaque assets or bindings',async()=>{
  const p=createProject('rpg','vi');p.manifest.match={gameCode:['TEST'],crc32:['12345678']};p.manifest.script='scripts/main.lua';
  p.manifest.values={hp:{type:'u8',addr:'02000000'}};p.manifest.customAdapter={mode:'normal'};
  p.files={'scripts/main.lua':btoa('local h=require("scripts/helper")\nfunction update() return {hp=h.hp} end'),'scripts/helper.lua':btoa('return {hp=7}'),'assets/opaque.bin':btoa('\x00\xff\x80')};
  const source=await importPack(await (await exportPack(p)).arrayBuffer());
  const bound=walk(source.layout).filter(({node})=>typeof node.text==='string'&&node.text.includes('{')).map(({node})=>node.text);
  const chosen=guideParts(source).find(part=>part.editable)!;
  applyGuideText(source,chosen.id,'Nội dung mới');applyGuideColor(source,chosen.id,'color','#abcdef');
  const result=await importPack(await (await exportPack(source)).arrayBuffer());
  // Managed layout/CSS files change as intended; reader and opaque files do not.
  for(const name of Object.keys(p.files))expect(result.files[name],name).toBe(source.files[name]);
  expect(result.manifest.values).toEqual(p.manifest.values);expect(result.manifest.customAdapter).toEqual(p.manifest.customAdapter);expect(result.manifest.script).toBe(p.manifest.script);
  expect(walk(result.layout).filter(({node})=>typeof node.text==='string'&&node.text.includes('{')).map(({node})=>node.text)).toEqual(bound);
  expect(walk(result.layout).find(({node})=>node.id===chosen.id)?.node.text).toBe('Nội dung mới');
});
it('reports missing readers honestly and limits simple color changes',()=>{
  const p=createProject();expect(guideStatus(p).hasReader).toBe(false);
  p.manifest.script='missing.lua';expect(guideStatus(p).missingScript).toBe(true);
  p.files['missing.lua']=btoa('function update() return {} end');expect(guideStatus(p)).toMatchObject({missingScript:false,hasReader:true,luaFiles:1});
  const part=guideParts(p)[0];expect(()=>applyGuideColor(p,part.id,'width','#ffffff')).toThrow();expect(()=>applyGuideColor(p,part.id,'color','url(bad)')).toThrow();
  applyGuideColor(p,part.id,'background','#000000');expect(walk(p.layout).find(r=>r.node.id===part.id)?.node.style?.background).toBe('#000000');
});
it('accepts a Studio-generated entry without marking its pending generated file as missing',()=>{
  const p=createProject('blank');p.manifest.script=computedScriptPath;p.manifest.studioComputed={energy:3};expect(guideStatus(p)).toMatchObject({missingScript:false,hasReader:true,hasScript:false});
  p.manifest.studioComputed=undefined;p.manifest.studioPulse={periodMs:100,bindings:{pulse:'energy'}};expect(guideStatus(p)).toMatchObject({missingScript:false,hasReader:true});
  p.manifest.script='custom.lua';expect(guideStatus(p)).toMatchObject({missingScript:true,hasReader:false});
});
