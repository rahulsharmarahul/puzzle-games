import {test,expect} from '@playwright/test';
const original=['sudoku','petdoku','flappy','wordle','checkers','dots','ludo','uno','trump','sea','fruit','blast','2048','2248','flood','arrows'];
const order=page=>page.locator('.game-cards>.game-card').evaluateAll(cards=>cards.map(c=>c.dataset.game));
test('favorites move first, retain every other game, survive refresh and can be removed',async({page})=>{
  await page.goto('./');expect(await order(page)).toEqual(original);
  await page.getByRole('button',{name:'Add UNO to favorites',exact:true}).click();expect(await order(page)).toEqual(['uno',...original.filter(g=>g!=='uno')]);await expect(page.getByRole('button',{name:'Remove UNO from favorites',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Add Wordle to favorites',exact:true}).click();expect(await order(page)).toEqual(['wordle','uno',...original.filter(g=>!['wordle','uno'].includes(g))]);await page.reload();expect((await order(page)).slice(0,2)).toEqual(['wordle','uno']);
  await page.getByRole('button',{name:'Remove Wordle from favorites',exact:true}).click();expect(await order(page)).toEqual(['uno',...original.filter(g=>g!=='uno')]);await page.getByRole('button',{name:'Remove UNO from favorites',exact:true}).click();expect(await order(page)).toEqual(original);
  await page.getByRole('button',{name:'Add Sudoku to favorites',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.game-cards>.game-card').first()).toHaveAttribute('data-favorite','true');
  await page.setViewportSize({width:320,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('favorites belong to each player and are included in backups',async({page})=>{
  await page.goto('./');await page.getByRole('button',{name:'Add Sea Battle to favorites',exact:true}).click();
  await page.goto('./#settings');const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export this player',exact:true}).click();const file=await (await pending).path();
  await page.goto('./#profiles');await page.getByRole('button',{name:'+ Add player',exact:true}).click();await page.getByLabel('Player name').fill('Other player');await page.getByRole('button',{name:'Save player',exact:true}).click();await page.goto('./');expect(await order(page)).toEqual(original);
  await page.goto('./#settings');await page.locator('input[type=file]').setInputFiles(file);await page.getByRole('button',{name:'Restore progress',exact:true}).click();await page.goto('./');expect((await order(page))[0]).toBe('sea');await expect(page.getByRole('button',{name:'Remove Sea Battle from favorites',exact:true})).toBeVisible();
});
