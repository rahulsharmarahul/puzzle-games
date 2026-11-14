import {it,expect} from 'vitest';
import {createNumberGame,slideLine,move2048,canSlide,canExtend,merge2248,chainValue,floodColour,flooded,validNumberGame,finishNumberGame} from '../engines/number-games';
import {createSession,updateClub} from '../lib/club';
import {freshData,validData} from '../lib/storage';
const players=[{id:'a',name:'A',avatar:'A'},{id:'b',name:'B',avatar:'B'}];
it('2048 merges each tile only once, compresses gaps and counts all merged values',()=>{
  expect(slideLine([2,2,2,2])).toEqual({line:[4,4,0,0],score:8});
  expect(slideLine([2,2,4,0])).toEqual({line:[4,4,0,0],score:4});
  expect(slideLine([0,4,0,4])).toEqual({line:[8,0,0,0],score:8});
});
it('2048 moves in all four directions and only spawns or passes turns on a valid move',()=>{
  for(const dir of ['up','down','left','right']){const s=createNumberGame('2048','moves');s.grid=Array(16).fill(0);s.grid[5]=2;s.grid[6]=2;const next=move2048(s,dir,2);expect(next.moves).toBe(1);expect(next.turn).toBe(1);expect(s.moves).toBe(0);expect(validNumberGame(next)).toBe(true);}
  const s=createNumberGame('2048','noop');s.grid=[2,0,0,0,...Array(12).fill(0)];expect(move2048(s,'left',2)).toBe(s);expect(move2048(s,'wrong')).toBe(s);
});
it('2048 recognises a full blocked board and preserves the 2048 milestone',()=>{
  let s=createNumberGame('2048','won');s.grid=[1024,1024,0,0,...Array(12).fill(0)];s=move2048(s,'left');expect(s.won).toBe(true);expect(s.status).toBe('playing');expect(s.score).toBe(2048);expect(validNumberGame(finishNumberGame(s))).toBe(true);
  s=createNumberGame('2048','blocked');s.grid=[2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,2];expect(canSlide(s)).toBe(false);expect(finishNumberGame(s).winner).toBe('lost');expect(validNumberGame({...s,status:'complete',winner:'lost'})).toBe(true);
});
it('2048 finishes automatically when its last legal merge leaves a blocked full board',()=>{
  const s=createNumberGame('2048','last move');s.grid=[2,2,8,16,32,64,128,256,512,1024,2048,4096,8192,16384,32768,65536];s.won=true;
  const next=move2048(s,'left',2);expect(next.status).toBe('complete');expect(next.winner).toBe('team');expect(canSlide(next)).toBe(false);expect(validNumberGame(next)).toBe(true);expect(move2048(next,'right')).toBe(next);
});
it('2248 enforces equal first pair, adjacency, doubling and no cell reuse',()=>{
  const s=createNumberGame('2248','chain');s.grid.fill(16);s.grid.splice(0,5,2,2,4,8,16);
  expect(canExtend(s,[0],2)).toBe(false);expect(canExtend(s,[0],1)).toBe(true);expect(canExtend(s,[0,1],0)).toBe(false);expect(canExtend(s,[0,1],6)).toBe(false);
  expect(chainValue(s,[0,1,2,3])).toBe(16);expect(merge2248(s,[0,1,2,3],2).score).toBe(16);expect(merge2248(s,[0,1,2,3],2).turn).toBe(1);
  expect(merge2248(s,[0,2])).toBe(s);expect(merge2248(s,[0,1,0])).toBe(s);
});
it('2248 rounds chains upward, supports diagonals, applies gravity and refills deterministically',()=>{
  const s=createNumberGame('2248','gravity');s.grid.fill(2);expect(chainValue(s,[0,6,12])).toBe(8);const next=merge2248(s,[0,6,12]);expect(next.grid).toHaveLength(40);expect(next.grid.every(Boolean)).toBe(true);expect(next.grid[12]).toBe(8);expect(next).toEqual(merge2248(s,[0,6,12]));expect(validNumberGame(next)).toBe(true);expect(s.grid[12]).toBe(2);
});
it('Flood-It absorbs only connected territory, ignores the current colour and wins on move 30',()=>{
  const s=createNumberGame('flood','win');s.grid.fill(1);s.grid[0]=0;s.moves=29;expect(flooded(s)).toEqual([0]);expect(floodColour(s,0)).toBe(s);const next=floodColour(s,1,2);expect(next.moves).toBe(30);expect(flooded(next)).toHaveLength(144);expect(next.winner).toBe('team');expect(next.score).toBe(100);expect(validNumberGame(next)).toBe(true);expect(floodColour(next,2)).toBe(next);
});
it('Flood-It ends after 30 moves with a loss if squares remain',()=>{
  const s=createNumberGame('flood','loss');s.grid=Array.from({length:144},(_,i)=>(Math.floor(i/12)+i%12)%2);s.moves=29;const next=floodColour(s,2);expect(next.status).toBe('complete');expect(next.winner).toBe('lost');expect(validNumberGame(next)).toBe(true);
});
for(const game of ['2048','2248','flood'])it(`${game} persists sessions, favorites, statistics and backup data without duplicate results`,()=>{
  let session=createSession(game,'local',players,{seed:'backup'}),data=updateClub(freshData(),session);data.favorites=[game];expect(validData(data)).toBe(true);
  if(game==='flood'){session.state.grid.fill(1);session.state.grid[0]=0;session.state=floodColour(session.state,1,2);}else session.state=finishNumberGame(session.state,2);
  session.status=session.state.status;session.winner=session.state.winner;data=updateClub(data,session);expect(validData(JSON.parse(JSON.stringify(data)))).toBe(true);expect(data.club.stats[game].played).toBe(1);expect(data.club.history[0].scores).toEqual([session.state.score]);expect(updateClub(data,session).club.stats[game].played).toBe(1);
  session.state.grid.push(0);expect(validData(updateClub(data,session))).toBe(false);
});
it('save validation rejects invalid tiles, turn, score and inconsistent completion',()=>{
  for(const game of ['2048','2248','flood']){const s=createNumberGame(game,'invalid');expect(validNumberGame({...s,score:-1})).toBe(false);expect(validNumberGame({...s,turn:2})).toBe(false);expect(validNumberGame({...s,status:'complete'})).toBe(false);s.grid[0]=3.5;expect(validNumberGame(s)).toBe(false);}
});
