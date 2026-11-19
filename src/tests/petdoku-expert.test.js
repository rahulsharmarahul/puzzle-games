import {it,expect} from 'vitest';
import expert from '../data/petdoku-expert.json';
import legacy from '../data/catalogue.json';
import {analysePetLogic,solvePetLayouts} from '../engines/pet-logic';
import {solvePets,petExclusions} from '../engines/petdoku';
import {makePuzzle,dailyKey} from '../engines/puzzles';
import {createGame,act,complete} from '../lib/game';
import {freshData,record,validData,validSave,parseBackup} from '../lib/storage';
it('every new Expert board is connected, uniquely solvable and resists basic deductions',()=>{
  expect(expert.puzzles).toHaveLength(12);
  for(const p of expert.puzzles){expect(p.size).toBe(10);expect(solvePets(p.regions,10)).toEqual([p.solution]);expect(solvePetLayouts(p.regions,10)).toEqual([p.solution]);const rating=analysePetLogic(p.regions,10);expect(rating).toEqual(p.rating);expect(rating.initialSingles).toBe(0);expect(rating.minRegion).toBeGreaterThanOrEqual(4);expect(rating.remainingAfterBasics).toBeGreaterThanOrEqual(4);
    for(let region=0;region<10;region++){const cells=p.regions.flatMap((r,i)=>r===region?[i]:[]),seen=new Set([cells[0]]),q=[cells[0]];for(let k=0;k<q.length;k++){const i=q[k];for(const j of [...(i%10?[i-1]:[]),...(i%10<9?[i+1]:[]),i-10,i+10])if(cells.includes(j)&&!seen.has(j)){seen.add(j);q.push(j);}}expect(seen.size).toBe(cells.length);}
  }
});
it('new Expert is materially stronger than the old basic-solved catalogue',()=>{
  const old=legacy.petdoku.expert.map(p=>analysePetLogic(p.regions,p.size));expect(old.filter(r=>r.remainingAfterBasics===0).length).toBeGreaterThanOrEqual(10);expect(expert.puzzles.every(p=>p.rating.remainingAfterBasics>=8)).toBe(true);
});
it('rotations/reflections retain uniqueness and measured difficulty',()=>{
  for(let seed=0;seed<40;seed++){const p=makePuzzle('petdoku','expert',String(seed),2);expect(p.size).toBe(10);expect(solvePets(p.regions,10)).toEqual([p.solution]);expect(analysePetLogic(p.regions,10).remainingAfterBasics).toBeGreaterThanOrEqual(4);expect(makePuzzle('petdoku','expert',String(seed),2)).toEqual(p);}
});
it('new games keep instant correctness, mistakes, hints, auto-crosses and completion',()=>{
  let g=createGame('petdoku','expert','feedback');expect(g.puzzleVersion).toBe(2);expect(validSave(g)).toBe(true);const wrong=g.board.findIndex((_,i)=>!g.solution.includes(i));g=act(g,{type:'value',index:wrong,value:2});expect(g.mistakes).toBe(1);g=act(g,{type:'erase',index:wrong});g=act(g,{type:'hint'});expect(g.hints).toBe(1);expect(petExclusions(g.board,g.regions,g.size,g.solution).size).toBeGreaterThan(0);while(!complete(g))g=act(g,{type:'hint'});expect(complete(g)).toBe(true);
});
it('old Expert saves and backups still use their original 8x8 board',()=>{
  const original=makePuzzle('petdoku','expert','old-expert',1),g={...createGame('petdoku','expert','old-expert'),...original,board:[...original.givens]};delete g.puzzleVersion;expect(g.size).toBe(8);expect(validSave(g)).toBe(true);const data=record(freshData(),g,'start');expect(validData(data)).toBe(true);expect(parseBackup(JSON.stringify({app:'Puzzle Zone',version:1,profiles:[{name:'Rahul',avatar:'X',data}]})).profiles[0].data.saves.petdoku.size).toBe(8);expect(validSave({...g,puzzleVersion:2})).toBe(false);
});
it('editions preserve other puzzles and version only the new Expert daily challenge',()=>{
  expect(dailyKey('petdoku','expert','2026-11-19')).toBe('v2:2026-11-19:petdoku:expert');expect(dailyKey('petdoku','hard','2026-11-19')).toBe('v1:2026-11-19:petdoku:hard');expect(createGame('petdoku','hard','same').size).toBe(7);expect(createGame('sudoku','expert','same').size).toBe(9);expect(validSave({...createGame('petdoku','expert','x'),puzzleVersion:99})).toBe(false);
});
