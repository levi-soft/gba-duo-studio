import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const studio=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const builder=path.resolve(process.env.GBA_DUO_BUILDER_DIR??path.join(studio,'../GBA-Duo-Companion-Builder'));
for(const file of ['pack-compiler.js','function-blocks.js','builder-core.js','project-templates.js'])if(!fs.existsSync(path.join(builder,'site',file)))throw Error('Builder source is missing: '+path.join(builder,'site',file)+'. Set GBA_DUO_BUILDER_DIR to a prepared Builder checkout.');
const child=spawn(process.execPath,[path.join(studio,'node_modules/vitest/vitest.mjs'),'run','--config','vite.interop.config.js'],{cwd:studio,env:{...process.env,GBA_DUO_BUILDER_DIR:builder},stdio:'inherit',windowsHide:true});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
