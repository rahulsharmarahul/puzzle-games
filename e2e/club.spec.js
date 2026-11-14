import {test,expect} from '@playwright/test';
import {answers} from '../src/data/words.js';
import {hash} from '../src/engines/random.js';
async function active(page){return page.evaluate(()=>{const m=JSON.parse(localStorage.getItem('pz:profiles')).data;return JSON.parse(localStorage.getItem('pz:player:'+m.active))?.data;});}
async function start(page,game,mode='local'){
  await page.goto(`./#club/${game}`);
  if(!['sudoku','petdoku'].includes(game))await page.getByRole('combobox',{name:'Play mode',exact:true}).selectOption(mode);
  if(game==='wordle')await page.getByRole('combobox',{name:'Word selection',exact:true}).selectOption('free');
  await page.getByRole('button',{name:'Start game',exact:true}).click();
}
test('all six games are discoverable and mobile club boards fit',async({page})=>{
  await page.goto('./');for(const name of ['Sudoku','Petdoku','Flappy Jump','Wordle','Checkers','Dots and Boxes'])await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:/Play together/})).toHaveCount(2);
  await page.setViewportSize({width:320,height:740});
  for(const game of ['wordle','checkers','dots','flappy']){await start(page,game);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/club-${game}-mobile.png`,fullPage:true});}
});
test('Wordle handles two-player guesses, repeated letters, completion and refresh',async({page})=>{
  await start(page,'wordle');const s=(await active(page)).club.sessions.wordle;const answer=answers[hash(`wordle-v1:${s.seed}`)%answers.length],wrong=answers.find(w=>w!==answer);
  await page.keyboard.type('zzzzz');await page.getByRole('button',{name:'Submit guess'}).click();await expect(page.getByRole('status')).toContainText('offline word list');expect((await active(page)).club.sessions.wordle.state.guesses).toHaveLength(0);
  for(let i=0;i<5;i++)await page.getByRole('button',{name:'Delete letter'}).click();
  await page.keyboard.type(wrong);await page.getByRole('button',{name:'Submit guess'}).click();expect((await active(page)).club.sessions.wordle.state.turn).toBe(1);await expect(page.locator('.current-turn')).toContainText('Neha');
  await page.reload();for(let i=0;i<5;i++)await expect(page.locator('.word-row').first().locator('.word-tile').nth(i)).toHaveAttribute('aria-label',new RegExp(`^${wrong[i]},`));
  await page.keyboard.type(answer);await page.getByRole('button',{name:'Submit guess'}).click();await expect(page.locator('.match-result')).toContainText('Solved together');expect((await active(page)).club.history).toHaveLength(1);
  await page.reload();expect((await active(page)).club.history).toHaveLength(1);
});
test('Checkers supports alternating human turns and a computer response',async({page})=>{
  await start(page,'checkers');await page.getByRole('button',{name:/^Row 6, column 1,/}).click();await page.getByRole('button',{name:/^Row 5, column 2,.*legal move/}).click();expect((await active(page)).club.sessions.checkers.state.turn).toBe(1);await expect(page.locator('.current-turn')).toContainText('Neha');
  await page.reload();expect((await active(page)).club.sessions.checkers.state.board[33]).toBe(1);
  await page.getByRole('button',{name:'New game',exact:true}).click();await page.getByRole('combobox',{name:'Play mode',exact:true}).selectOption('solo');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Start new session'}).click();
  await page.getByRole('button',{name:/^Row 6, column 1,/}).click();await page.getByRole('button',{name:/^Row 5, column 2,.*legal move/}).click();await expect.poll(async()=>(await active(page)).club.sessions.checkers.state.turn).toBe(0);
});
test('Dots and Boxes keeps the scoring turn and completes a real local match',async({page})=>{
  await page.goto('./#club/dots');await page.getByRole('combobox',{name:'Play mode',exact:true}).selectOption('local');await page.getByRole('combobox',{name:'Board size',exact:true}).selectOption('2');await page.getByRole('button',{name:'Start game',exact:true}).click();
  for(const label of ['Horizontal edge 1','Horizontal edge 3','Vertical edge 1'])await page.getByRole('button',{name:label,exact:true}).click();
  const turn=(await active(page)).club.sessions.dots.state.turn;await page.getByRole('button',{name:'Vertical edge 2',exact:true}).click();let state=(await active(page)).club.sessions.dots.state;expect(state.boxes[0]).toBe(turn);expect(state.turn).toBe(turn);
  const remaining=page.locator('.box-edge:not(:disabled)');while(await remaining.count())await remaining.first().click();
  await expect(page.locator('.match-result')).toBeVisible();state=(await active(page)).club.sessions.dots.state;expect(state.boxes.filter(n=>n>=0)).toHaveLength(4);await page.reload();await expect(page.locator('.match-result')).toBeVisible();
});
test('Flappy Jump runs two equal-course flights and saves the score result',async({page})=>{
  await start(page,'flappy');const first=(await active(page)).club.sessions.flappy.state.flight;
  await page.getByRole('button',{name:'Start flight',exact:true}).click();await expect.poll(async()=>(await active(page)).club.sessions.flappy.state.round,{timeout:10000}).toBe(1);
  const next=(await active(page)).club.sessions.flappy.state.flight;expect(next.pipes).toEqual(first.pipes);await expect(page.locator('.current-turn')).toContainText('Neha');
  await page.getByRole('button',{name:'Start flight',exact:true}).click();await expect(page.locator('.match-result')).toBeVisible({timeout:10000});expect((await active(page)).club.sessions.flappy.state.scores).toHaveLength(2);expect((await active(page)).club.history[0].game).toBe('flappy');
});
for(const game of ['sudoku','petdoku'])test(`${game} cooperative turn-taking preserves solo saves and resumes`,async({page})=>{
  await page.goto('./');await page.getByRole('button',{name:`Play ${game==='sudoku'?'Sudoku':'Petdoku'}`,exact:true}).click();await page.getByRole('button',{name:'Let’s go'}).click();await page.getByRole('button',{name:'Start playing'}).click();await page.getByRole('button',{name:'Hint',exact:true}).click();
  await page.getByRole('button',{name:'Back to play',exact:true}).click();const solo=(await active(page)).saves[game];
  await start(page,game);await page.getByRole('button',{name:'Start playing'}).click();await page.getByRole('button',{name:'Hint',exact:true}).click();await expect(page.locator('.current-turn')).toContainText('Neha');
  expect((await active(page)).saves[game]).toEqual(solo);expect((await active(page)).club.sessions[game].state.hints).toBe(1);
  await page.reload();await page.getByRole('button',{name:'Resume puzzle'}).click();await expect(page.locator('.current-turn')).toContainText('Neha');
  const shared=(await active(page)).club.sessions[game].state;
  const remaining=game==='sudoku'?shared.board.filter(n=>!n).length:shared.solution.filter(i=>shared.board[i]!==2).length;
  for(let i=0;i<remaining;i++)await page.getByRole('button',{name:'Hint',exact:true}).click();
  await expect(page.locator('.match-result')).toContainText('Solved together');
  expect((await active(page)).saves[game]).toEqual(solo);
  expect((await active(page)).club.history[0].game).toBe(game);
});
test('new games and same-device multiplayer work entirely offline',async({page,context})=>{
  await page.goto('./');await page.evaluate(async()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);
  for(const game of ['checkers','wordle','dots','flappy']){await start(page,game);await expect(page.locator('.club-heading h1')).toBeVisible();}
  await page.reload();await expect(page.getByRole('button',{name:'Start flight',exact:true})).toBeVisible();await context.setOffline(false);
});
test('keyboard controls preserve native button activation in Wordle and Flappy Jump',async({page})=>{
  await start(page,'wordle');const newGame=page.getByRole('button',{name:'New game',exact:true});await newGame.focus();await page.keyboard.press('Enter');await expect(page.getByRole('heading',{name:'Another round?',exact:true})).toBeVisible();
  await start(page,'flappy');await page.getByRole('button',{name:'Start flight',exact:true}).click();const pause=page.getByRole('button',{name:'Pause flight',exact:true});await pause.focus();await page.keyboard.press('Space');await expect(page.getByRole('button',{name:'Start flight',exact:true})).toBeVisible();expect((await active(page)).club.sessions.flappy.status).toBe('playing');
});
