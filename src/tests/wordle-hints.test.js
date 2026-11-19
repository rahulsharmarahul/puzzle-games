import {it,expect} from 'vitest';
import {createWordle,answerFor,guessWord,hintWord,validWordleHints} from '../engines/wordle';
import {createSession,updateClub} from '../lib/club';
import {freshData,validData} from '../lib/storage';
import {createRoom,joinRoom,applyRoomAction,publicRoom} from '../../server/model';
it('reveals correct positions without consuming a guess, changing turns or overwriting state',()=>{
  const s=createWordle('hint'),result=hintWord(s);expect(result.error).toBe('');expect(result.state.hints).toEqual([{position:0,letter:answerFor(s.seed)[0]}]);expect(result.state.guesses).toEqual([]);expect(result.state.turn).toBe(s.turn);expect(s.hints).toBeUndefined();
});
it('skips already correct letters and stops after three distinct hints',()=>{
  let s=createWordle('clues');const answer=answerFor(s.seed);s.guesses=[answer[0]+'ZZZZ'];s=hintWord(s).state;expect(s.hints[0].position).toBe(1);s=hintWord(s).state;s=hintWord(s).state;expect(new Set(s.hints.map(h=>h.position)).size).toBe(3);expect(hintWord(s).state).toBe(s);expect(hintWord(s).error).toContain('three');
  const known={...createWordle('known'),guesses:[answerFor('known')]};expect(hintWord(known).state).toBe(known);
});
it('keeps hints through guesses, validates old saves and rejects forged hint data',()=>{
  const players=[{id:'a',name:'A',avatar:'X'},{id:'b',name:'B',avatar:'X'}];let session=createSession('wordle','local',players,{seed:'backup'});expect(validData(updateClub(freshData(),session))).toBe(true);session.state=hintWord(session.state).state;session.state=guessWord(session.state,answerFor(session.seed),2).state;session.status=session.state.status;session.winner=session.state.winner;const data=updateClub(freshData(),session);expect(validData(JSON.parse(JSON.stringify(data)))).toBe(true);expect(session.state.hints).toHaveLength(1);
  expect(validWordleHints({...session.state,hints:[{position:0,letter:'?'}]})).toBe(false);expect(validWordleHints({...session.state,hints:[...session.state.hints,...session.state.hints]})).toBe(false);expect(hintWord(session.state).state).toBe(session.state);
});
it('online hints are authorized, shared and limited without leaking the hidden answer',()=>{
  const room=createRoom('ABCDEFGH',{game:'wordle',name:'A',avatar:'X'},1000);joinRoom(room,{name:'B',avatar:'X'},1001);const act=(seat,type='wordle-hint')=>applyRoomAction(room,seat,{id:crypto.randomUUID(),revision:room.revision,action:{type}},true,2000);
  expect(()=>act(1)).toThrow('other player');for(let n=0;n<3;n++)act(0);expect(()=>act(0)).toThrow('three');const view=publicRoom(room,[true,true],2000);expect(view.state.hints).toHaveLength(3);expect(view.state.guesses).toEqual([]);expect(view.turn).toBe(0);expect(view.state.answer).toBeUndefined();expect(view.state.seed).toBeUndefined();expect(view.state.hints.every(h=>h.letter===answerFor(room.match.seed)[h.position])).toBe(true);
});
