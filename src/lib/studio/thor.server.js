import net from 'node:net';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import {StringDecoder} from 'node:string_decoder';
import {bridgeCommand} from './thor-contract.js';
/** @typedef {import('./types.js').BridgeInfo} BridgeInfo */
const exec=promisify(execFile),port=8787;
let connectedSerial='',generation=0;
/** @type {Promise<unknown>} */
let connecting=Promise.resolve();
function adbPath(){
  const local=path.resolve(process.cwd(),'../tools/android/platform-tools/adb.exe');
  return process.env.GBA_DUO_ADB || (fs.existsSync(local)?local:'adb');
}
/** @param {string[]} args */
async function adb(...args){
  try{return (await exec(adbPath(),args,{timeout:10000,windowsHide:true,maxBuffer:1024*1024})).stdout;}
  catch(error){
    const code=error&&typeof error==='object'&&'code' in error?error.code:undefined;
    const stderr=error&&typeof error==='object'&&'stderr' in error&&typeof error.stderr==='string'?error.stderr.trim():'';
    throw Error(code==='ENOENT'?'Chưa tìm thấy ADB.':'ADB: '+(stderr||(error instanceof Error?error.message:String(error))));
  }
}
export async function thorDevices(){
  const text=await adb('devices','-l');
  return text.split(/\r?\n/).filter(line=>/^\S+\s+(device|offline|unauthorized)\b/.test(line)).map(line=>{
    const [serial,state,...details]=line.trim().split(/\s+/);
    return {serial,state,model:details.find(p=>p.startsWith('model:'))?.slice(6)??serial};
  });
}
/** Serialize forwarding changes; failed handshakes never leave a connected device. @param {string} [serial] @returns {Promise<BridgeInfo & {bridge:string}>} */
export function connectThor(serial){
  const next=connecting.catch(()=>{}).then(async()=>{
    connectedSerial='';const current=++generation;
    const devices=await thorDevices(),available=devices.filter(d=>d.state==='device');
    const target=serial?available.find(d=>d.serial===serial):available.length===1?available[0]:null;
    if(!target)throw Error(devices.some(d=>d.state==='unauthorized')?'Hãy cho phép gỡ lỗi USB trên Thor.':'Chọn một thiết bị ADB đang kết nối.');
    let lastError=Error('Không kết nối được GBA Duo Plus.');
    for(const endpoint of ['gbaduo-plus-studio','gbaduo-dev-bridge']){
      try{
        await adb('-s',target.serial,'forward',`tcp:${port}`,'localabstract:'+endpoint);
        const info=await request('info',{},target.serial,current);
        if(typeof info.gameCode!=='string')throw Error('Invalid bridge game information.');
        connectedSerial=target.serial;return {...info,bridge:endpoint};
      }catch(error){lastError=error instanceof Error?error:Error(String(error));}
    }
    throw lastError;
  });
  connecting=next;return next;
}
/** @param {string} command @param {{ranges?:import('./types.js').RamRange[]}} [parameters] @returns {Promise<BridgeInfo>} */
export function thorRequest(command,parameters={}){
  const safe=bridgeCommand(command,parameters.ranges);
  if(!connectedSerial)return Promise.reject(Error('Hãy bấm Kết nối Thor trước.'));
  return request(command,safe,connectedSerial,generation);
}
/** @param {string} command @param {{ranges?:import('./types.js').RamRange[]}} parameters @param {string} serial @param {number} current @returns {Promise<BridgeInfo>} */
function request(command,parameters,serial,current){
  return new Promise((resolve,reject)=>{
    const id=randomUUID(),decoder=new StringDecoder('utf8');let text='',done=false,bytes=0;
    const socket=net.createConnection({host:'127.0.0.1',port});
    /** @param {unknown} error @param {BridgeInfo} [value] */
    function finish(error,value){if(done)return;done=true;socket.destroy();if(error)reject(error);else if(value)resolve(value);else reject(Error('Invalid bridge response.'));}
    socket.setTimeout(7000,()=>finish(Error('Thor chưa phản hồi. Kiểm tra game đang chạy trong GBA Duo Plus.')));
    socket.on('connect',()=>socket.write(JSON.stringify({...parameters,command,id})+'\n'));
    socket.on('error',()=>finish(Error('Chưa truy cập được cầu nối. Hãy mở game bằng GBA Duo Plus trên Thor.')));
    socket.on('data',chunk=>{
      bytes+=chunk.length;if(bytes>1024*1024)return finish(Error('Phản hồi cầu nối quá lớn.'));
      text+=decoder.write(chunk);if(!text.includes('\n'))return;
      try{
        const response=JSON.parse(text.slice(0,text.indexOf('\n')));
        if(!response||typeof response!=='object'||response.id!==id||response.protocol!==1)throw Error('Phiên bản hoặc mã phản hồi cầu nối không khớp.');
        if(!response.ok)throw Error(typeof response.error==='string'?response.error:'Không đọc được RAM.');
        if(current!==generation)throw Error('Bridge device changed during the request.');
        if(!response.result||typeof response.result!=='object'||Array.isArray(response.result))throw Error('Invalid bridge response.');
        finish(null,{...response.result,deviceSerial:serial});
      }catch(error){finish(error);}
    });
    socket.on('end',()=>{if(!done)finish(Error('Cầu nối đóng kết nối. Hãy kiểm tra GBA Duo Plus đang mở game.'));});
  });
}
