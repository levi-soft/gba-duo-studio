import {it,expect} from 'vitest';
import {createProject,exportPack,importPack,walk} from './project.js';
import {assetTargets,assetEditSnapshot,applyAssetEdit,assetPreviewSource,uploadedAssetPath,readAssetUpload,assetEditError,type AssetEditRequest,type AssetSource} from './asset-editing.js';
import {fontCatalog} from './fonts.js';
import {validPngContainer} from './png-integrity.js';

const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4f50BAASvAdfA0BA+AAAAAElFTkSuQmCC';
function fixture(){
 const p=createProject('blank');p.manifest.match={gameCode:['TEST']};p.manifest.script='main.lua';p.files={'main.lua':btoa('function update() return {portrait="asset:shared.png"} end'),'assets/shared.png':png,'assets/images/shared.png':btoa('old image bytes'),'assets/opaque.bin':btoa('\x00\xff')};
 p.layout.pages![0].child.children=[{id:'image',type:'image',src:'asset:shared.png',style:{width:'80px'},onClick:{call:'literal'}},{id:'other',type:'image',src:'asset:shared.png'},{id:'button',type:'button',text:'HP {hp}',buttonSkin:{normal:'assets/shared.png',height:80,showLabel:true},onClick:{call:'literal'}}];return p;
}
function request(p:ReturnType<typeof fixture>,nodeId='image',target='src',source:AssetSource={type:'upload',name:'shared.png',bytes:png},descendants=false):AssetEditRequest{return {nodeId,target,snapshot:assetEditSnapshot(p,nodeId,target,descendants),source,descendants,replaceBinding:false};}

it('allocates a separate uploaded image and preserves every original asset and unrelated property',()=>{
 const p=fixture(),before=structuredClone(p),r=request(p),path=applyAssetEdit(p,r);expect(path).toBe('assets/images/shared-1.png');
 for(const [name,bytes]of Object.entries(before.files))expect(p.files[name],name).toBe(bytes);
 expect(p.layout.pages![0].child.children![0]).toEqual({...before.layout.pages![0].child.children![0],src:'asset:images/shared-1.png'});expect(p.layout.pages![0].child.children!.slice(1)).toEqual(before.layout.pages![0].child.children!.slice(1));
 expect(p.manifest).toEqual(before.manifest);expect(p.data).toEqual(before.data);expect(p.css).toEqual(before.css);
 const reused=applyAssetEdit(p,request(p));expect(reused).toBe(path);expect(Object.keys(p.files)).toHaveLength(Object.keys(before.files).length+1);
});

it('requires an explicit static-image choice for bound images and rejects stale targets/sources without partial writes',()=>{
 const p=fixture();p.layout.pages![0].child.children![0].src='$portrait';const before=JSON.stringify(p),r=request(p);
 try{applyAssetEdit(p,r);expect.fail();}catch(error){expect(assetEditError(error,'vi')).toContain('ảnh tĩnh');}expect(JSON.stringify(p)).toBe(before);
 const explicit={...r,replaceBinding:true};applyAssetEdit(p,explicit);expect(p.manifest.script).toBe('main.lua');expect(p.files['main.lua']).toBe(JSON.parse(before).files['main.lua']);
 const saved=JSON.stringify(p);expect(()=>applyAssetEdit(p,explicit)).toThrow();expect(JSON.stringify(p)).toBe(saved);
 const existing=request(p,'image','src',{type:'existing',path:'assets/shared.png',bytes:btoa('stale bytes')});expect(()=>applyAssetEdit(p,existing)).toThrow();expect(JSON.stringify(p)).toBe(saved);
});

it('changes only the selected button or tab state and supports an individual tab font',()=>{
 const p=fixture(),buttonBefore=structuredClone(p.layout.pages![0].child.children![2]);
 applyAssetEdit(p,request(p,'button','skin:pressed'));const button=p.layout.pages![0].child.children![2];expect(button).toEqual({...buttonBefore,buttonSkin:{...buttonBefore.buttonSkin,pressed:'assets/images/shared-1.png'}});
 p.layout.pages![0].child.children!.push({id:'tabs',type:'tabs',tabs:[{title:'A',child:{id:'tab-a',type:'text',text:'A'},skin:{normal:'assets/shared.png'}},{title:'B',child:{id:'tab-b',type:'text',text:'B'}}]});const before=structuredClone(p);
 applyAssetEdit(p,request(p,'tabs','tab-skin:tab-b:selected'));const tabs=walk(p.layout).find(r=>r.node.id==='tabs')!.node;expect(tabs.tabs![0]).toEqual(before.layout.pages![0].child.children!.at(-1)!.tabs![0]);expect(tabs.tabs![1].skin?.selected).toBe('assets/images/shared-1.png');
 applyAssetEdit(p,request(p,'tabs','tab-font:tab-a',{type:'upload',name:'demo.ttf',bytes:btoa('synthetic font contract fixture')}));const changed=walk(p.layout).find(r=>r.node.id==='tabs')!.node;
 expect(changed.studioStyles?.['tab:tab-a']?.normal?.['font-family']).toContain('StudioFont_');expect(changed.studioStyles?.['tab:tab-b']).toBeUndefined();
});

it('keeps font scope local by default and preserves reader/resources through native compile/export/reopen',async()=>{
 const p=fixture();p.layout.pages![0].child.children!.push({id:'group',type:'column',children:[{id:'label',type:'text',text:'Hi',style:{'font-family':'serif'}},{id:'child',type:'text',text:'Child'}]});const source={type:'upload' as const,name:'font.ttf',bytes:btoa('synthetic font contract fixture')};
 applyAssetEdit(p,request(p,'group','font',source));let group=walk(p.layout).find(r=>r.node.id==='group')!.node;expect(group.children![0].style?.['font-family']).toBe('serif');expect(group.children![1].style?.['font-family']).toBeUndefined();
 const family=fontCatalog(p).find(font=>font.path==='assets/fonts/font.ttf')!.family;
 applyAssetEdit(p,request(p,'group','font',source,true));group=walk(p.layout).find(r=>r.node.id==='group')!.node;expect(group.children!.every(node=>node.style?.['font-family']===JSON.stringify(family))).toBe(true);
 const before=structuredClone(p),restored=await importPack(await(await exportPack(p)).arrayBuffer());expect(p).toEqual(before);for(const [name,bytes]of Object.entries(before.files))expect(restored.files[name]).toBe(bytes);expect(restored.layout).toEqual(p.layout);expect(restored.manifest.script).toBe(p.manifest.script);
});

it('validates file types, paths and canonical data before changing the project, and handles real FileReader cancellation',async()=>{
 const p=fixture(),before=JSON.stringify(p);
 for(const source of [{type:'upload',name:'bad.lua',bytes:png},{type:'upload',name:'bad.png',bytes:'!!!!'},{type:'upload',name:'bad.png',bytes:'AB=='},{type:'existing',path:'../bad.png',bytes:png}])expect(()=>applyAssetEdit(p,request(p,'image','src',source as AssetSource))).toThrow();
 expect(JSON.stringify(p)).toBe(before);
 await expect(readAssetUpload(new File(['x'],'not-image.lua'),'image')).rejects.toThrow();await expect(readAssetUpload(new File([],'empty.png'),'image')).rejects.toThrow();
 const file=new File([Uint8Array.from(atob(png),c=>c.charCodeAt(0))],'tiny.png'),read=await readAssetUpload(file,'image');expect(read).toEqual({type:'upload',name:'tiny.png',bytes:png});
 const controller=new AbortController(),pending=readAssetUpload(file,'image',controller.signal);controller.abort();await expect(pending).rejects.toThrow('aborted');
 const oversized={name:'huge.png',size:32*1024*1024+1} as File;await expect(readAssetUpload(oversized,'image')).rejects.toThrow('file-size');
 expect(assetPreviewSource(p,{type:'existing',path:'assets/shared.png',bytes:png},'image').path).toBe('assets/shared.png');
});

it('keeps existing file maps unchanged over deterministic collision sequences and normalizes URL punctuation',()=>{
 let seed=0x4a77;const next=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 for(let run=0;run<64;run++){
  const p=fixture(),name='ảnh-'+run+'.png',base='assets/images/'+name,collisions=next()%18;
  for(let i=0;i<collisions;i++)p.files[i?base.replace('.png','-'+i+'.png'):base]=btoa('different '+i);
  const before=structuredClone(p.files),path=uploadedAssetPath(p,name,png);expect(p.files).toEqual(before);expect(Object.hasOwn(before,path)).toBe(false);
  applyAssetEdit(p,request(p,'image','src',{type:'upload',name,bytes:png}));for(const [file,bytes]of Object.entries(before))expect(p.files[file]).toBe(bytes);expect(p.files[path]).toBe(png);
 }
 expect(uploadedAssetPath(fixture(),'ảnh?#{x}%.png',png)).toBe('assets/images/ảnh___x__.png');
});

it('rejects browser-only image/font formats for every edit source without changing an imported pack',async()=>{
 const p=fixture();p.files['assets/vector.svg']=btoa('<svg xmlns="http://www.w3.org/2000/svg"/>');p.files['assets/web.woff2']=btoa('web font');
 const before=JSON.stringify(p);
 for(const [nodeId,target,name,kind]of [['image','src','vector.svg','image'],['button','skin:normal','vector.svg','image'],['button','font','web.woff2','font']] as const){
  for(const source of [{type:'upload' as const,name,bytes:p.files['assets/'+name]},{type:'existing' as const,path:'assets/'+name,bytes:p.files['assets/'+name]}]){
   try{applyAssetEdit(p,request(p,nodeId,target,source));expect.fail('Unsupported format applied');}catch(error){expect(assetEditError(error,'vi')).toContain('Companion Android');}
   expect(JSON.stringify(p)).toBe(before);
  }
  await expect(readAssetUpload(new File(['bytes'],name),kind)).rejects.toThrow(kind==='image'?'android-image':'android-font');
 }
 for(const name of ['font.woff','font.WOFF2'])expect(()=>assetPreviewSource(p,{type:'upload',name,bytes:btoa('font')},'font')).toThrow('android-font');
 for(const name of ['font.ttf','font.OTF'])expect(assetPreviewSource(p,{type:'upload',name,bytes:btoa('font')},'font').kind).toBe('font');
});

it('rejects PNG corruption, truncation and a disguised format before applying or loading an upload',async()=>{
 const p=fixture(),before=JSON.stringify(p),raw=atob(png);expect(validPngContainer(png)).toBe(true);
 const invalid=[btoa(raw.slice(0,-1)),btoa(raw.slice(0,33)),btoa(raw+'extra'),btoa('<svg/>')];
 let seed=0x1234;for(let n=0;n<32;n++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const index=8+seed%(raw.length-8);invalid.push(btoa(raw.slice(0,index)+String.fromCharCode(raw.charCodeAt(index)^1)+raw.slice(index+1)));}
 for(const bytes of invalid){
  expect(validPngContainer(bytes)).toBe(false);expect(()=>applyAssetEdit(p,request(p,'image','src',{type:'upload',name:'broken.png',bytes}))).toThrow('png-data');expect(JSON.stringify(p)).toBe(before);
 }
 const bytes=invalid[4];p.files['assets/broken.png']=bytes;const retained=JSON.stringify(p);expect(()=>assetPreviewSource(p,{type:'existing',path:'assets/broken.png',bytes},'image')).toThrow('png-data');expect(JSON.stringify(p)).toBe(retained);
 await expect(readAssetUpload(new File([Uint8Array.from(atob(bytes),c=>c.charCodeAt(0))],'broken.png'),'image')).rejects.toThrow('png-data');
 try{assetPreviewSource(p,{type:'upload',name:'broken.png',bytes},'image');}catch(error){expect(assetEditError(error,'vi')).toContain('xuất lại ảnh PNG');}
});
