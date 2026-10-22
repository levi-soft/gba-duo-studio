import {resolve} from '../preview/data.js';
import {walk,clone} from './tree.js';
import {dataPaths} from './project.js';
/** @param {import('./types.js').Project} project @param {string} id */
export function bindingFields(project,id) {
  /** @type {import('./types.js').JsonValue} */
  let item=project.data;let scoped=false;
  for(const {node} of walk(project.layout)) {
    if(node.type!=='list'||!walk(node.template).some(r=>r.node.id===id))continue;
    const path=(node.items??'').replace(/^\$/,'');
    /** @type {import('./types.js').JsonValue} */
    const values=resolve(path,item)??resolve(path,project.data);
    if(Array.isArray(values)&&values.length){item=values[0];scoped=true;}
  }
  const fields=dataPaths(project.data).map(f=>({...f,label:`Toàn cục · ${f.path}`}));
  if(scoped&&item&&typeof item==='object'&&!Array.isArray(item)) {
    const local=dataPaths(item).map(f=>({...f,label:`Phần tử danh sách · ${f.path}`,scoped:true}));
    const localNames=new Set(local.map(f=>f.path));
    return [...local,{path:'@index',value:0,label:'Phần tử danh sách · @index',scoped:true},...fields.filter(f=>!localNames.has(f.path))];
  }
  return fields;
}
/** @param {import('./types.js').JsonValue} data @param {(string|number)[]} path @param {import('./types.js').JsonValue} value @returns {import('./types.js').JsonValue} */
export function updateDataValue(data,path,value) {
  if(!path.length)return value;
  const next=clone(data);
  /** @type {import('./types.js').JsonValue | undefined} */
  let target=next;
  for(const key of path.slice(0,-1)){if(!target||typeof target!=='object'||!Object.hasOwn(target,key))throw Error('Đường dẫn dữ liệu không tồn tại.');if(typeof target!=='object')throw Error('Invalid data path.');target=Array.isArray(target)?target[Number(key)]:target[key];}
  const key=path.at(-1);if(key==null||!target||typeof target!=='object'||!Object.hasOwn(target,key))throw Error('Trường dữ liệu không tồn tại.');
  Object.defineProperty(target,key,{value,writable:true,enumerable:true,configurable:true});return next;
}
