import {EventEmitter} from 'node:events';
import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({adb:vi.fn(),connect:vi.fn()}));
vi.mock('node:util',()=>({default:{promisify:()=>mocks.adb},promisify:()=>mocks.adb}));
vi.mock('node:net',()=>({default:{createConnection:mocks.connect}}));
type Plan='ok'|'bad'|'hold';
class Socket extends EventEmitter {
  payload:{id:string;command:string}|undefined;
  destroyed=false;
  constructor(private plan:Plan){super();queueMicrotask(()=>this.emit('connect'));}
  setTimeout(){return this;}
  destroy(){this.destroyed=true;return this;}
  write(text:string){this.payload=JSON.parse(text);if(this.plan!=='hold')queueMicrotask(()=>this.respond());return true;}
  respond(){this.emit('data',Buffer.from(JSON.stringify({id:this.payload?.id,protocol:1,ok:this.plan!=='bad',error:'Handshake rejected.',result:{gameCode:'TEST',sessionId:'session-a'}})+'\n'));}
}
describe('ADB bridge connection identity',()=>{
  let plans:Plan[],sockets:Socket[];
  beforeEach(()=>{
    vi.resetModules();vi.clearAllMocks();plans=[];sockets=[];
    mocks.adb.mockImplementation(async(_path:string,args:string[])=>({stdout:args[0]==='devices'?'List of devices attached\ndevice-a device model:Thor\ndevice-b device model:Thor\n':''}));
    mocks.connect.mockImplementation(()=>{const socket=new Socket(plans.shift()??'ok');sockets.push(socket);return socket;});
  });
  it('does not expose a connected device after both handshakes fail',async()=>{
    plans.push('bad','bad');const bridge=await import('./thor.server.js');
    await expect(bridge.connectThor('device-a')).rejects.toThrow('Handshake rejected.');
    await expect(bridge.thorRequest('info')).rejects.toThrow('Kết nối Thor');
    expect(sockets).toHaveLength(2);expect(sockets.every(socket=>socket.destroyed)).toBe(true);
  });
  it('connects to loopback only and reports the serial of the confirmed handshake',async()=>{
    plans.push('bad','ok');const bridge=await import('./thor.server.js');
    const result=await bridge.connectThor('device-a');
    expect(result.deviceSerial).toBe('device-a');expect(result.bridge).toBe('gbaduo-dev-bridge');
    expect(mocks.connect).toHaveBeenCalledWith({host:'127.0.0.1',port:8787});
    expect((await bridge.thorRequest('info')).deviceSerial).toBe('device-a');
  });
  it('rejects a response received after a device switch instead of relabeling stale data',async()=>{
    const bridge=await import('./thor.server.js');await bridge.connectThor('device-a');
    plans.push('hold');const pending=bridge.thorRequest('info');
    // Install the rejection observer before the delayed response is delivered.
    const rejection=expect(pending).rejects.toThrow('device changed');
    await bridge.connectThor('device-b');sockets[1].respond();await rejection;
    expect((await bridge.thorRequest('info')).deviceSerial).toBe('device-b');
  });
  it('blocks writes and out-of-RAM reads even when called without the HTTP route',async()=>{
    const bridge=await import('./thor.server.js');
    expect(()=>bridge.thorRequest('write')).toThrow();
    expect(()=>bridge.thorRequest('read',{ranges:[{address:0x08000000,length:4}]})).toThrow('EWRAM');
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  it('closes oversized responses before parsing them',async()=>{
    const bridge=await import('./thor.server.js');await bridge.connectThor('device-a');
    plans.push('hold');const rejection=expect(bridge.thorRequest('data')).rejects.toThrow('quá lớn');
    sockets[1].emit('data',Buffer.alloc(1024*1024+1,65));await rejection;
    expect(sockets[1].destroyed).toBe(true);
  });
  it('preserves Unicode when a UTF-8 character is split across network chunks',async()=>{
    const bridge=await import('./thor.server.js');await bridge.connectThor('device-a');
    plans.push('hold');const pending=bridge.thorRequest('data');await Promise.resolve();
    const socket=sockets[1],payload=Buffer.from(JSON.stringify({id:socket.payload?.id,protocol:1,ok:true,result:{gameCode:'TEST',data:{name:'Thiên mã'}}})+'\n');
    const at=payload.indexOf(Buffer.from('ê'))+1;
    socket.emit('data',payload.subarray(0,at));socket.emit('data',payload.subarray(at));
    expect((await pending).data?.name).toBe('Thiên mã');
  });
});
