import {hash,random} from './random.js';
export const arrowDirections={up:[-1,0],right:[0,1],down:[1,0],left:[0,-1]};
const levels={easy:[6,10],medium:[8,20],hard:[10,32]};
export function arrowRay(arrow,size){const [dr,dc]=arrowDirections[arrow.direction],ray=[];let r=Math.floor(arrow.cells.at(-1)/size)+dr,c=arrow.cells.at(-1)%size+dc;while(r>=0&&r<size&&c>=0&&c<size){ray.push(r*size+c);r+=dr;c+=dc;}return ray;}
export function createArrows(seed='arrows',difficulty='easy'){
  const [size,count]=levels[difficulty]||levels.easy,rng=random(hash(`${seed}:${difficulty}:arrows-v1`)),arrows=[],occupied=new Set();
  // Each inserted arrow can leave immediately; reverse insertion is a guaranteed solution.
  for(let attempt=0;attempt<15000&&arrows.length<count;attempt++){
    const direction=Object.keys(arrowDirections)[Math.floor(rng()*4)],[dr,dc]=arrowDirections[direction],r=Math.floor(rng()*size),c=Math.floor(rng()*size),length=2+Math.floor(rng()*3),cells=[];
    for(let n=length-1;n>=0;n--){const row=r-dr*n,col=c-dc*n;if(row<0||row>=size||col<0||col>=size)break;cells.push(row*size+col);}
    const arrow={id:arrows.length,direction,cells};if(cells.length!==length||cells.some(i=>occupied.has(i))||arrowRay(arrow,size).some(i=>occupied.has(i)))continue;
    arrows.push(arrow);cells.forEach(i=>occupied.add(i));
  }
  return {seed,difficulty,size,arrows,removed:[],mistakes:0,hints:0,hint:null,turn:0,score:0,status:'playing',winner:null};
}
export function arrowBlocker(s,id){const arrow=s.arrows.find(a=>a.id===id);if(!arrow||s.removed.includes(id))return null;const ray=new Set(arrowRay(arrow,s.size));return s.arrows.find(a=>a.id!==id&&!s.removed.includes(a.id)&&a.cells.some(i=>ray.has(i)))?.id??null;}
export function freeArrows(s){return s.arrows.filter(a=>!s.removed.includes(a.id)&&arrowBlocker(s,a.id)===null).map(a=>a.id);}
const score=s=>Math.max(0,s.removed.length*100-s.mistakes*5-s.hints*10);
export function tapArrow(s,id,players=1){
  if(s.status!=='playing'||!Number.isInteger(id)||!s.arrows.some(a=>a.id===id)||s.removed.includes(id))return s;
  const next=structuredClone(s);if(arrowBlocker(s,id)!==null)next.mistakes++;else{next.removed.push(id);next.hint=null;next.turn=(s.turn+1)%players;if(next.removed.length===next.arrows.length){next.status='complete';next.winner=players===2?'team':0;}}
  next.score=score(next);return next;
}
export function hintArrow(s){if(s.status!=='playing')return s;const next={...s,hint:freeArrows(s)[0],hints:s.hints+1};next.score=score(next);return next;}
export function validArrows(s){
  if(!s||typeof s.seed!=='string'||s.seed.length>200||!Object.hasOwn(levels,s.difficulty)||!Array.isArray(s.removed)||new Set(s.removed).size!==s.removed.length||!['mistakes','hints'].every(k=>Number.isInteger(s[k])&&s[k]>=0&&s[k]<=1e8)||![0,1].includes(s.turn))return false;
  const expected=createArrows(s.seed,s.difficulty);if(s.size!==expected.size||JSON.stringify(s.arrows)!==JSON.stringify(expected.arrows)||!s.removed.every(i=>Number.isInteger(i)&&i>=0&&i<s.arrows.length)||s.score!==score(s))return false;
  let replay={...expected};for(const id of s.removed){if(arrowBlocker(replay,id)!==null)return false;replay.removed=[...replay.removed,id];}
  const complete=s.removed.length===s.arrows.length;
  return s.status===(complete?'complete':'playing')&&(complete?[0,'team'].includes(s.winner):s.winner===null)&&(s.hint===null||freeArrows(s).includes(s.hint));
}
