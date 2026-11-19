import {useEffect,useState} from 'react';
import {ludoTrack,ludoCell,ludoMoves,ludoOffsets,ludoSafe} from '../engines/ludo';
import '../ludo-touch.css';
const colorNames=['Coral','Green','Gold','Blue'];
export default function LudoBoard({state:s,players,readOnly,onAction}){
  const [choice,setChoice]=useState(null),[zoom,setZoom]=useState(false),offsets=ludoOffsets(s.tokens.length),legal=ludoMoves(s),tokens={},targets={},playing=s.status==='playing',canRoll=!readOnly&&playing&&s.die===null;
  useEffect(()=>setChoice(null),[s.turn,s.die,s.rolls]);
  const yards={0:[[2,2],[2,4],[4,2],[4,4]],13:[[2,10],[2,12],[4,10],[4,12]],26:[[10,10],[10,12],[12,10],[12,12]],39:[[10,2],[10,4],[12,2],[12,4]]};
  s.tokens.forEach((list,p)=>list.forEach((v,t)=>{const cell=v<0?yards[offsets[p]][t]:ludoCell(s,p,v);if(cell)(tokens[cell.join(':')]||=[]).push({p,t});}));
  for(const t of legal){const v=s.tokens[s.turn][t],cell=ludoCell(s,s.turn,v<0?0:v+s.die);if(cell)(targets[cell.join(':')]||=[]).push(t);}
  const homeColor=(r,c)=>r<6&&c<6?0:r<6&&c>8?1:r>8&&c>8?2:r>8&&c<6?3:null;
  function move(options){if(readOnly||!playing||!options.length)return;if(options.length===1){setChoice(null);onAction({type:'ludo-move',token:options[0]});}else setChoice(options);}
  const die=s.die||s.lastDie||null,pipPositions=[[],[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]][die||5];
  return <section className="ludo-touch"><p className="game-instruction">Tap the centre die, then tap a glowing token to move it. You can also tap its highlighted destination. Roll a six to leave the yard.</p><div className="ludo-player-key">{s.tokens.map((list,p)=><span key={p} className={p===s.turn&&playing?'active':''}><i className={`color-${offsets[p]/13}`}/><strong>{players[p]?.name}</strong><small>{list.filter(v=>v===56).length}/4 home</small></span>)}</div>
    <div className={`ludo-scroll ${zoom?'zoomed':''}`}><div className="ludo-board ludo-interactive" role="group" aria-label="Ludo board">{Array.from({length:225},(_,i)=>{
      const r=Math.floor(i/15),c=i%15,key=`${r}:${c}`,track=ludoTrack.findIndex(cell=>cell[0]===r&&cell[1]===c),home=homeColor(r,c),lane=r===7&&c>0&&c<6?0:c===7&&r>0&&r<6?1:r===7&&c>8&&c<14?2:c===7&&r>8&&r<14?3:null,here=tokens[key]||[],movable=here.filter(t=>t.p===s.turn&&legal.includes(t.t)).map(t=>t.t),dest=targets[key]||[];
      return <div key={i} className={`ludo-tile ${home!==null?'ludo-yard color-'+home:lane!==null?'ludo-home home-'+lane:track>=0?'ludo-path':'ludo-centre'} ${dest.length?'ludo-destination':''}`}>
        {track>=0&&ludoSafe.includes(track)&&<small aria-hidden="true">★</small>}
        {!!dest.length&&!here.length&&<button className="ludo-target" disabled={readOnly} aria-label={`Move to row ${r+1}, column ${c+1}`} onClick={()=>move(dest)}>•</button>}
        {!!here.length&&<button className={`ludo-token-hit ${movable.length?'can-move':''}`} disabled={readOnly||!movable.length} aria-label={here.length===1?`${players[here[0].p]?.name}, token ${here[0].t+1}${movable.length?', tap to move':''}`:`Stack of ${here.length} tokens${movable.length?', tap to choose a token':''}`} onClick={()=>move(movable)}>{here.map(({p,t})=><span key={`${p}:${t}`} className={`ludo-token color-${offsets[p]/13}`} aria-hidden="true">{t+1}</span>)}</button>}
      </div>;
    })}<button className={`ludo-centre-die ${canRoll?'ready':''}`} aria-label="Roll dice" disabled={!canRoll} onClick={()=>onAction({type:'ludo-roll'})}><span className="ludo-pips" aria-hidden="true">{Array.from({length:9},(_,i)=><i key={i} className={pipPositions.includes(i)?'pip':''}/>)}</span><small>{s.status!=='playing'?'Finished':s.die!==null?'Tap token':canRoll?'Tap to roll':'Waiting'}</small><span className="sr-only">{die?`Last roll: ${die}`:'Not rolled'}</span></button></div></div>
    <p className="ludo-touch-status" role="status">{s.note} {s.die!==null&&!readOnly?'Tap a glowing token or a marked destination.':canRoll?`${players[s.turn]?.name}, tap the die.`:''}</p>
    {choice&&<div className="ludo-stack-choice" role="group" aria-label="Choose a token from this stack"><p>These tokens share a square. Choose which to move.</p>{choice.map(t=><button key={t} className="button primary" onClick={()=>{setChoice(null);onAction({type:'ludo-move',token:t});}} disabled={readOnly||!legal.includes(t)}>Token {t+1}</button>)}<button className="text-button" onClick={()=>setChoice(null)}>Cancel</button></div>}
    <button className="text-button" aria-pressed={zoom} onClick={()=>setZoom(!zoom)}>{zoom?'Fit board to screen':'Enlarge board'}</button>{zoom&&<p className="tiny">Swipe across the board to pan. Tap a token to move it.</p>}
    <details className="ludo-alternatives"><summary>Alternative token controls &amp; rules</summary><div className="token-actions">{[0,1,2,3].map(t=><button key={t} className="button secondary" disabled={readOnly||!legal.includes(t)} onClick={()=>onAction({type:'ludo-move',token:t})}>Move token {t+1}</button>)}</div><p className="tiny">All four tokens must reach home with exact rolls. Sixes, captures and reaching home earn another roll. Three consecutive sixes pass the turn. Pairs block the track; ★ squares are safe. Colours follow board corners: {colorNames.join(', ')}.</p></details>
  </section>;
}
