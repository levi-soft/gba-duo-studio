import {beforeEach,describe,expect,it,vi} from 'vitest';
const backend=vi.hoisted(()=>({thorDevices:vi.fn(),connectThor:vi.fn(),thorRequest:vi.fn()}));
vi.mock('./thor.server.js',()=>backend);
import {GET,POST} from '../../routes/api/thor/+server.js';
function event(body:unknown,origin?:string,url='http://127.0.0.1:5173/api/thor'){
  return {url:new URL(url),request:new Request(url,{method:'POST',headers:{'content-type':'application/json',...(origin?{origin}:{})},body:JSON.stringify(body)})};
}
describe('loopback read-only bridge API',()=>{
  beforeEach(()=>{vi.clearAllMocks();backend.thorRequest.mockResolvedValue({gameCode:'TEST'});backend.connectThor.mockResolvedValue({gameCode:'TEST'});backend.thorDevices.mockResolvedValue([]);});
  it('rejects foreign origins and non-loopback hosts before calling ADB',async()=>{
    expect((await POST(event({command:'connect'},'https://other.example'))).status).toBe(503);
    expect((await GET(event({},undefined,'http://192.168.1.2:5173/api/thor'))).status).toBe(503);
    expect(backend.connectThor).not.toHaveBeenCalled();expect(backend.thorDevices).not.toHaveBeenCalled();
  });
  it('rejects cross-site fetch metadata even without an Origin',async()=>{
    const request=event({command:'connect'});request.request.headers.set('sec-fetch-site','cross-site');
    expect((await POST(request)).status).toBe(503);expect(backend.connectThor).not.toHaveBeenCalled();
  });
  it.each(['write','input','focusUnit','shell','unknown','__proto__'])('rejects non-read command %s',async command=>{
    const response=await POST(event({command}));expect(response.status).toBe(503);expect(backend.thorRequest).not.toHaveBeenCalled();
  });
  it.each([undefined,[],[{address:0x08000000,length:2}],[{address:0x0203ffff,length:2}],[{address:0x02000000,length:4097}],[{address:0x02000000,length:-1}],[{address:'0x02000000',length:2}],Array.from({length:129},()=>({address:0x02000000,length:1}))])('rejects invalid or out-of-bounds ranges',async ranges=>{
    expect((await POST(event({command:'read',ranges}))).status).toBe(503);expect(backend.thorRequest).not.toHaveBeenCalled();
  });
  it('forwards only validated memory fields, discarding untrusted parameters',async()=>{
    const ranges=[{address:0x02000000,length:16,write:'no'}];
    expect((await POST(event({command:'read',ranges,write:123},'http://127.0.0.1:5173'))).status).toBe(200);
    expect(backend.thorRequest).toHaveBeenCalledWith('read',{ranges:[{address:0x02000000,length:16}]});
  });
  it('rejects malformed envelopes and device serials',async()=>{
    for(const body of [null,[],{command:'connect',serial:['device']},{command:'connect',serial:'-s bad'}])expect((await POST(event(body))).status).toBe(503);
    expect(backend.connectThor).not.toHaveBeenCalled();
  });
});
