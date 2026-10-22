import {describe,it,expect} from 'vitest';
import {walk} from './tree.js';
import {parseLayout} from '../preview/layout.js';
import type {LayoutNode} from './types.js';

describe('editor traversal limits',()=>{
  it('rejects deep unused branches even when the native parser accepts the pages widget',()=>{
    const root:LayoutNode={id:'root',type:'pages',pages:[{name:'main',child:{id:'page',type:'text',text:'Hello'}}]};
    let cursor=root;
    for(let i=0;i<162;i++){
      const child:LayoutNode={id:`extra-${i}`,type:'box'};
      cursor.child=child;cursor=child;
    }
    // Native pages intentionally renders only pages[].child; the editor also
    // visits the unused child branch while assigning IDs and building Scene.
    expect(()=>parseLayout(root)).not.toThrow();
    expect(()=>walk(root)).toThrow(/editor complexity limits/);
  });
  it('bounds cyclic in-memory edits without overflowing the call stack',()=>{
    const root:LayoutNode={id:'cycle',type:'box'};root.child=root;
    expect(()=>walk(root)).toThrow(/editor complexity limits/);
  });
  it('accepts the node budget and rejects one extra node',()=>{
    const root:LayoutNode={id:'root',type:'column',children:Array.from({length:49999},(_,i)=>({id:String(i),type:'text'}))};
    expect(walk(root)).toHaveLength(50000);
    root.children!.push({id:'overflow',type:'text'});
    expect(()=>walk(root)).toThrow(/editor complexity limits/);
  });
});
