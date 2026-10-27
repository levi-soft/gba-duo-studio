import {walk} from './tree.js';import type {LayoutNode} from './types.js';
export type DropPosition='before'|'inside'|'after';
export function dropPosition(container:boolean,fraction:number,root=false):DropPosition {
  if(root||(container&&fraction>=0.25&&fraction<=0.75))return 'inside';
  return fraction<0.5?'before':'after';
}
function destination(root:LayoutNode,targetId:string,position:DropPosition){
  const ref=walk(root).find(r=>r.node.id===targetId);if(!ref)throw Error('Drop target no longer exists.');
  if(position==='inside'){
    let node=ref.node;
    if(node.type==='pages')node=(node.pages?.find(p=>p.name===node.initial)??node.pages?.[0])?.child??node;
    if(!['row','column','box'].includes(node.type))throw Error('Drop inside a row, column or container.');
    node.children??=[];return {parent:node,index:node.children.length};
  }
  if(ref.key!=='children'||!ref.parent||!('type'in ref.parent)||ref.index===null||!ref.parent.children)throw Error('Pages and repeated templates cannot be reordered here.');
  return {parent:ref.parent,index:ref.index+(position==='after'?1:0)};
}
export function insertNodeAt(root:LayoutNode,node:LayoutNode,targetId:string,position:DropPosition):void {
  if(walk(root).some(r=>r.node.id===node.id))throw Error('Duplicate component ID.');
  const {parent,index}=destination(root,targetId,position);parent.children!.splice(index,0,node);
}
export function moveNodeTo(root:LayoutNode,id:string,targetId:string,position:DropPosition):void {
  const ref=walk(root).find(r=>r.node.id===id);
  if(!ref||ref.key!=='children'||!ref.parent||!('type'in ref.parent)||ref.index===null||!ref.parent.children)throw Error('This component cannot be moved.');
  const {parent}=destination(root,targetId,position);
  if(id===targetId||walk(ref.node).some(r=>r.node.id===parent.id))throw Error('A component cannot contain itself.');
  ref.parent.children.splice(ref.index,1);
  const next=destination(root,targetId,position);next.parent.children!.splice(next.index,0,ref.node);
}
