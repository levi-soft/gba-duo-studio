// Asset-heavy projects exceed localStorage's small quota. Keep the old save as a migration fallback.
const legacyKey='gba-duo-studio-project-v1';
/** @type {Promise<IDBDatabase> | undefined} */
let connection;
function database(){
  if(!connection)connection=new Promise((resolve,reject)=>{
    const request=indexedDB.open('gba-duo-studio',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('projects');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(Error('Kho dự án đang bị khóa bởi một tab Studio khác.'));
  }).catch(error=>{connection=undefined;throw error;});
  return connection;
}
export async function loadProjectDraft(){
  if(typeof indexedDB!=='undefined'){
    const db=await database();
    const value=await new Promise((resolve,reject)=>{
      const request=db.transaction('projects','readonly').objectStore('projects').get('current');
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    });
    if(typeof value==='string')return value;
  }
  return localStorage.getItem(legacyKey);
}
/** @param {string} value */
export async function saveProjectDraft(value){
  if(typeof indexedDB==='undefined'){localStorage.setItem(legacyKey,value);return;}
  const db=await database();
  await new Promise((resolve,reject)=>{
    const transaction=db.transaction('projects','readwrite');
    transaction.oncomplete=()=>resolve(undefined);transaction.onabort=()=>reject(transaction.error??Error('Không lưu được dự án.'));transaction.onerror=()=>reject(transaction.error);
    transaction.objectStore('projects').put(value,'current');
  });
}
