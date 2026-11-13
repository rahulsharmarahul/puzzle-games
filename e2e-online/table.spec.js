import {test,expect} from '@playwright/test';
const web=process.env.ONLINE_WEB||'http://localhost:4173/puzzle-games/',service=process.env.ONLINE_SERVICE||'http://127.0.0.1:8787';
async function group(browser,game,count){
  const clients=[];
  for(let i=0;i<count;i++){
    const context=await browser.newContext();await context.addInitScript(({service,i})=>{localStorage.setItem('pz:online-config',JSON.stringify({endpoint:service}));localStorage.setItem('pz:profiles',JSON.stringify({version:1,data:{active:'p'+i,profiles:[{id:'p'+i,name:'Player '+i,avatar:'X'}]}}));},{service,i});
    const page=await context.newPage(),c={context,page,room:null,frames:[]};page.on('websocket',ws=>ws.on('framereceived',e=>{try{const f=JSON.parse(String(e.payload));c.frames.push(f);if(f.type==='state')c.room=f.room;}catch{}}));clients.push(c);
    if(i===0){await page.goto(web+'#online');await page.getByRole('combobox',{name:'Online game',exact:true}).selectOption(game);if(game!=='sea')await page.getByRole('combobox',{name:'Number of players',exact:true}).selectOption(String(count));await page.getByRole('button',{name:'Create room',exact:true}).click();await expect(page.locator('.room-code')).toBeVisible();}
    else{const code=(await clients[0].page.locator('.room-code').textContent()).trim();await page.goto(web+'#online/'+code);await page.getByRole('button',{name:'Join room',exact:true}).click();await expect(page.locator('.room-code')).toBeVisible();}
  }
  for(const c of clients)await expect.poll(()=>c.room?.presence.every(Boolean)).toBe(true);
  return clients;
}
async function revision(clients,n){for(const c of clients)await expect.poll(()=>c.room?.revision).toBe(n);}
async function cancel(clients){clients[0].page.once('dialog',d=>d.accept());await clients[0].page.getByRole('button',{name:'End match',exact:true}).click();for(const c of clients)await expect(c.page.locator('.match-result')).toBeVisible();}
for(const game of ['ludo','uno','trump'])test(`three devices play ${game} with reserved seats and private hands`,async({browser})=>{
  const clients=await group(browser,game,3),[a,b,c]=clients;expect(a.room.players).toHaveLength(3);
  if(game!=='ludo'){
    const all=clients.flatMap(c=>c.room.state.hand.map(card=>card.id));expect(new Set(all).size).toBe(21);
    for(const client of clients){expect(client.room.state.hands).toBeUndefined();expect(client.room.state.deck).toBeUndefined();expect(client.room.state.seed).toBeUndefined();await expect(client.page.getByRole('group',{name:game==='uno'?'Your UNO hand':'Your Trump hand'}).getByRole('button')).toHaveCount(7);}
  }
  let before=a.room.revision;
  if(game==='ludo')await a.page.getByRole('button',{name:'Roll dice',exact:true}).click();
  else if(game==='uno')await a.page.getByRole('button',{name:'Draw one card',exact:true}).click();
  else await a.page.getByRole('group',{name:'Your Trump hand'}).locator('button:not(:disabled)').first().click();
  await revision(clients,before+1);
  // Seat three survives refresh; reconnect snapshots still contain only its own hand.
  const hand=c.room.state.hand;c.room=null;await c.page.reload();await expect.poll(()=>c.room?.presence.every(Boolean)).toBe(true);await expect(c.page.getByText('Your seat: 3',{exact:false})).toBeVisible();if(hand)expect(c.room.state.hand).toEqual(hand);
  if(game==='trump')for(let n=1;n<21;n++){const current=clients[a.room.turn];before=a.room.revision;await current.page.getByRole('group',{name:'Your Trump hand'}).locator('button:not(:disabled)').first().click();await revision(clients,before+1);}
  if(game==='trump'){for(const client of clients)await expect(client.page.locator('.match-result')).toBeVisible();expect(a.room.state.tricks).toBe(7);}else await cancel(clients);
  for(const client of clients)await client.context.close();
});
test('Sea Battle devices prepare independently and never receive the opposing fleet',async({browser})=>{
  const clients=await group(browser,'sea',2),[a,b]=clients;
  for(const client of [b,a]){let before=a.room.revision;await client.page.getByRole('button',{name:'Auto-place fleet'}).click();await revision(clients,before+1);expect(client.room.state.fleet.flat()).toHaveLength(17);expect(client.room.state.enemyFleet).toEqual([]);before=a.room.revision;await client.page.getByRole('button',{name:'Confirm fleet'}).click();await revision(clients,before+1);}
  const target=b.room.state.fleet[0][0],label=String.fromCharCode(65+Math.floor(target/10))+(target%10+1);const before=a.room.revision;await a.page.getByRole('group',{name:'Target ocean'}).getByRole('button',{name:label,exact:true}).click();await revision(clients,before+1);expect(a.room.state.shots[0].hit).toBe(true);expect(b.room.state.incoming[0].hit).toBe(true);
  for(const client of clients)for(const frame of client.frames.filter(f=>f.type==='state')){expect(frame.room.state.fleets).toBeUndefined();expect(frame.room.state.seed).toBeUndefined();if(frame.room.phase!=='complete')expect(frame.room.state.enemyFleet).toEqual([]);}
  await cancel(clients);for(const client of clients)await client.context.close();
});
