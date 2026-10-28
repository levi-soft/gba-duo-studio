import {walk} from './tree.js';
import {cloneProject} from './source-project.js';
import {validate} from './project.js';
import {assetImportPath,isImageAsset,isFontAsset,isAndroidImageAsset,isAndroidFontAsset} from './assets.js';
import {applyNodeFont,fontCatalog,setTabLabelFont} from './fonts.js';
import {safePackPath,PACK_LIMITS} from './pack-safety.js';
import {validPngContainer} from './png-integrity.js';
import type {Project,LayoutNode} from './types.js';

export type AssetKind='image'|'font';
export interface AssetTarget {key:string;kind:AssetKind;state?:'normal'|'pressed'|'selected';tabId?:string;tabTitle?:string;binding:boolean}
export type AssetSource={type:'existing';path:string;bytes:string}|{type:'upload';name:string;bytes:string};
export interface AssetEditRequest {nodeId:string;target:string;snapshot:string;source:AssetSource;descendants:boolean;replaceBinding:boolean}
export interface AssetPreviewSource {kind:AssetKind;path:string;bytes:string}
type EditCode='target'|'stale'|'binding'|'file-type'|'android-image'|'android-font'|'file-data'|'png-data'|'file-size'|'file-read'|'file-limit'|'aborted';
class AssetEditError extends Error{constructor(public code:EditCode){super(code);}}

function nodeFor(project:Project,id:string){const node=walk(project.layout).find(ref=>ref.node.id===id)?.node;if(!node)throw new AssetEditError('target');return node;}
export function assetTargets(project:Project,id:string):AssetTarget[]{
  const node=walk(project.layout).find(ref=>ref.node.id===id)?.node;if(!node)return [];
  const targets:AssetTarget[]=[];
  if(node.type==='image')targets.push({key:'src',kind:'image',binding:!!node.src&&(node.src.startsWith('$')||/\{[^{}]+\}/.test(node.src))});
  if(node.type==='button')for(const state of ['normal','pressed','selected'] as const)targets.push({key:'skin:'+state,kind:'image',state,binding:false});
  if(node.type==='tabs')for(const tab of node.tabs??[]){
    for(const state of ['normal','pressed','selected'] as const)targets.push({key:'tab-skin:'+tab.child.id+':'+state,kind:'image',state,tabId:tab.child.id,tabTitle:tab.title,binding:false});
    targets.push({key:'tab-font:'+tab.child.id,kind:'font',tabId:tab.child.id,tabTitle:tab.title,binding:false});
  }
  if(!['image','spacer'].includes(node.type))targets.push({key:'font',kind:'font',binding:false});
  return targets;
}
function targetFor(project:Project,id:string,key:string){const target=assetTargets(project,id).find(t=>t.key===key);if(!target)throw new AssetEditError('target');return target;}
const fontState=(node:LayoutNode)=>[node.id,node.font,node.style?.['font-family'],Object.fromEntries(Object.entries(node.studioStyles??{}).map(([key,value])=>[key,value.normal?.['font-family']])),node.tabs?.map(tab=>[tab.child.id,tab.labelFont])];
export function assetEditSnapshot(project:Project,id:string,key:string,descendants=false){
  const node=nodeFor(project,id),target=targetFor(project,id,key),tab=node.tabs?.find(tab=>tab.child.id===target.tabId);
  if(target.kind==='font')return JSON.stringify(target.tabId?[tab?.labelFont,node.studioStyles?.['tab:'+target.tabId]?.normal?.['font-family']]:((descendants?walk(node).map(ref=>ref.node):[node]).map(fontState)));
  return JSON.stringify(target.key==='src'?[node.src]:[target.tabId?tab?.skin?.[target.state!]:node.buttonSkin?.[target.state!]]);
}

function checkBytes(bytes:string){
  if(typeof bytes!=='string'||!bytes||bytes.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(bytes))throw new AssetEditError('file-data');
  const padding=bytes.endsWith('==')?2:bytes.endsWith('=')?1:0,size=bytes.length/4*3-padding,tail='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.indexOf(bytes[bytes.length-padding-1]);
  if(padding===2&&(tail&15)!==0||padding===1&&(tail&3)!==0)throw new AssetEditError('file-data');
  if(size>PACK_LIMITS.file)throw new AssetEditError('file-size');
}
/** Name collisions allocate a new path; even a shared original asset is never overwritten. */
export function uploadedAssetPath(project:Project,name:string,bytes:string){
  const base=assetImportPath(name.replace(/[%?#{}]/g,'_'));safePackPath(base);
  const dot=base.lastIndexOf('.'),stem=base.slice(0,dot),ext=base.slice(dot);
  for(let i=0;i<=PACK_LIMITS.entries;i++){const path=i?stem+'-'+i+ext:base;safePackPath(path);if(!Object.hasOwn(project.files,path)||project.files[path]===bytes)return path;}
  throw new AssetEditError('file-limit');
}
export function assetPreviewSource(project:Project,source:AssetSource,kind:AssetKind):AssetPreviewSource{
  const name=source.type==='existing'?source.path:source.name;
  checkFormat(name,kind);
  checkAssetBytes(name,source.bytes);
  if(source.type==='existing'){
    safePackPath(source.path);if(!source.path.startsWith('assets/')||!Object.hasOwn(project.files,source.path)||project.files[source.path]!==source.bytes)throw new AssetEditError('stale');
    return {kind,path:source.path,bytes:source.bytes};
  }
  return {kind,path:uploadedAssetPath(project,source.name,source.bytes),bytes:source.bytes};
}

/** Changes only the selected asset target and newly added bytes, as one transaction. */
export function applyAssetEdit(project:Project,request:AssetEditRequest){
  const target=targetFor(project,request.nodeId,request.target);
  if(assetEditSnapshot(project,request.nodeId,request.target,request.descendants)!==request.snapshot)throw new AssetEditError('stale');
  if(target.binding&&!request.replaceBinding)throw new AssetEditError('binding');
  const asset=assetPreviewSource(project,request.source,target.kind),next=cloneProject(project),node=nodeFor(next,request.nodeId);
  if(request.source.type==='upload')next.files[asset.path]=asset.bytes;
  if(target.kind==='image'){
    if(target.key==='src')node.src='asset:'+asset.path.slice(7);
    else if(target.tabId){const tab=node.tabs!.find(tab=>tab.child.id===target.tabId)!;tab.skin={...tab.skin,[target.state!]:asset.path};}
    else node.buttonSkin={...node.buttonSkin,[target.state!]:asset.path};
  }else{
    const family=fontCatalog(next).find(font=>font.path===asset.path)?.family;
    if(!family)throw new AssetEditError('file-type');
    if(target.tabId)setTabLabelFont(next.layout,node.id,target.tabId,family);
    else applyNodeFont(next.layout,node.id,family,request.descendants);
  }
  validate(next);project.files=next.files;project.layout=next.layout;return asset.path;
}

export function readAssetUpload(file:File,kind:AssetKind,signal?:AbortSignal):Promise<AssetSource>{
  try{checkFormat(file.name,kind);}catch(error){return Promise.reject(error);}
  if(!file.size||file.size>PACK_LIMITS.file)return Promise.reject(new AssetEditError('file-size'));
  return new Promise((resolve,reject)=>{
    const reader=new FileReader(),abort=()=>reader.abort(),finish=()=>signal?.removeEventListener('abort',abort);
    if(signal?.aborted){reject(new AssetEditError('aborted'));return;}
    signal?.addEventListener('abort',abort,{once:true});
    reader.onload=()=>{finish();const bytes=typeof reader.result==='string'?reader.result.split(',')[1]:'';try{checkAssetBytes(file.name,bytes);resolve({type:'upload',name:file.name,bytes});}catch(error){reject(error);}};
    reader.onerror=()=>{finish();reject(new AssetEditError('file-read'));};reader.onabort=()=>{finish();reject(new AssetEditError('aborted'));};
    try{reader.readAsDataURL(file);}catch{finish();reject(new AssetEditError('file-read'));}
  });
}
function checkFormat(name:string,kind:AssetKind){
  if(!(kind==='image'?isImageAsset(name):isFontAsset(name)))throw new AssetEditError('file-type');
  if(!(kind==='image'?isAndroidImageAsset(name):isAndroidFontAsset(name)))throw new AssetEditError(kind==='image'?'android-image':'android-font');
}
function checkAssetBytes(name:string,bytes:string){
  checkBytes(bytes);if(/\.png$/i.test(name)&&!validPngContainer(bytes))throw new AssetEditError('png-data');
}
export function assetEditError(error:unknown,language='en'){
  const messages:Record<EditCode,[string,string]>={
    target:['Choose an image, button/tab image state, or a font target.','Chọn ảnh, trạng thái ảnh của nút/tab hoặc phần chữ cần đổi font.'],
    stale:['The component or asset changed. Close and reopen these controls.','Thành phần hoặc tài nguyên đã đổi. Đóng và mở lại phần chỉnh này.'],
    binding:['Choose to replace the game-data image with a static image first.','Chọn chuyển ảnh từ dữ liệu game sang ảnh tĩnh trước khi áp dụng.'],
    'file-type':['Choose a supported image or font file for this target.','Chọn đúng loại tệp ảnh hoặc font được hỗ trợ cho phần này.'],
    'android-image':['The Android companion cannot display SVG files. Convert the image to PNG, JPEG or WebP first. GIF is shown as a still image.','Companion Android chưa hiển thị được SVG. Hãy chuyển ảnh sang PNG, JPEG hoặc WebP trước. GIF hiển thị dưới dạng ảnh tĩnh.'],
    'android-font':['The Android companion needs a TTF or OTF font. Choose the original font file instead of WOFF/WOFF2.','Companion Android cần font TTF hoặc OTF. Hãy chọn tệp font gốc thay cho WOFF/WOFF2.'],
    'file-data':['This file is empty or contains invalid data.','Tệp trống hoặc dữ liệu tệp không hợp lệ.'],
    'png-data':['This PNG is damaged or has an invalid checksum. Export a fresh PNG from an image editor and choose it again.','Ảnh PNG bị hỏng hoặc sai checksum. Hãy xuất lại ảnh PNG bằng trình sửa ảnh rồi chọn lại.'],
    'file-size':['Choose a nonempty file no larger than 32 MiB.','Chọn tệp có dữ liệu, không quá 32 MiB.'],
    'file-read':['The file could not be read. Choose it again.','Không đọc được tệp. Hãy chọn lại.'],
    'file-limit':['Too many asset files. Choose an existing asset.','Có quá nhiều tệp tài nguyên. Hãy chọn tài nguyên có sẵn.'],
    aborted:['File selection cancelled.','Đã hủy đọc tệp.']
  };
  return error instanceof AssetEditError?messages[error.code][language==='vi'?1:0]:error instanceof Error?error.message:String(error);
}
