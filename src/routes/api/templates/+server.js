import { json } from '@sveltejs/kit';
import {builtinTemplates,builtinTemplateBytes} from '../../../lib/studio/builtin-templates.js';
/** @param {{url:URL}} event */
export async function GET({url}) {
  try {
    const file=url.searchParams.get('file');
    if(file) {
      const builtin=await builtinTemplateBytes(file);
      if(!builtin)return json({error:'Template not found.'},{status:404});
      return new Response(new Uint8Array(builtin).buffer,{headers:{'content-type':'application/zip','cache-control':'no-store'}});
    }
    const language=url.searchParams.get('language')==='vi'?'vi':'en';
    return json(builtinTemplates(language));
  } catch(e) { return json({error:e instanceof Error?e.message:String(e)},{status:404}); }
}
