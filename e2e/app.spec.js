import { test, expect } from '@playwright/test';
async function begin(page, game = 'Sudoku') {
  await page.goto('./');
  await page.getByRole('button',{name:`Play ${game}`,exact:true}).click();
  await page.getByRole('button',{name:'Let’s go'}).click();
  await page.getByRole('button',{name:'Start playing'}).click();
}
async function active(page) {
  return page.evaluate(() => { const meta=JSON.parse(localStorage.getItem('pz:profiles')).data; return JSON.parse(localStorage.getItem('pz:player:'+meta.active))?.data || {saves:{},history:[]}; });
}
test('Sudoku notes, keyboard, undo/redo, pause, refresh and completion', async ({page}) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await begin(page);
  const data=await active(page), g=data.saves.sudoku, i=g.board.indexOf(0), r=Math.floor(i/9)+1,c=i%9+1;
  await page.getByRole('button',{name:new RegExp(`^Row ${r}, column ${c},`)}).click();
  await page.getByRole('button',{name:'Notes',exact:true}).click();
  await page.getByRole('button',{name:'Enter 3',exact:true}).click();
  expect((await active(page)).saves.sudoku.notes[i]).toEqual([3]);
  await page.getByRole('button',{name:'Undo',exact:true}).click(); expect((await active(page)).saves.sudoku.notes[i]).toBeUndefined();
  await page.getByRole('button',{name:'Redo',exact:true}).click(); expect((await active(page)).saves.sudoku.notes[i]).toEqual([3]);
  await page.getByRole('button',{name:'Pause game'}).click(); await expect(page.getByRole('button',{name:'Resume puzzle'})).toBeVisible();
  const time=(await active(page)).saves.sudoku.elapsed; await page.waitForTimeout(1100); expect((await active(page)).saves.sudoku.elapsed).toBe(time);
  await page.reload(); await page.getByRole('button',{name:'Resume puzzle'}).click();
  const blanks=g.givens.filter(n=>!n).length;
  for(let j=0;j<blanks;j++) await page.getByRole('button',{name:'Hint',exact:true}).click();
  await expect(page.getByRole('heading',{name:'You found your zone.'})).toBeVisible();
  expect((await active(page)).history).toHaveLength(1); expect((await active(page)).saves.sudoku).toBeUndefined();
  await page.getByRole('button',{name:'Return home',exact:true}).click(); await page.reload(); expect((await active(page)).history).toHaveLength(1); expect(errors).toEqual([]);
});
test('Petdoku cycle, undo and full completion',async ({page})=>{
  await begin(page,'Petdoku'); const g=(await active(page)).saves.petdoku;
  const cell=page.getByRole('button',{name:/^Row 1, column 1,/});
  await cell.click(); expect((await active(page)).saves.petdoku.board[0]).toBe(1);
  await cell.click(); expect((await active(page)).saves.petdoku.board[0]).toBe(2);
  await page.getByRole('button',{name:'Undo',exact:true}).click(); expect((await active(page)).saves.petdoku.board[0]).toBe(1);
  await page.getByRole('button',{name:'Erase',exact:true}).click();
  for(let j=0;j<g.size;j++) await page.getByRole('button',{name:'Hint',exact:true}).click();
  await expect(page.getByRole('heading',{name:'You found your zone.'})).toBeVisible(); expect((await active(page)).history[0].game).toBe('petdoku');
});
test('profiles stay independent and backup export/import works',async ({page})=>{
  await begin(page); await page.getByRole('button',{name:'Hint',exact:true}).click();
  const saved=(await active(page)).saves.sudoku;
  await page.locator('.sidebar').getByRole('link',{name:'Your family'}).click();
  await page.getByRole('button',{name:'+ Add player'}).click(); await page.getByLabel('Player name').fill('Luna'); await page.getByRole('button',{name:'Choose 🐱',exact:true}).click(); await page.getByRole('button',{name:'Save player'}).click();
  expect((await active(page)).saves).toEqual({});
  await page.getByRole('button',{name:'Switch player',exact:true}).click(); expect((await active(page)).saves.sudoku.id).toBe(saved.id);
  await page.locator('.sidebar').getByRole('link',{name:'Settings',exact:true}).click();
  const downloadPromise=page.waitForEvent('download'); await page.getByRole('button',{name:'Export this player'}).click(); const download=await downloadPromise; const path=await download.path();
  await page.locator('input[type=file]').setInputFiles(path); await page.getByRole('button',{name:'Restore progress',exact:true}).click();
  expect((await active(page)).saves.sudoku.id).toBe(saved.id); expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pz:profiles')).data.profiles.length)).toBe(3);
});
test('daily completion cannot be counted twice',async ({page})=>{
  await page.goto('./'); await page.getByRole('button',{name:'Try today’s challenge'}).click(); await page.getByRole('button',{name:'Let’s go'}).click(); await page.getByRole('button',{name:'Start playing'}).click();
  const g=(await active(page)).saves.sudoku; for(let i=0;i<g.board.filter(n=>!n).length;i++) await page.getByRole('button',{name:'Hint',exact:true}).click();
  await page.getByRole('button',{name:'Return home',exact:true}).click(); await page.getByRole('button',{name:'Try today’s challenge'}).click();
  await expect(page.getByText(/Completed today in/)).toBeVisible(); await expect(page.getByRole('button',{name:'Let’s go'})).toHaveCount(0); expect((await active(page)).history).toHaveLength(1);
});
test('production offline cache includes lazy game and direct hash navigation',async ({page,context})=>{
  await page.goto('./'); await page.evaluate(async()=>{ await navigator.serviceWorker.ready; });
  await page.reload(); await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await context.setOffline(true); await page.goto('./#home'); await page.getByRole('button',{name:'Play Petdoku',exact:true}).click(); await page.getByRole('button',{name:'Let’s go'}).click(); await page.getByRole('button',{name:'Start playing'}).click(); await page.getByRole('button',{name:'Hint',exact:true}).click();
  expect((await active(page)).saves.petdoku.hints).toBe(1); await page.reload(); await expect(page.getByRole('button',{name:'Resume puzzle'})).toBeVisible();
  await context.setOffline(false);
});
test('responsive pages fit narrow phones, tablets and landscape without overflow',async ({page})=>{
  for(const [width,height] of [[320,740],[390,844],[768,1024],[844,390],[1440,1000]]) {
    await page.setViewportSize({width,height});
    for(const route of ['home','stats','profiles','settings']) { await page.goto('./#'+route); await expect(page.locator('h1')).toBeVisible(); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true); }
  }
  await page.setViewportSize({width:390,height:844}); await page.goto('./#home'); await page.screenshot({path:'test-results/mobile-home.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1100}); await page.goto('./#home'); await page.screenshot({path:'test-results/desktop-home.png',fullPage:true});
});
test('replacing an unfinished puzzle keeps the new save and records abandonment',async ({page})=>{
  await begin(page); await page.getByRole('button',{name:'Hint',exact:true}).click(); const old=(await active(page)).saves.sudoku.id;
  await page.getByRole('button',{name:'New puzzle',exact:true}).click(); await page.getByRole('combobox',{name:'Difficulty',exact:true}).selectOption('expert');
  page.once('dialog',d=>d.accept()); await page.getByRole('button',{name:'Let’s go'}).click();
  await expect(page.getByRole('button',{name:'Start playing'})).toBeVisible(); const d=await active(page); expect(d.saves.sudoku.id).not.toBe(old); expect(d.saves.sudoku.difficulty).toBe('expert'); expect(d.stats['sudoku:easy'].abandoned).toBe(1);
  await page.reload(); await page.getByRole('button',{name:'Start playing'}).click(); expect((await active(page)).saves.sudoku.difficulty).toBe('expert');
});
test('both game boards and controls fit a 320px phone, and theme persists',async ({page})=>{
  await page.setViewportSize({width:320,height:740});
  for(const game of ['Sudoku','Petdoku']) {
    await begin(page,game); expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('button',{name:'Hint',exact:true}).click(); await page.getByRole('button',{name:'Toggle color theme'}).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark'); await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    await page.getByRole('button',{name:'Resume puzzle'}).click(); await page.screenshot({path:`test-results/mobile-${game.toLowerCase()}.png`,fullPage:true});
    await page.getByRole('button',{name:'Toggle color theme'}).click();
  }
});
