/** @param {import('./types.js').TreeRef[]} entries @param {Record<string,boolean>} [collapsed] @param {string} [query] @param {(r:import('./types.js').TreeRef)=>string} [labelOf] */
export function sceneRows(entries,collapsed={},query='',labelOf=(r)=>r.node.type) {
  const search=query.trim().toLocaleLowerCase();
  const keep=new Set(),ancestors=[];
  if(search) for(const ref of entries) {
    ancestors.length=ref.depth;ancestors[ref.depth]=ref.node.id;
    if([labelOf(ref),ref.node.id,ref.node.type,ref.node.class,ref.node.src].join(' ').toLocaleLowerCase().includes(search)) for(const id of ancestors)keep.add(id);
  }
  /** @type {number|null} */
  let hiddenDepth=null;
  return entries.flatMap((ref,i)=>{
    if(hiddenDepth!==null&&ref.depth<=hiddenDepth)hiddenDepth=null;
    if(search&&!keep.has(ref.node.id))return [];
    if(!search&&hiddenDepth!==null)return [];
    const hasChildren=entries[i+1]?.depth>ref.depth;
    if(!search&&hasChildren&&collapsed[ref.node.id])hiddenDepth=ref.depth;
    return [{...ref,hasChildren}];
  });
}
/** @param {import('./types.js').TreeRef[]} entries @param {string} id @param {Record<string,boolean>} collapsed */
export function revealAncestors(entries,id,collapsed) {
  const index=entries.findIndex(r=>r.node.id===id);if(index<0)return collapsed;
  const next={...collapsed};let depth=entries[index].depth;
  for(let i=index-1;i>=0;i--)if(entries[i].depth<depth){delete next[entries[i].node.id];depth=entries[i].depth;}
  return next;
}
