import {writeFileSync,mkdirSync} from 'node:fs';import {random,shuffle} from '../src/engines/random.js';import {solvePetLayouts,analysePetLogic} from '../src/engines/pet-logic.js';
const rng=random(19112026),size=10,found=[],N=size*size;const adj=i=>[...(i%size?[i-1]:[]),...(i%size<size-1?[i+1]:[]),...(i>=size?[i-size]:[]),...(i<N-size?[i+size]:[])];
mkdirSync('.wrangler',{recursive:true});
// Keep the intended solution fixed; relocate connected boundary cells to eliminate
// alternative solutions, then accept only layouts that resist the basic rules.
for(let restart=0;restart<100&&found.length<12;restart++){
 let cols;do{cols=shuffle(Array.from({length:size},(_,i)=>i),rng);}while(cols.some((c,r)=>r&&Math.abs(c-cols[r-1])<=1));const solution=cols.map((c,r)=>r*size+c),protectedCells=new Set(solution),regions=Array(N).fill(-1),areas=Array(size).fill(1);solution.forEach((i,r)=>regions[i]=r);
 while(regions.includes(-1)){const edges=Array.from({length:size},()=>[]);for(let i=0;i<N;i++)if(regions[i]>=0)for(const j of adj(i))if(regions[j]<0)edges[regions[i]].push(j);const available=edges.map((e,r)=>e.length?r:-1).filter(r=>r>=0),small=available.filter(r=>areas[r]<4),region=(small.length?small:available)[Math.floor(rng()*(small.length||available.length))],i=edges[region][Math.floor(rng()*edges[region].length)];regions[i]=region;areas[region]++;}
 if(Math.min(...areas)<4)continue;const tabu=new Map();let best=32;
 for(let step=0;step<20000;step++){
  const solutions=solvePetLayouts(regions,size,32);if(!solutions.length)throw Error('lost protected solution');best=Math.min(best,solutions.length);if(solutions.length===1){const rating=analysePetLogic(regions,size);if(rating.remainingAfterBasics>=4){found.push({size,regions:[...regions],solution:solutions[0],rating});writeFileSync('.wrangler/pet-hill-found.json',JSON.stringify({version:2,puzzles:found}));console.log('FOUND',found.length,restart,step,rating);break;}}
  if(step&&step%2000===0)console.log('progress',restart,step,'count',solutions.length,'best',best);
  const freq=Array(N).fill(0);for(const sol of solutions)for(const i of sol)if(!protectedCells.has(i))freq[i]++;
  const moves=[];for(let i=0;i<N;i++){const a=regions[i];if(protectedCells.has(i)||areas[a]<=4)continue;for(const b of new Set(adj(i).map(j=>regions[j])))if(a!==b&&(tabu.get(`${i}:${b}`)||-100)<step-30)moves.push({i,a,b,score:freq[i]*10+rng()*15});}
  moves.sort((a,b)=>b.score-a.score);let moved=false;
  for(const {i,a,b} of moves){const first=regions.findIndex((r,j)=>r===a&&j!==i),seen=new Set([first]),q=[first];for(let n=0;n<q.length;n++)for(const j of adj(q[n]))if(j!==i&&regions[j]===a&&!seen.has(j)){seen.add(j);q.push(j);}if(seen.size!==areas[a]-1)continue;regions[i]=b;areas[a]--;areas[b]++;tabu.set(`${i}:${a}`,step);moved=true;break;}
  if(!moved)break;
 }
}
console.log('Finished',found.length);if(found.length!==12)throw Error('Could not curate twelve unique Expert puzzles.');if(found.length===12)writeFileSync('src/data/petdoku-expert.json',JSON.stringify({version:2,puzzles:found}));
