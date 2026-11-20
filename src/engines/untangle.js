import {hash,random,shuffle} from './random.js';
const levels={easy:[2,3],medium:[3,3],hard:[3,4],expert:[4,4]},EPS=1e-7;
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const onSegment=(a,b,p)=>Math.abs(cross(a,b,p))<EPS&&p.x>=Math.min(a.x,b.x)-EPS&&p.x<=Math.max(a.x,b.x)+EPS&&p.y>=Math.min(a.y,b.y)-EPS&&p.y<=Math.max(a.y,b.y)+EPS;
export function untangleGraph(seed,difficulty='easy'){
  const [rows,cols]=levels[difficulty]||levels.easy,rng=random(hash(`untangle-v1:${seed}:${difficulty}`)),points=[],edges=[];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const i=r*cols+c;points.push({x:55+c*290/(cols-1)+(rng()-.5)*8,y:55+r*290/(rows-1)+(rng()-.5)*8});if(c+1<cols)edges.push([i,i+1]);if(r+1<rows)edges.push([i,i+cols]);if(r+1<rows&&c+1<cols)edges.push(rng()<.5?[i,i+cols+1]:[i+1,i+cols]);}
  return {points,edges};
}
export function untangleCrossings(points,edges){
  const pairs=[],badEdges=new Set();
  for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){
    const [a,b]=edges[i],[c,d]=edges[j],shared=[a,b].find(k=>k===c||k===d);let hits=false;
    if(shared!==undefined){const p=points[shared],q=points[a===shared?b:a],r=points[c===shared?d:c];hits=Math.abs(cross(p,q,r))<EPS&&(q.x-p.x)*(r.x-p.x)+(q.y-p.y)*(r.y-p.y)>EPS;}
    else{const A=points[a],B=points[b],C=points[c],D=points[d],abC=cross(A,B,C),abD=cross(A,B,D),cdA=cross(C,D,A),cdB=cross(C,D,B);hits=abC*abD<-EPS&&cdA*cdB<-EPS||onSegment(A,B,C)||onSegment(A,B,D)||onSegment(C,D,A)||onSegment(C,D,B);}
    if(hits){pairs.push([i,j]);badEdges.add(i);badEdges.add(j);}
  }
  return {count:pairs.length,pairs,badEdges};
}
export function spacedPoints(points){return points.every((p,i)=>points.every((q,j)=>i===j||Math.hypot(p.x-q.x,p.y-q.y)>=30));}
export function createUntangle(seed='untangle',difficulty='easy'){
  if(!Object.hasOwn(levels,difficulty))difficulty='easy';const graph=untangleGraph(seed,difficulty),rng=random(hash(`untangle-scramble:${seed}:${difficulty}`)),n=graph.points.length;let points;
  for(let trial=0;trial<100;trial++){const order=shuffle(Array.from({length:n},(_,i)=>i),rng),angle=rng()*Math.PI*2;points=order.map(k=>({x:200+145*Math.cos(angle+k*Math.PI*2/n),y:200+145*Math.sin(angle+k*Math.PI*2/n)}));if(untangleCrossings(points,graph.edges).count)break;}
  return {seed,difficulty,points,edges:graph.edges,moves:0,hints:0,hint:null,undo:[],turn:0,score:0,status:'playing',winner:null};
}
const finalScore=s=>Math.max(0,1000+s.points.length*50-s.moves*5-s.hints*50);
export function moveUntangle(s,id,x,y,players=1){
  if(s.status!=='playing'||!Number.isInteger(id)||id<0||id>=s.points.length||!Number.isFinite(x)||!Number.isFinite(y))return s;
  const point={x:Math.round(Math.max(32,Math.min(368,x))*1000)/1000,y:Math.round(Math.max(32,Math.min(368,y))*1000)/1000};if(Math.hypot(s.points[id].x-point.x,s.points[id].y-point.y)<.01)return s;
  const points=s.points.map((p,i)=>i===id?point:{...p});if(!spacedPoints(points))return s;
  const next={...s,points,moves:s.moves+1,hint:null,turn:(s.turn+1)%players,undo:[...s.undo,{points:s.points.map(p=>({...p})),turn:s.turn}].slice(-50)};
  if(!untangleCrossings(points,s.edges).count){next.status='complete';next.winner=players===2?'team':0;next.score=finalScore(next);next.undo=[];}return next;
}
export function undoUntangle(s){if(s.status!=='playing'||!s.undo.length)return s;const previous=s.undo.at(-1);return {...s,points:previous.points.map(p=>({...p})),turn:previous.turn,undo:s.undo.slice(0,-1),moves:s.moves+1,hint:null};}
export function hintUntangle(s){if(s.status!=='playing'||s.hint!==null)return s;const target=untangleGraph(s.seed,s.difficulty).points;let id=0;for(let i=1;i<target.length;i++)if(Math.hypot(s.points[i].x-target[i].x,s.points[i].y-target[i].y)>Math.hypot(s.points[id].x-target[id].x,s.points[id].y-target[id].y))id=i;return {...s,hint:id,hints:s.hints+1};}
export function validUntangle(s){
  const int=(n,max=1e8)=>Number.isInteger(n)&&n>=0&&n<=max;
  if(!s||typeof s.seed!=='string'||s.seed.length>200||!Object.hasOwn(levels,s.difficulty))return false;const graph=untangleGraph(s.seed,s.difficulty),n=graph.points.length;
  const validPoints=points=>Array.isArray(points)&&points.length===n&&points.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=32&&p.x<=368&&p.y>=32&&p.y<=368)&&spacedPoints(points);
  if(!validPoints(s.points)||JSON.stringify(s.edges)!==JSON.stringify(graph.edges)||!int(s.moves)||!int(s.hints)||!int(s.turn,1)||!(s.hint===null||int(s.hint,n-1))||!Array.isArray(s.undo)||s.undo.length>50||!s.undo.every(u=>u&&validPoints(u.points)&&int(u.turn,1)))return false;
  const solved=untangleCrossings(s.points,s.edges).count===0;return s.status===(solved?'complete':'playing')&&(solved?[0,'team'].includes(s.winner)&&s.score===finalScore(s):s.winner===null&&s.score===0);
}
