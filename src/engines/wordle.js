import { answers, vocabulary } from '../data/words';
import { hash } from './random';
export function answerFor(seed) { return answers[hash(`wordle-v1:${seed}`)%answers.length]; }
export function wordFeedback(answer, guess) {
  const out=Array(5).fill('absent'), remaining={};
  for(let i=0;i<5;i++) if(guess[i]===answer[i]) out[i]='correct'; else remaining[answer[i]]=(remaining[answer[i]]||0)+1;
  for(let i=0;i<5;i++) if(out[i]!=='correct' && remaining[guess[i]]>0) {out[i]='present';remaining[guess[i]]--;}
  return out;
}
export function createWordle(seed) { return {seed,guesses:[],turn:0,status:'playing',winner:null}; }
export const WORDLE_HINT_LIMIT=3;
export function hintWord(state){
  if(state.status!=='playing')return {state,error:'This word is already finished.'};
  const hints=state.hints||[],answer=answerFor(state.seed);
  if(hints.length>=WORDLE_HINT_LIMIT)return {state,error:'All three hints have been used.'};
  const position=[0,1,2,3,4].find(i=>!hints.some(h=>h.position===i)&&!state.guesses.some(word=>word[i]===answer[i]));
  if(position===undefined)return {state,error:'You already know every position. Use your clues to finish the word.'};
  return {state:{...state,hints:[...hints,{position,letter:answer[position]}]},error:''};
}
export function validWordleHints(state){
  const hints=state.hints;
  return hints===undefined||Array.isArray(hints)&&hints.length<=WORDLE_HINT_LIMIT&&new Set(hints.map(h=>h?.position)).size===hints.length&&hints.every(h=>h&&Object.keys(h).length===2&&Number.isInteger(h.position)&&h.position>=0&&h.position<5&&h.letter===answerFor(state.seed)[h.position]);
}
export function guessWord(state, input, players=1) {
  const word=input.trim().toUpperCase();
  if(state.status!=='playing') return {state,error:'This word is already finished.'};
  if(!/^[A-Z]{5}$/.test(word)) return {state,error:'Enter five letters.'};
  if(!vocabulary.has(word)) return {state,error:'Not in our offline word list. Clear or edit this word and try again.'};
  if(state.guesses.includes(word)) return {state,error:'You already tried that word.'};
  const next={...state,guesses:[...state.guesses,word],turn:(state.turn+1)%players};
  if(word===answerFor(state.seed)) {next.status='complete';next.winner='team';}
  else if(next.guesses.length===6) {next.status='complete';next.winner='lost';}
  return {state:next,error:''};
}
