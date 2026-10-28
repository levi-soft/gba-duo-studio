import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
const root=process.cwd(),pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const files=[];
function collect(relative){
 const absolute=path.resolve(root,relative),stat=fs.lstatSync(absolute);
 if(stat.isSymbolicLink())throw Error('Source bundle cannot contain links: '+relative);
 if(stat.isDirectory())for(const name of fs.readdirSync(absolute))collect(path.join(relative,name));
 else files.push(relative.replaceAll('\\','/'));
}
for(const directory of ['src','static','scripts','docs','.github','integration','e2e'])collect(directory);
for(const file of ['.gitattributes','.gitignore','.npmrc','.ai-style-rules.md','package.json','package-lock.json','jsconfig.json','vite.config.js','vite.interop.config.js','playwright.config.mjs','README.md','README.vi.md','LICENSE','NOTICE.md','THIRD-PARTY-NOTICES.txt','CONTRIBUTING.md','SECURITY.md','CHANGELOG.md','Run-Studio.bat','Stop-Studio.bat'])collect(file);
const problems=[];
for(const file of files){
 if(/\.(gba|gbc?|nds|sav|state|apk|exe|zip|gguf|bin)$/i.test(file))problems.push(file);
 if(!/\.(png|jpe?g|webp|ico)$/i.test(file)){
  const text=fs.readFileSync(file,'utf8');
  if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-[A-Za-z0-9]{30,})\b/.test(text))problems.push(file);
 }
}
if(problems.length)throw Error('Source bundle scan failed; inspect these paths: '+problems.join(', '));
const zip=new JSZip();for(const file of files)zip.file(file,fs.readFileSync(file));
const output=path.join('.studio-runtime','distribution',`GBA-Duo-Studio-${pkg.version}-source.zip`);
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
console.log(`Prepared ${files.length} source files: ${output}`);
console.log('Only allowlisted source is included. Private workspaces, device data, Git history and installed dependencies are excluded.');
