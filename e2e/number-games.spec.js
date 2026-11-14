import {test,expect} from '@playwright/test';
async function start(page,game,mode='solo'){
  await page.goto('./');await page.locator(`[data-game="${game}"]`).getByRole('link',{name:/^Play /}).click();
  await page.getByRole('combobox',{name:'Play mode',exact:true}).selectOption(mode);await page.getByRole('button',{name:'Start game',exact:true}).click();
}
async function data(page){return page.evaluate(()=>{const m=JSON.parse(localStorage.getItem('pz:profiles')).data;return JSON.parse(localStorage.getItem('pz:player:'+m.active)).data;});}
async function pair(page){return page.locator('.board-2248 button').evaluateAll(nodes=>{const nums=nodes.map(n=>Number(n.childNodes[0].textContent));for(let i=0;i<40;i++)for(let j=i+1;j<40;j++)if(nums[i]===nums[j]&&Math.abs(i%5-j%5)<=1&&Math.abs(Math.floor(i/5)-Math.floor(j/5))<=1)return [i,j];return null;});}
test('2048 accepts keyboard, buttons and swipes, alternates turns and restores the board',async({page})=>{
  await start(page,'2048','local');for(const key of ['ArrowLeft','ArrowDown','ArrowRight','ArrowUp'])await page.keyboard.press(key);
  let s=(await data(page)).club.sessions['2048'];expect(s.state.moves).toBeGreaterThan(0);expect(s.state.turn).toBe(s.state.moves%2);
  for(const dir of ['left','down','right','up'])await page.getByRole('button',{name:`Move ${dir}`,exact:true}).click();
  const board=page.locator('.board-2048'),box=await board.boundingBox();await page.mouse.move(box.x+box.width*.8,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.2,box.y+box.height/2,{steps:8});await page.mouse.up();
  s=(await data(page)).club.sessions['2048'];await page.reload();expect((await data(page)).club.sessions['2048'].state).toEqual(s.state);await expect(page.locator('.board-2048 .number-tile')).toHaveCount(16);
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Finish run',exact:true}).click();await expect(page.locator('.match-result')).toContainText('Run complete!');await page.reload();expect((await data(page)).club.stats['2048'].played).toBe(1);
});
test('2248 taps, rejects a non-neighbour, merges twice and supports keyboard selection',async({page})=>{
  await start(page,'2248','local');const cells=page.locator('.board-2248 button');await cells.nth(0).click();await cells.nth(39).click();await expect(cells.nth(39)).toHaveAttribute('aria-pressed','false');await expect(page.getByRole('button',{name:'Merge chain',exact:true})).toBeDisabled();await page.getByRole('button',{name:'Clear chain',exact:true}).click();
  for(let n=0;n<2;n++){const p=await pair(page);expect(p).not.toBeNull();await cells.nth(p[0]).click();await cells.nth(p[1]).click();await expect(page.getByRole('button',{name:'Merge chain',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Merge chain',exact:true}).click();expect((await data(page)).club.sessions['2248'].state.moves).toBe(n+1);}
  const p=await pair(page);await cells.nth(p[0]).focus();await page.keyboard.press('Enter');await cells.nth(p[1]).focus();await page.keyboard.press('Space');await page.getByRole('button',{name:'Merge chain',exact:true}).click();expect((await data(page)).club.sessions['2248'].state.moves).toBe(3);
  const state=(await data(page)).club.sessions['2248'].state;await page.reload();expect((await data(page)).club.sessions['2248'].state).toEqual(state);await expect(cells).toHaveCount(40);
});
test('2248 merges a dragged chain on release',async({page})=>{
  await start(page,'2248');await page.locator('.board-2248').evaluate(node=>node.scrollIntoView({block:'start'}));const p=await pair(page),cells=page.locator('.board-2248 button'),a=await cells.nth(p[0]).boundingBox(),b=await cells.nth(p[1]).boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:10});await page.mouse.up();expect((await data(page)).club.sessions['2248'].state.moves).toBe(1);
});
test('Flood-It plays an entire visible board, saves results once and restarts',async({page})=>{
  await start(page,'flood','local');
  // Read only the visible coloured cells and choose the colour adding most territory.
  for(let move=0;move<30&&!await page.locator('.match-result').count();move++){
    const colour=await page.locator('.flood-cell').evaluateAll(nodes=>{const grid=nodes.map(n=>Number(n.className.match(/flood-(\d)/)[1]));const area=col=>{const g=grid.slice(),q=[0],seen=new Set([0]),original=g[0];for(let n=0;n<q.length;n++){const i=q[n];for(const j of [i-12,i+12,...(i%12?[i-1]:[]),...(i%12<11?[i+1]:[])])if(j>=0&&j<144&&!seen.has(j)&&g[j]===original){seen.add(j);q.push(j);}}for(const i of seen)g[i]=col;const all=new Set([0]),pending=[0];for(let n=0;n<pending.length;n++){const i=pending[n];for(const j of [i-12,i+12,...(i%12?[i-1]:[]),...(i%12<11?[i+1]:[])])if(j>=0&&j<144&&!all.has(j)&&g[j]===col){all.add(j);pending.push(j);}}return all.size;};return [0,1,2,3,4,5].filter(c=>c!==grid[0]).sort((a,b)=>area(b)-area(a))[0];});
    await page.locator('.flood-palette button').nth(colour).click();
  }
  await expect(page.locator('.match-result')).toBeVisible();const s=(await data(page)).club.sessions.flood;expect(s.state.moves).toBeLessThanOrEqual(30);expect(s.status).toBe('complete');await expect(page.locator('.flood-palette button:enabled')).toHaveCount(0);await page.reload();expect((await data(page)).club.stats.flood.played).toBe(1);await page.getByRole('button',{name:'Play again',exact:true}).click();await page.getByRole('button',{name:'Start new session',exact:true}).click();expect((await data(page)).club.sessions.flood.state.moves).toBe(0);
});
test('all three games fit a phone, accept touch, work offline and can be favourites',async({browser})=>{
  const context=await browser.newContext({viewport:{width:320,height:740},hasTouch:true,isMobile:true}),page=await context.newPage();await page.goto('http://localhost:4173/puzzle-games/');await page.evaluate(async()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);
  for(const game of ['2048','2248','flood']){await page.goto('http://localhost:4173/puzzle-games/');await page.locator(`[data-game="${game}"]`).getByRole('button',{name:/Add .* to favorites/}).tap();await page.locator(`[data-game="${game}"]`).getByRole('link',{name:/^Play /}).tap();await page.getByRole('button',{name:'Start game',exact:true}).tap();
    if(game==='2248'){const p=await pair(page);for(const i of p)await page.locator('.board-2248 button').nth(i).tap();await page.getByRole('button',{name:'Merge chain',exact:true}).tap();expect((await data(page)).club.sessions[game].state.moves).toBe(1);}
    else if(game==='flood')await page.locator('.flood-palette button:enabled').first().tap();else for(const dir of ['left','down','right','up'])await page.getByRole('button',{name:`Move ${dir}`,exact:true}).tap();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/${game}-phone.png`,fullPage:true});await page.reload();await expect(page.locator(`.board-${game}`)).toBeVisible();
  }await context.close();
});
