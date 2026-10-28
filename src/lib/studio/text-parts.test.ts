import {it,expect} from 'vitest';
import {textParts,editedTextParts,applyTextParts,textPartsError,type TextPartsRequest} from './text-parts.js';
import {createProject,exportPack,importPack,walk} from './project.js';
import {interpolate,scopedValues} from '../preview/data.js';

it('edits Unicode wording while preserving repeated, indexed and UI bindings in their exact native order',()=>{
  const original='HP {hp}/{maxHp}: {hp} · {@index} {ui.page} {đội[0].tên}',parts=textParts(original);
  expect(parts.supported).toBe(true);expect(parts.tokens).toEqual(['{hp}','{maxHp}','{hp}','{@index}','{ui.page}','{đội[0].tên}']);
  expect(editedTextParts({original,literals:parts.literals})).toBe(original);
  const result=editedTextParts({original,literals:['Sinh lực ',' trên ','; còn ',' · dòng ',' · trang ',' · ','!']});
  expect(result).toBe('Sinh lực {hp} trên {maxHp}; còn {hp} · dòng {@index} · trang {ui.page} · {đội[0].tên}!');
  expect(interpolate(result,scopedValues({hp:0,maxHp:20},2,{ui:{page:'map'},đội:[{tên:'Mai'}]}))).toBe('Sinh lực 0 trên 20; còn 0 · dòng 2 · trang map · Mai!');
});

it('rejects new bindings, malformed segments and stale edits atomically',()=>{
  const original='HP {hp}';
  for(const literals of [['{new} ', ''],['Only one'],[null,''],new Array(2)])expect(()=>editedTextParts({original,literals} as TextPartsRequest)).toThrow();
  expect(()=>editedTextParts({original,literals:['x'.repeat(16384),'']})).toThrow();
  expect(textParts('static').supported).toBe(false);expect(textParts('$runtime').supported).toBe(false);expect(textParts('{x}'.repeat(33)).supported).toBe(false);expect(textParts('x'.repeat(16384)+'{x}').supported).toBe(false);
  const p=createProject('blank');p.layout.pages![0].child.children=[{id:'label',type:'text',text:'New {hp}'}];const before=JSON.stringify(p);
  try{applyTextParts(p,'label',{original,literals:['Sinh lực ','']});expect.fail('Must reject stale source');}catch(error){expect(textPartsError(error,'vi')).toContain('đã thay đổi');}expect(JSON.stringify(p)).toBe(before);
  expect(()=>applyTextParts(p,'missing',{original,literals:['','']})).toThrow();expect(JSON.stringify(p)).toBe(before);
});

it('changes only the selected text/button/bar property and retains reader, actions, style and template bytes through a ZIP',async()=>{
  const p=createProject('blank');p.manifest.match={gameCode:['TEST']};p.manifest.script='main.lua';p.files={'main.lua':btoa('function update() return {} end'),'assets/opaque.bin':btoa('\x00\xff')};p.data={hp:0,maxHp:20};
  p.layout.pages![0].child.children=[{id:'text',type:'text',text:'HP {hp}',style:{color:'#fff'},class:'metric'},{id:'button',type:'button',text:'Use {hp}',onClick:{call:'use',args:['$hp']}},{id:'bar',type:'bar',value:'$hp',maxKey:'$maxHp',label:'HP {hp}/{maxHp}',onClick:{set:{selected:'hp'}}}];
  const before=structuredClone(p),unrelated=JSON.stringify({data:p.data,manifest:p.manifest,files:p.files,css:p.css});
  for(const id of ['text','button','bar']){const node=walk(p.layout).find(r=>r.node.id===id)!.node,original=String(node.type==='bar'?node.label:node.text),parts=textParts(original);applyTextParts(p,id,{original,literals:parts.literals.map((value,i)=>i===0?'Sinh lực ':value)});}
  expect(JSON.stringify({data:p.data,manifest:p.manifest,files:p.files,css:p.css})).toBe(unrelated);
  for(const [index,node] of p.layout.pages![0].child.children.entries()){const property=node.type==='bar'?'label':'text';expect({...node,[property]:before.layout.pages![0].child.children![index][property]}).toEqual(before.layout.pages![0].child.children![index]);}
  const restored=await importPack(await(await exportPack(p)).arrayBuffer());for(const name of Object.keys(p.files))expect(restored.files[name]).toBe(p.files[name]);expect(restored.layout).toEqual(p.layout);expect(restored.data).toEqual(p.data);
});

it('preserves native token sequences and identity over deterministic generated templates and wording edits',()=>{
  let seed=0x529fa;const next=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const paths=['hp','party[0].name','ui.page','@index','đội.tên','missing','active'];
  for(let run=0;run<120;run++){
    const tokens=Array.from({length:1+next()%12},()=>'{'+paths[next()%paths.length]+'}'),original=tokens.map((token,index)=>'Chữ '+index+' '+token).join('')+' cuối',parts=textParts(original),saved=JSON.stringify(parts);
    expect(editedTextParts({original,literals:parts.literals})).toBe(original);
    const literals=parts.literals.map((_,i)=>['','Mới Ω '+i+' ','\n'][next()%3]),changed=editedTextParts({original,literals});
    expect([...changed.matchAll(/\{([^{}]+)\}/g)].map(match=>match[0])).toEqual(tokens);expect(JSON.stringify(parts)).toBe(saved);
    expect(()=>editedTextParts({original,literals:['{unwanted}'+literals[0],...literals.slice(1)]})).toThrow();
  }
});
