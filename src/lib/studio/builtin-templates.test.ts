import {describe,it,expect} from 'vitest';
import JSZip from 'jszip';
import {builtinTemplates,builtinTemplateBytes} from './builtin-templates.js';
import {GET} from '../../routes/api/templates/+server.js';
import {POST} from '../../routes/api/thor/+server.js';
describe('Neutral public Studio entry points',()=>{
  it('provides English and Vietnamese examples without bundled game resources',async()=>{
    for(const language of ['en','vi']){
      const catalog=builtinTemplates(language);expect(catalog).toHaveLength(3);
      const zip=await JSZip.loadAsync((await builtinTemplateBytes(catalog[1].file))!);
      const data=JSON.parse(await zip.file('preview-data.json')!.async('string'));
      expect(data.items[0].name).toBe(language==='en'?'Iron sword':'Kiếm sắt');
      expect(Object.keys(zip.files).some(p=>p.startsWith('assets/')||p.endsWith('.lua'))).toBe(false);
    }
    expect(await builtinTemplateBytes('../private.zip')).toBeNull();
  });
  it('hides private template ZIPs on the public route by default',async()=>{
    const response=await GET({url:new URL('http://localhost/api/templates')} as Parameters<typeof GET>[0]);
    const catalog=await response.json();expect(catalog.map((p:{file:string})=>p.file)).toEqual(builtinTemplates().map(p=>p.file));
    const hidden=await GET({url:new URL('http://localhost/api/templates?file=private-companion.zip')} as Parameters<typeof GET>[0]);expect(hidden.status).toBe(404);
  });
  it('localizes bridge validation errors before sending them to the UI',async()=>{
    for(const language of ['en','vi']){
      const url=new URL('http://localhost/api/thor');
      const request=new Request(url,{method:'POST',body:JSON.stringify({command:'write',language})});
      const response=await POST({request,url} as Parameters<typeof POST>[0]);expect(response.status).toBe(503);
      expect((await response.json()).error).toBe(language==='en'?'Invalid read-only command.':'Lệnh chỉ đọc không hợp lệ.');
    }
  });
});
