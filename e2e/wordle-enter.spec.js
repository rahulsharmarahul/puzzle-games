import {test,expect} from '@playwright/test';
import {wordFeedback,answerFor} from '../src/engines/wordle.js';
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
