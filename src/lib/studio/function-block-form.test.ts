import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {mount,unmount,tick,flushSync} from 'svelte';
import FunctionBlockLibrary from './FunctionBlockLibrary.svelte';
import {locale} from './i18n.js';
import {createProject,exportPack,importPack,walk} from './project.js';
import {insertFunctionBlock,type FunctionBlockRequest} from './function-block-authoring.js';
import {BLOCK_PRESETS_KEY,makeBlockPreset,serializeBlockPresets,parseBlockPresets} from './block-presets.js';

let component:ReturnType<typeof mount>|undefined;
beforeEach(()=>{
 // jsdom has no CSS.escape. This fixture only generates plain identifier IDs.
 vi.stubGlobal('CSS',{escape:(value:string)=>{expect(value).toMatch(/^[A-Za-z][A-Za-z0-9_-]*$/);return value;}});
 const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}});
});
afterEach(async()=>{if(component)await unmount(component);component=undefined;locale.set('en');vi.unstubAllGlobals();document.body.replaceChildren();});
function control<T extends HTMLInputElement|HTMLSelectElement>(label:string):T{
 const owner=[...document.querySelectorAll('label')].find(el=>el.firstChild?.textContent?.trim()===label);
 const input=owner?.querySelector('input,select');expect(input,'Control '+label).toBeTruthy();return input as T;
}
async function change(label:string,value:string){const input=control(label);input.value=value;input.dispatchEvent(new Event(input instanceof HTMLSelectElement?'change':'input',{bubbles:true}));flushSync();await tick();}
function button(text:string){const result=[...document.querySelectorAll('button')].find(el=>el.textContent?.trim()===text);expect(result,'Button '+text).toBeTruthy();return result!;}

it('authors and exports a data-driven label through the real Vietnamese form without game-specific data',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({json:async()=>({css:''})})));
 const p=createProject('blank');p.manifest.match={gameCode:['TEST']};p.data={pilot:'Aya',energyName:'Pin',energy:0,capacity:20};
 p.manifest.studioDataFields={energy:{labelVi:'Năng lượng',kind:'number'},energyName:{labelVi:'Loại năng lượng',kind:'string'}};
 p.manifest.script='main.lua';p.files['main.lua']=btoa('function update() return {energy=0,capacity=20,energyName="Battery"} end');
 const parent=p.layout.pages![0].child.id;const before=JSON.stringify({files:p.files,data:p.data,manifest:p.manifest});
 let request:FunctionBlockRequest|undefined,closed=false;
 locale.set('vi');component=mount(FunctionBlockLibrary,{target:document.body,props:{project:p,targetId:parent,sourceDirty:false,onapply:(r:FunctionBlockRequest)=>{request=r;insertFunctionBlock(p,r,'vi','form-stats');return '';},onclose:()=>{closed=true;}}});
 flushSync();await tick();
 await change('Loại khối','stats');await change('Trường dữ liệu 1','energy');
 await change('Nguồn nhãn 1','field');expect(button('Chèn khối chức năng').disabled).toBe(true);
 await change('Trường dữ liệu nhãn 1','energyName');expect(button('Chèn khối chức năng').disabled).toBe(false);
 button('Thêm dòng chỉ số').click();flushSync();await tick();
 await change('Trường dữ liệu 2','capacity');await change('Nhãn dòng 2','Tối đa');
 document.querySelector<HTMLButtonElement>('[aria-label="Đưa dòng lên 2"]')!.click();flushSync();await tick();
 button('Chèn khối chức năng').click();flushSync();await tick();
 expect(closed).toBe(true);expect(request?.rows).toEqual([{field:'capacity',label:'Tối đa'},{field:'energy',label:'Năng lượng',labelField:'energyName'}]);
 expect(JSON.stringify({files:p.files,data:p.data,manifest:p.manifest})).toBe(before);
 const exported=await importPack(await(await exportPack(p)).arrayBuffer());
 expect(walk(exported.layout).find(r=>r.node.id==='form-stats-label-0')?.node.text).toBe('Tối đa');
 expect(walk(exported.layout).find(r=>r.node.id==='form-stats-label-1')?.node.text).toBe('{energyName}');
 expect(walk(exported.layout).find(r=>r.node.id==='form-stats-value-1')?.node.text).toBe('{energy}');
 expect(exported.files['main.lua']).toBe(p.files['main.lua']);
});

it('clears label/value choices when changing scope and previews the first list row instead of global data',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({json:async()=>({css:''})})));
 const p=createProject('blank'),parent=p.layout.pages![0].child;
 p.data={energy:99,energyName:'Battery',roster:[{energy:0,energyName:'Mana'},{energy:8,energyName:'Fuel'}]};
 parent.children=[{type:'list',id:'roster',items:'$roster',template:{type:'column',id:'roster-row',children:[]}}];
 const before=JSON.stringify(p);locale.set('vi');
 component=mount(FunctionBlockLibrary,{target:document.body,props:{project:p,targetId:parent.id,sourceDirty:false,onapply:()=>'',onclose:()=>{}}});flushSync();await tick();
 await change('Loại khối','stats');await change('Trường dữ liệu 1','energy');await change('Nguồn nhãn 1','field');await change('Trường dữ liệu nhãn 1','energyName');
 expect(button('Chèn khối chức năng').disabled).toBe(false);
 await change('Khung chứa','roster-row');
 expect(control('Trường dữ liệu 1').value).toBe('');expect(control('Trường dữ liệu nhãn 1').value).toBe('');
 expect(button('Chèn khối chức năng').disabled).toBe(true);
 await change('Trường dữ liệu 1','energy');await change('Trường dữ liệu nhãn 1','energyName');
 const preview=[...document.querySelectorAll<HTMLElement>('.device')].find(el=>el.shadowRoot)?.shadowRoot;
 expect(preview?.getElementById('function-block-preview-label-0')?.textContent).toBe('Mana');
 expect(preview?.getElementById('function-block-preview-value-0')?.textContent).toBe('0');
 expect(JSON.stringify(p)).toBe(before);
});

it('saves a named configuration and requires rebinding after loading it in another project',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({json:async()=>({css:''})})));
 const source=createProject('blank');source.data={energy:0,energyName:'Pin'};const before=JSON.stringify(source);locale.set('vi');
 component=mount(FunctionBlockLibrary,{target:document.body,props:{project:source,targetId:source.layout.pages![0].child.id,sourceDirty:false,onapply:()=>'',onclose:()=>{}}});flushSync();await tick();
 document.querySelector('summary')!.click();await change('Loại khối','stats');await change('Trường dữ liệu 1','energy');await change('Nguồn nhãn 1','field');await change('Trường dữ liệu nhãn 1','energyName');await change('Tên cấu hình','Bảng năng lượng');
 button('Lưu cấu hình mới').click();flushSync();await tick();
 const saved=localStorage.getItem(BLOCK_PRESETS_KEY)!,id=parseBlockPresets(saved).presets[0].id;
 expect(JSON.stringify(source)).toBe(before);await unmount(component);component=undefined;
 const target=createProject('blank');target.data={fuel:3,fuelName:'Nhiên liệu'};const targetBefore=JSON.stringify({files:target.files,data:target.data,manifest:target.manifest});
 component=mount(FunctionBlockLibrary,{target:document.body,props:{project:target,targetId:target.layout.pages![0].child.id,sourceDirty:false,onapply:(r:FunctionBlockRequest)=>{insertFunctionBlock(target,r,'vi','rebound');return '';},onclose:()=>{}}});flushSync();await tick();
 document.querySelector('summary')!.click();await change('Cấu hình đã lưu',id);button('Nạp cấu hình').click();flushSync();await tick();
 expect(button('Chèn khối chức năng').disabled).toBe(true);
 await change('Trường dữ liệu 1','fuel');await change('Trường dữ liệu nhãn 1','fuelName');expect(button('Chèn khối chức năng').disabled).toBe(false);
 button('Chèn khối chức năng').click();flushSync();await tick();
 expect(walk(target.layout).find(r=>r.node.id==='rebound-label-0')?.node.text).toBe('{fuelName}');
 expect(walk(target.layout).find(r=>r.node.id==='rebound-value-0')?.node.text).toBe('{fuel}');
 expect(localStorage.getItem(BLOCK_PRESETS_KEY)).toBe(saved);expect(JSON.stringify({files:target.files,data:target.data,manifest:target.manifest})).toBe(targetBefore);
});

it('captures an existing block configuration and supports undoing removal without editing the project',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({json:async()=>({css:''})})));
 const p=createProject('blank');p.data={energy:1,energyName:'Pin'};
 insertFunctionBlock(p,{kind:'stats',parentId:p.layout.pages![0].child.id,position:'end',title:'Tài nguyên',rows:[{label:'',labelField:'energyName',field:'energy'}]},'vi','existing');
 const before=JSON.stringify(p);locale.set('vi');component=mount(FunctionBlockLibrary,{target:document.body,props:{project:p,targetId:'existing',sourceDirty:false,onapply:()=>'',onclose:()=>{}}});flushSync();await tick();
 document.querySelector('summary')!.click();button('Lấy cấu hình từ khối đang chọn').click();flushSync();await tick();
 expect(control('Nguồn nhãn 1').value).toBe('field');button('Lưu cấu hình mới').click();flushSync();await tick();
 const saved=localStorage.getItem(BLOCK_PRESETS_KEY)!;expect(parseBlockPresets(saved).presets[0].name).toBe('Tài nguyên');
 button('Bỏ cấu hình').click();flushSync();await tick();expect(parseBlockPresets(localStorage.getItem(BLOCK_PRESETS_KEY)!).presets).toHaveLength(0);
 button('Hoàn tác bỏ cấu hình').click();flushSync();await tick();expect(localStorage.getItem(BLOCK_PRESETS_KEY)).toBe(saved);expect(JSON.stringify(p)).toBe(before);
});

it('keeps configurations created while a JSON import is pending and preserves storage after invalid imports',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({json:async()=>({css:''})})));
 const p=createProject('blank');p.data={energy:1,energyName:'Pin'};locale.set('vi');
 component=mount(FunctionBlockLibrary,{target:document.body,props:{project:p,targetId:p.layout.pages![0].child.id,sourceDirty:false,onapply:()=>'',onclose:()=>{}}});flushSync();await tick();document.querySelector('summary')!.click();
 let resolveFile!:(source:string)=>void;const delayed=new Promise<string>(resolve=>{resolveFile=resolve;});
 const input=document.querySelector<HTMLInputElement>('[aria-label="Tệp JSON thư viện cấu hình"]')!;
 const upload=(name:string,read:()=>Promise<string>)=>{const file=new File(['{}'],name,{type:'application/json'});Object.defineProperty(file,'text',{value:read});Object.defineProperty(input,'files',{value:[file],configurable:true});input.dispatchEvent(new Event('change',{bubbles:true}));};
 upload('delayed.json',()=>delayed);
 await change('Loại khối','stats');await change('Trường dữ liệu 1','energy');await change('Tên cấu hình','Tạo trong lúc nhập');button('Lưu cấu hình mới').click();flushSync();await tick();
 const imported=makeBlockPreset({kind:'stats',title:'',rows:[{label:'Tiền',field:'money'}]},'incoming','Từ máy khác');resolveFile(serializeBlockPresets({formatVersion:1,presets:[imported]}));await tick();flushSync();await tick();
 const saved=localStorage.getItem(BLOCK_PRESETS_KEY)!;expect(parseBlockPresets(saved).presets.map(p=>p.name)).toEqual(['Tạo trong lúc nhập','Từ máy khác']);
 upload('bad.json',async()=>'{bad');await tick();flushSync();await tick();expect(localStorage.getItem(BLOCK_PRESETS_KEY)).toBe(saved);expect(document.querySelector('[role="alert"]')).not.toBeNull();
});

it('reports a failed browser write without claiming success or disabling insertion',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({json:async()=>({css:''})})));
 const p=createProject('blank');p.data={energy:1};locale.set('vi');
 component=mount(FunctionBlockLibrary,{target:document.body,props:{project:p,targetId:p.layout.pages![0].child.id,sourceDirty:false,onapply:()=>'',onclose:()=>{}}});flushSync();await tick();document.querySelector('summary')!.click();
 await change('Loại khối','stats');await change('Trường dữ liệu 1','energy');await change('Tên cấu hình','Không được mất');
 vi.spyOn(localStorage,'setItem').mockImplementation(()=>{throw new DOMException('No space','QuotaExceededError');});
 button('Lưu cấu hình mới').click();flushSync();await tick();
 expect(localStorage.getItem(BLOCK_PRESETS_KEY)).toBeNull();expect(document.querySelector('[role="status"]')).toBeNull();
 expect(document.querySelector('[role="alert"]')?.textContent).toContain('chưa lưu được');expect(button('Chèn khối chức năng').disabled).toBe(false);
});
