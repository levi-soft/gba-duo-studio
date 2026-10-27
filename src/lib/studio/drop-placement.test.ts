import {it,expect} from 'vitest';import type {LayoutNode} from './types.js';
import {dropPosition,insertNodeAt,moveNodeTo} from './drop-placement.js';
const tree=():LayoutNode=>({id:'root',type:'column',children:[{id:'a',type:'text'},{id:'b',type:'text'},{id:'box',type:'row',children:[{id:'c',type:'text'}]}]});
it('distinguishes before/after edges from container interiors',()=>{expect(dropPosition(true,.5)).toBe('inside');expect(dropPosition(true,.1)).toBe('before');expect(dropPosition(false,.8)).toBe('after');expect(dropPosition(false,.1,true)).toBe('inside');});
it('inserts and reorders at the indicated position, including moves in the same array',()=>{
 const root=tree();moveNodeTo(root,'a','b','after');expect(root.children!.map(n=>n.id)).toEqual(['b','a','box']);
 moveNodeTo(root,'a','b','before');expect(root.children!.map(n=>n.id)).toEqual(['a','b','box']);
 insertNodeAt(root,{id:'new',type:'bar'},'b','before');expect(root.children!.map(n=>n.id)).toEqual(['a','new','b','box']);
 moveNodeTo(root,'new','box','inside');expect(root.children![2].children!.map(n=>n.id)).toEqual(['c','new']);
});
it('rejects cycles, roots and duplicate IDs without removing the original node',()=>{
 const root=tree(),before=JSON.stringify(root);
 expect(()=>moveNodeTo(root,'box','c','before')).toThrow('itself');expect(()=>moveNodeTo(root,'root','box','inside')).toThrow('cannot');expect(()=>insertNodeAt(root,{id:'a',type:'text'},'box','inside')).toThrow('Duplicate');expect(JSON.stringify(root)).toBe(before);
});
