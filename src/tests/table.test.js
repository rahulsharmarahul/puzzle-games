import {describe,it,expect} from 'vitest';
import {createLudo,playLudo,ludoMoves} from '../engines/ludo';
import {createUno,playUno,canUno,createTrump,playTrump,legalTrump} from '../engines/cards';
import {createSea,playSea,shipCells} from '../engines/sea';
import {createTable,tableAction,tableBot,tableView,validTable} from '../engines/table';
import {createRoom,joinRoom,applyRoomAction,publicRoom} from '../../server/model';
import {createSession,validSession,updateClub} from '../lib/club';
import {recordOnlineResult,validOnlineResults} from '../lib/online-results';

describe('complete table games and durable saves',()=>{
  for(const game of ['ludo','uno','trump','sea'])for(const count of game==='sea'?[2]:[2,3,4])it(`${game} completes with ${count} players and validates every saved position`,()=>{
    let s=createTable(game,count,'test-round-'+count);
    for(let moves=0;s.status==='playing'&&moves<20000;moves++){
      const seat=game==='sea'&&!s.ready.every(Boolean)?s.setupTurn:s.turn;
      expect(validTable(game,s,count)).toBe(true);
      const next=tableAction(game,s,tableBot(game,s,seat),seat);expect(next).not.toBe(s);s=next;
    }
    expect(s.status).toBe('complete');expect(validTable(game,s,count)).toBe(true);
    const session={...createSession(game,'local',Array.from({length:count},(_,i)=>({id:String(i),name:'Player '+i,avatar:'X'}))),state:s,status:s.status,winner:s.winner};
    expect(validSession(session,()=>true)).toBe(true);
    expect(updateClub({},session).club.history[0].players).toHaveLength(count);
  });
});
it('Ludo requires six to enter, captures, protects safe cells and finishes exactly',()=>{
  const s=createLudo(2,'rules');s.die=5;expect(ludoMoves(s)).toEqual([]);s.die=6;expect(ludoMoves(s)).toHaveLength(4);
  const entered=playLudo(s,{type:'ludo-move',token:0});expect(entered.tokens[0][0]).toBe(0);expect(entered.turn).toBe(0);
  s.tokens=[[0,-1,-1,-1],[27,-1,-1,-1]];s.die=1;
  expect(playLudo(s,{type:'ludo-move',token:0}).tokens[1][0]).toBe(-1);
  s.tokens=[[7,-1,-1,-1],[34,-1,-1,-1]];
  expect(playLudo(s,{type:'ludo-move',token:0}).tokens[1][0]).toBe(34);
  s.tokens=[[56,56,56,55],[-1,-1,-1,-1]];s.die=2;expect(ludoMoves(s)).toEqual([]);s.die=1;
  expect(playLudo(s,{type:'ludo-move',token:3}).winner).toBe(0);
});
it('Ludo pairs block passage and a third six passes the turn',()=>{
  const s=createLudo();s.tokens=[[0,-1,-1,-1],[28,28,-1,-1]];s.die=3;expect(ludoMoves(s)).toEqual([]);
  let found=false;for(let rolls=0;rolls<100;rolls++){const before={...createLudo(3,'six'),sixes:2,rolls};const after=playLudo(before,{type:'ludo-roll'});if(after.note.startsWith('Three')){expect(after.turn).toBe(1);expect(after.die).toBeNull();found=true;break;}}expect(found).toBe(true);
});
it('UNO enforces colour, drawn-card restrictions, +4 legality and UNO penalties',()=>{
  const s=createUno(3,'rules');s.color='red';s.discard=[{id:'top',color:'red',value:'5'}];s.hands[0]=[{id:'red',color:'red',value:'1'},{id:'blue',color:'blue',value:'2'},{id:'wild',color:'wild',value:'+4'}];
  expect(canUno(s,s.hands[0][1])).toBe(false);expect(canUno(s,s.hands[0][2])).toBe(false);
  expect(playUno(s,{type:'uno-play',card:'wild',color:'green'})).toBe(s);
  s.hands[0]=s.hands[0].slice(0,2);const penalty=playUno(s,{type:'uno-play',card:'red'});expect(penalty.hands[0]).toHaveLength(3);
  const called=playUno(s,{type:'uno-call'});expect(playUno(called,{type:'uno-play',card:'red'}).hands[0]).toHaveLength(1);
  s.drawn='blue';expect(canUno(s,s.hands[0][0])).toBe(false);
});
it('UNO reverses direction, skips draw recipients and rejects invalid wild colours',()=>{
  const s=createUno(3);s.color='red';s.hands[0]=[{id:'r',color:'red',value:'reverse'},{id:'x',color:'red',value:'2'},{id:'y',color:'blue',value:'1'}];
  expect(playUno(s,{type:'uno-play',card:'r'}).turn).toBe(2);
  s.hands[0][0]={id:'r',color:'red',value:'+2'};const next=playUno(s,{type:'uno-play',card:'r'});expect(next.turn).toBe(2);expect(next.hands[1]).toHaveLength(9);
  s.hands[0][0]={id:'r',color:'wild',value:'wild'};expect(playUno(s,{type:'uno-play',card:'r',color:'purple'})).toBe(s);
});
it('Trump requires following suit and awards a trick to the highest trump',()=>{
  const s=createTrump(3);s.trump=2;s.hands=[[{id:'0:14',suit:0,rank:14}],[{id:'0:2',suit:0,rank:2},{id:'2:14',suit:2,rank:14}],[{id:'2:2',suit:2,rank:2}]];
  const first=playTrump(s,{type:'trump-play',card:'0:14'});expect(legalTrump(first)).toEqual([s.hands[1][0]]);expect(playTrump(first,{type:'trump-play',card:'2:14'})).toBe(first);
  const next=playTrump(playTrump(first,{type:'trump-play',card:'0:2'}),{type:'trump-play',card:'2:2'});expect(next.turn).toBe(2);expect(next.scores).toEqual([0,0,1]);
});
it('Sea Battle prevents wrapping, overlaps, early shots, repeat shots and out-of-turn shots',()=>{
  expect(shipCells(8,5,false)).toBeNull();expect(shipCells(80,5,true)).toBeNull();let s=createSea();
  s=playSea(s,{type:'sea-place',index:0,vertical:false},0);expect(playSea(s,{type:'sea-place',index:2,vertical:true},0)).toBe(s);expect(playSea(s,{type:'sea-fire',index:0},0)).toBe(s);
  for(const p of [0,1]){s=playSea(s,{type:'sea-auto',shuffle:0},p);s=playSea(s,{type:'sea-ready'},p);}
  const target=s.fleets[1][0][0];s=playSea(s,{type:'sea-fire',index:target},0);expect(s.shots[0][0].hit).toBe(true);expect(s.turn).toBe(1);expect(playSea(s,{type:'sea-fire',index:1},0)).toBe(s);
  s=playSea(s,{type:'sea-fire',index:99},1);expect(playSea(s,{type:'sea-fire',index:target},0)).toBe(s);
});
it('backup validation rejects altered cards and bent ships',()=>{
  const uno=createUno();uno.hands[0][0].value='invalid';expect(validTable('uno',uno,2)).toBe(false);
  const sea=createSea();sea.fleets[0]=[[0,1,20,30,40]];expect(validTable('sea',sea,2)).toBe(false);
});
for(const game of ['uno','trump','sea'])it(`${game} projects only the authorized player's private information`,()=>{
  let s=createTable(game,game==='sea'?2:3,'privacy');if(game==='sea')for(const seat of [0,1])s=tableAction(game,s,{type:'sea-auto',shuffle:0},seat);
  const a=tableView(game,s,0),b=tableView(game,s,1),anonymous=tableView(game,s);
  expect(a.seed).toBeUndefined();expect(a.hands).toBeUndefined();expect(a.deck).toBeUndefined();expect(a.fleets).toBeUndefined();
  if(game==='sea'){expect(a.enemyFleet).toEqual([]);expect(a.fleet).toEqual(s.fleets[0]);expect(b.fleet).toEqual(s.fleets[1]);expect(anonymous.fleet).toEqual([]);}
  else{expect(a.hand).toEqual(s.hands[0]);expect(b.hand).toEqual(s.hands[1]);expect(a.hand.some(c=>b.hand.some(d=>d.id===c.id))).toBe(false);expect(anonymous.hand).toEqual([]);}
});
for(const game of ['ludo','uno','trump'])it(`three-seat ${game} rooms wait for everyone, enforce seats and record all players`,()=>{
  const r=createRoom('ABCDEFGH',{game,playerCount:3,name:'A'});expect(joinRoom(r,{name:'B'})).toBe(1);expect(r.phase).toBe('waiting');expect(joinRoom(r,{name:'C'})).toBe(2);expect(r.phase).toBe('playing');expect(()=>joinRoom(r,{name:'D'})).toThrow('All seats');
  const action=tableBot(game,r.match);expect(()=>applyRoomAction(r,2,{id:'bad',revision:r.revision,action})).toThrow('other player');
  expect(applyRoomAction(r,0,{id:'first',revision:r.revision,action})).toBe(true);expect(publicRoom(r,[true,true,true],Date.now(),2).players).toHaveLength(3);
  applyRoomAction(r,2,{id:'cancel',revision:r.revision,action:{type:'resign'}});expect(r.winner).toBe('draw');
  const result=recordOnlineResult({},publicRoom(r),2);expect(result.online.history[0].seat).toBe(2);expect(validOnlineResults(result.online)).toBe(true);
});
