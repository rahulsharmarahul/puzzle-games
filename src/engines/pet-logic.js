// A deterministic, solution-independent lower-bound assessment of Petdoku logic.
// Singles, row/column/region locks and shared non-touch exclusions are propagated
// to a fixed point. Remaining pets require deductions beyond these basic rules.
export function analysePetLogic(regions,size){
  const groups=Array.from({length:size*3},()=>[]),conflicts=Array.from({length:size*size},()=>new Set());
  for(let i=0;i<regions.length;i++){const r=Math.floor(i/size),c=i%size;groups[r].push(i);groups[size+c].push(i);groups[2*size+regions[i]].push(i);
    for(let j=0;j<regions.length;j++)if(i!==j&&(r===Math.floor(j/size)||c===j%size||regions[i]===regions[j]||Math.abs(r-Math.floor(j/size))<=1&&Math.abs(c-j%size)<=1))conflicts[i].add(j);
  }
  const candidates=new Set(regions.map((_,i)=>i)),placed=new Set(),initialSingles=groups.filter(g=>g.length===1).length;
  let changed=true,rounds=0,contradiction=false;
  while(changed&&!contradiction){changed=false;rounds++;
    for(const group of groups){const options=group.filter(i=>candidates.has(i));if(!options.length){contradiction=true;break;}
      if(options.length===1&&!placed.has(options[0])){const cell=options[0];placed.add(cell);for(const other of conflicts[cell])if(candidates.delete(other))changed=true;}
    }
    if(contradiction)break;
    for(const group of groups){const options=group.filter(i=>candidates.has(i));if(options.length<2)continue;
      for(const cell of candidates)if(!placed.has(cell)&&options.every(i=>conflicts[i].has(cell))){candidates.delete(cell);changed=true;}
    }
  }
  return {initialSingles,minRegion:Math.min(...groups.slice(size*2).map(g=>g.length)),basicPlacements:placed.size,remainingAfterBasics:size-placed.size,remainingCandidates:candidates.size,rounds,contradiction};
}

// Used by offline catalogue curation; MRV searches the most constrained row first.
export function solvePetLayouts(regions,size,limit=2){
  const results=[],cols=Array(size).fill(-1);let usedCols=0,usedRegions=0;
  function visit(depth){if(results.length>=limit)return;if(depth===size){results.push(cols.map((c,r)=>r*size+c));return;}
    let row=-1,options=null;
    for(let r=0;r<size;r++)if(cols[r]<0){const choices=[];for(let c=0;c<size;c++){const region=regions[r*size+c];if(usedCols&(1<<c)||usedRegions&(1<<region)||r>0&&cols[r-1]>=0&&Math.abs(cols[r-1]-c)<=1||r+1<size&&cols[r+1]>=0&&Math.abs(cols[r+1]-c)<=1)continue;choices.push(c);}if(!choices.length)return;if(!options||choices.length<options.length){row=r;options=choices;if(choices.length===1)break;}}
    for(const c of options){const region=regions[row*size+c];cols[row]=c;usedCols|=1<<c;usedRegions|=1<<region;visit(depth+1);usedCols^=1<<c;usedRegions^=1<<region;cols[row]=-1;if(results.length>=limit)return;}
  }
  visit(0);return results;
}
