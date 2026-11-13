import { createCheckers, moveChecker } from '../src/engines/checkers.js';
import { createDots, drawEdge } from '../src/engines/dots.js';
import { createWordle, guessWord, answerFor, wordFeedback } from '../src/engines/wordle.js';
import { createGame, act, complete, formatTime } from '../src/lib/game.js';
import { petExclusions } from '../src/engines/petdoku.js';
import { createFlight, stepFlight, flight } from '../src/engines/flappy.js';

export const games = ['sudoku','petdoku','wordle','checkers','dots','flappy'];
export const ROOM_LIFETIME = 6 * 60 * 60 * 1000;
export const MAX_FLIGHT_TICKS = 7200;
export function player(input) {
  if (!input || typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 30) throw Error('Choose a player name (1–30 characters).');
  return {name:input.name.trim(),avatar:typeof input.avatar==='string' && [...input.avatar].length<=4 ? input.avatar : '🌿'};
}
export function createRoom(code, input, now=Date.now()) {
  if (!input || !games.includes(input.game)) throw Error('Choose a supported game.');
  const seed=crypto.randomUUID();
  const difficulty=['easy','medium','hard','expert'].includes(input.difficulty)?input.difficulty:'easy';
  const size=Number.isInteger(input.size)&&input.size>=2&&input.size<=6?input.size:4;
  const match=input.game==='checkers'?createCheckers():input.game==='dots'?createDots(size):input.game==='wordle'?createWordle(seed):input.game==='flappy'?{round:0,scores:[],roundStarted:null,status:'playing',winner:null}:createGame(input.game,difficulty,seed);
  return {version:1,code,game:input.game,seed,players:[player(input),null],phase:'waiting',revision:0,match,turn:0,contributions:[0,0],winner:null,paused:false,elapsed:0,clock:null,created:now,expires:now+ROOM_LIFETIME,recent:[[],[]],note:'Waiting for player two.'};
}
export function joinRoom(room,input,now=Date.now()) {
  if (now>=room.expires) throw Error('This room has expired. Create a new one.');
  if (room.players[1]) throw Error('Both seats are taken. Reopen this room in the browser you joined with.');
  room.players[1]=player(input);room.phase='playing';room.revision++;room.note='Player two joined. Connect both devices to begin.';
}
export function activeTurn(room) {return ['checkers','dots','wordle'].includes(room.game)?room.match.turn:room.game==='flappy'?room.match.round:room.turn;}
export function clockRoom(room,connected,now=Date.now()) {
  if(room.clock!==null){room.elapsed+=Math.max(0,now-room.clock);room.clock=null;}
  if(room.phase==='playing'&&!room.paused&&connected)room.clock=now;
}
export function publicRoom(room,presence=[false,false],now=Date.now()) {
  const m=room.match;let state;
  if(room.game==='wordle')state={guesses:m.guesses,feedback:m.guesses.map(w=>wordFeedback(answerFor(m.seed),w)),turn:m.turn,status:m.status,winner:m.winner,...(m.status==='complete'?{answer:answerFor(m.seed)}:{})};
  else if(['sudoku','petdoku'].includes(room.game))state={size:m.size,difficulty:m.difficulty,givens:m.givens,board:m.board,notes:m.notes,mistakes:m.mistakes,hints:m.hints,canUndo:m.undo.length>0,canRedo:m.redo.length>0,status:m.status,invalid:m.board.flatMap((v,i)=>v&&(room.game==='sudoku'?v!==m.solution[i]:v===2&&!m.solution.includes(i))?[i]:[]),...(room.game==='petdoku'?{regions:m.regions,excluded:[...petExclusions(m.board,m.regions,m.size,m.solution)],correctPets:m.solution.filter(i=>m.board[i]===2)}:{})};
  else if(room.game==='checkers'){const {positions,...rest}=m;state=rest;}
  else if(room.game==='flappy')state={...m,course:room.seed,maxTicks:MAX_FLIGHT_TICKS};
  else state=m;
  return {protocol:1,code:room.code,game:room.game,players:room.players,phase:room.phase,revision:room.revision,state,turn:activeTurn(room),contributions:room.contributions,winner:room.winner,paused:room.paused,elapsed:room.elapsed+(room.clock===null?0:Math.max(0,now-room.clock)),presence,created:room.created,expires:room.expires,note:room.note};
}
export function replayFlight(seed, flaps, ticks) {
  if(!Number.isInteger(ticks)||ticks<1||ticks>MAX_FLIGHT_TICKS||!Array.isArray(flaps)||flaps.length>1000||flaps.some((v,i)=>!Number.isInteger(v)||v<0||v>=ticks||(i&&v<=flaps[i-1])))throw Error('Invalid flight input.');
  let state=createFlight(seed), cursor=0;
  for(let tick=0;tick<ticks;tick++) {
    if(flaps[cursor]===tick){state={...state,vy:flight.jump};cursor++;}
    state=stepFlight(state,1/60);
    if(!state.alive && tick!==ticks-1)throw Error('The flight ended before that score.');
  }
  if(state.alive&&ticks<MAX_FLIGHT_TICKS)throw Error('Finish the flight before submitting it.');
  return state;
}
function finishFlight(room,score) {
  const m=room.match;m.scores.push(score);m.roundStarted=null;
  if(m.round===0){m.round=1;room.note='First flight finished. Player two, take your flight.';}
  else {m.status='complete';m.winner=m.scores[0]===m.scores[1]?'draw':m.scores[0]>m.scores[1]?0:1;room.phase='complete';room.winner=m.winner;room.note='Both flights are finished.';}
}
export function applyRoomAction(room, seat, message, connected=true, now=Date.now()) {
  if(!Number.isInteger(seat)||seat<0||seat>1||!room.players[seat])throw Error('This seat is not available.');
  if(!message||typeof message.id!=='string'||message.id.length>80||!message.id)throw Error('Invalid action identifier.');
  if(room.recent[seat].includes(message.id))return false;
  if(now>=room.expires)throw Error('This room has expired.');
  if(message.revision!==room.revision)throw Error('The board changed. Your screen has been refreshed; try again.');
  const action=message.action;
  if(!action||typeof action.type!=='string')throw Error('Invalid move.');
  if(room.phase!=='playing')throw Error('This match is not in progress.');
  clockRoom(room,false,now);
  if(action.type==='resign') {
    room.phase='complete';room.winner=['checkers','dots','flappy'].includes(room.game)?1-seat:'lost';room.match.status='complete';room.match.winner=room.winner;room.note=`${room.players[seat].name} ended the match.`;
  } else if(action.type==='pause'&&room.game!=='flappy') {
    room.paused=!room.paused;room.note=room.paused?'The shared game is paused.':'The shared game resumed.';
  } else {
    if(!connected)throw Error('Wait for both players to reconnect.');
    if(room.paused)throw Error('Resume the shared game first.');
    if(activeTurn(room)!==seat)throw Error('It is the other player’s turn.');
    let next=room.match;
    if(room.game==='checkers'&&action.type==='checker')next=moveChecker(room.match,action.from,action.to);
    else if(room.game==='dots'&&action.type==='edge')next=drawEdge(room.match,action.axis,action.index);
    else if(room.game==='wordle'&&action.type==='guess') {
      if(typeof action.word!=='string'||action.word.length>20)throw Error('Enter a five-letter word.');
      const result=guessWord(room.match,action.word,2);if(result.error)throw Error(result.error);next=result.state;
    } else if(room.game==='flappy') {
      if(action.type==='flight-start') {if(room.match.roundStarted!==null)throw Error('This flight has already started. Resume it or forfeit this flight.');room.match.roundStarted=now;room.note=`${room.players[seat].name} is flying.`;}
      else if(action.type==='flight-finish') {
        if(room.match.roundStarted===null)throw Error('Start your flight first.');
        if(!Number.isInteger(action.ticks)||action.ticks/60>(now-room.match.roundStarted)/1000+2)throw Error('That flight could not have finished yet.');
        const result=replayFlight(room.seed,action.flaps,action.ticks);finishFlight(room,result.score);
      } else if(action.type==='flight-forfeit') {if(room.match.roundStarted===null)throw Error('No flight is in progress.');finishFlight(room,0);}
      else throw Error('Invalid flight action.');
    } else if(['sudoku','petdoku'].includes(room.game)) {
      if(!['value','erase','note','hint','undo','redo'].includes(action.type))throw Error('Unsupported puzzle move.');
      if(['value','erase','note'].includes(action.type)&&(!Number.isInteger(action.index)||action.index<0||action.index>=room.match.board.length))throw Error('Choose a cell first.');
      if(['value','note'].includes(action.type)&&(!Number.isInteger(action.value)||action.value<0||action.value>(room.game==='sudoku'?9:2)))throw Error('Invalid cell value.');
      if(action.type==='note'&&(room.game!=='sudoku'||action.value===0))throw Error('Choose a note from 1 to 9.');
      if(room.game==='petdoku'&&action.type==='value'&&action.value===2&&petExclusions(room.match.board,room.match.regions,room.match.size,room.match.solution).has(action.index))throw Error('This cell is ruled out by a correct pet.');
      next=act(room.match,action);
      if(next!==room.match){const changed=JSON.stringify(next.board)!==JSON.stringify(room.match.board);if(changed){room.contributions[seat]++;room.turn=1-seat;}if(complete(next)){next.status='complete';room.winner='team';room.phase='complete';}}
    } else throw Error('Unsupported action.');
    if(next===room.match&&room.game!=='flappy')throw Error('That move is not allowed.');
    room.match=next;
    if(next.status==='complete'&&room.phase!=='complete'){room.phase='complete';room.winner=next.winner;}
    if(room.game!=='flappy')room.note=room.phase==='complete'?'Match finished.':`${room.players[seat].name} made a move.`;
  }
  room.revision++;room.recent[seat]=[...room.recent[seat],message.id].slice(-40);
  clockRoom(room,connected,now);
  return true;
}
