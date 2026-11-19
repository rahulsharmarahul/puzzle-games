import {it,expect} from 'vitest';
import {createArrows,freeArrows,arrowBlocker,tapArrow,hintArrow,validArrows} from '../engines/arrows';
import {createSession,updateClub} from '../lib/club';
import {freshData,validData} from '../lib/storage';
it('generates deterministic, non-overlapping, solvable levels at all difficulties',()=>{
  for(const difficulty of ['easy','medium','hard'])for(let seed=0;seed<15;seed++){
    let s=createArrows(String(seed),difficulty);expect(s).toEqual(createArrows(String(seed),difficulty));expect(s.arrows.length).toBeGreaterThan(5);const cells=s.arrows.flatMap(a=>a.cells);expect(new Set(cells).size).toBe(cells.length);
    for(const arrow of [...s.arrows].reverse()){expect(arrowBlocker(s,arrow.id)).toBe(null);s=tapArrow(s,arrow.id,2);}expect(s.status).toBe('complete');expect(s.winner).toBe('team');expect(validArrows(s)).toBe(true);
  }
});
it('blocked taps keep arrows and turns while valid taps pass the turn',()=>{
  let s=createArrows('blocked','medium'),blocked=s.arrows.find(a=>arrowBlocker(s,a.id)!==null);expect(blocked).toBeDefined();let next=tapArrow(s,blocked.id,2);expect(next.mistakes).toBe(1);expect(next.removed).toEqual([]);expect(next.turn).toBe(0);expect(validArrows(next)).toBe(true);next=tapArrow(next,freeArrows(next)[0],2);expect(next.turn).toBe(1);expect(next.score).toBe(95);expect(s.mistakes).toBe(0);
});
it('hints reveal an available arrow, cost points and do not consume a turn',()=>{
  let s=createArrows('hint');s=tapArrow(s,freeArrows(s)[0]);const next=hintArrow(s);expect(next.hints).toBe(1);expect(next.score).toBe(s.score-10);expect(freeArrows(next)).toContain(next.hint);expect(next.turn).toBe(s.turn);expect(validArrows(next)).toBe(true);
});
it('any sequence of free arrows can finish and completed boards ignore actions',()=>{
  let s=createArrows('order','hard');while(s.status==='playing'){const options=freeArrows(s);expect(options.length).toBeGreaterThan(0);s=tapArrow(s,options[Math.floor(options.length/2)]);}expect(validArrows(s)).toBe(true);expect(tapArrow(s,0)).toBe(s);expect(hintArrow(s)).toBe(s);
});
it('saves scores, results and favorites in validated profile backups',()=>{
  const players=[{id:'a',name:'A',avatar:'X'},{id:'b',name:'B',avatar:'X'}];let session=createSession('arrows','local',players,{seed:'backup',difficulty:'medium'});let data=updateClub(freshData(),session);data.favorites=['arrows'];expect(validData(data)).toBe(true);
  while(session.state.status==='playing')session.state=tapArrow(session.state,freeArrows(session.state)[0],2);session.status=session.state.status;session.winner=session.state.winner;data=updateClub(data,session);expect(validData(JSON.parse(JSON.stringify(data)))).toBe(true);expect(data.club.stats.arrows.bestScore).toBe(session.state.score);expect(updateClub(data,session).club.history).toHaveLength(1);
});
it('rejects corrupt or impossible saved boards',()=>{
  const s=createArrows('invalid','medium'),blocked=s.arrows.find(a=>arrowBlocker(s,a.id)!==null);expect(validArrows({...s,removed:[blocked.id],score:100})).toBe(false);expect(validArrows({...s,size:20})).toBe(false);expect(validArrows({...s,score:100})).toBe(false);expect(validArrows({...s,turn:2})).toBe(false);expect(tapArrow(s,-1)).toBe(s);
});
