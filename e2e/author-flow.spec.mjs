import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import JSZip from 'jszip';

const png=color=>readFileSync(new URL('./fixtures/'+color+'.png',import.meta.url));
function fixture(){
 const layout={type:'pages',id:'pages',initial:'overview',pages:[{name:'overview',child:{type:'column',id:'root',style:{gap:'12px'},children:[
  {type:'text',id:'heading',text:'Thông tin',style:{'font-size':'24px'}},{type:'text',id:'status',text:'HP {hp}/{maxHp}'},
  {type:'image',id:'picture',src:'asset:portrait.png',style:{width:'64px',height:'64px'}},
  {type:'bar',id:'meter',value:'$hp',maxKey:'$maxHp',label:'HP {hp}/{maxHp}',style:{height:'24px'}},
  {type:'list',id:'party',items:'$party',template:{type:'text',id:'party-row',text:'{name}: {hp}'}}
 ]}}]};
 const manifest={id:'author-flow-test',name:'Companion mẫu',version:'1.0.0',formatVersion:2,match:{gameCode:['TEST'],crc32:['2419A356']},layout:'layout.json',styles:['style.css'],script:'scripts/main.lua',tickHz:4,permissions:['read-ram'],values:{hp:{type:'u8',addr:'02000000'}},studioDataFields:{hp:{kind:'number',labelVi:'HP hiện tại'},maxHp:{kind:'number',labelVi:'HP tối đa'},energy:{kind:'number',labelVi:'Năng lượng'},capacity:{kind:'number',labelVi:'Giới hạn'}}};
 const data={hp:12,maxHp:30,energy:0,capacity:20,party:[{name:'Aya',hp:7}]};
 const files={'scripts/main.lua':Buffer.from('local h=require("scripts/helper")\nfunction update() return h end'),'scripts/helper.lua':Buffer.from('return {hp=12,maxHp=30,energy=0,capacity=20}'),'assets/portrait.png':Buffer.from(png('blue')),'assets/images/portrait.png':Buffer.from(png('green')),'assets/opaque.bin':Buffer.from([0,255,128,7])};
 return {layout,manifest,data,files,css:':root { background:#101e30; color:#edf4ff; padding:12px; font-size:18px; }',width:960,height:720,editorGrid:{visible:false,snap:true,size:16}};
}
async function inputZip(p){const zip=new JSZip(),layout=JSON.stringify(p.layout),css=p.css;for(const [name,bytes]of Object.entries(p.files))zip.file(name,bytes);zip.file('manifest.json',JSON.stringify(p.manifest));zip.file('layout.json',layout);zip.file('style.css',css);zip.file('preview-data.json',JSON.stringify(p.data));zip.file('studio-design.json',JSON.stringify({version:1,layout:p.layout,css,generatedLayout:layout,generatedCss:css,width:p.width,height:p.height,editorGrid:p.editorGrid}));return zip.generateAsync({type:'nodebuffer'});}
async function openProject(page,file){const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Mở dự án',exact:true}).click();await(await chooser).setFiles(file);}
async function guidePart(page,id){await page.getByRole('button',{name:'Sửa companion',exact:true}).click();const guide=page.getByRole('dialog',{name:'Sửa companion',exact:true});await guide.getByLabel('Tìm chữ hoặc thành phần',{exact:true}).fill(id);await guide.locator('.guide-parts button').first().click();return guide;}
async function assetDialog(page,guide){await guide.getByRole('button',{name:'Thay ảnh hoặc font…',exact:true}).click();return page.getByRole('dialog',{name:'Thay ảnh hoặc font',exact:true});}
function find(root,id){if(root.id===id)return root;for(const child of [...(root.children||[]),...(root.child?[root.child]:[]),...(root.template?[root.template]:[]),...(root.pages||[]).map(p=>p.child),...(root.tabs||[]).map(p=>p.child)]){const match=find(child,id);if(match)return match;}}
async function download(page,button,testInfo,name){const started=page.waitForEvent('download');await button.click();const result=await started;expect(await result.failure()).toBeNull();const path=testInfo.outputPath(name);await result.saveAs(path);return path;}
async function throughBuilder(page,saved,testInfo,pageErrors){
 const builderPage=await page.context().newPage();builderPage.on('pageerror',error=>pageErrors.push('Builder: '+error.message));try{
  await builderPage.goto(process.env.GBA_DUO_TEST_BUILDER_URL);await builderPage.locator('#language').selectOption('vi');await builderPage.locator('#customTitle').click();await builderPage.locator('#custom').check();
  let choosing=builderPage.waitForEvent('filechooser');await builderPage.locator('#pickSource').click();await(await choosing).setFiles(saved);
  const rom=Buffer.alloc(192);rom.write('TEST',0xac);choosing=builderPage.waitForEvent('filechooser');await builderPage.locator('#pickRom').click();await(await choosing).setFiles({name:'synthetic-test.gba',mimeType:'application/octet-stream',buffer:rom});
  await expect(builderPage.locator('#build')).toBeEnabled();await builderPage.locator('#build').click();await expect(builderPage.locator('#result')).toBeVisible();await builderPage.screenshot({path:testInfo.outputPath('05-builder-ui.png'),fullPage:true});
  return await download(builderPage,builderPage.locator('#zip'),testInfo,'builder.zip');
 }finally{await builderPage.close();}
}
async function verifyZip(path,original,fontBytes){
 const zip=await JSZip.loadAsync(await fs.readFile(path)),m=JSON.parse(await zip.file('manifest.json').async('string')),metadata=JSON.parse(await zip.file('studio-design.json').async('string'));
 expect(m.script).toBe(original.manifest.script);expect(m.values).toEqual(original.manifest.values);expect(m.match).toEqual(original.manifest.match);expect(JSON.parse(await zip.file('preview-data.json').async('string'))).toEqual(original.data);
 for(const [name,bytes]of Object.entries(original.files))expect(await zip.file(name).async('nodebuffer'),name).toEqual(bytes);
 expect(find(metadata.layout,'heading').text).toBe('Thông tin của tôi');expect(find(metadata.layout,'status').text).toBe('Sinh lực {hp} trên {maxHp}');expect(find(metadata.layout,'meter')).toMatchObject({value:'$energy',maxKey:'$capacity'});expect(find(metadata.layout,'picture').src).toBe('asset:images/portrait-1.png');
 expect(await zip.file('assets/images/portrait-1.png').async('nodebuffer')).toEqual(png('gold'));expect([metadata.width,metadata.height]).toEqual([960,720]);expect(metadata.editorGrid).toEqual(original.editorGrid);
 if(fontBytes){expect(await zip.file('assets/fonts/test-font.ttf').async('nodebuffer')).toEqual(fontBytes);expect(find(metadata.layout,'heading').style['font-family']).toMatch(/StudioFont_/);}
}

test('opens, edits, previews, exports and reopens a companion through the real Vietnamese UI',async({page},testInfo)=>{
 const original=fixture(),bytes=await inputZip(original),pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
 await page.goto('/');await expect(page.locator('.studio')).toHaveAttribute('aria-busy','false');await page.getByLabel('Studio language').selectOption('vi');await expect(page.locator('.save-indicator')).toContainText('Đã lưu trên trình duyệt');
 await openProject(page,{name:'Companion-mau.zip',mimeType:'application/zip',buffer:bytes});await expect(page.locator('.scene-tab')).toContainText('Companion mẫu');await expect(page.locator('#status')).toHaveText('HP 12/30');
 const originalImage=await page.locator('#picture').getAttribute('src');await page.screenshot({path:testInfo.outputPath('01-imported.png'),fullPage:true});
 let guide=await guidePart(page,'heading');await guide.getByLabel('Chữ hiển thị',{exact:true}).fill('Thông tin của tôi');await guide.getByRole('button',{name:'Áp dụng chữ',exact:true}).click();await expect(guide.getByLabel('Chữ hiển thị',{exact:true})).toHaveValue('Thông tin của tôi');await guide.getByRole('button',{name:'Đóng hướng dẫn',exact:true}).click();
 guide=await guidePart(page,'status');await guide.getByLabel('Chữ trước dữ liệu 1',{exact:true}).fill('Sinh lực ');await guide.getByLabel('Chữ trước dữ liệu 2',{exact:true}).fill(' trên ');await guide.getByRole('button',{name:'Áp dụng phần chữ',exact:true}).click();await expect(guide.locator('pre')).toHaveText('Sinh lực {hp} trên {maxHp}');await guide.getByRole('button',{name:'Đóng hướng dẫn',exact:true}).click();
 let fontBytes=null;
 if(process.env.GBA_DUO_TEST_FONT){
  fontBytes=await fs.readFile(process.env.GBA_DUO_TEST_FONT);guide=await guidePart(page,'heading');const dialog=await assetDialog(page,guide);await dialog.getByRole('combobox',{name:'Nguồn tài nguyên',exact:true}).selectOption('upload');await dialog.locator('input[type="file"]').setInputFiles({name:'test-font.ttf',mimeType:'font/ttf',buffer:fontBytes});await expect(dialog.getByRole('button',{name:'Áp dụng tài nguyên',exact:true})).toBeEnabled();
  const family=await dialog.locator('.font-sample').evaluate(el=>getComputedStyle(el).fontFamily);expect(family).toContain('StudioAssetPreview_');expect(await page.evaluate(family=>document.fonts.check(`20px ${family}`),family)).toBe(true);
  await dialog.screenshot({path:testInfo.outputPath('02-real-font-preview.png')});await dialog.getByRole('button',{name:'Áp dụng tài nguyên',exact:true}).click();await expect(page.getByRole('dialog',{name:'Sửa companion',exact:true})).toBeVisible();await page.getByRole('button',{name:'Đóng hướng dẫn',exact:true}).click();
 }else testInfo.annotations.push({type:'not-checked',description:'Set GBA_DUO_TEST_FONT to a private local TTF to include actual font decoding/upload.'});
 guide=await guidePart(page,'picture');const dialog=await assetDialog(page,guide);await dialog.getByRole('combobox',{name:'Nguồn tài nguyên',exact:true}).selectOption('upload');
 const broken=Buffer.from(png('gold')),idat=broken.indexOf(Buffer.from('IDAT'));broken[idat+4+broken.readUInt32BE(idat-4)]^=1;
 await dialog.locator('input[type="file"]').setInputFiles({name:'broken.png',mimeType:'image/png',buffer:broken});await expect(dialog.getByRole('alert')).toContainText('checksum');await expect(dialog.getByRole('button',{name:'Áp dụng tài nguyên',exact:true})).toBeDisabled();
 await dialog.locator('input[type="file"]').setInputFiles({name:'vector.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')});await expect(dialog.getByRole('alert')).toContainText('SVG');await expect(dialog.getByRole('button',{name:'Áp dụng tài nguyên',exact:true})).toBeDisabled();
 await dialog.locator('input[type="file"]').setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:png('gold')});await expect(dialog.getByRole('button',{name:'Áp dụng tài nguyên',exact:true})).toBeEnabled();expect(await dialog.locator('img').evaluate(img=>img.complete&&img.naturalWidth===64)).toBe(true);
 await dialog.screenshot({path:testInfo.outputPath('03-image-preview.png')});await dialog.getByRole('button',{name:'Áp dụng tài nguyên',exact:true}).click();await page.getByRole('button',{name:'Đóng hướng dẫn',exact:true}).click();const newImage=await page.locator('#picture').getAttribute('src');expect(newImage).not.toBe(originalImage);
 await page.getByTitle('Hoàn tác Ctrl+Z',{exact:true}).click();await expect(page.locator('#picture')).toHaveAttribute('src',originalImage);await page.getByTitle('Làm lại Ctrl+Shift+Z',{exact:true}).click();await expect(page.locator('#picture')).toHaveAttribute('src',newImage);
 await page.getByRole('button',{name:'Gắn dữ liệu',exact:true}).click();const binding=page.getByRole('dialog',{name:'Gắn dữ liệu companion',exact:true});await binding.getByRole('combobox',{name:'Cách áp dụng',exact:true}).selectOption('existing');await binding.getByRole('combobox',{name:'Thành phần có sẵn',exact:true}).selectOption('meter');await binding.getByRole('combobox',{name:'Giá trị hiện tại',exact:true}).selectOption('energy');await binding.getByRole('combobox',{name:'Giá trị tối đa',exact:true}).selectOption('capacity');await binding.getByLabel('Giữ định dạng nhãn đang có',{exact:true}).uncheck();await binding.getByLabel('Nhãn hiển thị (tùy chọn)',{exact:true}).fill('Pin');await binding.getByRole('button',{name:'Áp dụng dữ liệu',exact:true}).click();await expect(binding).not.toBeVisible();
 await page.getByRole('button',{name:'▶ Kiểm thử',exact:true}).click();await expect(page.locator('#status')).toHaveText('Sinh lực 12 trên 30');await expect(page.locator('#meter')).toContainText('Pin');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:testInfo.outputPath('04-edited-preview.png'),fullPage:true});
 const saved=await download(page,page.getByRole('button',{name:'Lưu dự án',exact:true}),testInfo,'edited.gbastudio.json'),source=JSON.parse(await fs.readFile(saved,'utf8'));expect(source.data).toEqual(original.data);expect(source.files['scripts/main.lua']).toBe(original.files['scripts/main.lua'].toString('base64'));
 const exported=await download(page,page.getByRole('button',{name:'Xuất pack ZIP ↗',exact:true}),testInfo,'edited.zip');await verifyZip(exported,original,fontBytes);
 const builderChecked=!!process.env.GBA_DUO_TEST_BUILDER_URL,reopen=builderChecked?await throughBuilder(page,saved,testInfo,pageErrors):exported;await verifyZip(reopen,original,fontBytes);
 if(!builderChecked)testInfo.annotations.push({type:'not-checked',description:'Prepared sibling Builder checkout was not available; only Studio UI was checked.'});
 await openProject(page,reopen);await expect(page.locator('#status')).toHaveText('Sinh lực 12 trên 30');await expect(page.locator('#picture')).toHaveAttribute('src',newImage);await expect(page.locator('.save-indicator')).toContainText('Đã lưu trên trình duyệt');await page.reload();await expect(page.locator('#heading')).toHaveText('Thông tin của tôi');await expect(page.locator('#status')).toHaveText('Sinh lực 12 trên 30');
 const again=await download(page,page.getByRole('button',{name:'Xuất pack ZIP ↗',exact:true}),testInfo,'reopened.zip');await verifyZip(again,original,fontBytes);await page.screenshot({path:testInfo.outputPath('05-reopened.png'),fullPage:true});expect(pageErrors).toEqual([]);
 await fs.writeFile(testInfo.outputPath('verification.json'),JSON.stringify({project:testInfo.project.name,viewport:testInfo.project.use.viewport,fontDecoded:!!fontBytes,builderUiChecked:builderChecked,originalFiles:Object.keys(original.files),screenshots:(fontBytes?5:4)+(builderChecked?1:0),readerPreserved:true,dataPreserved:true,exportReopened:true,pageErrors},null,2));
});
