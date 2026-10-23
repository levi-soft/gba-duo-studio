import {widget,walk} from './project.js';
/** @param {import('./types.js').Project} project @param {string} parentId @param {string} current @param {string} maximum */
export function insertBoundBar(project,parentId,current,maximum){
  const values=project.manifest.values??{};
  if(!Object.hasOwn(values,current)||!Object.hasOwn(values,maximum))throw Error('Choose two saved numeric blocks.');
  const parent=walk(project.layout).find(ref=>ref.node.id===parentId)?.node;
  if(!parent||!['row','column','box'].includes(parent.type))throw Error('Select a container in Scene first.');
  const bar=widget('bar');
  bar.value='$'+current;bar.maxKey='$'+maximum;bar.label='{'+current+'} / {'+maximum+'}';
  parent.children??=[];parent.children.push(bar);
  return bar.id;
}
