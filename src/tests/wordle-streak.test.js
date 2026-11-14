import {it,expect} from 'vitest';
import {wordleStreak,recordWordleDay,validDay} from '../lib/wordle-streak';
import {createSession,updateClub,validClub} from '../lib/club';
import {guessWord,answerFor} from '../engines/wordle';
const players=[{id:'one',name:'One',avatar:'X'},{id:'two',name:'Two',avatar:'X'}];
function finish(day,mode='solo'){const s=createSession('wordle',mode,players,{seed:'wordle-v1:'+day,daily:'wordle-v1:'+day});s.state=guessWord(s.state,answerFor(s.seed),mode==='solo'?1:2).state;s.status='complete';s.winner='team';return s;}
it('counts consecutive daily wins and keeps a streak alive until today is played',()=>{
  const club={wordleDays:{'2026-11-11':'won','2026-11-12':'won','2026-11-13':'won'}};
  expect(wordleStreak(club,'2026-11-14')).toEqual({current:3,best:3,today:'unplayed'});
  expect(wordleStreak(club,'2026-11-15').current).toBe(0);
});
it('a daily loss resets current streak while preserving the personal best',()=>{expect(wordleStreak({wordleDays:{'2026-11-12':'won','2026-11-13':'won','2026-11-14':'lost'}},'2026-11-14')).toEqual({current:0,best:2,today:'lost'});});
it('deduplicates dates across modes and never downgrades a daily win',()=>{
  let data=updateClub({},finish('2026-11-13'));data=updateClub(data,finish('2026-11-14'));data=updateClub(data,finish('2026-11-14','local'));
  expect(wordleStreak(data.club,'2026-11-14')).toEqual({current:2,best:2,today:'won'});
  const loss={...finish('2026-11-14'),winner:'lost'};expect(recordWordleDay(data.club,loss).wordleDays['2026-11-14']).toBe('won');expect(validClub(data.club,()=>true)).toBe(true);
});
it('free play does not change daily streaks and older retained daily history is adopted',()=>{
  expect(recordWordleDay({}, {...finish('2026-11-14'),daily:null})).toEqual({});
  expect(wordleStreak({history:[{game:'wordle',daily:'wordle-v1:2026-11-13',winner:'team'}]},'2026-11-14').current).toBe(1);
});
it('keeps records and best streak after match history is pruned and rejects corrupt imports',()=>{
  const club={wordleDays:{'2026-11-13':'won'},wordleBest:10,history:[]};const next={...club,...recordWordleDay(club,finish('2026-11-14'))};expect(wordleStreak(next,'2026-11-14')).toEqual({current:2,best:10,today:'won'});
  expect(validDay('2026-02-30')).toBe(false);expect(validClub({sessions:{},history:[],wordleDays:{'bad':'won'}},()=>true)).toBe(false);
});
it('adopts legacy daily wins before another game prunes the old history',()=>{
  const old={id:'old-word',game:'wordle',daily:'wordle-v1:2026-11-13',winner:'team'},history=[...Array.from({length:499},(_,i)=>({id:String(i),game:'checkers',daily:null,winner:0})),old];
  const s=createSession('checkers','local',players);s.status='complete';s.state.status='complete';s.winner=0;s.state.winner=0;
  const next=updateClub({club:{sessions:{},stats:{},daily:{},history}},s).club;
  expect(next.history.some(h=>h.id==='old-word')).toBe(false);expect(next.wordleDays['2026-11-13']).toBe('won');expect(wordleStreak(next,'2026-11-14').current).toBe(1);
});
