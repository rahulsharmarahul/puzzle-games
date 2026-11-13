const KEY='pz:online-config';
export function cleanEndpoint(value) {
  const url=new URL(String(value).trim());
  if(url.protocol!=='https:' && !(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Use an HTTPS service URL.');
  if(url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('Use the service’s root URL.');
  return url.origin;
}
export function savedEndpoint(){try{return cleanEndpoint(JSON.parse(localStorage.getItem(KEY)).endpoint);}catch{return '';}}
export async function endpoint(){const local=savedEndpoint();if(local)return local;const env=import.meta.env.VITE_MULTIPLAYER_URL;if(env)return cleanEndpoint(env);const res=await fetch(`${import.meta.env.BASE_URL}multiplayer.json`);const config=await res.json();return config.endpoint?cleanEndpoint(config.endpoint):'';}
export function saveEndpoint(value){const url=cleanEndpoint(value);localStorage.setItem(KEY,JSON.stringify({endpoint:url}));return url;}
const prefix=id=>`pz:room:${id}:`;
export function roomCredential(profileId,code){try{const item=JSON.parse(localStorage.getItem(prefix(profileId)+code));return item&&typeof item.token==='string'&&/^[a-f0-9]{64}$/.test(item.token)&&Number.isInteger(item.seat)&&item.seat>=0&&item.seat<4?item:null;}catch{return null;}}
export function saveCredential(profileId,code,item){localStorage.setItem(prefix(profileId)+code,JSON.stringify(item));}
export function rememberedRooms(profileId){const out=[];try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key.startsWith(prefix(profileId))){const code=key.slice(prefix(profileId).length),item=roomCredential(profileId,code);if(item)out.push({code,...item});}}}catch{}return out.sort((a,b)=>b.saved-a.saved).slice(0,8);}
export function pruneCredentials(profileId){const keep=rememberedRooms(profileId).map(r=>r.code);try{const remove=[];for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key.startsWith(prefix(profileId))&&!keep.includes(key.slice(prefix(profileId).length)))remove.push(key);}remove.forEach(k=>localStorage.removeItem(k));}catch{}}
export async function post(base,path,payload){const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});let data;try{data=await response.json();}catch{throw Error('The online service is unavailable. Try again shortly.');}if(!response.ok)throw Error(data.error||'The online service could not complete the request.');return data;}
