import {hash,random} from './random';

export const numberGames=['2048','2248','flood'];
const rngFor=(s)=>random(hash(`${s.seed}:${s.moves}`));
const power=n=>Number.isSafeInteger(n)&&n>=2&&n<=2**40&&Number.isInteger(Math.log2(n));
const int=(n,max=1e8)=>Number.isInteger(n)&&n>=0&&n<=max;
export function neighbours(i,cols,rows,diagonal=false){
  const out=[],r=Math.floor(i/cols),c=i%cols;
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if((dr||dc)&&(diagonal||!dr||!dc)&&r+dr>=0&&r+dr<rows&&c+dc>=0&&c+dc<cols)out.push((r+dr)*cols+c+dc);
  return out;
}
function spawn(s,rng){const empty=s.grid.flatMap((n,i)=>n?[]:[i]);if(empty.length)s.grid[empty[Math.floor(rng()*empty.length)]]=rng()<.9?2:4;}
export function createNumberGame(game,seed){
  const s={game,seed,grid:[],moves:0,score:0,turn:0,won:false,ended:false,status:'playing',winner:null},rng=rngFor(s);
  if(game==='2048'){s.grid=Array(16).fill(0);spawn(s,rng);spawn(s,rng);}
  else if(game==='2248')s.grid=Array.from({length:40},()=>2**(1+Math.floor(rng()*4)));
  else s.grid=Array.from({length:144},()=>Math.floor(rng()*6));
  return s;
}
export function slideLine(line){
  const values=line.filter(Boolean),result=[];let score=0;
  for(let i=0;i<values.length;i++){if(values[i]===values[i+1]){const n=values[i]*2;result.push(n);score+=n;i++;}else result.push(values[i]);}
  return {line:[...result,...Array(line.length-result.length).fill(0)],score};
}
export function canSlide(s){return s.grid.some((n,i)=>!n||neighbours(i,4,4).some(j=>s.grid[j]===n));}
function advance(s,players){s.moves++;s.turn=(s.turn+1)%players;return s;}
export function finishNumberGame(s,players=1){if(s.status!=='playing')return s;return {...s,ended:true,status:'complete',winner:s.game==='2048'&&!s.won?'lost':players===2?'team':0};}
export function move2048(s,direction,players=1){
  if(s.status!=='playing'||!['left','right','up','down'].includes(direction))return s;
  const next=structuredClone(s);
  for(let row=0;row<4;row++){
    const indices=Array.from({length:4},(_,c)=>direction==='left'?row*4+c:direction==='right'?row*4+3-c:direction==='up'?c*4+row:(3-c)*4+row);
    const merged=slideLine(indices.map(i=>s.grid[i]));indices.forEach((i,c)=>next.grid[i]=merged.line[c]);next.score+=merged.score;
  }
  if(next.grid.every((n,i)=>n===s.grid[i]))return s;
  spawn(next,rngFor(s));advance(next,players);next.won=s.won||next.grid.some(n=>n>=2048);
  return canSlide(next)?next:finishNumberGame(next,players);
}
export function canExtend(s,path,i){
  if(!int(i,39)||path.includes(i)||path.length>=40)return false;
  if(!path.length)return true;
  const last=path.at(-1);return neighbours(last,5,8,true).includes(i)&&(s.grid[i]===s.grid[last]||path.length>1&&s.grid[i]===2*s.grid[last]);
}
export function chainValue(s,path){return path.length<2?0:2**Math.ceil(Math.log2(path.reduce((sum,i)=>sum+s.grid[i],0)));}
export function canLink(s){return s.grid.some((n,i)=>neighbours(i,5,8,true).some(j=>s.grid[j]===n));}
export function merge2248(s,path,players=1){
  if(s.status!=='playing'||!Array.isArray(path)||path.length<2||!path.every((i,n)=>canExtend(s,path.slice(0,n),i)))return s;
  const value=chainValue(s,path);if(value>2**40)return s;
  const next=structuredClone(s),rng=rngFor(s);path.forEach(i=>next.grid[i]=0);next.grid[path.at(-1)]=value;next.score+=value;
  for(let c=0;c<5;c++){
    const column=Array.from({length:8},(_,r)=>next.grid[r*5+c]).filter(Boolean);
    while(column.length<8)column.unshift(2**(1+Math.floor(rng()*4)));
    column.forEach((n,r)=>next.grid[r*5+c]=n);
  }
  advance(next,players);return canLink(next)?next:finishNumberGame(next,players);
}
export function flooded(s){
  const seen=new Set([0]),queue=[0];for(let n=0;n<queue.length;n++)for(const j of neighbours(queue[n],12,12))if(!seen.has(j)&&s.grid[j]===s.grid[0]){seen.add(j);queue.push(j);}return [...seen];
}
export function floodColour(s,colour,players=1){
  if(s.status!=='playing'||!int(colour,5)||colour===s.grid[0])return s;
  const next=structuredClone(s);for(const i of flooded(s))next.grid[i]=colour;advance(next,players);
  next.won=flooded(next).length===144;next.score=next.won?(31-next.moves)*100:0;
  if(next.won||next.moves>=30){next.status='complete';next.winner=next.won?(players===2?'team':0):'lost';}
  return next;
}
export function validNumberGame(s){
  if(!s||!numberGames.includes(s.game)||typeof s.seed!=='string'||s.seed.length>200||!Array.isArray(s.grid)||!int(s.moves)||!int(s.score,1e12)||!int(s.turn,1)||typeof s.won!=='boolean'||typeof s.ended!=='boolean'||!['playing','complete'].includes(s.status)||![null,0,'team','lost'].includes(s.winner)||(s.status==='playing')!==(s.winner===null))return false;
  if(s.game==='flood')return s.grid.length===144&&s.grid.every(n=>int(n,5))&&s.moves<=30&&s.won===(flooded(s).length===144)&&s.score===(s.won?(31-s.moves)*100:0)&&s.status===(s.won||s.moves===30?'complete':'playing')&&(s.status==='playing'||(s.won?s.winner!=='lost':s.winner==='lost'));
  if(s.grid.length!==(s.game==='2048'?16:40)||!s.grid.every(n=>s.game==='2048'&&n===0||power(n)))return false;
  if(s.game==='2048'&&s.won!==s.grid.some(n=>n>=2048))return false;
  const ended=s.ended||!(s.game==='2048'?canSlide(s):canLink(s));
  return s.status===(ended?'complete':'playing')&&(s.status==='playing'||(s.game==='2048'&&!s.won?s.winner==='lost':s.winner!=='lost'));
}
