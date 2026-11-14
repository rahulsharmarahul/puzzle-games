import {useEffect,useRef,useState} from 'react';
import {ScreenClock,screenTotals,screenDuration} from '../lib/screen-time';
import {loadScreenTime,recordScreenTime} from '../lib/screen-store';
import {clubGames} from '../lib/club';
import '../screen-time.css';
export function useScreenClock(profileId,game){
  const clock=useRef(null);if(!clock.current)clock.current=new ScreenClock({write:recordScreenTime});
  useEffect(()=>{
    const active=()=>document.visibilityState==='visible'&&document.hasFocus();
    const change=()=>clock.current.set(profileId,game,active()),stop=()=>clock.current.set(null,null,false);
    change();const timer=setInterval(()=>clock.current.flush(),5000);
    document.addEventListener('visibilitychange',change);window.addEventListener('focus',change);window.addEventListener('blur',change);window.addEventListener('pagehide',stop);window.addEventListener('pageshow',change);window.addEventListener('pz-screen-flush',change);
    return()=>{stop();clearInterval(timer);document.removeEventListener('visibilitychange',change);window.removeEventListener('focus',change);window.removeEventListener('blur',change);window.removeEventListener('pagehide',stop);window.removeEventListener('pageshow',change);window.removeEventListener('pz-screen-flush',change);};
  },[profileId,game]);
}
export default function ScreenTime({meta}){
  const [period,setPeriod]=useState('today'),[selected,setSelected]=useState(meta.active),[,redraw]=useState(0);
  useEffect(()=>{const update=()=>redraw(n=>n+1);window.addEventListener('pz-screen-change',update);window.addEventListener('storage',update);const timer=setInterval(update,5000);return()=>{clearInterval(timer);window.removeEventListener('pz-screen-change',update);window.removeEventListener('storage',update);};},[]);
  const profiles=meta.profiles.filter(p=>!meta.profiles.some(p=>p.shared)||p.shared),chosen=profiles.find(p=>p.id===selected)||profiles.find(p=>p.id===meta.active)||profiles[0];
  const rows=profiles.map(p=>({...p,...screenTotals(loadScreenTime(p.id),period)})),current=rows.find(p=>p.id===chosen?.id),total=rows.reduce((sum,p)=>sum+p.total,0),max=Math.max(1,...Object.values(current?.games||{}));
  return <section className="panel screen-time-panel" aria-label="Family screen time"><div className="screen-heading"><div><h2>Family screen time</h2><p>Choose your player before playing. Compare time across every game.</p></div><label className="field">Time period<select aria-label="Screen time period" value={period} onChange={e=>setPeriod(e.target.value)}><option value="today">Today</option><option value="week">Last 7 days</option><option value="all">All time</option></select></label></div>
    <div className="screen-overall"><span>Family total</span><strong>{screenDuration(total)}</strong></div><div className="screen-players">{rows.map(p=><button key={p.id} className={p.id===chosen?.id?'selected':''} aria-pressed={p.id===chosen?.id} aria-label={`Screen time for ${p.name}`} onClick={()=>setSelected(p.id)}><span>{p.avatar} {p.name}</span><strong>{screenDuration(p.total)}</strong></button>)}</div>
    {current&&<><h3>{current.name} · game breakdown</h3><div className="screen-game-list">{Object.entries(current.games).sort(([,a],[,b])=>b-a).map(([game,ms])=><div className="screen-game" key={game} data-screen-game={game}><span>{clubGames[game].name}</span><div className="screen-bar" aria-hidden="true"><i style={{width:`${ms/max*100}%`}}/></div><strong>{screenDuration(ms)}</strong></div>)}</div><p className="screen-player-total">{current.name} overall <strong>{screenDuration(current.total)}</strong></p></>}
    <p className="tiny">Tracking starts with this update; earlier screen time cannot be reconstructed. Counts a visible, focused game board, including thinking and pause time. Menus, setup screens and background tabs do not count. Choose the correct player before playing; same-device shared games count under the selected host profile. Today and last 7 days use each playing device’s local dates. All-time totals are retained; daily details keep the latest 90 days per device. Linked Family devices combine time automatically.</p>
  </section>;
}
