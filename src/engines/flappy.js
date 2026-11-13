import { hash, random } from './random';
export const flight = {width:360,height:500,x:85,radius:13,gravity:900,jump:-310,speed:120,gap:155,spacing:210,pipeWidth:55};
export function pipeAt(seed,index) {const rng=random(hash(`${seed}:${index}`));return {x:430+index*flight.spacing,top:65+rng()*200,scored:false};}
export function createFlight(seed) {return {seed,y:230,vy:0,distance:0,score:0,elapsed:0,alive:true,pipes:[pipeAt(seed,0),pipeAt(seed,1),pipeAt(seed,2)],nextPipe:3};}
export function stepFlight(state,dt) {
  if(!state.alive) return state;
  const seconds=Math.max(0,Math.min(dt,.025));
  const next={...state,pipes:state.pipes.map(p=>({...p})),elapsed:state.elapsed+seconds};
  next.vy+=flight.gravity*seconds;next.y+=next.vy*seconds;next.distance+=flight.speed*seconds;
  for(const p of next.pipes) {
    const x=p.x-next.distance;
    if(x+flight.pipeWidth<flight.x-flight.radius && !p.scored){p.scored=true;next.score++;}
    if(x<flight.x+flight.radius && x+flight.pipeWidth>flight.x-flight.radius && (next.y-flight.radius<p.top || next.y+flight.radius>p.top+flight.gap)) next.alive=false;
  }
  if(next.y-flight.radius<0 || next.y+flight.radius>flight.height-25) next.alive=false;
  next.pipes=next.pipes.filter(p=>p.x-next.distance+flight.pipeWidth>0);
  while(next.pipes.length<3)next.pipes.push(pipeAt(next.seed,next.nextPipe++));
  return next;
}
