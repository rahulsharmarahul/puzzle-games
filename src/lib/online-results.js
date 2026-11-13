import { clubGames } from './club';
export function validOnlineResults(value) {
  return value&&value.stats&&typeof value.stats==='object'&&!Array.isArray(value.stats)&&Object.entries(value.stats).every(([game,s])=>Object.hasOwn(clubGames,game)&&s&&['played','wins','losses','draws'].every(k=>Number.isInteger(s[k])&&s[k]>=0)&&s.wins+s.losses+s.draws===s.played)&&Array.isArray(value.history)&&value.history.length<=500&&value.history.every(h=>h&&typeof h.id==='string'&&Object.hasOwn(clubGames,h.game)&&typeof h.code==='string'&&/^[A-Z2-9]{8}$/.test(h.code)&&Array.isArray(h.players)&&h.players.length>=2&&h.players.length<=4&&h.players.every(n=>typeof n==='string'&&n.length<=30)&&Number.isInteger(h.seat)&&h.seat>=0&&h.seat<h.players.length&&['won','lost','draw'].includes(h.result)&&Number.isFinite(h.elapsed)&&h.elapsed>=0&&typeof h.date==='string');
}
export function recordOnlineResult(data,room,seat) {
  if(room.phase!=='complete'||(!Number.isInteger(seat)||seat<0||seat>=room.players.length))return data;
  const id=`${room.code}:${room.created}`;
  const online=structuredClone(data.online||{history:[],stats:{}});
  if(online.history.some(h=>h.id===id))return data;
  const result=room.winner==='draw'?'draw':room.winner==='team'||room.winner===seat?'won':'lost';
  const stats=online.stats[room.game]||={played:0,wins:0,losses:0,draws:0};stats.played++;stats[result==='won'?'wins':result==='lost'?'losses':'draws']++;
  online.history=[{id,code:room.code,game:room.game,players:room.players.map(p=>p.name),seat,result,elapsed:room.elapsed,date:new Date().toISOString()},...online.history].slice(0,500);
  return {...data,online};
}
