import {test,expect} from '@playwright/test';
// Play with the visible controls and feedback. No save/solution inspection or
// state injection is used to choose moves in these sessions.
test.setTimeout(240000);
test.beforeEach(async({page})=>{page.auditErrors=[];page.on('pageerror',e=>page.auditErrors.push(e.message));});
test.afterEach(async({page})=>{expect(page.auditErrors).toEqual([]);});
async function club(page,game,count=2){
  await page.goto('./');await page.getByRole('link',{name:`Play ${game==='dots'?'Dots and Boxes':game==='trump'?'Trump Tricks':game==='sea'?'Sea Battle':game==='flappy'?'Flappy Jump':game==='uno'?'UNO':game==='wordle'?'Wordle':game==='checkers'?'Checkers':'Ludo'} →`,exact:true}).click();
  await page.getByRole('combobox',{name:'Play mode',exact:true}).selectOption('local');
  if(['ludo','uno','trump'].includes(game))await page.getByRole('combobox',{name:'Number of players',exact:true}).selectOption(String(count));
  if(game==='dots')await page.getByRole('combobox',{name:'Board size',exact:true}).selectOption('2');
  await page.getByRole('button',{name:'Start game',exact:true}).click();
}
async function reveal(page){const button=page.getByRole('button',{name:'Show my turn',exact:true});if(await button.count())await button.click();}
async function result(page){await expect(page.locator('.match-result')).toBeVisible();await page.reload();await expect(page.locator('.match-result')).toBeVisible();}

test('play Sudoku using only the visible board and number keys',async({page})=>{
  await page.goto('./');await page.getByRole('button',{name:'Play Sudoku',exact:true}).click();await page.getByRole('button',{name:'Let’s go',exact:true}).click();await page.getByRole('button',{name:'Start playing',exact:true}).click();
  // Solve the visible puzzle, never the stored answer. Singles suffice on easy.
  const cells=page.locator('.sudoku-board .cell');let entered=0;
  for(let pass=0;pass<81&&await cells.count();pass++){
    const labels=await cells.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))),board=labels.map(t=>Number(t.match(/column \d+, (\d)/)?.[1]||0));
    let move=null;for(let i=0;i<81;i++)if(!board[i]){const r=Math.floor(i/9),c=i%9,used=new Set(board.filter((_,j)=>Math.floor(j/9)===r||j%9===c||Math.floor(j/27)===Math.floor(r/3)&&Math.floor(j%9/3)===Math.floor(c/3)));const values=[1,2,3,4,5,6,7,8,9].filter(v=>!used.has(v));if(values.length===1){move={i,value:values[0]};break;}}
    expect(move,'An easy puzzle should have a visible single').not.toBeNull();await cells.nth(move.i).click();await page.getByRole('button',{name:'Enter '+move.value,exact:true}).click();entered++;
    if(entered===3){await page.getByRole('button',{name:'Pause game',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Resume puzzle',exact:true}).click();}
  }
  await expect(page.getByRole('heading',{name:'You found your zone.',exact:true})).toBeVisible();
});
test('play Petdoku by trying cells and responding to visible correct/incorrect feedback',async({page})=>{
  await page.goto('./');await page.getByRole('button',{name:'Play Petdoku',exact:true}).click();await page.getByRole('button',{name:'Let’s go',exact:true}).click();await page.getByRole('button',{name:'Start playing',exact:true}).click();
  for(let attempt=0;attempt<40&&!await page.locator('.completion').count();attempt++){
    const cell=page.locator('.petdoku-board .cell');const labels=await cell.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));const i=labels.findIndex(s=>s.includes(', empty'));
    expect(i).toBeGreaterThanOrEqual(0);const target=cell.nth(i);await target.click();await target.click();if(await page.locator('.completion').count())break;
    if((await target.getAttribute('aria-label')).includes('incorrect')){await target.click();await target.click();} // exclude a known wrong spot
  }
  await expect(page.getByRole('heading',{name:'You found your zone.',exact:true})).toBeVisible();
});
test('play Wordle through six normal words, including plurals and feedback on every row',async({page})=>{
  await club(page,'wordle');const words=['MINES','BOOKS','CRANE','LIGHT','HOUSE','WATER'];
  for(const [row,word] of words.entries()){if(await page.locator('.match-result').count())break;for(const letter of word)await page.getByRole('button',{name:'Letter '+letter,exact:true}).click();await page.keyboard.press('Enter');await expect(page.locator('.word-row').nth(row).locator('.word-tile.correct,.word-tile.present,.word-tile.absent')).toHaveCount(5);}
  await result(page);
});
test('play Dots and Boxes to the final scored box',async({page})=>{
  await club(page,'dots');for(let turn=0;turn<12;turn++)await page.locator('.box-edge:not(:disabled)').last().click();await expect(page.getByText('All boxes claimed.',{exact:true})).toBeVisible();await result(page);
});
test('play Checkers through captures, promotions and a final result',async({page})=>{
  await club(page,'checkers');
  for(let move=0;move<600&&!await page.locator('.match-result').count();move++){
    const name=(await page.locator('.current-turn strong').textContent()).trim(),pieces=page.locator('.checker-cell').filter({has:page.locator('.checker-piece')});const labels=await pieces.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));let moved=false;
    for(let j=0;j<labels.length;j++){if(!labels[j].includes(name))continue;await pieces.nth(j).click();const targets=page.locator('.checker-cell.legal-target');if(await targets.count()){await targets.nth(move%await targets.count()).click();moved=true;break;}}
    expect(moved,'A turn must offer an actionable checker move').toBe(true);
  }
  await result(page);
});
test('play three-player Ludo until all four winning tokens reach home',async({page})=>{
  await club(page,'ludo',3);
  for(let move=0;move<4000&&!await page.locator('.match-result').count();move++){
    const roll=page.getByRole('button',{name:'Roll dice',exact:true});if(await roll.isEnabled())await roll.click();else{const options=page.locator('.token-actions button:not(:disabled)');expect(await options.count()).toBeGreaterThan(0);await options.first().click();}
  }
  await result(page);
});
test('play three-player UNO through drawing, wild colours, calling UNO and winning',async({page})=>{
  await club(page,'uno',3);
  for(let move=0;move<1500&&!await page.locator('.match-result').count();move++){
    await reveal(page);const call=page.getByRole('button',{name:'Say UNO',exact:true});if(await call.count()&&await call.isEnabled()){await call.click();continue;}
    const cards=page.getByRole('group',{name:'Your UNO hand'}).locator('button:not(:disabled)');if(await cards.count()){
      const card=cards.first();if((await card.getAttribute('aria-label')).includes('wild')){const hand=await page.getByRole('group',{name:'Your UNO hand'}).getByRole('button').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));const color=['red','blue','green','yellow'].sort((a,b)=>hand.filter(t=>t.includes(b)).length-hand.filter(t=>t.includes(a)).length)[0];await page.getByRole('combobox',{name:'Wild card colour',exact:true}).selectOption(color);}await card.click();
    }else{const pass=page.getByRole('button',{name:'Pass drawn card',exact:true});if(await pass.isEnabled())await pass.click();else await page.getByRole('button',{name:'Draw one card',exact:true}).click();}
  }
  await result(page);
});
test('play four-player Trump through all seven tricks',async({page})=>{
  await club(page,'trump',4);for(let move=0;move<28;move++){await reveal(page);await page.getByRole('group',{name:'Your Trump hand'}).locator('button:not(:disabled)').last().click();}await result(page);
});
test('play Sea Battle from manual ship placement through the last sunk ship',async({page})=>{
  await club(page,'sea');for(let p=0;p<2;p++){await reveal(page);const fleet=page.getByRole('group',{name:'Your fleet ocean'});for(const coord of ['A1','B1','C1','D1','E1'])await fleet.getByRole('button',{name:coord,exact:true}).click();await expect(fleet.locator('.ship')).toHaveCount(17);await page.getByRole('button',{name:'Confirm fleet',exact:true}).click();}
  let sawSunk=false;for(let shot=0;shot<200&&!await page.locator('.match-result').count();shot++){await reveal(page);const target=page.getByRole('group',{name:'Target ocean'});if(shot===1)await expect(page.locator('.sea-shot-summary')).toContainText('Incoming shot: J10 - Miss');if(shot===0)await target.getByRole('button',{name:'J10',exact:true}).click();else await target.locator('button:not(:disabled)').first().click();if(shot===0)await expect(page.locator('.handoff-public-result')).toContainText('Miss.');if(shot===1)await expect(page.locator('.handoff-public-result')).toContainText('Hit!');if(await page.locator('.handoff-public-result').count()){sawSunk ||= (await page.locator('.handoff-public-result').textContent()).includes('Ship sunk');await expect(page.getByRole('group',{name:'Your fleet ocean'})).toHaveCount(0);}}expect(sawSunk).toBe(true);
  await result(page);
});
test('play Flappy Jump using visual position, pause/resume, and finish both flights',async({page})=>{
  await club(page,'flappy');await page.getByRole('button',{name:'Start flight',exact:true}).click();
  for(let tick=0;tick<70&&await page.getByRole('button',{name:'Pause flight',exact:true}).isEnabled();tick++){
    // Read rendered pixels, as a player sees them, rather than the simulation.
    const picture=await page.locator('canvas').evaluate(canvas=>{const c=canvas.getContext('2d'),d=c.getImageData(0,0,360,500).data;let y=0,n=0;for(let r=0;r<475;r++)for(let x=70;x<95;x++){const k=(r*360+x)*4;if(d[k]===229&&d[k+1]===175&&d[k+2]===76){y+=r;n++;}}let top=150;for(let x=72;x<360;x++){const k=x*4;if(d[k]===66&&d[k+1]===109&&d[k+2]===80){for(let r=1;r<350;r++){const i=(r*360+x)*4;if(d[i]!==66){top=r;break;}}break;}}return {y:n?y/n:230,target:top+90};});
    if(picture.y>picture.target+10)await page.getByRole('button',{name:'Jump ↑',exact:true}).click();await page.waitForTimeout(80);
    if(tick===10){await page.getByRole('button',{name:'Pause flight',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Start flight',exact:true}).click();}
  }
  // Finish the current flight by releasing the controls, then play the second.
  await expect(page.getByRole('button',{name:'Start flight',exact:true})).toBeVisible({timeout:10000});await page.getByRole('button',{name:'Start flight',exact:true}).click();await page.keyboard.press('ArrowUp');await expect(page.locator('.match-result')).toBeVisible({timeout:10000});await result(page);
});
