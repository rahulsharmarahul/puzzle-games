import {test,expect} from '@playwright/test';
import {wordFeedback,answerFor} from '../src/engines/wordle.js';
async function session(page){return page.evaluate(()=>{const meta=JSON.parse(localStorage.getItem('pz:profiles')).data;return JSON.parse(localStorage.getItem('pz:player:'+meta.active)).data.club.sessions.wordle;});}
for(const mode of ['solo','local'])test(`Wordle Enter submits after tapping letters in ${mode} play and marks every position`,async({page})=>{
  await page.goto('./#club/wordle');await page.getByRole('combobox',{name:'Play mode',exact:true}).selectOption(mode);await page.getByRole('combobox',{name:'Word selection',exact:true}).selectOption('free');await page.getByRole('button',{name:'Start game',exact:true}).click();
  for(const letter of 'APPLE')await page.getByRole('button',{name:'Letter '+letter,exact:true}).click();
  await page.keyboard.press('Enter');
  await expect.poll(async()=>(await session(page)).state.guesses).toEqual(['APPLE']);
  const s=await session(page),marks=wordFeedback(answerFor(s.seed),'APPLE');
  for(let i=0;i<5;i++)await expect(page.locator('.word-row').first().locator('.word-tile').nth(i)).toHaveAttribute('aria-label',`APPLE`[i]+', '+marks[i]);
  if(s.status==='playing'){
    // Typing moves focus back into the game even after another control was focused.
    await page.getByRole('button',{name:'New game',exact:true}).focus();
    await page.keyboard.type('CRANE');await page.keyboard.press('Enter');await expect.poll(async()=>(await session(page)).state.guesses).toEqual(['APPLE','CRANE']);
  }
});
test('Wordle Enter explains rejected words and allows correction without losing a guess',async({page})=>{
  await page.goto('./#club/wordle');await page.getByRole('button',{name:'Start game',exact:true}).click();
  await page.getByRole('button',{name:'Letter Z',exact:true}).click();await page.keyboard.press('Enter');await expect(page.getByRole('status')).toContainText('Enter five letters');
  await page.keyboard.type('ZZZZ');await page.keyboard.press('Enter');await expect(page.getByRole('status')).toContainText('offline word list');expect((await session(page)).state.guesses).toHaveLength(0);
  for(let i=0;i<5;i++)await page.keyboard.press('Backspace');await page.keyboard.type('APPLE');await page.keyboard.press('Enter');await expect.poll(async()=>(await session(page)).state.guesses).toEqual(['APPLE']);
});
