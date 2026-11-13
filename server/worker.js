import { DurableObject } from 'cloudflare:workers';
import { createRoom, joinRoom, publicRoom, applyRoomAction, clockRoom } from './model.js';
import { rateLimit } from './limits.js';
export { FamilyGroup } from './family.js';

const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code=()=>Array.from(crypto.getRandomValues(new Uint8Array(8)),n=>alphabet[n%alphabet.length]).join('');
const token=()=>crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function body(request){const text=await request.text();if(text.length>8192)throw Error('Request too large.');return JSON.parse(text);}

export default {
  async fetch(request,env) {
    const url=new URL(request.url),origin=request.headers.get('Origin'),allowed=(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim());
    if(url.pathname==='/health'&&request.method==='GET')return json({ok:true,protocol:1});
    if(!origin||!allowed.includes(origin))return json({error:'This website is not allowed to connect.'},403);
    const cors=response=>{if(response.status===101)return response;const headers=new Headers(response.headers);headers.set('Access-Control-Allow-Origin',origin);headers.set('Vary','Origin');headers.set('Access-Control-Allow-Headers','Content-Type');headers.set('Access-Control-Allow-Methods','POST,GET,OPTIONS');return new Response(response.body,{status:response.status,headers});};
    if(request.method==='OPTIONS')return cors(new Response(null,{status:204}));
    try {
      const path=url.pathname;
      const familyPath=path.match(/^\/families\/([A-Z2-9]{16})(\/socket)?$/);
      if(path==='/families'&&request.method==='POST'||familyPath){
        if(familyPath?.[2]&&request.headers.get('Upgrade')?.toLowerCase()==='websocket')return await env.FAMILIES.get(env.FAMILIES.idFromName(familyPath[1])).fetch(request);
        if(request.method!=='POST')return cors(json({error:'Not found.'},404));
        const ip=request.headers.get('CF-Connecting-IP')||'local',limiter=env.ROOMS.get(env.ROOMS.idFromName('rate:'+await digest(ip)));
        const permit=await limiter.fetch('https://internal/limit',{method:'POST',body:JSON.stringify({kind:path==='/families'?'family':'sync'})});if(!permit.ok){const failure=await permit.json();return cors(json(failure,429));}
        if(path==='/families'){
          const input=await body(request),familyCode=code()+code();
          const result=await env.FAMILIES.get(env.FAMILIES.idFromName(familyCode)).fetch('https://internal/family',{method:'POST',body:JSON.stringify({type:'create',profiles:input.profiles})});
          return cors(json({...await result.json(),code:familyCode},result.status));
        }
        const result=await env.FAMILIES.get(env.FAMILIES.idFromName(familyPath[1])).fetch(new Request('https://internal/family',request));return cors(result);
      }
      if(request.method==='POST'&&(path==='/rooms'||/^\/rooms\/[A-Z2-9]{8}\/join$/.test(path))) {
        const ip=request.headers.get('CF-Connecting-IP')||'local';
        const limiter=env.ROOMS.get(env.ROOMS.idFromName('rate:'+await digest(ip)));
        const permit=await limiter.fetch('https://internal/limit',{method:'POST',body:JSON.stringify({kind:path==='/rooms'?'room':'join'})});
        if(!permit.ok)return cors(json(await permit.json(),429));
        const input=await body(request);
        if(path==='/rooms') {
          for(let i=0;i<3;i++){const roomCode=code(),secret=token();const room=env.ROOMS.get(env.ROOMS.idFromName(roomCode));const result=await room.fetch('https://internal/create',{method:'POST',body:JSON.stringify({code:roomCode,input,tokenHash:await digest(secret)})});if(result.status===409)continue;const data=await result.json();return cors(json(result.ok?{...data,token:secret,seat:0}:data,result.status));}
          return cors(json({error:'Could not create a room. Try again.'},503));
        }
        const roomCode=path.split('/')[2],secret=token();
        const result=await env.ROOMS.get(env.ROOMS.idFromName(roomCode)).fetch('https://internal/join',{method:'POST',body:JSON.stringify({input,tokenHash:await digest(secret)})});
        const data=await result.json();return cors(json(result.ok?{...data,token:secret,seat:1}:data,result.status));
      }
      const match=path.match(/^\/rooms\/([A-Z2-9]{8})\/socket$/);
      if(match&&request.headers.get('Upgrade')?.toLowerCase()==='websocket')return await env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(request);
      return cors(json({error:'Not found.'},404));
    } catch { return cors(json({error:'The service could not process this request. Please try again.'},400)); }
  }
};

export class GameRoom extends DurableObject {
  constructor(ctx,env) {
    super(ctx,env);this.ctx=ctx;this.room=null;this.keys=[];
    ctx.blockConcurrencyWhile(async()=>{const saved=await ctx.storage.get('room');if(saved){this.room=saved.room;this.keys=saved.keys;}});
  }
  presence(){return [0,1].map(seat=>this.ctx.getWebSockets(String(seat)).some(ws=>ws.readyState===1));}
  async persist(room=this.room){await this.ctx.storage.put('room',{room,keys:this.keys});}
  snapshot(){return publicRoom(this.room,this.presence());}
  broadcast(){if(!this.room)return;const payload=JSON.stringify({type:'state',room:this.snapshot()});for(const ws of this.ctx.getWebSockets())try{if(ws.readyState===1)ws.send(payload);}catch{/* socket close is handled separately */}}
  async fetch(request) {
    const path=new URL(request.url).pathname;
    if(path==='/limit') {
      return this.ctx.blockConcurrencyWhile(async()=>{const input=await body(request),now=Date.now(),result=rateLimit(await this.ctx.storage.get('limit'),input.kind,now);await this.ctx.storage.put('limit',result.next);await this.ctx.storage.setAlarm(now+3700000);return json({ok:result.ok,error:result.error,retryAfter:result.retryAfter},result.ok?200:429);});
    }
    if(path==='/create'||path==='/join') {
      return this.ctx.blockConcurrencyWhile(async()=>{try{const data=await body(request);if(path==='/create'){if(this.room)return json({error:'Room already exists.'},409);this.room=createRoom(data.code,data.input);this.keys=[data.tokenHash,null];await this.ctx.storage.setAlarm(this.room.expires);}else{if(!this.room)return json({error:'Room not found. Check the code.'},404);joinRoom(this.room,data.input);this.keys[1]=data.tokenHash;}await this.persist();this.broadcast();return json({code:this.room.code,room:this.snapshot()},201);}catch(error){return json({error:error.message},400);}});
    }
    if(!this.room||Date.now()>=this.room.expires)return json({error:'Room expired or not found.'},404);
    const protocols=(request.headers.get('Sec-WebSocket-Protocol')||'').split(',').map(s=>s.trim());
    const credential=protocols.find(p=>p.startsWith('auth.'))?.slice(5);
    if(!credential||!protocols.includes('puzzle-zone-v1'))return json({error:'Rejoin this room from your original browser.'},401);
    const seat=this.keys.indexOf(await digest(credential));
    if(seat<0)return json({error:'Seat could not be verified.'},401);
    for(const old of this.ctx.getWebSockets(String(seat)))old.close(4001,'Seat opened in another tab.');
    const pair=new WebSocketPair(),[client,server]=Object.values(pair);
    this.ctx.acceptWebSocket(server,[String(seat)]);server.serializeAttachment({seat,window:0,messages:0});
    // Hibernation keeps idle rooms from running continuously.
    await this.ctx.blockConcurrencyWhile(async()=>{clockRoom(this.room,this.presence().every(Boolean));await this.persist();this.broadcast();});
    return new Response(null,{status:101,webSocket:client,headers:{'Sec-WebSocket-Protocol':'puzzle-zone-v1'}});
  }
  async webSocketMessage(ws,raw) {
    const attachment=ws.deserializeAttachment();
    if(typeof raw!=='string'||raw.length>16384){ws.close(1009,'Message too large.');return;}
    const second=Math.floor(Date.now()/1000);if(attachment.window!==second){attachment.window=second;attachment.messages=0;}attachment.messages++;ws.serializeAttachment(attachment);if(attachment.messages>10){ws.send(JSON.stringify({type:'error',error:'Please slow down.'}));return;}
    await this.ctx.blockConcurrencyWhile(async()=>{
      let message;
      try {
        message=JSON.parse(raw);
        if(message.type==='sync'){ws.send(JSON.stringify({type:'state',room:this.snapshot()}));return;}
        // A failed action never changes the live or persisted room.
        const next=structuredClone(this.room);
        const changed=applyRoomAction(next,attachment.seat,message,this.presence().every(Boolean));
        if(changed){await this.persist(next);this.room=next;this.broadcast();}
        ws.send(JSON.stringify({type:'ack',id:message.id}));
      }catch(error){ws.send(JSON.stringify({type:'error',id:message?.id,error:error.message}));if(this.room)ws.send(JSON.stringify({type:'state',room:this.snapshot()}));}
    });
  }
  async webSocketClose(ws,code,reason){try{ws.close(code===1006?1000:code,reason);}catch{}if(this.room)await this.ctx.blockConcurrencyWhile(async()=>{clockRoom(this.room,this.presence().every(Boolean));await this.persist();this.broadcast();});}
  async webSocketError(ws){return this.webSocketClose(ws,1011,'Connection interrupted.');}
  async alarm(){for(const ws of this.ctx.getWebSockets())ws.close(4004,'Room expired.');await this.ctx.storage.deleteAll();this.room=null;this.keys=[];}
}
