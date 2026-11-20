import {it,expect} from 'vitest';
import {createUntangle,untangleGraph,untangleCrossings,moveUntangle,hintUntangle,undoUntangle,validUntangle} from '../engines/untangle';
import {createSession,updateClub} from '../lib/club';
import {freshData,validData} from '../lib/storage';
it('all four difficulties start tangled and have deterministic crossing-free solutions',()=>{
 for(const [difficulty,n] of [['easy',6],['medium',9],['hard',12],['expert',16]])for(let i=0;i<30;i++){
  const s=createUntangle(String(i),difficulty),g=untangleGraph(String(i),difficulty);
  expect(s).toEqual(createUntangle(String(i),difficulty));expect(s.points).toHaveLength(n);expect(untangleCrossings(s.points,s.edges).count).toBeGreaterThan(0);expect(untangleCrossings(g.points,g.edges).count).toBe(0);expect(validUntangle(s)).toBe(true);
 }
});
it('counts crossings and collinear overlaps but allows legal shared endpoints',()=>{
 const p=[{x:0,y:0},{x:100,y:100},{x:0,y:100},{x:100,y:0}];expect(untangleCrossings(p,[[0,1],[2,3]]).count).toBe(1);expect(untangleCrossings(p,[[0,1],[1,2]]).count).toBe(0);
 const q=[{x:0,y:0},{x:100,y:0},{x:50,y:0},{x:50,y:100}];expect(untangleCrossings(q,[[0,1],[2,3]]).count).toBe(1);expect(untangleCrossings(q,[[0,1],[0,2]]).count).toBe(1);
});
it('rejects overlaps and invalid moves, saves turns, hints and undo without mutating',()=>{
 const s=createUntangle('moves'),p=s.points[1];expect(moveUntangle(s,0,p.x,p.y,2)).toBe(s);expect(moveUntangle(s,-1,100,100)).toBe(s);expect(moveUntangle(s,0,NaN,100)).toBe(s);
 const moved=moveUntangle(s,0,200,200,2);expect(moved.moves).toBe(1);expect(moved.turn).toBe(1);expect(validUntangle(moved)).toBe(true);
 const hint=hintUntangle(moved);expect(hint.hints).toBe(1);expect(hint.turn).toBe(1);expect(hintUntangle(hint)).toBe(hint);
 const undo=undoUntangle(hint);expect(undo.points).toEqual(s.points);expect(undo.turn).toBe(0);expect(undo.moves).toBe(2);expect(undo.hints).toBe(1);expect(validUntangle(undo)).toBe(true);expect(s.moves).toBe(0);
});
it('completes through legal moves, saves scores once and validates family backups',()=>{
 const players=[{id:'a',name:'Rahul',avatar:'R'},{id:'b',name:'Neha',avatar:'N'}];let session=createSession('untangle','local',players,{seed:'finish'}),s=session.state;const target=untangleGraph(s.seed).points;
 for(let i=0;i<100&&s.status==='playing';i++){
  s=hintUntangle(s);const id=s.hint,t=target[id],blocker=s.points.findIndex((p,j)=>j!==id&&Math.hypot(p.x-t.x,p.y-t.y)<30);
  if(blocker>=0){let spare;for(let x=36;x<365&&!spare;x+=45)for(let y=36;y<365&&!spare;y+=45)if(Math.hypot(x-t.x,y-t.y)>35&&s.points.every((p,j)=>j===blocker||Math.hypot(x-p.x,y-p.y)>35))spare={x,y};expect(spare).toBeDefined();s=moveUntangle(s,blocker,spare.x,spare.y,2);}else s=moveUntangle(s,id,t.x,t.y,2);
 }
 expect(s.status).toBe('complete');expect(s.winner).toBe('team');expect(validUntangle(s)).toBe(true);expect(moveUntangle(s,0,200,200)).toBe(s);session={...session,state:s,status:s.status,winner:s.winner};let data=updateClub(freshData(),session);data=updateClub(data,session);expect(data.club.history).toHaveLength(1);expect(data.club.stats.untangle.played).toBe(1);expect(validData(data)).toBe(true);
 expect(validUntangle({...s,score:s.score+1})).toBe(false);expect(validUntangle({...s,edges:[]})).toBe(false);
});
