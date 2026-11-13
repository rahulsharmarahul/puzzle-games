import { createCheckers } from '../engines/checkers';
import { createDots } from '../engines/dots';
import { createWordle, guessWord } from '../engines/wordle';
import { createFlight } from '../engines/flappy';
import { createGame } from './game';
export const clubGames = {
  flappy:{name:'Flappy Jump',symbol:'🐤',tag:'TIMING & REFLEXES',description:'Tap, hop and glide through the gaps. How far can your little bird fly?',modes:'Solo or two-player score challenge'},
  wordle:{name:'Wordle',symbol:'Aa',tag:'FIVE LETTERS. SIX GUESSES.',description:'Find the hidden word, one colourful clue at a time. A fresh word every day.',modes:'Solo or cooperative guessing'},
  checkers:{name:'Checkers',symbol:'●',tag:'THINK A MOVE AHEAD',description:'Jump, capture and crown your kings. A classic duel across the board.',modes:'Play the computer or a friend'},
  dots:{name:'Dots and Boxes',symbol:'▦',tag:'CONNECT. COMPLETE. CLAIM.',description:'Draw a line, close a box and take another turn. Every edge counts.',modes:'Play the computer or a friend'},
  sudoku:{name:'Sudoku',symbol:'▦',modes:'Cooperative turn-taking'},
  petdoku:{name:'Petdoku',symbol:'🐱',modes:'Cooperative turn-taking'}
};
export const emptyClub = () => ({sessions:{},history:[],stats:{},daily:{}});
export function createSession(game,mode,players,{difficulty='easy',size=4,seed=crypto.randomUUID(),daily=null}={}) {
  if(!Object.hasOwn(clubGames,game))throw Error('Unknown game');
  const state=game==='checkers' ? createCheckers() : game==='dots' ? createDots(size) : game==='wordle' ? createWordle(seed) : game==='flappy' ? {flight:createFlight(seed),round:0,scores:[],status:'playing',winner:null} : createGame(game,difficulty,seed);
  return {id:crypto.randomUUID(),game,mode,players:structuredClone(players),seed,daily,state,turn:0,contributions:[0,0],created:new Date().toISOString(),status:'playing',winner:null};
}
export function updateClub(data,session) {
  const club=structuredClone(data.club || emptyClub());
  club.sessions[session.game]=session;
  const dailyId=session.daily ? `${session.daily}:${session.mode}` : null;
  if(session.status==='complete' && !(dailyId&&club.daily?.[dailyId]) && !club.history.some(h=>h.id===session.id || session.daily && h.daily===session.daily && h.mode===session.mode)) {
    if(dailyId){club.daily ||= {};club.daily[dailyId]=session.id;}
    club.stats ||= {};
    const stats=club.stats[session.game] ||= {played:0,wins:0,losses:0,draws:0,bestScore:0};
    stats.played++;
    if(session.winner==='draw')stats.draws++;
    else if(session.winner==='team'||session.winner===0)stats.wins++;
    else stats.losses++;
    if(session.game==='flappy')stats.bestScore=Math.max(stats.bestScore,...session.state.scores);
    club.history=[{id:session.id,game:session.game,mode:session.mode,players:session.players.map(p=>p.name),winner:session.winner,date:new Date().toISOString(),daily:session.daily,scores:session.game==='flappy' ? session.state.scores : session.game==='dots' ? [0,1].map(p=>session.state.boxes.filter(b=>b===p).length) : null},...club.history].slice(0,500);
  }
  return {...data,club};
}
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
const finite=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
function validFlight(f) {
  return f && typeof f.seed==='string' && finite(f.y,-1000,2000) && finite(f.vy,-2000,2000) && finite(f.distance,0,1e10) && integer(f.score,0,1e8) && finite(f.elapsed,0,1e8) && typeof f.alive==='boolean' && integer(f.nextPipe,3,1e8) && Array.isArray(f.pipes) && f.pipes.length===3 && f.pipes.every(p=>finite(p.x,0,1e11)&&finite(p.top,65,265)&&typeof p.scored==='boolean');
}
export function validSession(s,validPuzzle) {
  if(!s || !Object.hasOwn(clubGames,s.game) || typeof s.id!=='string' || typeof s.seed!=='string' || s.seed.length>200 || !['solo','local'].includes(s.mode) || !['playing','complete'].includes(s.status) || !(s.winner===null || ['draw','team','lost',0,1].includes(s.winner)) || !Array.isArray(s.players) || s.players.length!==2 || !s.players.every(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&p.name.length<=30&&typeof p.avatar==='string'&&p.avatar.length<20) || !integer(s.turn,0,1) || !Array.isArray(s.contributions) || s.contributions.length!==2 || !s.contributions.every(n=>integer(n,0,1e8)) || typeof s.created!=='string' || !(s.daily===null||typeof s.daily==='string'&&s.daily.length<100)) return false;
  const st=s.state;
  if(s.daily!==null && (s.game!=='wordle'||!/^wordle-v1:\d{4}-\d{2}-\d{2}$/.test(s.daily)||s.seed!==s.daily))return false;
  if(!st || !['playing','complete'].includes(st.status) || st.status!==s.status || (!['sudoku','petdoku'].includes(s.game)&&st.winner!==s.winner))return false;
  if(['sudoku','petdoku'].includes(s.game)) return s.mode==='local' && st.game===s.game && validPuzzle({...st,status:'playing'});
  if(s.game==='checkers') return Array.isArray(st.board)&&st.board.length===64&&st.board.every((p,i)=>integer(p,-2,2)&&(!p||(Math.floor(i/8)+i%8)%2===1))&&integer(st.turn,0,1)&&(st.forced===null||integer(st.forced,0,63))&&integer(st.quiet,0,1e8)&&st.positions&&typeof st.positions==='object'&&Object.keys(st.positions).length<=1000&&Object.values(st.positions).every(n=>integer(n,1,3));
  if(s.game==='dots')return integer(st.size,2,6)&&['h','v','boxes'].every(k=>Array.isArray(st[k])&&st[k].length===(k==='boxes'?st.size**2:st.size*(st.size+1))&&st[k].every(v=>integer(v,-1,1)))&&integer(st.turn,0,1);
  if(s.game==='wordle') {
    if(st.seed!==s.seed||!Array.isArray(st.guesses)||st.guesses.length>6)return false;
    let replay=createWordle(st.seed);
    for(const guess of st.guesses){if(typeof guess!=='string')return false;const result=guessWord(replay,guess,s.mode==='local'?2:1);if(result.error)return false;replay=result.state;}
    return JSON.stringify(st)===JSON.stringify(replay);
  }
  return validFlight(st.flight)&&integer(st.round,0,1)&&Array.isArray(st.scores)&&st.scores.length<=2&&st.scores.every(n=>integer(n,0,1e8));
}
export function validClub(club,validPuzzle) {
  if(club?.daily!==undefined && (!club.daily || typeof club.daily!=='object' || Array.isArray(club.daily) || !Object.entries(club.daily).every(([key,id])=>/^wordle-v1:\d{4}-\d{2}-\d{2}:(solo|local)$/.test(key)&&typeof id==='string'&&id.length<100)))return false;
  if (club?.stats !== undefined && (!club.stats || typeof club.stats!=='object' || Array.isArray(club.stats) || !Object.entries(club.stats).every(([game,s])=>Object.hasOwn(clubGames,game)&&s&&['played','wins','losses','draws','bestScore'].every(k=>integer(s[k],0,1e12))&&s.wins+s.losses+s.draws===s.played)))return false;
  return club && club.sessions && typeof club.sessions==='object' && !Array.isArray(club.sessions) && Object.entries(club.sessions).every(([key,s])=>s.game===key&&validSession(s,validPuzzle)) && Array.isArray(club.history)&&club.history.length<=500&&club.history.every(h=>h&&typeof h.id==='string'&&Object.hasOwn(clubGames,h.game)&&['solo','local'].includes(h.mode)&&typeof h.date==='string'&&Array.isArray(h.players)&&h.players.length===2&&h.players.every(p=>typeof p==='string'&&p.length<=30)&&(h.winner===null||['draw','team','lost',0,1].includes(h.winner))&&(h.scores===null||Array.isArray(h.scores)&&h.scores.length<=2&&h.scores.every(n=>integer(n,0,1e8))));
}
