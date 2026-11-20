import {test,expect} from '@playwright/test';
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
async function start(page,game){
  if(['sudoku','petdoku'].includes(game)){await page.goto('./');await page.getByRole('button',{name:`Play ${game==='sudoku'?'Sudoku':'Petdoku'}`,exact:true}).tap();await page.getByRole('button',{name:/^Let.*go/}).tap();await page.getByRole('button',{name:'Start playing',exact:true}).tap();}
  else{await page.goto('./#club/'+game);await page.getByRole('button',{name:'Start game',exact:true}).tap();}
}
async function data(page){return page.evaluate(()=>{const id=JSON.parse(localStorage.getItem('pz:profiles')).data.active;return JSON.parse(localStorage.getItem('pz:player:'+id)).data;});}
async function dragTouch(page,from,to,cancel=false){
  const session=await page.context().newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});
  for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/8,y:from.y+(to.y-from.y)*i/8}]});
  await session.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});await session.detach();
}
const centre=box=>({x:box.x+box.width/2,y:box.y+box.height/2});
test('all twenty games fit narrow phones with compact rules and usable controls',async({page})=>{
  test.setTimeout(120000);
  for(const game of ['sudoku','petdoku','flappy','wordle','checkers','dots','ludo','uno','trump','sea','fruit','blast','2048','2248','flood','arrows','untangle','gravity','rope','bricks']){
    await start(page,game);await expect(page.locator('main')).toBeVisible();
    for(const width of [320,390]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),game+' should fit '+width).toBe(true);}
    const guide=page.locator('.game-guide').first();if(await guide.count()){await expect(guide).not.toHaveAttribute('open','');await guide.locator('summary').tap();await expect(guide).toHaveAttribute('open','');await guide.locator('summary').tap();}
    if(['uno','trump'].includes(game)){const hand=page.getByRole('group',{name:game==='uno'?'Your UNO hand':'Your Trump hand'});await expect(hand).toBeVisible();expect(await hand.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);expect(await hand.getByRole('button').first().evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(100);}
    if(game==='flood'){const palette=page.locator('.flood-palette');expect(await palette.locator('button').first().evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);await palette.locator('button:enabled').first().tap();expect((await data(page)).club.sessions.flood.state.moves).toBe(1);}
  }
});
test('Block Blast accepts a real touch drag and cancels a drag without placing',async({page})=>{
  await start(page,'blast');await page.locator('.blast-board').evaluate(el=>el.scrollIntoView({block:'start'}));
  let from=centre(await page.locator('.blast-piece:not(:disabled)').first().boundingBox()),to=centre(await page.locator('.blast-cell').first().boundingBox());await dragTouch(page,from,to);expect((await data(page)).club.sessions.blast.state.placed).toBe(1);
  from=centre(await page.locator('.blast-piece:not(:disabled)').first().boundingBox());to=centre(await page.locator('.blast-cell').nth(32).boundingBox());await dragTouch(page,from,to,true);expect((await data(page)).club.sessions.blast.state.placed).toBe(1);await expect(page.locator('.piece-preview')).toHaveCount(0);
});
test('Sea Battle places horizontal and vertical ships with finger drags and supports precise enlarged taps',async({page})=>{
  await start(page,'sea');let ocean=page.getByRole('group',{name:'Your fleet ocean',exact:true});await ocean.evaluate(el=>el.scrollIntoView({block:'start'}));
  await dragTouch(page,centre(await ocean.getByRole('button',{name:'A1',exact:true}).boundingBox()),centre(await ocean.getByRole('button',{name:'A5',exact:true}).boundingBox()));expect((await data(page)).club.sessions.sea.state.fleets[0][0]).toEqual([0,1,2,3,4]);
  await dragTouch(page,centre(await ocean.getByRole('button',{name:'C1',exact:true}).boundingBox()),centre(await ocean.getByRole('button',{name:'F1',exact:true}).boundingBox()));expect((await data(page)).club.sessions.sea.state.fleets[0][1]).toEqual([20,30,40,50]);
  await page.getByRole('button',{name:'Enlarge Your fleet board',exact:true}).tap();expect(await ocean.evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThan(450);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('button',{name:'Fit Your fleet board',exact:true}).tap();await page.getByRole('button',{name:'Auto-place fleet',exact:true}).tap();await page.getByRole('button',{name:'Confirm fleet',exact:true}).tap();await expect(page.getByRole('group',{name:'Target ocean',exact:true})).toBeVisible({timeout:10000});
});
test('UNO uses the draw pile and large wild-colour choices',async({page})=>{
  await start(page,'uno');await page.getByRole('button',{name:'Use green for wild cards',exact:true}).tap();await expect(page.getByRole('button',{name:'Use green for wild cards',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'Draw one card',exact:true}).tap();expect((await data(page)).club.sessions.uno.state.hands[0]).toHaveLength(8);
});
test('three players finish UNO using phone taps and the scrolling hand',async({page})=>{
  test.setTimeout(180000);await page.goto('./#club/uno');await page.getByRole('combobox',{name:'Play mode',exact:true}).selectOption('local');await page.getByRole('combobox',{name:'Number of players',exact:true}).selectOption('3');await page.getByRole('button',{name:'Start game',exact:true}).tap();
  for(let move=0;move<1500&&!await page.locator('.match-result').count();move++){
    const show=page.getByRole('button',{name:'Show my turn',exact:true});if(await show.count())await show.tap();const call=page.getByRole('button',{name:'Say UNO',exact:true});if(await call.count()&&await call.isEnabled()){await call.tap();continue;}
    const cards=page.getByRole('group',{name:'Your UNO hand'}).locator('button:not(:disabled)');if(await cards.count()){const card=cards.first();if((await card.getAttribute('aria-label')).includes('wild')){const hand=await page.getByRole('group',{name:'Your UNO hand'}).getByRole('button').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))),color=['red','blue','green','yellow'].sort((a,b)=>hand.filter(t=>t.includes(b)).length-hand.filter(t=>t.includes(a)).length)[0];await page.getByRole('button',{name:`Use ${color} for wild cards`,exact:true}).tap();}await card.tap();}
    else{const pass=page.getByRole('button',{name:'Pass drawn card',exact:true});if(await pass.isEnabled())await pass.tap();else await page.getByRole('button',{name:'Draw one card',exact:true}).tap();}
  }
  await expect(page.locator('.match-result')).toBeVisible();await page.reload();await expect(page.locator('.match-result')).toBeVisible();
});
test('Sudoku enlarges without changing progress and keeps its keypad accessible',async({page})=>{
  await start(page,'sudoku');const s=(await data(page)).saves.sudoku;await page.getByRole('button',{name:'Enlarge Sudoku board',exact:true}).tap();expect(await page.locator('.sudoku-board').evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThan(500);expect((await data(page)).saves.sudoku.board).toEqual(s.board);await page.getByRole('button',{name:'Fit Sudoku board',exact:true}).tap();const i=s.board.indexOf(0);await page.locator('.sudoku-board .cell').nth(i).tap();await page.getByRole('button',{name:'Enter '+s.solution[i],exact:true}).tap();expect((await data(page)).saves.sudoku.board[i]).toBe(s.solution[i]);expect(await page.getByRole('button',{name:'Enter 1',exact:true}).evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
});
test('Flappy can start by tapping the play area and pauses safely',async({page})=>{
  await start(page,'flappy');await page.locator('.flight-overlay h2').tap();await expect(page.getByRole('button',{name:'Pause flight',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Pause flight',exact:true}).tap();await expect(page.getByRole('button',{name:'Start flight',exact:true})).toBeVisible();
});
