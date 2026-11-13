export function createDots(size=4) { return {size,h:Array((size+1)*size).fill(-1),v:Array(size*(size+1)).fill(-1),boxes:Array(size*size).fill(-1),turn:0,status:'playing',winner:null}; }
export function dotScores(s) { return [0,1].map(p=>s.boxes.filter(n=>n===p).length); }
export function drawEdge(state, axis, index) {
  if (state.status!=='playing' || !['h','v'].includes(axis) || !Number.isInteger(index) || index<0 || index>=state[axis].length || state[axis][index]!==-1) return state;
  const next=structuredClone(state), n=next.size; next[axis][index]=next.turn;
  let claimed=0;
  for(let r=0;r<n;r++) for(let c=0;c<n;c++) {
    const box=r*n+c;
    if(next.boxes[box]===-1 && [next.h[r*n+c],next.h[(r+1)*n+c],next.v[r*(n+1)+c],next.v[r*(n+1)+c+1]].every(e=>e!==-1)) { next.boxes[box]=next.turn; claimed++; }
  }
  if(!claimed) next.turn=1-next.turn;
  if(next.boxes.every(b=>b!==-1)) { next.status='complete'; const scores=dotScores(next); next.winner=scores[0]===scores[1] ? 'draw' : scores[0]>scores[1] ? 0 : 1; }
  return next;
}
export function dotsBot(state) {
  const choices=[];
  for(const axis of ['h','v']) state[axis].forEach((e,index)=>{if(e===-1){const next=drawEdge(state,axis,index);const gain=dotScores(next)[state.turn]-dotScores(state)[state.turn];let risky=0;const n=next.size;for(let r=0;r<n;r++)for(let c=0;c<n;c++)if([next.h[r*n+c],next.h[(r+1)*n+c],next.v[r*(n+1)+c],next.v[r*(n+1)+c+1]].filter(v=>v!==-1).length===3)risky++;choices.push({axis,index,score:gain*100-risky});}});
  return choices.sort((a,b)=>b.score-a.score)[0];
}
