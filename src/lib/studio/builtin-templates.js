import JSZip from 'jszip';
import {createProject,walk} from './project.js';
const kinds=['blank','rpg','adventure'];
/** @param {string} [language] */
export function builtinTemplates(language='en') {
  const vi=language==='vi';
  return kinds.map((kind,index)=>({file:`studio-${kind}-${vi?'vi':'en'}.zip`,name:(vi?['Trang trống','Nhân vật và túi đồ','Phiêu lưu']:['Blank Canvas','Character & Inventory','Adventure'])[index],
    version:'1.0.0',gameCodes:[],nodeCount:walk(createProject(kind,language).layout).length,assetCount:0,
    features:{pages:true,lists:kind!=='blank'},preview:'',notes:vi?'Mẫu trung lập, không chứa dữ liệu game. Nhập mã ROM trước khi xuất companion.':'Game-neutral template with no ROM data or game assets. Enter your ROM game code before exporting the companion.'}));
}
/** @param {string} file */
export async function builtinTemplateBytes(file) {
  const match=/^studio-(blank|rpg|adventure)-(en|vi)\.zip$/.exec(file);
  if(!match)return null;
  const p=createProject(match[1],match[2]),zip=new JSZip();
  for(const[name,value]of Object.entries({'manifest.json':p.manifest,'layout.json':p.layout,'preview-data.json':p.data}))zip.file(name,JSON.stringify(value));
  zip.file('style.css',p.css);return zip.generateAsync({type:'uint8array'});
}
