import {walk} from './tree.js';
import {shouldGenerateScript} from './computed-values.js';
import type {Project} from './types.js';

/** Index existing authoring nodes; never rewrite Lua, bindings or game data. */
export function guideParts(project:Project, query='') {
  const needle=query.trim().toLocaleLowerCase();
  return walk(project.layout).filter(({node})=>['text','button','bar','box','row','column','image','list','tabs'].includes(node.type))
    .map(({node,depth})=>{
      const text=typeof node.text==='string'?node.text:typeof node.label==='string'?node.label:'';
      const dynamic=/\{[^}]+\}|^\$/.test(text);
      return {id:node.id,type:node.type,text,dynamic,depth,editable:typeof node.text==='string'&&!dynamic&&['text','button'].includes(node.type),
        color:typeof node.style?.color==='string'?node.style.color:'',background:typeof node.style?.background==='string'?node.style.background:''};
    }).filter(part=>!needle||[part.text,part.id,part.type].some(value=>value.toLocaleLowerCase().includes(needle)));
}

export function applyGuideText(project:Project,id:string,text:string) {
  const part=guideParts(project).find(part=>part.id===id);
  if(!part?.editable)throw Error('Dynamic text must keep its data binding.');
  const node=walk(project.layout).find(ref=>ref.node.id===id)!.node;
  node.text=text;
}

export function applyGuideColor(project:Project,id:string,key:string,value:string) {
  if(!['color','background'].includes(key)||!/^#[\da-f]{6}$/i.test(value))throw Error('Choose a text or background color.');
  const node=walk(project.layout).find(ref=>ref.node.id===id)?.node;
  if(!node)throw Error('Component no longer exists.');
  node.style??={};node.style[key]=value;
}

export function guideStatus(project:Project) {
  const script=project.manifest.script;
  const hasScript=typeof script==='string'&&Object.hasOwn(project.files,script);
  const values=Object.keys(project.manifest.values??{}).length;
  const generated=shouldGenerateScript(project);
  return {hasScript,missingScript:!!script&&!hasScript&&!generated,hasReader:hasScript||values>0||generated,
    luaFiles:Object.keys(project.files).filter(name=>name.endsWith('.lua')).length,
    fileCount:Object.keys(project.files).length,gameCodes:project.manifest.match?.gameCode??[]};
}
