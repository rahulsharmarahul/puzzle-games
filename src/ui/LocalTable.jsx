import {useEffect,useState} from 'react';
import {tableAction,tableBot,tableView} from '../engines/table';
import TableGames from './TableGames';
export default function LocalTable({session,onChange}){
  const {state:s,game,mode,players}=session,actor=game==='sea'&&!s.ready.every(Boolean)?s.setupTurn:s.turn,computer=mode==='solo'&&actor>0;
  const [revealed,setRevealed]=useState(null),[error,setError]=useState('');
  const privacy=['uno','trump','sea'].includes(game)&&mode==='local'&&s.status==='playing';
  function action(a){const next=tableAction(game,s,a,actor);if(next===s){setError('That move is not allowed. Choose a highlighted card, token or a valid empty cell.');return;}setError('');if((game==='sea'&&!next.ready.every(Boolean)?next.setupTurn:next.turn)!==actor)setRevealed(null);onChange({...session,state:next,status:next.status,winner:next.winner});}
  useEffect(()=>{if(!computer||s.status!=='playing')return;const timer=setTimeout(()=>action(tableBot(game,s,actor)),450);return()=>clearTimeout(timer);},[s,computer]);
  const seat=mode==='solo'?0:actor;
  if(privacy&&revealed!==actor)return <section className="handoff panel"><span>🙈</span><h2>Pass to {players[actor].name}</h2>{game==='sea'&&s.result?<div className="handoff-public-result" role="status"><strong>{players[s.result.seat].name}: {String.fromCharCode(65+Math.floor(s.result.index/10))}{s.result.index%10+1}</strong><span>{s.result.sunk?`Hit! Ship sunk (${s.result.sunk} cells).`:s.result.hit?'Hit!':'Miss.'}</span></div>:['uno','trump'].includes(game)&&<p className="handoff-public-result" role="status">{s.note}</p>}<p>Other players should look away. Your hand or fleet stays hidden until you are ready.</p><button className="button primary" onClick={()=>setRevealed(actor)}>Show my turn</button></section>;
  return <><p className="table-turn">{s.status==='complete'?'Match complete':computer?`${players[actor].name} is thinking…`:`${players[actor].name}’s turn`}</p>{error&&<p className="danger" role="alert">{error}</p>}<TableGames game={game} state={tableView(game,s,seat)} players={players} seat={seat} readOnly={computer||s.status==='complete'} onAction={action}/></>;
}
