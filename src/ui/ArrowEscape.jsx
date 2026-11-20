import EscapeCar from './EscapeCar';
import {GameGuide,BoardViewport} from './PhonePlay';
import {useRef,useState} from 'react';
import {arrowBlocker,tapArrow,hintArrow} from '../engines/arrows';
import '../arrows.css';
const colors=['#187e85','#925ac2','#ca5c48','#2569bd','#ad6d15','#b63c77'];
export default function ArrowEscape({session,onChange,best=0}){
  const s=session.state,[message,setMessage]=useState(''),[blocked,setBlocked]=useState(null),refs=useRef([]),done=s.status==='complete';
  function save(next){onChange({...session,state:next,status:next.status,winner:next.winner});}
  function tap(id){const blocker=arrowBlocker(s,id),next=tapArrow(s,id,session.mode==='local'?2:1);if(next===s)return;setBlocked(blocker===null?null:id);setMessage(blocker===null?`Car ${id+1} escaped!`:`Car ${id+1} is blocked by car ${blocker+1}. Clear its path first.`);save(next);}
  function key(e,i){const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-s.size,ArrowDown:s.size}[e.key];if(delta){e.preventDefault();let n=i+delta;while(n>=0&&n<s.size*s.size){if(refs.current[n]&&!refs.current[n].disabled){refs.current[n].focus();break;}n+=delta;}}}
  const cells=new Map();for(const a of s.arrows)if(!s.removed.includes(a.id))for(const i of a.cells)cells.set(i,a);
  return <section className="arrow-game"><GameGuide tip="Tap cars with a clear road ahead.">Tap a car to drive it off the board in the direction of its headlights. Other cars can block the road. Free every car to win. Blocked taps cost 5 points, hints cost 10; there is no timer or lives limit.</GameGuide><div className="arcade-scorebar"><span>Remaining<strong>{s.arrows.length-s.removed.length}</strong></span><span>Score<strong>{s.score}</strong></span><span>Best<strong>{Math.max(best,s.score)}</strong></span></div>
    {session.mode==='local'&&!done&&<p className="turn-note">{session.players[s.turn].name}, find a car that can drive out. Successful escapes pass the turn.</p>}
    <BoardViewport label="Arrow Escape" width={480}><div className="arrow-board" role="group" aria-label="Arrow Escape board" style={{gridTemplateColumns:`repeat(${s.size},minmax(0,1fr))`}}>{Array.from({length:s.size*s.size},(_,i)=>{const a=cells.get(i);return a?<button ref={node=>refs.current[i]=node} key={i} data-arrow={a.id} className={`arrow-cell ${s.hint===a.id?'hinted':''} ${blocked===a.id?'blocked':''}`} disabled={done} aria-label={`Car ${a.id+1} facing ${a.direction}`} onKeyDown={e=>key(e,i)} onClick={()=>tap(a.id)}/>:<span key={i} className="arrow-cell empty"/>;})}
      <svg viewBox={`0 0 ${s.size*40} ${s.size*40}`} aria-hidden="true">{s.arrows.filter(a=>!s.removed.includes(a.id)).map(a=>{const tail=a.cells[0],x=tail%s.size*40+20,y=Math.floor(tail/s.size)*40+20,rotation={right:0,down:90,left:180,up:270}[a.direction];return <g key={a.id} transform={`translate(${x} ${y}) rotate(${rotation})`}><g className={blocked===a.id?'arrow-bump':''}><EscapeCar length={a.cells.length*40-12} color={colors[a.id%colors.length]} number={a.id+1} rotation={rotation}/></g></g>;})}</svg>
    </div></BoardViewport><p className="word-message" role="status">{done?'Every car escaped. Traffic cleared!':message||'Find the headlights, then check the road to the edge.'}</p><button className="button secondary" disabled={done} onClick={()=>{const next=hintArrow(s);setBlocked(null);setMessage(`Car ${next.hint+1} has a clear path. Tap it to escape.`);save(next);}}>Show a hint</button><p className="tiny">{s.mistakes} blocked taps · {s.hints} hints. Progress saves after every tap.</p></section>;
}
