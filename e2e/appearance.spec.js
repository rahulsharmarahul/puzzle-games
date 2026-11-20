import {test,expect} from '@playwright/test';
test('compact home removes the banner and shows four games in each desktop row',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto('./');await expect(page.locator('.hero')).toHaveCount(0);await expect(page.locator('.game-cards>.game-card')).toHaveCount(17);
  const cards=await page.locator('.game-cards>.game-card').evaluateAll(cards=>cards.map(c=>({top:c.getBoundingClientRect().top,height:c.getBoundingClientRect().height})));
  expect(cards.slice(0,4).every(c=>c.top===cards[0].top)).toBe(true);expect(cards[4].top).toBeGreaterThan(cards[0].top);expect(Math.max(...cards.map(c=>c.height))).toBeLessThan(380);
  await page.screenshot({path:'test-results/home-compact-desktop.png',fullPage:true});
});
test('all presets apply immediately, persist after reload and retain gameplay',async({page})=>{
  await page.goto('./#settings');const options=page.getByRole('group',{name:'Theme options'}).getByRole('button');await expect(options).toHaveCount(15);
  for(const name of ['Tesla','Apple','Microsoft','Google','Netflix','Spotify','Amazon','GitHub','Data-phi.ai','Ocean','Sunset','Lavender','Garden light','Garden dark']){await page.getByRole('button',{name:name+' theme',exact:true}).click();await expect(page.getByRole('button',{name:name+' theme',exact:true})).toHaveAttribute('aria-pressed','true');}
  await page.getByRole('button',{name:'Data-phi.ai theme',exact:true}).click();await page.reload();await expect(page.locator('html')).toHaveAttribute('data-palette','data-phi');await expect(page.getByRole('button',{name:'Data-phi.ai theme',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:'test-results/themes-data-phi.png',fullPage:true});await page.goto('./#club/wordle');await page.getByRole('button',{name:'Start game',exact:true}).click();await page.keyboard.type('APPLE');await page.keyboard.press('Enter');await expect(page.locator('.word-row').first().locator('.word-tile.correct,.word-tile.present,.word-tile.absent')).toHaveCount(5);
});
test('custom colours survive reload and backup restore, and narrow screens fit',async({page})=>{
  await page.goto('./#settings');await page.getByRole('button',{name:'Custom theme',exact:true}).click();await page.getByLabel('Page background',{exact:true}).fill('#101828');await page.getByLabel('Accent colour',{exact:true}).fill('#e4aaff');await page.getByRole('button',{name:'Choose Panda',exact:true}).click();await page.reload();await expect(page.getByLabel('Page background',{exact:true})).toHaveValue('#101828');await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export whole family',exact:true}).click();const download=await downloadPromise,path=await download.path();
  await page.getByRole('button',{name:'Apple theme',exact:true}).click();await page.getByRole('button',{name:'Choose Cat',exact:true}).click();await page.locator('input[type=file]').setInputFiles(path);await page.getByRole('checkbox',{name:'Also restore appearance and sound settings'}).check();await page.getByRole('button',{name:'Restore progress',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-palette','custom');await expect(page.getByLabel('Accent colour',{exact:true})).toHaveValue('#e4aaff');await expect(page.getByRole('button',{name:'Choose Panda',exact:true})).toHaveAttribute('aria-pressed','true');
  for(const width of [320,390,768,1024]){await page.setViewportSize({width,height:900});for(const hash of ['settings','home']){await page.goto('./#'+hash);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}}
  await page.setViewportSize({width:390,height:844});await page.goto('./#settings');await page.screenshot({path:'test-results/themes-custom-mobile.png',fullPage:true});
});
