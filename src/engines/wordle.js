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
export function guessWord(state, input, players=1) {
  const word=input.trim().toUpperCase();
  if(state.status!=='playing') return {state,error:'This word is already finished.'};
  if(!/^[A-Z]{5}$/.test(word)) return {state,error:'Enter five letters.'};
  if(!vocabulary.has(word)) return {state,error:'Not in our offline word list. Try another word.'};
  if(state.guesses.includes(word)) return {state,error:'You already tried that word.'};
  const next={...state,guesses:[...state.guesses,word],turn:(state.turn+1)%players};
  if(word===answerFor(state.seed)) {next.status='complete';next.winner='team';}
  else if(next.guesses.length===6) {next.status='complete';next.winner='lost';}
  return {state:next,error:''};
}
