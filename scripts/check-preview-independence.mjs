import fs from 'node:fs';
import path from 'node:path';
const forbidden=['renderer/parse-layout','renderer/render-widget','renderer/prepare-stylesheet','renderer/binding','renderer/actions','CodeEditor.svelte','pack-folder.js'];
const problems=[];let count=0;
function scan(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
 const name=path.join(directory,entry.name);
 if(entry.isDirectory())scan(name);
 else if(/\.(js|ts|svelte|html|mjs)$/.test(name)){
  count++;const source=fs.readFileSync(name,'utf8');
  for(const token of forbidden)if(source.includes(token))problems.push(`${name}: ${token}`);
 }
}}
scan('src');scan('static');
for(const file of ['layout.js','data.js','dom.js','css.js'])if(!fs.existsSync('src/lib/preview/'+file))problems.push('Missing new preview module '+file);
for(const legacy of ['src/lib/renderer','src/lib/pack-folder.js','src/lib/CodeEditor.svelte','src/routes/simulator'])if(fs.existsSync(legacy))problems.push('Legacy source remains: '+legacy);
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
if(Object.keys(pkg.dependencies).some(name=>name==='codemirror'||name.startsWith('@codemirror/')))problems.push('Unused simulator editor dependency remains');
if(problems.length){console.error(problems.join('\n'));process.exitCode=1;}else console.log(`PASS: ${count} active source/static files checked; no simulator module references. This checks dependencies, not legal provenance.`);
