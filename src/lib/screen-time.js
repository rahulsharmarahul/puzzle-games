// Per-installation grow-only counters: merging a synced copy never adds it twice.
export const screenGames=['sudoku','petdoku','flappy','wordle','checkers','dots','ludo','uno','trump','sea','fruit','blast','2048','2248','flood','arrows','untangle','gravity','rope','bricks'];
export const emptyScreenTime=()=>({version:1,sources:{}});
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const counter=x=>Number.isSafeInteger(x)&&x>=0&&x<=1e13;
const validGames=g=>object(g)&&Object.keys(g).length<=screenGames.length&&Object.entries(g).every(([game,n])=>screenGames.includes(game)&&counter(n));
export function validScreenTime(value){
  return object(value)&&value.version===1&&object(value.sources)&&Object.keys(value.sources).length<=100&&Object.entries(value.sources).every(([id,s])=>/^[\w-]{1,80}$/.test(id)&&!['__proto__','prototype','constructor'].includes(id)&&object(s)&&validGames(s.games)&&object(s.days)&&Object.keys(s.days).length<=90&&Object.entries(s.days).every(([date,g])=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&dayKey(new Date(date+'T12:00:00').getTime())===date&&validGames(g)&&Object.entries(g).every(([game,n])=>n<=86400000&&n<=(s.games[game]||0)))&&Object.entries(s.games).every(([game,total])=>Object.values(s.days).reduce((sum,g)=>sum+(g[game]||0),0)<=total));
}
const mergeGames=(a={},b={})=>Object.fromEntries([...new Set([...Object.keys(a),...Object.keys(b)])].map(game=>[game,Math.max(a[game]||0,b[game]||0)]));
export function mergeScreenTime(a=emptyScreenTime(),b=emptyScreenTime()){
  const result=structuredClone(a);
  for(const [id,s] of Object.entries(b.sources)){
    const old=result.sources[id]||{games:{},days:{}},days={...old.days};
    for(const [date,games] of Object.entries(s.days))days[date]=mergeGames(days[date],games);
    result.sources[id]={games:mergeGames(old.games,s.games),days:Object.fromEntries(Object.entries(days).sort(([a],[b])=>b.localeCompare(a)).slice(0,90))};
  }
  return result;
}
export function dayKey(time=Date.now()){const d=new Date(time);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function addScreenTime(value,source,game,start,end){
  if(!screenGames.includes(game)||!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return value;
  const next=structuredClone(value),s=next.sources[source]||={games:{},days:{}};
  let cursor=start;
  while(cursor<end){const date=dayKey(cursor),midnight=new Date(cursor);midnight.setHours(24,0,0,0);const until=Math.min(end,midnight.getTime()),ms=Math.floor(until-cursor);s.games[game]=(s.games[game]||0)+ms;(s.days[date]||={})[game]=(s.days[date][game]||0)+ms;cursor=until;}
  s.days=Object.fromEntries(Object.entries(s.days).sort(([a],[b])=>b.localeCompare(a)).slice(0,90));return next;
}
export function screenTotals(value,period='all',now=Date.now()){
  const games=Object.fromEntries(screenGames.map(game=>[game,0])),start=new Date(now);start.setHours(0,0,0,0);if(period==='week')start.setDate(start.getDate()-6);const first=dayKey(start),last=dayKey(now);
  for(const s of Object.values(value?.sources||{})){const groups=period==='all'?[s.games]:Object.entries(s.days).filter(([date])=>date>=first&&date<=last).map(([,g])=>g);for(const group of groups)for(const [game,ms] of Object.entries(group))games[game]+=ms;}
  return {games,total:Object.values(games).reduce((a,b)=>a+b,0)};
}
export function screenDuration(ms){const seconds=Math.floor(ms/1000),minutes=Math.floor(seconds/60),hours=Math.floor(minutes/60);return hours?`${hours}h ${minutes%60}m`:minutes?`${minutes}m ${seconds%60}s`:`${seconds}s`;}

// A monotonic clock measures duration; wall time only assigns it to local dates.
export class ScreenClock {
  constructor({write,mono=()=>performance.now(),wall=()=>Date.now()}){Object.assign(this,{write,mono,wall});this.current=null;this.started=null;}
  set(profileId,game,active){this.flush();this.current=profileId&&game?{profileId,game}:null;this.started=active&&this.current?this.mono():null;this.anchor=this.wall();}
  flush(){if(this.started===null)return;const now=this.mono(),duration=Math.max(0,now-this.started);this.started=now;if(duration>=1){this.write({...this.current,start:this.anchor,end:this.anchor+duration});this.anchor+=duration;}}
}
