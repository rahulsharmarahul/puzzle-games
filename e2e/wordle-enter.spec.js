import {test,expect} from '@playwright/test';
import {wordFeedback,answerFor} from '../src/engines/wordle.js';
test.describe('phone keyboard entry',()=>{
  test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  test('hints reveal positions without using guesses, persist and enforce the limit',async({page,context})=>{
    await page.goto('./#club/wordle');await page.getByRole('combobox',{name:'Play mode',exact:true}).selectOption('local');await page.getByRole('combobox',{name:'Word selection',exact:true}).selectOption('free');await page.getByRole('button',{name:'Start game',exact:true}).tap();await page.evaluate(async()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);
    const hint=page.getByRole('button',{name:'Get a Wordle hint',exact:true}),answer=answerFor((await session(page)).seed);await page.getByRole('textbox',{name:'Type your Wordle guess'}).fill('AB');await hint.tap();await expect(page.getByRole('textbox',{name:'Type your Wordle guess'})).toHaveValue('AB');await expect(page.getByRole('group',{name:'Revealed letter positions'})).toContainText(answer[0]);expect((await session(page)).state.guesses).toEqual([]);expect((await session(page)).state.turn).toBe(0);
    await page.reload();await expect(hint).toContainText('1/3');await hint.tap();await hint.tap();await expect(hint).toBeDisabled();expect((await session(page)).state.hints).toHaveLength(3);await page.getByRole('textbox',{name:'Type your Wordle guess'}).fill(answer);await page.getByRole('textbox',{name:'Type your Wordle guess'}).press('Enter');await expect(page.locator('.match-result')).toBeVisible();await expect(hint).toBeDisabled();await context.setOffline(false);await page.setViewportSize({width:320,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
  test('native text entry submits successive guesses, deletes letters, shows feedback and disables after solving',async({page})=>{
    await page.goto('./#club/wordle');await page.getByRole('combobox',{name:'Word selection',exact:true}).selectOption('free');await page.getByRole('button',{name:'Start game',exact:true}).click();
    const field=page.getByRole('textbox',{name:'Type your Wordle guess'}),answer=answerFor((await session(page)).seed),words=['MINES','BOOKS','CLOUD'].filter(word=>word!==answer);
    await field.tap();await expect(field).toBeFocused();await expect(field).toHaveAttribute('inputmode','text');await expect(field).toHaveAttribute('enterkeyhint','go');await expect(field).toHaveAttribute('autocorrect','off');
    await field.fill('abc');await field.press('Backspace');await expect(field).toHaveValue('AB');await field.press('Enter');await expect(page.locator('.word-message')).toContainText('Enter five letters');expect((await session(page)).state.guesses).toHaveLength(0);
    await field.fill(words[0].toLowerCase());await field.press('Enter');await expect(field).toHaveValue('');await expect(field).toBeFocused();expect((await session(page)).state.guesses).toEqual([words[0]]);await expect(page.locator('.word-row').first().locator('.correct,.present,.absent')).toHaveCount(5);
    await field.fill(words[1]);await page.getByRole('button',{name:'Check word',exact:true}).tap();expect((await session(page)).state.guesses).toEqual(words.slice(0,2));await expect(field).toBeFocused();
    await field.fill(answer);await field.press('Enter');await expect(field).toBeDisabled();await expect(page.getByRole('button',{name:'Check word',exact:true})).toBeDisabled();await expect(page.locator('.match-result')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
});
async function session(page){return page.evaluate(()=>{const meta=JSON.parse(localStorage.getItem('pz:profiles')).data;return JSON.parse(localStorage.getItem('pz:player:'+meta.active)).data.club.sessions.wordle;});}
for(const mode of ['solo','local'])test(`Wordle Enter submits after tapping letters in ${mode} play and marks every position`,async({page,context})=>{
  await page.goto('./#club/wordle');await page.getByRole('combobox',{name:'Play mode',exact:true}).selectOption(mode);await page.getByRole('combobox',{name:'Word selection',exact:true}).selectOption('free');await page.getByRole('button',{name:'Start game',exact:true}).click();
  if(mode==='solo'){await page.evaluate(async()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);}
  if(mode==='solo')await page.getByRole('button',{name:'Toggle color theme',exact:true}).click();
  for(const letter of 'MINES')await page.getByRole('button',{name:'Letter '+letter,exact:true}).click();
  await page.keyboard.press('Enter');
  await expect.poll(async()=>(await session(page)).state.guesses).toEqual(['MINES']);
  const s=await session(page),marks=wordFeedback(answerFor(s.seed),'MINES');
  for(let i=0;i<5;i++)await expect(page.locator('.word-row').first().locator('.word-tile').nth(i)).toHaveAttribute('aria-label',`MINES`[i]+', '+marks[i]);
  if(mode==='solo')await page.locator('.word-game').screenshot({path:'test-results/wordle-mines-feedback.png'});
  if(s.status==='playing'){
    // Typing moves focus back into the game even after another control was focused.
    await page.getByRole('button',{name:'New game',exact:true}).focus();
    await page.keyboard.type('BOOKS');await page.keyboard.press('Enter');await expect.poll(async()=>(await session(page)).state.guesses).toEqual(['MINES','BOOKS']);
  }
  await page.reload();await expect(page.locator('.word-row').first().locator('.word-tile.correct,.word-tile.present,.word-tile.absent')).toHaveCount(5);if(mode==='solo')await context.setOffline(false);
});
test('Wordle Enter explains rejected words and allows correction without losing a guess',async({page})=>{
  await page.goto('./#club/wordle');await page.getByRole('button',{name:'Start game',exact:true}).click();
  await page.getByRole('button',{name:'Letter Z',exact:true}).click();await page.keyboard.press('Enter');await expect(page.getByRole('status')).toContainText('Enter five letters');
  await page.keyboard.type('ZZZZ');await page.keyboard.press('Enter');await expect(page.getByRole('status')).toContainText('offline word list');expect((await session(page)).state.guesses).toHaveLength(0);
  await page.getByRole('button',{name:'Clear word',exact:true}).click();await expect(page.locator('.word-row').first()).not.toContainText('Z');await page.keyboard.type('MINES');await page.keyboard.press('Enter');await expect.poll(async()=>(await session(page)).state.guesses).toEqual(['MINES']);
});
