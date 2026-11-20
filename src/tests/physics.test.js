import {it,expect} from 'vitest';
import {createPhysics,mazeRoute,tiltMaze,hintMaze,undoMaze,cutRope,retryRope,stepRope,launchBricks,movePaddle,stepBricks,validPhysics,physicsGames} from '../engines/physics';
import {createSession,updateClub} from '../lib/club';
import {freshData,validData} from '../lib/storage';
it('all maze difficulties are deterministic and have safe solutions across many seeds',()=>{
 for(const difficulty of ['easy','medium','hard'])for(let i=0;i<40;i++){let s=createPhysics('gravity',String(i),difficulty);expect(s).toEqual(createPhysics('gravity',String(i),difficulty));const route=mazeRoute(s);expect(route.length).toBeGreaterThan(2);for(const d of route){s=tiltMaze(s,d,2);expect(validPhysics(s)).toBe(true);}expect(s.status).toBe('complete');expect(s.winner).toBe('team');expect(s.mistakes).toBe(0);expect(tiltMaze(s,0)).toBe(s);}
});
it('walls do not pass a maze turn; hints, undo and falls preserve valid progress',()=>{
 const s=createPhysics('gravity','undo');expect(tiltMaze(s,0,2)).toBe(s);const h=hintMaze(s);expect(h.hint).toBe(mazeRoute(s)[0]);expect(hintMaze(h)).toBe(h);const moved=tiltMaze(h,h.hint,2);expect(moved.turn).toBe(1);const undo=undoMaze(moved);expect(undo.ball).toBe(s.ball);expect(undo.moves).toBe(2);expect(undo.turn).toBe(0);expect(undo.hints).toBe(1);expect(validPhysics(undo)).toBe(true);
 let fell=false;for(let i=0;i<20&&!fell;i++){let m=createPhysics('gravity','hole'+i,'hard');for(const hole of m.holes){let copy={...m,holes:[],goal:hole};const route=mazeRoute(copy);if(!route)continue;for(const d of route)m=tiltMaze(m,d);if(m.mistakes){fell=true;expect(m.ball).toBe(m.start);expect(validPhysics(m)).toBe(true);break;}}}expect(fell).toBe(true);
});
it('rope physics feeds pets in both orientations at every difficulty and records stars',()=>{
 for(const difficulty of ['easy','medium','hard'])for(const seed of ['a','b','c','d']){let s=createPhysics('rope',seed,difficulty),first=s.goal>180?0:1;s=cutRope(s,first,2);expect(s.turn).toBe(1);expect(cutRope(s,first,2)).toBe(s);for(let i=0;i<60;i++)s=stepRope(s,1/120,2);s=cutRope(s,1-first,2);for(let i=0;i<2200&&s.status==='playing';i++)s=stepRope(s,1/120,2);expect(s.status).toBe('complete');expect(s.winner).toBe('team');expect(s.stars.some(Boolean)).toBe(true);expect(validPhysics(s)).toBe(true);expect(stepRope(s,1/120)).toBe(s);}
});
it('missed rope cuts can retry without completing a session or erasing attempt costs',()=>{
 let s=createPhysics('rope','miss');s=cutRope(cutRope(s,0),1);for(let i=0;i<2200&&s.phase!=='failed';i++)s=stepRope(s,1/120);expect(s.phase).toBe('failed');expect(s.status).toBe('playing');expect(validPhysics(s)).toBe(true);s=retryRope(s);expect(s.ropes).toEqual([true,true]);expect(s.attempts).toBe(1);expect(s.cuts).toBe(2);expect(validPhysics(s)).toBe(true);
});
it('bricks clear with paddle tracking across difficulties and reinforced bricks need two hits',()=>{
 for(const difficulty of ['easy','medium','hard']){let s=launchBricks(createPhysics('bricks','win',difficulty));for(let i=0;i<16000&&s.status==='playing';i++){s=movePaddle(s,s.ball.x);if(s.phase==='ready')s=launchBricks(s);s=stepBricks(s,1/120,2);}expect(s.status).toBe('complete');expect(s.winner).toBe('team');expect(s.lives).toBeGreaterThan(0);expect(s.score).toBe(difficulty==='easy'?240:difficulty==='medium'?300:480);expect(validPhysics(s)).toBe(true);}
});
it('paddle angle reflects the ball, losing lives passes turns and three losses finish',()=>{
 let s=createPhysics('bricks','loss');s=stepBricks({...s,phase:'flying',ball:{x:202,y:438,vx:0,vy:270}},1/120);expect(s.ball.vy).toBeLessThan(0);expect(s.ball.vx).toBeGreaterThan(0);
 s=createPhysics('bricks','loss');for(let i=0;i<3;i++){s=stepBricks({...s,phase:'flying',ball:{x:20,y:487,vx:0,vy:270}},1/120,2);expect(s.lives).toBe(2-i);expect(s.turn).toBe((i+1)%2);expect(validPhysics(s)).toBe(true);}expect(s.status).toBe('complete');expect(s.winner).toBe('lost');
});
it('physics saves and scores validate in profile backups and completed results count once',()=>{
 const players=[{id:'a',name:'Rahul',avatar:'R'},{id:'b',name:'Neha',avatar:'N'}];let data=freshData();for(const game of physicsGames){let session=createSession(game,'local',players,{seed:'backup'});data=updateClub(data,session);expect(validData(data)).toBe(true);if(game==='gravity'){let state=session.state;for(const d of mazeRoute(state))state=tiltMaze(state,d,2);session={...session,state,status:state.status,winner:state.winner};data=updateClub(updateClub(data,session),session);expect(data.club.stats.gravity.played).toBe(1);expect(validData(data)).toBe(true);}expect(validPhysics({...session.state,score:NaN})).toBe(false);}
});
