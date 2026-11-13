import {test,expect} from '@playwright/test';
async function saved(page,game){return page.evaluate(game=>{const m=JSON.parse(localStorage.getItem('pz:profiles')).data;return JSON.parse(localStorage.getItem('pz:player:'+m.active)).data.club.sessions[game];},game);}
async function start(page,game,count=2,mode='local'){
  await page.goto('./#club/'+game);await page.getByRole('combobox',{name:'Play mode',exact:true}).selectOption(mode);
  if(game!=='sea')await page.getByRole('combobox',{name:'Number of players',exact:true}).selectOption(String(count));
  await page.getByRole('button',{name:'Start game',exact:true}).click();
}
test('all ten games are discoverable and new boards work offline on a small phone',async({page,context})=>{
  await page.goto('./');for(const name of ['Ludo','UNO','Trump Tricks','Sea Battle'])await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
  await page.evaluate(async()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);
  await page.setViewportSize({width:320,height:740});
  for(const game of ['ludo','uno','trump','sea']){await start(page,game);if(game!=='ludo')await page.getByRole('button',{name:'Show my turn'}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/${game}-mobile.png`,fullPage:true});}
  await context.setOffline(false);
});
test('three-player UNO keeps hands behind a handoff screen and resumes the saved session',async({page})=>{
  await start(page,'uno',3);await expect(page.getByRole('group',{name:'Your UNO hand'})).toHaveCount(0);await page.getByRole('button',{name:'Show my turn'}).click();await expect(page.getByRole('group',{name:'Your UNO hand'}).getByRole('button')).toHaveCount(7);
  const original=await saved(page,'uno');expect(original.players).toHaveLength(3);
  await page.getByRole('button',{name:'Draw one card',exact:true}).click();let state=(await saved(page,'uno')).state;
  if(state.drawn)await page.getByRole('button',{name:'Pass drawn card',exact:true}).click();
  await expect(page.getByRole('button',{name:'Show my turn'})).toBeVisible();await expect(page.getByRole('group',{name:'Your UNO hand'})).toHaveCount(0);
  await page.reload();await expect(page.getByRole('button',{name:'Show my turn'})).toBeVisible();expect((await saved(page,'uno')).state.turn).toBe(1);expect((await saved(page,'uno')).id).toBe(original.id);
});
test('three humans finish Trump and record a single result after refresh',async({page})=>{
  await start(page,'trump',3);
  for(let n=0;n<21;n++){const handoff=page.getByRole('button',{name:'Show my turn'});if(await handoff.count())await handoff.click();await page.getByRole('group',{name:'Your Trump hand'}).locator('button:not(:disabled)').first().click();}
  await expect(page.locator('.match-result')).toBeVisible();expect((await saved(page,'trump')).state.scores.reduce((a,b)=>a+b,0)).toBe(7);await page.reload();await expect(page.locator('.match-result')).toBeVisible();
});
test('Sea Battle hides each fleet during handoff and alternates shots',async({page})=>{
  await start(page,'sea');for(let i=0;i<2;i++){await page.getByRole('button',{name:'Show my turn'}).click();await page.getByRole('button',{name:'Auto-place fleet'}).click();await expect(page.locator('.sea-cell.ship')).toHaveCount(17);await page.getByRole('button',{name:'Confirm fleet'}).click();}
  await page.getByRole('button',{name:'Show my turn'}).click();const target=page.getByRole('group',{name:'Target ocean'});await expect(target.locator('.ship')).toHaveCount(0);await target.getByRole('button').first().click();await expect(page.getByRole('button',{name:'Show my turn'})).toBeVisible();expect((await saved(page,'sea')).state.turn).toBe(1);await page.reload();expect((await saved(page,'sea')).state.shots[0]).toHaveLength(1);
});
test('Ludo uses three local seats and solo Trump computers finish their turns',async({page})=>{
  await start(page,'ludo',3);expect((await saved(page,'ludo')).players).toHaveLength(3);await page.getByRole('button',{name:'Roll dice',exact:true}).click();expect((await saved(page,'ludo')).state.rolls).toBe(1);
  await start(page,'trump',3,'solo');await page.getByRole('group',{name:'Your Trump hand'}).locator('button:not(:disabled)').first().click();await expect.poll(async()=>(await saved(page,'trump')).state.tricks).toBe(1);await expect(page.getByRole('group',{name:'Your Trump hand'}).getByRole('button')).toHaveCount(6);
});
