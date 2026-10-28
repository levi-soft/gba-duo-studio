import {validateGraphicsSpecs} from './rom-graphics.js';
import {validateGameInfo} from './memory-values.js';
import {shouldGenerateScript} from './computed-values.js';
import {widget,walk} from './project.js';
import type {Project,GraphicsSpec,BridgeInfo} from './types.js';

export function insertGraphicsBlock(project:Project,parentId:string,key:string,spec:GraphicsSpec,info:BridgeInfo){
  if(project.manifest.script&&!shouldGenerateScript(project))throw Error('Custom Lua is preserved. Use a generated-data project for visual ROM image blocks.');
  if(project.manifest.match?.gameCode?.length)validateGameInfo(project.manifest,info);
  if(!info.gameCode||!info.crc32)throw Error('Connect a game before adding a ROM image.');
  if(Object.hasOwn(project.manifest.studioGraphics??{},key)||Object.hasOwn(project.manifest.values??{},key)||Object.hasOwn(project.manifest.studioComputed??{},key))throw Error('This data block key already exists.');
  const specs={...project.manifest.studioGraphics,[key]:spec};validateGraphicsSpecs(specs);
  const parent=walk(project.layout).find(r=>r.node.id===parentId)?.node;
  if(!parent||!['row','column','box'].includes(parent.type))throw Error('Select a container in Scene first.');
  project.manifest.studioGraphics=specs;
  if(!project.manifest.match?.gameCode?.length)project.manifest.match={gameCode:[info.gameCode],crc32:[info.crc32]};
  else if(!project.manifest.match.crc32?.length)project.manifest.match.crc32=[info.crc32];
  // Preview pixels stay in transient editor state. Export carries an empty placeholder.
  project.data[key]='';
  const image=widget('image');image.src='$'+key;image.style={width:spec.width+'px',height:spec.height+'px','object-fit':'contain'};
  parent.children??=[];parent.children.push(image);return image.id;
}
