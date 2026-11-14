import {validScreenTime,emptyScreenTime,mergeScreenTime} from '../src/lib/screen-time.js';
import { DurableObject } from 'cloudflare:workers';
import { validData } from '../src/lib/storage.js';
export const FAMILY_TTL=180*24*60*60*1000;
const CHUNK=24000;
const response=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export function validRoster(profiles){return Array.isArray(profiles)&&profiles.length>0&&profiles.length<=20&&new Set(profiles.map(p=>p?.id)).size===profiles.length&&profiles.every(p=>p&&typeof p.id==='string'&&/^[\w-]{1,80}$/.test(p.id)&&typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=30&&typeof p.avatar==='string'&&p.avatar.length<20);}
export class FamilyGroup extends DurableObject {
  constructor(ctx,env){super(ctx,env);this.ctx=ctx;this.head=null;ctx.blockConcurrencyWhile(async()=>{this.head=await ctx.storage.get('head')||null;});}
  snapshot(){return this.head;}
  broadcast(){const message=JSON.stringify({type:'family',family:this.head});for(const ws of this.ctx.getWebSockets())try{ws.send(message);}catch{}}
  async fetch(request){
    if(request.headers.get('Upgrade')?.toLowerCase()==='websocket'){
      if(!this.head)return response({error:'Family not found. Check your family code.'},404);
      const pair=new WebSocketPair(),[client,server]=Object.values(pair);this.ctx.acceptWebSocket(server);server.send(JSON.stringify({type:'family',family:this.head}));return new Response(null,{status:101,webSocket:client});
    }
    return this.ctx.blockConcurrencyWhile(async()=>{
      try {
        const text=await request.text();if(text.length>2100000)return response({error:'This profile is too large to synchronize. Export a backup first.'},413);
        const input=JSON.parse(text),now=Date.now();
        if(input.type==='create'){
          if(this.head)return response({error:'Family code already exists.'},409);
          if(!validRoster(input.profiles))return response({error:'Choose 1–20 valid family players.'},400);
          this.head={version:1,revision:1,rosterRevision:1,profiles:input.profiles.map(p=>({id:p.id,name:p.name.trim(),avatar:p.avatar,revision:0})),created:now,updated:now};
          await this.ctx.storage.put('head',this.head);await this.ctx.storage.setAlarm(now+FAMILY_TTL);return response({family:this.head},201);
        }
        if(!this.head)return response({error:'Family not found. Check the code, or create a new shared family.'},404);
        await this.ctx.storage.setAlarm(now+FAMILY_TTL);
        if(input.type==='head')return response({family:this.head});
        if(input.type==='roster'){
          if(input.baseRevision!==this.head.rosterRevision)return response({error:'The family list changed on another device. Refresh it before editing again.',family:this.head},409);
          if(!validRoster(input.profiles))return response({error:'Keep between 1 and 20 valid family players.'},400);
          const profiles=input.profiles.map(p=>({...this.head.profiles.find(old=>old.id===p.id),id:p.id,name:p.name.trim(),avatar:p.avatar}));
          for(const p of profiles)if(!Number.isInteger(p.revision))p.revision=0;
          const removed=this.head.profiles.filter(p=>!profiles.some(n=>n.id===p.id));
          const next={...this.head,profiles,revision:this.head.revision+1,rosterRevision:this.head.rosterRevision+1,updated:now};
          await this.ctx.storage.transaction(async tx=>{for(const p of removed){const manifest=await tx.get('profile:'+p.id);if(manifest)await tx.delete(Array.from({length:manifest.chunks},(_,i)=>`data:${p.id}:${i}`));await tx.delete('profile:'+p.id);const screen=await tx.get('screen:'+p.id);if(screen)await tx.delete(Array.from({length:screen.chunks},(_,i)=>`screen-data:${p.id}:${i}`));await tx.delete('screen:'+p.id);}await tx.put('head',next);});
          this.head=next;this.broadcast();return response({family:this.head});
        }
        const member=this.head.profiles.find(p=>p.id===input.profileId);if(!member)return response({error:'That player is no longer in this shared family.'},404);
        if(input.type==='screen'){
          const manifest=await this.ctx.storage.get('screen:'+member.id),keys=Array.from({length:manifest?.chunks||0},(_,i)=>`screen-data:${member.id}:${i}`),chunks=keys.length?await this.ctx.storage.get(keys):new Map();
          const current=keys.length?JSON.parse(keys.map(k=>chunks.get(k)).join('')):emptyScreenTime();
          if(input.screenTime===undefined)return response({screenTime:current,revision:member.screenRevision||0});
          if(!validScreenTime(input.screenTime))return response({error:'Invalid screen-time data. Your saved game was kept.'},400);
          const combined=mergeScreenTime(current,input.screenTime),serialized=JSON.stringify(combined);
          if(!validScreenTime(combined)||serialized.length>2000000)return response({error:'Screen-time storage is full. Export a family backup.'},413);
          if(serialized===JSON.stringify(current))return response({screenTime:current,revision:member.screenRevision||0,family:this.head});
          const count=Math.ceil(serialized.length/CHUNK),revision=(member.screenRevision||0)+1,next={...this.head,revision:this.head.revision+1,updated:now,profiles:this.head.profiles.map(p=>p.id===member.id?{...p,screenRevision:revision}:p)};
          await this.ctx.storage.transaction(async tx=>{const values={};for(let i=0;i<count;i++)values[`screen-data:${member.id}:${i}`]=serialized.slice(i*CHUNK,(i+1)*CHUNK);await tx.put(values);if(manifest?.chunks>count)await tx.delete(Array.from({length:manifest.chunks-count},(_,i)=>`screen-data:${member.id}:${count+i}`));await tx.put('screen:'+member.id,{chunks:count});await tx.put('head',next);});
          this.head=next;this.broadcast();return response({screenTime:combined,revision,family:this.head});
        }
        const manifest=await this.ctx.storage.get('profile:'+member.id);
        if(input.type==='pull'){
          if(!manifest)return response({revision:0,data:null});
          const keys=Array.from({length:manifest.chunks},(_,i)=>`data:${member.id}:${i}`),chunks=await this.ctx.storage.get(keys);
          return response({revision:member.revision,data:JSON.parse(keys.map(k=>chunks.get(k)).join(''))});
        }
        if(input.type==='push'){
          if(!validData(input.data))return response({error:'This player save could not be validated. Export a backup and reload.'},400);
          const serialized=JSON.stringify(input.data);if(serialized.length>2000000)return response({error:'This player save is too large to sync. Export a backup first.'},413);
          const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(serialized))),n=>n.toString(16).padStart(2,'0')).join('');
          if(manifest?.hash===hash)return response({revision:member.revision,family:this.head});
          if(input.baseRevision!==member.revision)return response({error:'This player has newer progress on another device.',revision:member.revision,conflict:true,family:this.head},409);
          const count=Math.ceil(serialized.length/CHUNK),next={...this.head,revision:this.head.revision+1,updated:now,profiles:this.head.profiles.map(p=>p.id===member.id?{...p,revision:p.revision+1}:p)};
          await this.ctx.storage.transaction(async tx=>{const values={};for(let i=0;i<count;i++)values[`data:${member.id}:${i}`]=serialized.slice(i*CHUNK,(i+1)*CHUNK);await tx.put(values);if(manifest?.chunks>count)await tx.delete(Array.from({length:manifest.chunks-count},(_,i)=>`data:${member.id}:${count+i}`));await tx.put('profile:'+member.id,{chunks:count,hash});await tx.put('head',next);});
          this.head=next;this.broadcast();return response({revision:member.revision+1,family:this.head});
        }
        return response({error:'Unsupported family operation.'},400);
      }catch{return response({error:'Family sync is unavailable. Your device saves have been kept.'},400);}
    });
  }
  webSocketMessage(ws,message){if(message==='sync'&&this.head)ws.send(JSON.stringify({type:'family',family:this.head}));}
  webSocketClose(ws,code,reason){try{ws.close(code===1006?1000:code,reason);}catch{}}
  webSocketError(ws){try{ws.close(1011,'Reconnect to family sync.');}catch{}}
  async alarm(){for(const ws of this.ctx.getWebSockets())ws.close(4004,'Family expired after inactivity.');await this.ctx.storage.deleteAll();this.head=null;}
}
