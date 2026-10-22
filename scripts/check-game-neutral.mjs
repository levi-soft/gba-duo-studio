import fs from 'node:fs';
import path from 'node:path';
const forbidden=/\bfe[678]\b|fe[678]-|fire emblem|\blyn\b|\bzugu\b|\beliwood\b|AE7E|BE8E/i;
const hits=[];
function scan(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
 const file=path.join(dir,item.name);
 if(item.isDirectory())scan(file);
 else if(forbidden.test(file)||forbidden.test(fs.readFileSync(file,'utf8')))hits.push(file);
}}
for(const dir of ['src','static'])scan(dir);
for(const dir of ['projects','releases','templete','examples'])if(fs.existsSync(dir))hits.push(dir);
if(hits.length)throw Error('Private game material found: '+hits.join(', '));
console.log('Active Studio source and static files contain no private game material.');
