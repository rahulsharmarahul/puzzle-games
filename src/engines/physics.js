import {hash,random,shuffle} from './random.js';
export const physicsGames=['gravity','rope','bricks'];
export const physicsLevels=['easy','medium','hard'];
const directions=[[0,-1],[1,0],[0,1],[-1,0]];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finish=(s,players)=>({...s,status:'complete',winner:players===2?'team':0});
function slide(grid,size,at,dir,holes=[]){const [dx,dy]=directions[dir],path=[];let x=at%size,y=Math.floor(at/size);while(x+dx>=0&&x+dx<size&&y+dy>=0&&y+dy<size&&grid[(y+dy)*size+x+dx]===0){x+=dx;y+=dy;path.push(y*size+x);if(holes.includes(y*size+x))break;}return {at:y*size+x,path};}
export function mazeRoute(s,from=s.ball){const queue=[[from,[]]],seen=new Set([from]);for(let i=0;i<queue.length;i++){const [at,route]=queue[i];if(at===s.goal)return route;for(let d=0;d<4;d++){const next=slide(s.grid,s.size,at,d,s.holes);if(next.at!==at&&!s.holes.includes(next.at)&&!seen.has(next.at)){seen.add(next.at);queue.push([next.at,[...route,d]]);}}}return null;}
export function mazeLayout(seed,difficulty='easy'){
 const rng=random(hash('gravity:'+seed+':'+difficulty)),size={easy:9,medium:11,hard:13}[difficulty]||9,grid=Array(size*size).fill(1),start=size+1,stack=[start];grid[start]=0;
 while(stack.length){const at=stack.at(-1),x=at%size,y=Math.floor(at/size),options=shuffle(directions,rng).filter(([dx,dy])=>x+dx*2>0&&x+dx*2<size-1&&y+dy*2>0&&y+dy*2<size-1&&grid[(y+dy*2)*size+x+dx*2]);if(!options.length){stack.pop();continue;}const [dx,dy]=options[0],next=(y+dy*2)*size+x+dx*2;grid[(y+dy)*size+x+dx]=0;grid[next]=0;stack.push(next);}
 const queue=[[start,[]]],seen=new Set([start]);for(let i=0;i<queue.length;i++){const [at,route]=queue[i];for(let d=0;d<4;d++){const next=slide(grid,size,at,d);if(!seen.has(next.at)){seen.add(next.at);queue.push([next.at,[...route,d]]);}}}
 const [goal,route]=queue.at(-1),protectedCells=new Set([start]);let at=start;for(const d of route){const next=slide(grid,size,at,d);next.path.forEach(p=>protectedCells.add(p));at=next.at;}const holes=shuffle(grid.flatMap((v,i)=>!v&&!protectedCells.has(i)?[i]:[]),rng).slice(0,{easy:0,medium:2,hard:4}[difficulty]||0);return {size,grid,start,goal,holes};
}
export function createPhysics(game,seed='physics',difficulty='easy'){
 if(!physicsGames.includes(game))throw Error('Unknown physics game');if(!physicsLevels.includes(difficulty))difficulty='easy';const base={game,seed,difficulty,turn:0,moves:0,score:0,status:'playing',winner:null};
 if(game==='gravity'){const layout=mazeLayout(seed,difficulty);return {...base,...layout,ball:layout.start,direction:2,mistakes:0,hints:0,hint:null,undo:[]};}
 if(game==='rope')return {...base,...ropeLayout(seed,difficulty),x:180,y:150,vx:0,vy:0,time:0,ropes:[true,true],stars:[false,false,false],cuts:0,attempts:0,phase:'ready'};
 return {...base,bricks:brickLayout(seed,difficulty),ball:{x:180,y:430,vx:110,vy:-270},paddle:180,lives:3,phase:'ready',hits:0};
}
export function tiltMaze(s,dir,players=1){if(s.status!=='playing'||!Number.isInteger(dir)||dir<0||dir>3)return s;const next=slide(s.grid,s.size,s.ball,dir,s.holes);if(next.at===s.ball)return s;const fell=s.holes.includes(next.at),state={...s,ball:fell?s.start:next.at,direction:dir,moves:s.moves+1,mistakes:s.mistakes+(fell?1:0),hint:null,turn:(s.turn+1)%players,undo:[...s.undo,{ball:s.ball,turn:s.turn}].slice(-50)};if(state.ball===s.goal){state.score=Math.max(0,1000+s.size*30-state.moves*10-state.mistakes*50-s.hints*40);return finish(state,players);}return state;}
export function mazeMotion(s,dir){return slide(s.grid,s.size,s.ball,dir,s.holes).path;}
export function hintMaze(s){if(s.status!=='playing'||s.hint!==null)return s;const route=mazeRoute(s);return route?.length?{...s,hint:route[0],hints:s.hints+1}:s;}
export function undoMaze(s){if(s.status!=='playing'||!s.undo.length)return s;const old=s.undo.at(-1);return {...s,ball:old.ball,turn:old.turn,undo:s.undo.slice(0,-1),moves:s.moves+1,hint:null};}
export function ropeLayout(seed,difficulty){const right=hash('rope:'+seed)%2===0,mirror=x=>right?x:360-x,goal=mirror(290);return {goal,goalWidth:{easy:112,medium:94,hard:78}[difficulty],anchors:[{x:80,y:40},{x:280,y:40}],length:Math.hypot(100,110),platforms:[{x:135,y:267,w:90,h:18}],starPoints:[{x:mirror(255),y:190},{x:mirror(290),y:290},{x:goal,y:380}]};}
export function cutRope(s,id,players=1){if(s.status!=='playing'||s.phase==='failed'||!Number.isInteger(id)||!s.ropes[id])return s;return {...s,ropes:s.ropes.map((v,i)=>i===id?false:v),cuts:s.cuts+1,moves:s.moves+1,turn:(s.turn+1)%players,phase:'swinging'};}
export function retryRope(s){if(s.status!=='playing')return s;return {...createPhysics('rope',s.seed,s.difficulty),attempts:s.attempts+1,moves:s.moves,cuts:s.cuts,turn:s.turn};}
export function stepRope(s,dt,players=1){if(s.status!=='playing'||s.phase!=='swinging'||!Number.isFinite(dt)||dt<=0)return s;dt=Math.min(dt,1/60);let {x,y,vx,vy}=s;const px=x,py=y;vy+=480*dt;x+=vx*dt;y+=vy*dt;
 for(let pass=0;pass<5;pass++)for(let i=0;i<2;i++)if(s.ropes[i]){const a=s.anchors[i],dx=x-a.x,dy=y-a.y,d=Math.hypot(dx,dy)||1;if(d>s.length){x=a.x+dx*s.length/d;y=a.y+dy*s.length/d;}}
 vx=(x-px)/dt*.999;vy=(y-py)/dt*.999;if(x<12){x=12;vx=Math.abs(vx)*.75;}if(x>348){x=348;vx=-Math.abs(vx)*.75;}
 for(const p of s.platforms)if(x+11>p.x&&x-11<p.x+p.w&&y+11>p.y&&py+11<=p.y+3&&vy>0){y=p.y-11;vy=-vy*.28;vx*=.95;}
 const stars=s.stars.map((v,i)=>v||Math.hypot(x-s.starPoints[i].x,y-s.starPoints[i].y)<26),next={...s,x,y,vx,vy,time:s.time+dt,stars};
 if(y>=428&&Math.abs(x-s.goal)<s.goalWidth/2){next.score=Math.max(0,1000+stars.filter(Boolean).length*150-s.attempts*60-s.cuts*10);return finish({...next,phase:'fed'},players);}
 if(y>472||next.time>18)return {...next,phase:'failed',y:Math.min(y,474)};return next;
}
export function brickLayout(seed,difficulty){const rows={easy:4,medium:5,hard:6}[difficulty],rng=random(hash('bricks:'+seed));return Array.from({length:rows*6},(_,i)=>{const max=difficulty==='hard'&&i<12?2:1;return {id:i,x:15+i%6*56,y:48+Math.floor(i/6)*25,w:50,h:18,hp:max,max,color:Math.floor(rng()*5)};});}
export function movePaddle(s,x){if(s.status!=='playing'||!Number.isFinite(x))return s;const paddle=clamp(x,43,317);return {...s,paddle,ball:s.phase==='ready'?{...s.ball,x:paddle}:s.ball};}
export function launchBricks(s){return s.status==='playing'&&s.phase==='ready'?{...s,phase:'flying',moves:s.moves+1}:s;}
export function stepBricks(s,dt,players=1){if(s.status!=='playing'||s.phase!=='flying'||!Number.isFinite(dt)||dt<=0)return s;dt=Math.min(dt,1/120);let {x,y,vx,vy}=s.ball;const px=x,py=y;x+=vx*dt;y+=vy*dt;if(x<7){x=7;vx=Math.abs(vx);}if(x>353){x=353;vx=-Math.abs(vx);}if(y<7){y=7;vy=Math.abs(vy);}let hits=s.hits,score=s.score,bricks=s.bricks;
 for(const b of bricks)if(b.hp&&x+7>b.x&&x-7<b.x+b.w&&y+7>b.y&&y-7<b.y+b.h){bricks=bricks.map(old=>old.id===b.id?{...old,hp:old.hp-1}:old);hits++;score+=10;if(px+7<=b.x){x=b.x-7;vx=-Math.abs(vx);}else if(px-7>=b.x+b.w){x=b.x+b.w+7;vx=Math.abs(vx);}else if(py<b.y){y=b.y-7;vy=-Math.abs(vy);}else{y=b.y+b.h+7;vy=Math.abs(vy);}break;}
 if(vy>0&&py+7<=446&&y+7>=446&&Math.abs(x-s.paddle)<49){y=439;const speed=Math.min(420,Math.hypot(vx,vy)+3),angle=clamp((x-s.paddle)/43,-1,1)*1.05;vx=Math.sin(angle)*speed;if(Math.abs(vx)<35)vx=vx<0?-35:35;vy=-Math.sqrt(Math.max(1,speed*speed-vx*vx));}
 let next={...s,bricks,ball:{x,y,vx,vy},hits,score};if(bricks.every(b=>!b.hp))return finish(next,players);
 if(y>487){next={...next,lives:s.lives-1,turn:(s.turn+1)%players,phase:'ready',ball:{x:s.paddle,y:430,vx:110*(s.lives%2?1:-1),vy:-270}};if(!next.lives)return {...next,status:'complete',winner:'lost'};}return next;
}
export function validPhysics(s){
 const int=(n,max=1e9)=>Number.isInteger(n)&&n>=0&&n<=max,finite=(n,a,b)=>Number.isFinite(n)&&n>=a&&n<=b,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 if(!s||!physicsGames.includes(s.game)||typeof s.seed!=='string'||s.seed.length>200||!physicsLevels.includes(s.difficulty)||!int(s.turn,1)||!int(s.moves)||!int(s.score)||!['playing','complete'].includes(s.status))return false;
 if(s.status==='playing'?s.winner!==null:![0,'team','lost'].includes(s.winner))return false;
 if(s.game==='gravity'){const layout=mazeLayout(s.seed,s.difficulty);if(!Object.keys(layout).every(k=>same(s[k],layout[k])))return false;const open=p=>int(p,s.size*s.size-1)&&s.grid[p]===0&&!s.holes.includes(p);return open(s.ball)&&int(s.direction,3)&&int(s.mistakes)&&int(s.hints)&&(s.hint===null||int(s.hint,3))&&Array.isArray(s.undo)&&s.undo.length<=50&&s.undo.every(u=>u&&open(u.ball)&&int(u.turn,1))&&(s.status==='complete'?s.ball===s.goal&&s.winner!=='lost':s.ball!==s.goal&&s.score===0);}
 if(s.game==='rope'){const layout=ropeLayout(s.seed,s.difficulty);return Object.keys(layout).every(k=>same(s[k],layout[k]))&&finite(s.x,0,360)&&finite(s.y,-300,500)&&finite(s.vx,-1500,1500)&&finite(s.vy,-1500,1500)&&finite(s.time,0,19)&&Array.isArray(s.ropes)&&s.ropes.length===2&&s.ropes.every(v=>typeof v==='boolean')&&Array.isArray(s.stars)&&s.stars.length===3&&s.stars.every(v=>typeof v==='boolean')&&int(s.cuts)&&int(s.attempts)&&['ready','swinging','failed','fed'].includes(s.phase)&&(s.status==='complete'?s.phase==='fed'&&s.winner!=='lost':s.phase!=='fed'&&s.score===0);}
 const layout=brickLayout(s.seed,s.difficulty);return Array.isArray(s.bricks)&&s.bricks.length===layout.length&&s.bricks.every((b,i)=>b&&Object.keys(layout[i]).every(k=>k==='hp'?int(b.hp,b.max):same(b[k],layout[i][k])))&&s.ball&&finite(s.ball.x,0,360)&&finite(s.ball.y,0,490)&&finite(s.ball.vx,-900,900)&&finite(s.ball.vy,-900,900)&&finite(s.paddle,43,317)&&int(s.lives,3)&&int(s.hits)&&['ready','flying'].includes(s.phase)&&(s.status==='playing'?s.lives>0&&s.bricks.some(b=>b.hp):s.winner==='lost'?s.lives===0:s.bricks.every(b=>!b.hp));
}
