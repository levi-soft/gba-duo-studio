import {expect,it} from 'vitest';
import {characterCard,statsTable} from './function-blocks.js';
import {makeBlockPreset,parseBlockPresets,serializeBlockPresets,mergeBlockPresets,loadBlockPresets,saveBlockPresets,blockPresetRequest,selectedBlockConfig,BLOCK_PRESETS_KEY,type BlockPresets} from './block-presets.js';
import {createProject,walk} from './project.js';
import {insertFunctionBlock} from './function-block-authoring.js';
import examples from '../../../docs/block-presets.example.json';
const library=(...presets:ReturnType<typeof makeBlockPreset>[]):BlockPresets=>({formatVersion:1,presets});
const stat=()=>makeBlockPreset({kind:'stats',title:'Tài nguyên',rows:[{label:'',labelField:'energyName',field:'energy'}]},'energy','Năng lượng');
it('ships a valid importable example library and inserts its status card into the starter project',()=>{
 const saved=parseBlockPresets(JSON.stringify(examples)),p=createProject('blank');expect(saved.presets).toHaveLength(2);
 const request=blockPresetRequest(saved.presets[0],p.layout.pages![0].child.id,'end');insertFunctionBlock(p,request,'vi','example-status');
 expect(walk(p.layout).find(r=>r.node.id==='example-status-name')?.node.text).toBe('{character}');
});

it('captures constructor settings from selected descendants without copying styles, assets, data or reader code',()=>{
 const p=createProject('blank');p.data={pilot:'Aya',rank:2,energy:0,capacity:20,avatar:'asset:pilot.png'};p.files={'main.lua':btoa('reader code'),'assets/pilot.png':btoa('image bytes')};
 const parent=p.layout.pages![0].child;
 parent.children=[characterCard({id:'card',title:'Phi công',nameField:'pilot',levelField:'rank',levelLabel:'Hạng',portrait:'asset:pilot.png',currentHpField:'energy',maximumHpField:'capacity',hpLabel:'Năng lượng'})];
 parent.children[0].style!.background='red';const before=JSON.stringify(p);
 const config=selectedBlockConfig(p,'card-name')!;expect(config).toMatchObject({kind:'character',nameField:'pilot',levelLabel:'Hạng',portraitMode:'asset',portraitAsset:'assets/pilot.png',barLabel:'Năng lượng'});
 const saved=makeBlockPreset(config,'saved','Phi công của tôi');const encoded=serializeBlockPresets(library(saved));
 expect(encoded).not.toContain('reader code');expect(encoded).not.toContain('image bytes');expect(encoded).not.toContain('background');expect(encoded).not.toContain('Aya');
 expect(blockPresetRequest(saved,'new-parent','start')).toMatchObject({parentId:'new-parent',position:'start'});expect(JSON.stringify(p)).toBe(before);
 parent.children[0].children!.push({id:'extra',type:'text',text:'Extra'});expect(selectedBlockConfig(p,'card')).toBeNull();
 expect(selectedBlockConfig(p,'unknown')).toBeNull();
});

it('roundtrips seeded stat configurations and recovers label bindings and order from native nodes',()=>{
 let seed=0x4ab124;const next=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 for(let run=0;run<60;run++){
  const rows=Array.from({length:1+next()%24},(_,i)=>({label:'Chỉ số '+i,field:'metric_'+i,...(next()%2?{labelField:'label_'+i}:{})}));
  const preset=makeBlockPreset({kind:'stats',title:'Bảng '+run,rows},'preset_'+run,'Mẫu '+run),l=library(preset);
  expect(parseBlockPresets(serializeBlockPresets(l))).toEqual(l);
  const p=createProject('blank'),node=statsTable({id:'stats',title:preset.config.title,rows:preset.config.rows!});p.layout.pages![0].child.children=[node];
  const capture=selectedBlockConfig(p,'stats-value-0')!;
  expect(capture).toEqual(preset.config);expect(walk(node).filter(r=>r.node.id.includes('-value-')).map(r=>r.node.text)).toEqual(rows.map(r=>'{'+r.field+'}'));
 }
});

it('merges libraries idempotently while rejecting conflicting IDs, names, unsafe bindings and bounds',()=>{
 const a=library(stat()),before=JSON.stringify(a);expect(mergeBlockPresets(a,a)).toEqual(a);expect(JSON.stringify(a)).toBe(before);
 expect(()=>mergeBlockPresets(a,library(makeBlockPreset({kind:'stats',title:'Changed',rows:[{label:'X',field:'x'}]},'energy','Other')))).toThrow('already exists');
 expect(()=>mergeBlockPresets(a,library(makeBlockPreset(stat().config,'another','NĂNG LƯỢNG')))).toThrow('already exists');
 for(const change of [{formatVersion:2,presets:[]},{formatVersion:1,presets:Array.from({length:51},()=>stat())},{formatVersion:1,presets:[{...stat(),name:''}]},{formatVersion:1,presets:[{...stat(),config:{kind:'stats',rows:[{labelField:'constructor',field:'energy'}]}}]}])expect(()=>parseBlockPresets(JSON.stringify(change))).toThrow();
 expect(()=>parseBlockPresets(' '.repeat(512*1024+1))).toThrow('too large');
 const extra=JSON.parse(JSON.stringify({...a,presets:[{...stat(),files:{'main.lua':'secret'},config:{...stat().config,data:{secret:true}}}]}));
 expect(parseBlockPresets(JSON.stringify(extra))).toEqual(a);
});

it('keeps corrupt or quota-blocked storage intact and uses a separate bounded key',()=>{
 const items=new Map<string,string>([['project','keep']]),storage={getItem:(key:string)=>items.get(key)??null,setItem:(key:string,value:string)=>{items.set(key,value);}};
 saveBlockPresets(library(stat()),storage);expect(loadBlockPresets(storage)).toEqual(library(stat()));expect(items.get('project')).toBe('keep');
 items.set(BLOCK_PRESETS_KEY,'{broken');expect(()=>loadBlockPresets(storage)).toThrow();expect(items.get(BLOCK_PRESETS_KEY)).toBe('{broken');
 expect(()=>saveBlockPresets(library(stat()),{setItem:()=>{throw Error('Quota exceeded');}})).toThrow('could not save');expect(items.get(BLOCK_PRESETS_KEY)).toBe('{broken');
});

it('requires rebinding when a saved configuration is inserted into a different project',()=>{
 const p=createProject('blank');p.data={fuel:8};const before=JSON.stringify(p);
 const request=blockPresetRequest(stat(),p.layout.pages![0].child.id,'end');
 expect(()=>insertFunctionBlock(p,request,'vi','reused')).toThrow('scalar');expect(JSON.stringify(p)).toBe(before);
 request.rows=[{label:'Nhiên liệu',field:'fuel'}];insertFunctionBlock(p,request,'vi','reused');expect(walk(p.layout).find(r=>r.node.id==='reused-value-0')?.node.text).toBe('{fuel}');
});
