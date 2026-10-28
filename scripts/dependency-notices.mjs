import fs from 'node:fs';
import path from 'node:path';
const visited=new Set(),sections=[],roots=['jszip','svelte','@sveltejs/kit','vite','wasmoon','@playwright/test'];
function visit(name,from=process.cwd()){
 let directory=from,manifestPath;
 while(directory!==path.dirname(directory)){
  const candidate=path.join(directory,'node_modules',name,'package.json');
  if(fs.existsSync(candidate)){manifestPath=candidate;break;}directory=path.dirname(directory);
 }
 if(!manifestPath)throw Error('Cannot locate installed dependency '+name);
 const folder=path.dirname(manifestPath),pkg=JSON.parse(fs.readFileSync(manifestPath,'utf8')),key=pkg.name+'@'+pkg.version;
 if(visited.has(key))return;visited.add(key);
 const licenses=fs.readdirSync(folder).filter(file=>/^(?:licen[cs]e|copying|notice)(?:[.-].*)?$/i.test(file)&&fs.statSync(path.join(folder,file)).isFile());
 let text=`\n${'='.repeat(72)}\n${key}\nLicense: ${pkg.license??'See upstream'}\n`;
 for(const file of licenses)text+=`\n--- ${file} ---\n`+fs.readFileSync(path.join(folder,file),'utf8')+'\n';
 if(!licenses.length)text+='No standalone license text in this installed package; see its package metadata and upstream distribution.\n';
 sections.push(text);
 for(const dep of Object.keys(pkg.dependencies??{}))visit(dep,folder);
}
for(const root of roots)visit(root);
fs.writeFileSync('THIRD-PARTY-NOTICES.txt','Third-party package notices from the pinned local dependency tree.\nIncludes runtime libraries and selected build/test tools.\nEach component retains its original license. JSZip is used under its MIT option.\nWasmoon is test-only; its distribution embeds Lua (https://www.lua.org/license.html).\n\n'+sections.join('\n'));
console.log(`Recorded notices for ${visited.size} packages.`);
