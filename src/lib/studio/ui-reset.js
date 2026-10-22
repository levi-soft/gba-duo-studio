/** @typedef {{identity:string[],states:Record<string,string>}} UiResetPolicy */
// Snapshot-driven defaults, shared by the live reader and generated Lua.
/** @param {string} k */
const key=k=>typeof k==='string'&&/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)&&!['__proto__','constructor','prototype'].includes(k);
/** @param {UiResetPolicy} policy */
export function validateUiReset(policy){
  if(!Array.isArray(policy.identity)||!policy.identity.length||policy.identity.length>16||!policy.identity.every(key)||!policy.states||Object.keys(policy.states).length>32)throw Error('Cấu hình mặc định UI không hợp lệ.');
  for(const [name,binding] of Object.entries(policy.states))if(!key(name)||typeof binding!=='string'||!binding.startsWith('$')||!key(binding.slice(1)))throw Error('Trường mặc định UI không hợp lệ.');
  return policy;
}
/** @param {import('./types.js').DataValues} values @param {UiResetPolicy | undefined} policy @param {{uiIdentity?:string}} context @param {string} sessionId */
export function applyUiReset(values,policy,context,sessionId){
  if(!policy)return values;validateUiReset(policy);
  const identity=JSON.stringify([sessionId,...policy.identity.map(k=>values[k])]);
  if(context.uiIdentity===identity)return values;
  context.uiIdentity=identity;
  const set=Object.fromEntries(Object.entries(policy.states).map(([name,binding])=>[name,values[binding.slice(1)]]));
  return {...values,ui:{set}};
}
/** @param {UiResetPolicy} policy */
export function uiResetLua(policy){
  validateUiReset(policy);
  return [
    `  local identity = table.concat({${policy.identity.map(k=>`tostring(v["${k}"])`).join(',')}}, "|")`,
    '  if identity ~= lastUiIdentity then',
    `    v.ui = {set={${Object.entries(policy.states).map(([name,binding])=>`["${name}"]=v["${binding.slice(1)}"]`).join(',')}}}`,
    '    lastUiIdentity = identity',
    '  end',
  ];
}
