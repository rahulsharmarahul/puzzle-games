import {localDate} from '../engines/puzzles';
export function validDay(day){if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;const date=new Date(day+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===day;}
const previous=day=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);};
export function wordleDays(club={}){
  const days={};
  for(const h of club.history||[]){const day=h.game==='wordle'&&typeof h.daily==='string'&&h.daily.match(/^wordle-v1:(\d{4}-\d{2}-\d{2})$/)?.[1];if(day&&validDay(day)&&(h.winner==='team'||days[day]!=='won'))days[day]=h.winner==='team'?'won':'lost';}
  for(const [day,result] of Object.entries(club.wordleDays||{}))if(validDay(day)&&(result==='won'||result==='lost')&&(result==='won'||days[day]!=='won'))days[day]=result;
  return days;
}
export function wordleStreak(club={},today=localDate()){
  const days=wordleDays(club),dates=Object.keys(days).sort();let run=0,best=club.wordleBest||0,last=null;
  for(const day of dates){run=days[day]==='won'?(last===previous(day)?run+1:1):0;best=Math.max(best,run);last=day;}
  let current=0,day=days[today]==='won'?today:previous(today);
  if(days[today]!=='lost')while(days[day]==='won'){current++;day=previous(day);}
  return {current,best,today:days[today]||'unplayed'};
}
export function recordWordleDay(club,session){
  const day=session.game==='wordle'&&session.status==='complete'&&typeof session.daily==='string'&&session.daily.match(/^wordle-v1:(\d{4}-\d{2}-\d{2})$/)?.[1];
  if(!day||!validDay(day))return {};
  const days=wordleDays(club);if(session.winner==='team'||days[day]!=='won')days[day]=session.winner==='team'?'won':'lost';
  const best=wordleStreak({...club,wordleDays:days},day).best;
  return {wordleDays:Object.fromEntries(Object.entries(days).sort(([a],[b])=>a.localeCompare(b)).slice(-4000)),wordleBest:best};
}
