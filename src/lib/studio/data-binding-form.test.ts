import {afterEach,expect,it} from 'vitest';
import {mount,unmount,flushSync,tick} from 'svelte';
import DataBindingWizard from './DataBindingWizard.svelte';
import {locale} from './i18n.js';
import {createProject,walk} from './project.js';
import {applyDataWidget,type DataWidgetRequest} from './data-widgets.js';
import {resolve,scopedValues} from '../preview/data.js';
let component:ReturnType<typeof mount>|undefined;
afterEach(async()=>{if(component)await unmount(component);component=undefined;locale.set('en');document.body.replaceChildren();});
function fixture(){
 const p=createProject('blank');p.manifest.match={gameCode:['TEST']};p.files={'reader.lua':btoa('unchanged reader')};
 p.data={pilotName:'Aya',portrait:'asset:one.png',avatar:'asset:two.png',hp:12,maxHp:30,energy:0,capacity:20,level:4,roster:[{portrait:'asset:row-one.png',avatar:'asset:row-two.png'}]};
 p.layout.pages![0].child.children=[
  {type:'image',id:'picture',src:'$portrait',style:{width:'80px',height:'120px'},class:'framed',onClick:{call:'open'}},
  {type:'bar',id:'bar',value:'$hp',maxKey:'$maxHp',label:'Pin {hp}/{maxHp} · Cấp {level}',style:{height:'24px'},class:'meter'},
  {type:'text',id:'name',text:'Phi công: {pilotName}'},
  {type:'list',id:'roster',items:'$roster',template:{type:'column',id:'row',children:[{type:'image',id:'row-picture',src:'$portrait'}]}}
 ];return p;
}
function input(label:string){const owner=[...document.querySelectorAll('label')].find(el=>el.firstChild?.textContent?.trim()===label),control=owner?.querySelector('input,select');expect(control,label).toBeTruthy();return control as HTMLInputElement|HTMLSelectElement;}
async function change(label:string,value:string){const control=input(label);control.value=value;control.dispatchEvent(new Event(control instanceof HTMLSelectElement?'change':'input',{bubbles:true}));flushSync();await tick();}
async function mapText(index:number,value:string){const owner=[...document.querySelectorAll('label')].find(el=>el.textContent?.trim().startsWith(`Giá trị ${index}:`));const control=owner?.querySelector('select');expect(control).toBeTruthy();control!.value=value;control!.dispatchEvent(new Event('change',{bubbles:true}));flushSync();await tick();}
function keepTemplate(){return [...document.querySelectorAll('label')].find(el=>el.textContent?.trim()==='Giữ mẫu chữ đang có')?.querySelector<HTMLInputElement>('input');}
function matchRows(){return [...document.querySelectorAll('label')].find(el=>el.textContent?.trim()==='Ghép trường của mẫu dòng')?.querySelector<HTMLInputElement>('input');}
async function mapRow(key:string,value:string){const control=[...document.querySelectorAll<HTMLSelectElement>('select[data-list-binding]')].find(el=>el.dataset.listBinding===key);expect(control).toBeTruthy();control!.value=value;control!.dispatchEvent(new Event('change',{bubbles:true}));flushSync();await tick();}
function apply(){const button=[...document.querySelectorAll('button')].find(el=>el.textContent?.trim()==='Áp dụng dữ liệu');expect(button).toBeTruthy();return button!;}
async function open(p:ReturnType<typeof fixture>,id:string,onapply:(r:DataWidgetRequest)=>string,sourceDirty=false){locale.set('vi');component=mount(DataBindingWizard,{target:document.body,props:{project:p,targetId:id,sourceDirty,onapply,onclose:()=>{}}});flushSync();await tick();}

it('opens on the selected image, offers text fields and updates that image without adding a node',async()=>{
 const p=fixture(),before=structuredClone(p),count=walk(p.layout).length;let request:DataWidgetRequest|undefined;
 await open(p,'picture',r=>{request=r;applyDataWidget(p,r,'vi');return '';});
 expect(input('Cách áp dụng').value).toBe('existing');expect(input('Thành phần có sẵn').value).toBe('picture');expect(input('Trường dữ liệu').value).toBe('portrait');
 const choices=[...(input('Trường dữ liệu') as HTMLSelectElement).options].map(o=>o.value);expect(choices).toContain('avatar');expect(choices).not.toContain('hp');expect(choices).not.toContain('roster');
 await change('Trường dữ liệu','avatar');apply().click();flushSync();await tick();
 expect(request).toMatchObject({kind:'image',replaceId:'picture',field:'avatar'});expect(walk(p.layout).length).toBe(count);
 expect(walk(p.layout).find(r=>r.node.id==='picture')?.node).toEqual({...before.layout.pages![0].child.children![0],src:'$avatar'});
 expect(p.files).toEqual(before.files);expect(p.data).toEqual(before.data);expect(p.manifest).toEqual(before.manifest);
});
it('prefills the selected bar and preserves its label format when current/max fields change',async()=>{
 const p=fixture();await open(p,'bar',r=>{applyDataWidget(p,r,'vi');return '';});
 expect(input('Giá trị hiện tại').value).toBe('hp');expect(input('Giá trị tối đa').value).toBe('maxHp');
 const keep=document.querySelector<HTMLInputElement>('input[type="checkbox"]')!;expect(keep.checked).toBe(true);
 await change('Giá trị hiện tại','energy');expect(apply().disabled).toBe(true);await change('Giá trị tối đa','capacity');
 expect(document.querySelector('output')?.textContent).toBe('0');apply().click();flushSync();await tick();
 expect(walk(p.layout).find(r=>r.node.id==='bar')?.node).toMatchObject({value:'$energy',maxKey:'$capacity',label:'Pin {energy}/{capacity} · Cấp {level}',style:{height:'24px'},class:'meter'});
});
it('switches existing targets using the newly chosen ID and restores their current fields and caption',async()=>{
 const p=fixture();await open(p,'name',r=>{applyDataWidget(p,r,'vi');return '';});
 expect(input('Trường dữ liệu').value).toBe('pilotName');expect(input('Nhãn hiển thị (tùy chọn)').value).toBe('Phi công');
 await change('Thành phần có sẵn','picture');expect(input('Trường dữ liệu').value).toBe('portrait');
 await change('Thành phần có sẵn','name');expect(input('Trường dữ liệu').value).toBe('pilotName');await change('Nhãn hiển thị (tùy chọn)','Tên phi công');apply().click();flushSync();await tick();
 expect(walk(p.layout).find(r=>r.node.id==='name')?.node.text).toBe('Tên phi công: {pilotName}');expect(walk(p.layout).find(r=>r.node.id==='picture')?.node.src).toBe('$portrait');
});
it('uses image fields from a repeated row instead of same-named global data',async()=>{
 const p=fixture();await open(p,'row-picture',r=>{applyDataWidget(p,r,'vi');return '';});
 expect(document.querySelector('output')?.textContent).toBe('asset:row-one.png');await change('Trường dữ liệu','avatar');expect(document.querySelector('output')?.textContent).toBe('asset:row-two.png');apply().click();flushSync();await tick();
 const image=walk(p.layout).find(r=>r.node.id==='row-picture')!.node;expect(resolve(image.src,scopedValues((p.data.roster as {avatar:string}[])[0],0,p.data))).toBe('asset:row-two.png');
});
it('keeps the code-draft guard effective even when an existing binding is prefilled',async()=>{
 const p=fixture(),before=JSON.stringify(p);let calls=0;await open(p,'picture',()=>{calls++;return '';},true);
 expect(input('Trường dữ liệu').value).toBe('portrait');expect(apply().matches(':disabled')).toBe(true);apply().click();flushSync();await tick();expect(calls).toBe(0);expect(JSON.stringify(p)).toBe(before);
});
it('opens a selected list in existing mode and rebinds it without rebuilding the row template',async()=>{
 const p=fixture();p.data.backupRoster=[{portrait:'asset:backup.png'}];const before=structuredClone(p),list=walk(p.layout).find(r=>r.node.id==='roster')!.node,template=list.template;
 let calls=0;await open(p,'roster',r=>{calls++;applyDataWidget(p,r,'vi');return '';});
 expect(input('Cách áp dụng').value).toBe('existing');expect(input('Trường dữ liệu').value).toBe('roster');
 expect(document.body.textContent).toContain('Giữ mẫu dòng đang có');expect(document.body.textContent).not.toContain('Giá trị hiển thị ở mỗi dòng');
 await change('Trường dữ liệu','backupRoster');expect(document.body.textContent).toContain('Đã kiểm tra mẫu: 1 dòng.');expect(apply().disabled).toBe(false);
 apply().click();flushSync();await tick();expect(calls).toBe(1);expect(list.template).toBe(template);
 before.layout.pages![0].child.children![3].items='$backupRoster';expect(p).toEqual(before);
});
it('blocks an incompatible list source with a translated field/row issue, then permits a compatible selection',async()=>{
 const p=fixture();p.data.incompatible=[{portrait:'asset:ok.png'},{name:'Missing portrait'}];p.data.backupRoster=[{portrait:'asset:ok.png'}];
 const before=structuredClone(p);let calls=0;await open(p,'roster',()=>{calls++;return '';});
 await change('Trường dữ liệu','incompatible');expect(apply().disabled).toBe(true);
 expect(document.body.textContent).toContain('portrait');expect(document.body.textContent).toContain('dòng 2');
 apply().click();flushSync();await tick();expect(calls).toBe(0);expect(p).toEqual(before);
 await change('Trường dữ liệu','backupRoster');expect(apply().disabled).toBe(false);expect(document.body.textContent).not.toContain('dòng 2');
});
it('retains the code-draft guard when opening a prefilled list binding',async()=>{
 const p=fixture(),before=structuredClone(p);let calls=0;await open(p,'roster',()=>{calls++;return '';},true);
 expect(input('Trường dữ liệu').value).toBe('roster');expect(apply().matches(':disabled')).toBe(true);
 apply().click();flushSync();await tick();expect(calls).toBe(0);expect(p).toEqual(before);
});
it('opens complex text with template preservation, previews sample values and changes only chosen references',async()=>{
 const p=fixture();p.layout.pages![0].child.children!.push({type:'text',id:'summary',text:'HP {hp}/{maxHp}\nCấp {level} · HP {hp}',class:'stats',style:{color:'#ffff00'},onClick:{call:'open'}});
 const before=structuredClone(p);let request:DataWidgetRequest|undefined;
 await open(p,'summary',r=>{request=r;applyDataWidget(p,r,'vi');return '';});
 expect(keepTemplate()?.checked).toBe(true);expect(document.querySelector('output')?.textContent).toBe('HP 12/30\nCấp 4 · HP 12');
 expect(document.body.textContent).not.toContain('Nhãn hiển thị (tùy chọn)');
 await mapText(1,'energy');await mapText(2,'capacity');expect(document.querySelector('output')?.textContent).toBe('HP 0/20\nCấp 4 · HP 0');
 await change('Tìm giá trị theo tên','cấp');expect(apply().disabled).toBe(false); // Filter does not discard other selected values.
 apply().click();flushSync();await tick();
 expect(request).toMatchObject({keepText:true,textFields:{hp:'energy',maxHp:'capacity',level:'level'}});
 before.layout.pages![0].child.children![4].text='HP {energy}/{capacity}\nCấp {level} · HP {energy}';expect(p).toEqual(before);
});
it('blocks a missing original field until a replacement is chosen and labels undeclared sample values honestly',async()=>{
 const p=fixture();p.layout.pages![0].child.children!.push({type:'text',id:'summary',text:'Máu {oldHp}/{maxHp}'});
 p.manifest.studioDataFields={declaredHp:{kind:'number',labelVi:'HP khai báo'}};
 let calls=0;await open(p,'summary',r=>{calls++;applyDataWidget(p,r,'vi');return '';});
 expect(keepTemplate()?.checked).toBe(true);expect(apply().disabled).toBe(true);expect(document.body.textContent).toContain('chưa có trong phạm vi này');
 apply().click();flushSync();await tick();expect(calls).toBe(0);
 await mapText(1,'declaredHp');expect(apply().disabled).toBe(false);expect(document.querySelector('output')?.textContent).toBe('Máu …/30');
 expect(document.body.textContent).toContain('Một số giá trị mẫu');apply().click();flushSync();await tick();expect(calls).toBe(1);expect(Object.hasOwn(p.data,'declaredHp')).toBe(false);
});
it('resets template mappings when switching targets and requires deliberate opt-out before replacing complex wording with one value',async()=>{
 const p=fixture();p.layout.pages![0].child.children!.push({type:'text',id:'summary',text:'HP {hp}/{maxHp}'});
 await open(p,'summary',r=>{applyDataWidget(p,r,'vi');return '';});await mapText(1,'energy');
 await change('Thành phần có sẵn','name');expect(keepTemplate()?.checked).toBe(false);expect(input('Trường dữ liệu').value).toBe('pilotName');
 await change('Thành phần có sẵn','summary');expect(keepTemplate()?.checked).toBe(true);expect(document.querySelector('output')?.textContent).toBe('HP 12/30');
 keepTemplate()!.click();flushSync();await tick();expect(apply().disabled).toBe(true);expect(document.body.textContent).toContain('Áp dụng sẽ thay nội dung chữ');
 await change('Trường dữ liệu','energy');await change('Nhãn hiển thị (tùy chọn)','Năng lượng');apply().click();flushSync();await tick();
 expect(walk(p.layout).find(r=>r.node.id==='summary')?.node.text).toBe('Năng lượng: {energy}');
});
it('previews repeated-row text using sample row fields, retaining index/UI placeholders and false/zero values',async()=>{
 const p=fixture();p.data.active=false;p.data.roster=[{portrait:'asset:one.png',avatar:'asset:two.png',hp:2,maxHp:9,energy:0,capacity:7,level:1}];
 const list=walk(p.layout).find(r=>r.node.id==='roster')!.node;
 list.template!.children!.push({type:'text',id:'summary',text:'HP {hp}/{maxHp} · {active} · {@index} {ui.page}'});
 await open(p,'summary',r=>{applyDataWidget(p,r,'vi');return '';});
 expect(document.querySelector('output')?.textContent).toBe('HP 2/9 · false · … …');
 await mapText(1,'energy');await mapText(2,'capacity');apply().click();flushSync();await tick();
 expect(walk(p.layout).find(r=>r.node.id==='summary')?.node.text).toBe('HP {energy}/{capacity} · {active} · {@index} {ui.page}');
});
it('keeps complex text and sample data unchanged while a Code draft is pending',async()=>{
 const p=fixture();p.layout.pages![0].child.children!.push({type:'text',id:'summary',text:'HP {hp}/{maxHp}'});
 const before=structuredClone(p);let calls=0;await open(p,'summary',()=>{calls++;return '';},true);
 expect(keepTemplate()?.checked).toBe(true);expect(apply().matches(':disabled')).toBe(true);apply().click();flushSync();await tick();expect(calls).toBe(0);expect(p).toEqual(before);
});
it('matches a renamed row image source through the form and preserves the existing row structure',async()=>{
 const p=fixture();p.data.newRoster=[{picture:'asset:new.png'}];p.manifest.studioDataFields={'roster[].portrait':{labelVi:'Chân dung cũ'},'newRoster[].picture':{labelVi:'Chân dung mới'}};
 const before=structuredClone(p);let request:DataWidgetRequest|undefined;
 await open(p,'roster',r=>{request=r;applyDataWidget(p,r,'vi');return '';});await change('Trường dữ liệu','newRoster');
 expect(apply().disabled).toBe(true);expect(matchRows()?.checked).toBe(false);matchRows()!.click();flushSync();await tick();
 expect(document.body.textContent).toContain('Chân dung cũ');expect(document.body.textContent).toContain('Chân dung mới');
 await mapRow('roster:portrait','picture');expect(document.body.textContent).toContain('Mẫu sau ghép: asset:new.png');expect(apply().disabled).toBe(false);
 expect(p).toEqual(before);apply().click();flushSync();await tick();expect(request).toMatchObject({listFields:{'roster:portrait':'picture'}});
 before.layout.pages![0].child.children![3].items='$newRoster';before.layout.pages![0].child.children![3].template!.children![0].src='$picture';expect(p).toEqual(before);
});
it('checks mapped fields on later rows and resets the pending matches on a source or target change',async()=>{
 const p=fixture();p.data.newRoster=[{picture:'asset:ok.png'},{missing:'Later row has no picture'}];p.data.goodRoster=[{avatar:'asset:good.png'}];
 const before=structuredClone(p);let calls=0;await open(p,'roster',()=>{calls++;return '';});await change('Trường dữ liệu','newRoster');matchRows()!.click();flushSync();await tick();await mapRow('roster:portrait','picture');
 expect(apply().disabled).toBe(true);expect(document.body.textContent).toContain('dòng 2');apply().click();flushSync();await tick();expect(calls).toBe(0);expect(p).toEqual(before);
 await change('Trường dữ liệu','goodRoster');expect(apply().disabled).toBe(true);await mapRow('roster:portrait','avatar');expect(apply().disabled).toBe(false);
 await change('Thành phần có sẵn','picture');await change('Thành phần có sẵn','roster');expect(matchRows()?.checked).toBe(false);expect(input('Trường dữ liệu').value).toBe('roster');expect(p).toEqual(before);
});
it('reveals nested field matches after the nested list source is matched and retains distinct scopes',async()=>{
 const p=fixture(),list=walk(p.layout).find(r=>r.node.id==='roster')!.node;
 p.data.roster=[{skills:[{name:'Old skill'}]}];p.data.newRoster=[{abilities:[{title:'New skill'}]}];
 list.template={type:'list',id:'skills',items:'$skills',template:{type:'text',id:'skill-name',text:'{name}'}};
 await open(p,'roster',r=>{applyDataWidget(p,r,'vi');return '';});await change('Trường dữ liệu','newRoster');matchRows()!.click();flushSync();await tick();
 await mapRow('roster:skills','abilities');expect(apply().disabled).toBe(true);await mapRow('skills:name','title');expect(apply().disabled).toBe(false);apply().click();flushSync();await tick();
 expect(list.template).toMatchObject({items:'$abilities',template:{text:'{title}'}});
});
it('resets matches without applying and preserves the draft guard for list mapping controls',async()=>{
 const p=fixture();p.data.newRoster=[{picture:'asset:new.png'}];const before=structuredClone(p);let calls=0;
 await open(p,'roster',()=>{calls++;return '';});await change('Trường dữ liệu','newRoster');matchRows()!.click();flushSync();await tick();await mapRow('roster:portrait','picture');expect(apply().disabled).toBe(false);
 [...document.querySelectorAll('button')].find(el=>el.textContent?.trim()==='Đặt lại ghép trường')!.click();flushSync();await tick();expect(apply().disabled).toBe(true);expect(calls).toBe(0);expect(p).toEqual(before);
 await unmount(component!);component=undefined;await open(p,'roster',()=>{calls++;return '';},true);
 expect(matchRows()!.matches(':disabled')).toBe(true);expect(apply().matches(':disabled')).toBe(true);apply().click();flushSync();await tick();expect(calls).toBe(0);expect(p).toEqual(before);
});
