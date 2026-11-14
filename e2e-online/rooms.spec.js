import {test,expect} from '@playwright/test';
const web=process.env.ONLINE_WEB||'http://localhost:4173/puzzle-games/';
const service=process.env.ONLINE_SERVICE||'http://127.0.0.1:8787';
async function client(browser,name){const context=await browser.newContext();await context.addInitScript(({name,service})=>{localStorage.setItem('pz:online-config',JSON.stringify({endpoint:service}));if(!localStorage.getItem('pz:profiles'))localStorage.setItem('pz:profiles',JSON.stringify({version:1,data:{active:name,profiles:[{id:name,name,avatar:name==='Alex'?'🌿':'🐱'}]}}));},{name,service});const page=await context.newPage(),latest={room:null,frames:[]};page.on('websocket',ws=>ws.on('framereceived',event=>{try{const frame=JSON.parse(String(event.payload));latest.frames.push(frame);if(frame.type==='state')latest.room=frame.room;}catch{}}));return {context,page,latest};}
async function pair(browser,game){const a=await client(browser,'Alex'),b=await client(browser,'Sam');await a.page.goto(web+'#online');await a.page.getByRole('combobox',{name:'Online game',exact:true}).selectOption(game);if(game==='dots')await a.page.getByRole('combobox',{name:'Board size',exact:true}).selectOption('2');await a.page.getByRole('button',{name:'Create room',exact:true}).click();await expect(a.page.locator('.room-code')).toBeVisible();const code=(await a.page.locator('.room-code').textContent()).trim();await b.page.goto(web+'#online/'+code);await b.page.getByRole('button',{name:'Join room',exact:true}).click();await expect.poll(()=>a.latest.room?.presence.every(Boolean)).toBe(true);await expect.poll(()=>b.latest.room?.presence.every(Boolean)).toBe(true);return {a,b,code,async close(){await a.context.close();await b.context.close();}};}
test('two devices synchronize checkers, reject wrong turns, reserve seats and reconnect',async({browser,request})=>{
  const {a,b,code,close}=await pair(browser,'checkers');
  await expect(b.page.getByRole('button',{name:/^Row 6, column 1,/})).toBeDisabled();
  const before=[...a.latest.room.state.board];
  const denied=await request.post(service+`/rooms/${code}/join`,{headers:{Origin:'http://localhost:4173'},data:{name:'Third'}});expect(denied.status()).toBe(400);expect((await denied.json()).error).toContain('Both seats');
  // A guest with a legitimate seat token still cannot make the host's move.
  const result=await b.page.evaluate(async({service,code})=>{const credential=JSON.parse(localStorage.getItem('pz:room:Sam:'+code));return new Promise(resolve=>{const ws=new WebSocket(service.replace('http','ws')+`/rooms/${code}/socket`,['puzzle-zone-v1','auth.'+credential.token]);ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='state')ws.send(JSON.stringify({id:'illegal-guest-move',revision:m.room.revision,action:{type:'checker',from:40,to:33}}));if(m.type==='error'){ws.close();resolve(m.error);}};});},{service,code});expect(result).toContain('other player');
  expect(a.latest.room.state.board).toEqual(before);
  await b.page.getByRole('button',{name:'Reconnect',exact:true}).click();await expect.poll(()=>a.latest.room?.presence.every(Boolean)).toBe(true);
  await a.page.getByRole('button',{name:/^Row 6, column 1,/}).click();await a.page.getByRole('button',{name:/^Row 5, column 2,.*legal move/}).click();await expect.poll(()=>b.latest.room?.state.board[33]).toBe(1);expect(b.latest.room.turn).toBe(1);
  await b.context.setOffline(true);await expect.poll(()=>a.latest.room?.presence[1],{timeout:15000}).toBe(false);await b.context.setOffline(false);await b.page.reload();await expect.poll(()=>b.latest.room?.presence.every(Boolean)).toBe(true);expect(b.latest.room.state.board[33]).toBe(1);
  a.page.once('dialog',d=>d.accept());await a.page.getByRole('button',{name:'End match',exact:true}).click();await expect(b.page.locator('.match-result')).toContainText('Sam wins');
  await expect.poll(()=>a.page.evaluate(()=>JSON.parse(localStorage.getItem('pz:player:Alex')).data.online?.stats.checkers.losses)).toBe(1);
  await b.page.reload();await expect(b.page.locator('.match-result')).toContainText('Sam wins');expect(await b.page.evaluate(()=>JSON.parse(localStorage.getItem('pz:player:Sam')).data.online.history.length)).toBe(1);
  await close();
});
test('two devices complete Dots and Boxes and keep the turn when scoring',async({browser})=>{
  const {a,b,close}=await pair(browser,'dots');const clients=[a,b];
  for(const label of ['Horizontal edge 1','Horizontal edge 3','Vertical edge 1']){const current=clients[a.latest.room.turn],old=a.latest.room.revision;await current.page.getByRole('button',{name:label,exact:true}).click();await expect.poll(()=>a.latest.room.revision).toBe(old+1);await expect.poll(()=>b.latest.room.revision).toBe(old+1);}
  const seat=a.latest.room.turn,revision=a.latest.room.revision;await clients[seat].page.getByRole('button',{name:'Vertical edge 2',exact:true}).click();await expect.poll(()=>a.latest.room.revision).toBe(revision+1);expect(a.latest.room.turn).toBe(seat);expect(a.latest.room.state.boxes[0]).toBe(seat);
  for(let i=0;i<20&&a.latest.room.phase!=='complete';i++){const current=clients[a.latest.room.turn],old=a.latest.room.revision;await current.page.locator('.box-edge:not(:disabled)').first().click();await expect.poll(()=>a.latest.room.revision).toBe(old+1);await expect.poll(()=>b.latest.room.revision).toBe(old+1);}
  await expect(a.page.locator('.match-result')).toBeVisible();await expect(b.page.locator('.match-result')).toBeVisible();expect(a.latest.room.state.boxes.every(n=>n>=0)).toBe(true);await close();
});
test('online Wordle shares feedback and validates guesses without exposing its answer',async({browser})=>{
  const {a,b,close}=await pair(browser,'wordle');expect(a.latest.room.state.seed).toBeUndefined();expect(a.latest.room.state.answer).toBeUndefined();await a.page.keyboard.type('zzzzz');await a.page.getByRole('button',{name:'Submit guess'}).click();await expect(a.page.getByRole('alert')).toContainText('offline word list');expect(a.latest.room.state.guesses).toHaveLength(0);
  const clients=[a,b];for(const word of ['ABOUT','APPLE','CRANE','HOUSE','LIGHT','WATER']){if(a.latest.room.phase==='complete')break;const current=clients[a.latest.room.turn],old=a.latest.room.revision;for(const letter of word)await current.page.getByRole('button',{name:'Letter '+letter,exact:true}).click();await current.page.keyboard.press('Enter');await expect.poll(()=>a.latest.room.revision).toBe(old+1);await expect.poll(()=>b.latest.room.revision).toBe(old+1);const row=a.latest.room.state.guesses.length-1;for(let i=0;i<5;i++)for(const client of clients)await expect(client.page.locator('.word-row').nth(row).locator('.word-tile').nth(i)).toHaveAttribute('aria-label',word[i]+', '+a.latest.room.state.feedback[row][i]);}
  await expect(a.page.locator('.match-result')).toBeVisible();expect(a.latest.room.state.answer).toMatch(/^[A-Z]{5}$/);await close();
});
for(const game of ['sudoku','petdoku'])test(`online ${game} synchronizes turns, shared pause, hints and completion`,async({browser})=>{
  const {a,b,close}=await pair(browser,game);expect(a.latest.room.state.solution).toBeUndefined();const clients=[a,b];
  await b.page.getByRole('button',{name:'Pause shared game',exact:true}).click();await expect(a.page.getByRole('button',{name:'Resume shared game',exact:true})).toBeVisible();await a.page.getByRole('button',{name:'Resume shared game',exact:true}).click();await expect.poll(()=>a.latest.room.paused).toBe(false);
  for(let i=0;i<81&&a.latest.room.phase!=='complete';i++){const current=clients[a.latest.room.turn],old=a.latest.room.revision;await current.page.getByRole('button',{name:'Hint',exact:true}).click();await expect.poll(()=>a.latest.room.revision).toBe(old+1);await expect.poll(()=>b.latest.room.revision).toBe(old+1);}
  await expect(a.page.locator('.match-result')).toContainText('Solved together');await expect(b.page.locator('.match-result')).toContainText('Solved together');await close();
});
test('online Flappy Jump validates both flights on the same course and reports a draw',async({browser})=>{
  const {a,b,close}=await pair(browser,'flappy');const seed=a.latest.room.state.course;
  await a.page.getByRole('button',{name:'Prepare flight',exact:true}).click();await expect(a.page.getByRole('button',{name:'Start flight',exact:true})).toBeVisible();await a.page.getByRole('button',{name:'Start flight',exact:true}).click();await expect.poll(()=>b.latest.room.state.round,{timeout:12000}).toBe(1);expect(b.latest.room.state.course).toBe(seed);
  await b.page.getByRole('button',{name:'Prepare flight',exact:true}).click();await expect(b.page.getByRole('button',{name:'Start flight',exact:true})).toBeVisible();await b.page.getByRole('button',{name:'Start flight',exact:true}).click();await expect(a.page.locator('.match-result')).toContainText('draw',{timeout:12000});expect(a.latest.room.state.scores).toEqual([0,0]);await close();
});
test('unknown origins and unauthenticated sockets cannot access a room',async({browser,request})=>{
  const denied=await request.post(service+'/rooms',{headers:{Origin:'https://untrusted.example'},data:{game:'checkers',name:'X'}});expect(denied.status()).toBe(403);
  const c=await client(browser,'Alex');await c.page.goto(web+'#online');await c.page.getByRole('button',{name:'Create room',exact:true}).click();await expect(c.page.locator('.room-code')).toBeVisible();const code=await c.page.locator('.room-code').textContent();
  const deniedSocket=await c.page.evaluate(async({service,code})=>new Promise(resolve=>{let stateReceived=false;const ws=new WebSocket(service.replace('http','ws')+`/rooms/${code}/socket`,['puzzle-zone-v1','auth.'+'a'.repeat(64)]);ws.onmessage=()=>stateReceived=true;ws.onerror=()=>{};ws.onclose=()=>resolve(!stateReceived);}),{service,code});expect(deniedSocket).toBe(true);await c.context.close();
});
test('room navigation and mobile layout preserve the reserved seat',async({browser})=>{
  const c=await client(browser,'Alex');await c.page.setViewportSize({width:320,height:740});await c.page.goto(web+'#online');await c.page.getByRole('button',{name:'Create room',exact:true}).click();await expect(c.page.locator('.room-code')).toBeVisible();const code=await c.page.locator('.room-code').textContent();expect(await c.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await c.page.getByRole('button',{name:'Choose another room',exact:true}).click();await expect(c.page.getByRole('button',{name:'Create room',exact:true})).toBeVisible();await c.page.getByRole('button',{name:new RegExp(code)}).click();await expect(c.page.locator('.room-code')).toHaveText(code);
  await c.page.goBack();await expect(c.page.getByRole('button',{name:'Create room',exact:true})).toBeVisible();await c.context.close();
});
