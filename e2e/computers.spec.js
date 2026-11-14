import {test,expect} from '@playwright/test';
async function start(page,game,count=2){await page.goto('./#club/'+game);if(game==='dots')await page.getByRole('combobox',{name:'Board size',exact:true}).selectOption('2');if(['ludo','uno','trump'].includes(game))await page.getByRole('combobox',{name:'Number of players',exact:true}).selectOption(String(count));await page.getByRole('button',{name:'Start game',exact:true}).click();}
test('Ludo computer rolls and moves until the human turn returns',async({page})=>{
  await start(page,'ludo',3);
  for(let n=0;n<30&&(await page.locator('.current-turn strong').textContent()).trim()==='Rahul';n++){const roll=page.getByRole('button',{name:'Roll dice',exact:true});if(await roll.isEnabled())await roll.click();else await page.locator('.token-actions button:not(:disabled)').first().click();}
  await expect(page.locator('.current-turn strong')).not.toHaveText('Rahul');await expect(page.locator('.current-turn strong')).toHaveText('Rahul',{timeout:20000});await expect(page.getByRole('button',{name:'Roll dice',exact:true})).toBeEnabled();
});
test('UNO computers respond and preserve the human hand',async({page})=>{
  await start(page,'uno',4);await page.getByRole('button',{name:'Draw one card',exact:true}).click();const pass=page.getByRole('button',{name:'Pass drawn card',exact:true});if(await pass.isEnabled())await pass.click();
  await expect(page.locator('.current-turn strong')).toHaveText('Rahul',{timeout:20000});expect(await page.getByRole('group',{name:'Your UNO hand'}).getByRole('button').count()).toBeGreaterThanOrEqual(8);await expect(page.getByRole('button',{name:'Draw one card',exact:true})).toBeEnabled();
});
test('three Trump computers play every trick and finish the round',async({page})=>{
  await start(page,'trump',4);for(let i=0;i<7;i++)await page.getByRole('group',{name:'Your Trump hand'}).locator('button:not(:disabled)').first().click();await expect(page.locator('.match-result')).toBeVisible({timeout:20000});
});
test('Sea Battle computer locks a fleet, responds to a shot, and keeps both shot summaries',async({page})=>{
  await start(page,'sea');await page.getByRole('button',{name:'Auto-place fleet'}).click();await page.getByRole('button',{name:'Confirm fleet'}).click();const target=page.getByRole('group',{name:'Target ocean'});await expect(target).toBeVisible();await target.getByRole('button',{name:'A1',exact:true}).click();await expect(page.locator('.sea-shot-summary')).toContainText('Your last shot: A1');await expect(page.locator('.sea-shot-summary')).toContainText('Incoming shot:',{timeout:10000});await expect(target.locator('button:not(:disabled)')).toHaveCount(99);
});

test('Dots and Boxes computer responds, takes scoring turns and completes the board',async({page})=>{
  await start(page,'dots');for(let turns=0;turns<12;turns++){await expect.poll(async()=>Boolean(await page.locator('.match-result').count()||await page.locator('.box-edge:not(:disabled)').count())).toBe(true);if(await page.locator('.match-result').count())break;await page.locator('.box-edge:not(:disabled)').first().click();}await expect(page.locator('.match-result')).toBeVisible();await expect(page.getByText('All boxes claimed.',{exact:true})).toBeVisible();
});
