import {json} from '@sveltejs/kit';
import {thorDevices,connectThor,thorRequest} from '../../../lib/studio/thor.server.js';
import {translate} from '../../../lib/studio/i18n.js';
import {bridgeCommand} from '../../../lib/studio/thor-contract.js';

/** @param {Request} request @param {URL} url */
function localOnly(request,url){
  if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('Cầu nối chỉ dùng trên PC cục bộ.');
  const origin=request.headers.get('origin');
  if(origin&&origin!==url.origin)throw Error('Yêu cầu khác nguồn không được phép.');
  if(request.headers.get('sec-fetch-site')==='cross-site')throw Error('Yêu cầu khác nguồn không được phép.');
}
/** @param {{request:Request,url:URL}} event */
export async function GET({request,url}){
  try{localOnly(request,url);return json({devices:await thorDevices()});}
  catch(error){return json({error:translate(url.searchParams.get('language')??'en',error instanceof Error?error.message:String(error))},{status:503});}
}
/** @param {{request:Request,url:URL}} event */
export async function POST({request,url}){
  let language='en';
  try{
    localOnly(request,url);
    const text=await request.text();if(text.length>8192)throw Error('Yêu cầu quá lớn.');
    const body=JSON.parse(text);
    if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Invalid bridge request.');
    const {command,serial,ranges,language:requestedLanguage}=body;
    language=requestedLanguage==='vi'?'vi':'en';
    if(command==='connect'){
      if(serial!=null&&(typeof serial!=='string'||serial.length>256||!/^[-A-Za-z0-9_.:]+$/.test(serial)))throw Error('Invalid device serial.');
      return json(await connectThor(serial));
    }
    const safe=bridgeCommand(command,ranges);
    return json(await thorRequest(command,safe));
  }catch(error){return json({error:translate(language,error instanceof Error?error.message:String(error))},{status:503});}
}
