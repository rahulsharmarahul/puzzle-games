import {loadScreenTime,mergeStoredScreenTime} from './screen-store';
import * as store from './storage';
import {endpoint,post} from './online';
export const normalizeFamilyCode=value=>String(value||'').toUpperCase().replace(/[^A-Z2-9]/g,'');
export const familyLink=()=>store.read('family-link',null);
export function setFamilyLink(value){store.write('family-link',value);window.dispatchEvent(new Event('pz-family-link'));}
const minimal=profiles=>profiles.map(({id,name,avatar})=>({id,name,avatar}));
export function sharedRoster(meta,head){
  const ids=new Set(head.profiles.map(p=>p.id));
  const local=meta.profiles.filter(p=>!ids.has(p.id)).map(p=>p.shared?{...p,shared:false}:p);
  const shared=head.profiles.map(({id,name,avatar})=>({id,name,avatar,shared:true}));
  return {...meta,profiles:[...shared,...local],active:ids.has(meta.active)||local.some(p=>p.id===meta.active)?meta.active:shared[0].id};
}
export class FamilyClient {
  constructor({onMeta,onProfile,onState}){Object.assign(this,{onMeta,onProfile,onState});this.stopped=false;this.busy=false;this.inflight=new Set();this.head=null;this.conflicts={};this.screenInflight=new Set();this.onScreen=e=>{if(e.detail.local&&this.link&&store.metadata().profiles.some(p=>p.id===e.detail.id&&p.shared)){this.link.screenDirty||={};this.link.screenDirty[e.detail.id]=true;this.saveLink();this.schedule();}};window.addEventListener('pz-screen-change',this.onScreen);this.onLocal=e=>this.local(e.detail.key);this.onOnline=()=>this.refresh();this.onVisible=()=>{if(!document.hidden)this.refresh();};window.addEventListener('pz-local-change',this.onLocal);window.addEventListener('online',this.onOnline);document.addEventListener('visibilitychange',this.onVisible);}
  async start(){this.link=familyLink();if(!this.link?.code)return;try{this.base=await endpoint();if(!this.base)throw Error('Set up the online service before linking a family.');await this.refresh();}catch(e){this.status('offline',e.message);}}
  status(status,error=''){if(!this.stopped)this.onState({status,error,head:this.head,conflicts:{...this.conflicts}});}
  saveLink(){if(!this.stopped)store.write('family-link',this.link);}
  async api(payload){const response=await fetch(`${this.base}/families/${this.link.code}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok){const error=Error(data.error||'Family sync is unavailable.');error.details=data;throw error;}return data;}
  connectSocket(){if(this.stopped||this.ws&&[0,1].includes(this.ws.readyState))return;const ws=new WebSocket(this.base.replace(/^http/,'ws')+`/families/${this.link.code}/socket`);this.ws=ws;ws.onopen=()=>{this.retries=0;};ws.onmessage=e=>{try{const msg=JSON.parse(e.data);if(msg.type==='family')this.receive(msg.family).catch(err=>this.status('offline',err.message));}catch{}};ws.onclose=()=>{if(this.stopped)return;this.status('offline','Changes are saved on this device and will sync when reconnected.');clearTimeout(this.retry);this.retries=(this.retries||0)+1;if(navigator.onLine&&this.retries<=5)this.retry=setTimeout(()=>this.refresh(),5000);};ws.onerror=()=>{};}
  async refresh(){if(this.stopped||!this.base||navigator.onLine===false)return;try{this.status('syncing');const {family}=await this.api({type:'head'});await this.receive(family);this.connectSocket();await this.flush();}catch(e){this.status('offline',e.message);}}
  local(key){if(!this.link)return;if(key==='profiles'){const roster=minimal(store.metadata().profiles.filter(p=>p.shared));if(roster.length&&JSON.stringify(roster)!==JSON.stringify(minimal(this.head?.profiles||[])))this.link.rosterDirty=true;}else{const id=key.slice(7);if(!store.metadata().profiles.some(p=>p.id===id&&p.shared))return;this.link.dirty ||= {};this.link.dirty[id]=true;}this.saveLink();this.schedule();}
  schedule(){if(this.stopped)return;this.status('pending');if(!this.timer)this.timer=setTimeout(()=>{this.timer=null;this.flush();},3000);}
  backup(id){const data=store.read('player:'+id,null),profile=store.metadata().profiles.find(p=>p.id===id);if(data&&profile)store.write('family-recovery:'+id,{profile,data});}
  async receive(head){
    if(this.stopped||this.head&&head.revision<this.head.revision)return;
    this.head=head;this.link.versions ||= {};this.link.dirty ||= {};
    if(!this.link.rosterDirty){const meta=store.metadata(),next=sharedRoster(meta,head);if(JSON.stringify(meta)!==JSON.stringify(next)){store.write('profiles',next,{silent:true});this.onMeta(next);}}
    this.link.screenVersions||={};this.link.screenDirty||={};
    for(const p of head.profiles){
      if((p.screenRevision||0)!==(this.link.screenVersions[p.id]||0)&&!this.screenInflight.has(p.id)){
        const screen=await this.api({type:'screen',profileId:p.id});if(this.stopped)return;
        if(!mergeStoredScreenTime(p.id,screen.screenTime,false))throw Error('Screen time could not be saved on this device.');this.link.screenVersions[p.id]=screen.revision;
      }
      if(!p.revision||this.link.versions[p.id]===p.revision||this.inflight.has(p.id))continue;
      if(this.link.dirty[p.id]){this.conflicts[p.id]={name:p.name,revision:p.revision};continue;}
      const response=await this.api({type:'pull',profileId:p.id});if(this.stopped)return;if(!store.validData(response.data))throw Error('The shared save could not be validated. This device’s progress was kept.');
      if((this.link.versions[p.id]||0)>=response.revision)continue;
      if(this.link.dirty[p.id]||this.inflight.has(p.id)){this.conflicts[p.id]={name:p.name,revision:response.revision};continue;}
      if(this.link.versions[p.id]===undefined)this.backup(p.id);
      if(!store.saveData(p.id,response.data,{silent:true}))throw Error('This device has insufficient storage for family sync. Export a backup.');
      this.link.versions[p.id]=response.revision;this.onProfile(p.id,response.data);
    }
    if(!this.link.rosterDirty)this.link.rosterRevision=head.rosterRevision;this.saveLink();this.status(Object.keys(this.conflicts).length?'conflict':Object.keys(this.link.dirty).length||Object.keys(this.link.screenDirty||{}).length||this.link.rosterDirty?'pending':'synced');
  }
  async flush(){
    if(this.busy||this.stopped||!this.head||navigator.onLine===false)return;this.busy=true;let failed=false;this.status('syncing');
    try{
      if(this.link.rosterDirty){const profiles=minimal(store.metadata().profiles.filter(p=>p.shared));const result=await this.api({type:'roster',profiles,baseRevision:this.link.rosterRevision});this.link.rosterDirty=false;await this.receive(result.family);}
      for(const id of Object.keys(this.link.dirty||{})){
        if(!this.head.profiles.some(p=>p.id===id)){delete this.link.dirty[id];continue;}if(this.conflicts[id])continue;
        const data=store.loadData(id),serialized=JSON.stringify(data);this.inflight.add(id);
        try{const result=await this.api({type:'push',profileId:id,data,baseRevision:this.link.versions[id]||0});this.link.versions[id]=result.revision;if(JSON.stringify(store.loadData(id))===serialized)delete this.link.dirty[id];await this.receive(result.family);}
        catch(e){if(e.details?.conflict){const current=await this.api({type:'pull',profileId:id});if(JSON.stringify(current.data)===serialized){this.link.versions[id]=current.revision;if(JSON.stringify(store.loadData(id))===serialized)delete this.link.dirty[id];}else this.conflicts[id]={name:this.head.profiles.find(p=>p.id===id)?.name||'Player',revision:e.details.revision};}else throw e;}
        finally{this.inflight.delete(id);this.saveLink();}
      }
      for(const id of Object.keys(this.link.screenDirty||{})){
        if(!this.head.profiles.some(p=>p.id===id)){delete this.link.screenDirty[id];continue;}
        const screenTime=loadScreenTime(id),serialized=JSON.stringify(screenTime);this.screenInflight.add(id);
        try{const result=await this.api({type:'screen',profileId:id,screenTime});const changed=JSON.stringify(loadScreenTime(id))!==serialized;if(!mergeStoredScreenTime(id,result.screenTime,false))throw Error('Screen time could not be saved.');this.link.screenVersions||={};this.link.screenVersions[id]=result.revision;if(!changed)delete this.link.screenDirty[id];await this.receive(result.family);}finally{this.screenInflight.delete(id);this.saveLink();}
      }
      this.status(Object.keys(this.conflicts).length?'conflict':Object.keys(this.link.dirty||{}).length||Object.keys(this.link.screenDirty||{}).length?'pending':'synced');
    }catch(e){failed=true;if(e.details?.family&&!e.details.conflict){store.write('family-roster-recovery',store.metadata());this.link.rosterDirty=false;await this.receive(e.details.family);}this.status('offline',e.message);}finally{this.busy=false;if(!failed&&!this.stopped&&!Object.keys(this.conflicts).length&&(Object.keys(this.link.dirty||{}).length||Object.keys(this.link.screenDirty||{}).length))this.schedule();}
  }
  async resolve(id,choice){try{this.status('syncing');const result=await this.api({type:'pull',profileId:id});this.backup(id);if(choice==='cloud'){if(!store.validData(result.data))throw Error('No valid cloud save was found. Keep this device’s progress instead.');if(!store.saveData(id,result.data,{silent:true}))throw Error('Not enough browser storage.');this.onProfile(id,result.data);delete this.link.dirty[id];}else{this.link.dirty[id]=true;}this.link.versions[id]=result.revision;delete this.conflicts[id];this.saveLink();await this.flush();this.status(Object.keys(this.conflicts).length?'conflict':'synced');}catch(e){this.status('offline',e.message);}}
  async transfer(localId,sharedId){const result=await this.api({type:'pull',profileId:sharedId});this.backup(sharedId);const data=store.loadData(localId);if(!store.saveData(sharedId,data,{silent:true}))throw Error('Could not save the imported progress on this device.');this.onProfile(sharedId,data);mergeStoredScreenTime(sharedId,loadScreenTime(localId));this.link.versions[sharedId]=result.revision;this.link.dirty[sharedId]=true;delete this.conflicts[sharedId];this.saveLink();await this.flush();}
  stop(){this.stopped=true;clearTimeout(this.timer);clearTimeout(this.retry);this.ws?.close();window.removeEventListener('pz-screen-change',this.onScreen);window.removeEventListener('pz-local-change',this.onLocal);window.removeEventListener('online',this.onOnline);document.removeEventListener('visibilitychange',this.onVisible);}
}
export async function createSharedFamily(meta){const base=await endpoint();if(!base)throw Error('Online play must be connected first.');const profiles=meta.profiles.some(p=>p.shared)?meta.profiles.filter(p=>p.shared):meta.profiles;const result=await post(base,'/families',{profiles:minimal(profiles)});setFamilyLink({code:result.code,versions:{},dirty:Object.fromEntries(profiles.map(p=>[p.id,true])),screenDirty:Object.fromEntries(profiles.map(p=>[p.id,true])),screenVersions:{},rosterRevision:result.family.rosterRevision});return result.family;}
export async function joinSharedFamily(value){const code=normalizeFamilyCode(value);if(!/^[A-Z2-9]{16}$/.test(code))throw Error('Enter the 16-character family code.');const base=await endpoint();if(!base)throw Error('Online play must be connected first.');const result=await post(base,`/families/${code}`,{type:'head'});setFamilyLink({code,versions:{},dirty:{},rosterRevision:result.family.rosterRevision});return result.family;}
