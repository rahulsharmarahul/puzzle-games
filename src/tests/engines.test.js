import { describe, it, expect } from 'vitest';
import catalogue from '../data/catalogue.json';
import { solveSudoku, sudokuConflicts, rateSudoku, candidates } from '../engines/sudoku';
import { solvePets, petConflicts, petsComplete } from '../engines/petdoku';
import { makePuzzle, dailyKey, localDate } from '../engines/puzzles';
import { levels } from '../engines/random';
import { createGame, act, complete, elapsedAt, formatTime } from '../lib/game';

describe('Sudoku catalogue and generated variants', () => {
  for (const level of levels) {
    it(`${level}: every catalogue puzzle is unique and technique-rated`, () => {
      for (const p of catalogue.sudoku[level]) { const board = [...p.puzzle].map(Number); expect(solveSudoku(board)).toEqual([[...p.solution].map(Number)]); expect(rateSudoku(board)).toBe(level); }
    });
    it(`${level}: transformations preserve uniqueness, difficulty and givens`, () => {
      for (let seed = 0; seed < 15; seed++) { const p = makePuzzle('sudoku',level,String(seed)); expect(solveSudoku(p.givens)).toEqual([p.solution]); expect(sudokuConflicts(p.solution)).toEqual([]); expect(rateSudoku(p.givens)).toBe(level); }
    });
  }
  it('detects row, column and box conflicts and invalid input', () => {
    for (const j of [1,9,10]) { const b = Array(81).fill(0); b[0] = b[j] = 4; expect(sudokuConflicts(b)).toContain(0); expect(solveSudoku(b)).toEqual([]); expect(candidates(b,2)).not.toContain(4); }
    expect(solveSudoku([1])).toEqual([]); expect(solveSudoku(Array(81).fill(11))).toEqual([]);
  });
});
describe('Petdoku catalogue and rules', () => {
  for (const [level,size] of Object.entries({easy:5,medium:6,hard:7,expert:8})) {
    it(`${level}: every region map is contiguous, unique and compliant`, () => {
      for (const p of catalogue.petdoku[level]) {
        expect(p.size).toBe(size); expect(solvePets(p.regions,size)).toEqual([p.solution]);
        const board=Array(size*size).fill(0); p.solution.forEach(i => board[i]=2); expect(petsComplete(board,p.regions,size)).toBe(true);
        for (let region=0; region<size; region++) { const cells = p.regions.flatMap((n,i) => n === region ? [i] : []); const reached=new Set([cells[0]]), todo=[cells[0]]; while (todo.length) { const i=todo.pop(); for (const j of [i%size ? i-1 : -1,i%size<size-1 ? i+1 : -1,i-size,i+size]) if (cells.includes(j) && !reached.has(j)) { reached.add(j); todo.push(j); } } expect(reached.size).toBe(cells.length); }
      }
    });
    it(`${level}: deterministic rotations and reflections stay unique`, () => { for (let seed=0;seed<15;seed++) { const p=makePuzzle('petdoku',level,String(seed)); expect(solvePets(p.regions,size)).toEqual([p.solution]); } });
  }
  it('rejects same row, column, region and diagonal contacts', () => {
    const n=5, regions=Array.from({length:25},(_,i)=>Math.floor(i/5));
    for (const [a,b] of [[0,4],[0,10],[0,6],[2,8]]) { const board=Array(25).fill(0); board[a]=board[b]=2; expect(petConflicts(board,regions,n)).toEqual([a,b]); expect(petsComplete(board,regions,n)).toBe(false); }
    expect(solvePets([],5)).toEqual([]);
  });
});
describe('Game actions and clock', () => {
  it('toggles notes, erases, undoes and redoes without changing givens', () => {
    let g=createGame('sudoku','easy','actions'); const i=g.board.indexOf(0), given=g.board.findIndex(Boolean);
    expect(act(g,{type:'value',index:given,value:1})).toBe(g);
    g=act(g,{type:'note',index:i,value:2}); g=act(g,{type:'note',index:i,value:5}); expect(g.notes[i]).toEqual([2,5]);
    g=act(g,{type:'note',index:i,value:2}); expect(g.notes[i]).toEqual([5]);
    g=act(g,{type:'value',index:i,value:g.solution[i]}); expect(g.notes[i]).toBeUndefined();
    g=act(g,{type:'undo'}); expect(g.board[i]).toBe(0); expect(g.notes[i]).toEqual([5]);
    g=act(g,{type:'redo'}); expect(g.board[i]).toBe(g.solution[i]);
    g=act(g,{type:'erase',index:i}); expect(g.board[i]).toBe(0);
    g=act(g,{type:'hint'}); expect(g.hints).toBe(1); expect(g.board[i]).toBe(g.solution[i]);
  });
  it('counts mistakes and hints cumulatively through undo', () => { let g=createGame('sudoku','easy','wrong'); const i=g.board.indexOf(0); g=act(g,{type:'value',index:i,value:g.solution[i]%9+1}); expect(g.mistakes).toBe(1); g=act(g,{type:'undo'}); expect(g.mistakes).toBe(1); });
  it('completes both games with hints and detects incomplete boards', () => {
    for (const game of ['sudoku','petdoku']) { let g=createGame(game,'easy','hint'); expect(complete(g)).toBe(false); for (let i=0;i<81 && !complete(g);i++) g=act(g,{type:'hint'}); expect(complete(g)).toBe(true); expect(act({...g,status:'complete'},{type:'erase',index:0}).board).toEqual(g.board); }
  });
  it('cycles pets and supports undo, redo and erase', () => { let g=createGame('petdoku','easy','cycle'); for (const value of [1,2,0]) { g=act(g,{type:'value',index:0,value}); expect(g.board[0]).toBe(value); } g=act(g,{type:'undo'}); expect(g.board[0]).toBe(2); g=act(g,{type:'redo'}); expect(g.board[0]).toBe(0); });
  it('tracks active wall time and excludes pauses without relying on ticks', () => { expect(elapsedAt(5000,10000,12500)).toBe(7500); expect(elapsedAt(7500,null,99000)).toBe(7500); expect(elapsedAt(7500,100000,102000)).toBe(9500); expect(elapsedAt(5,100,90)).toBe(5); expect(formatTime(3661000)).toBe('1:01:01'); expect(formatTime(61000)).toBe('01:01'); });
  it('daily puzzles agree across independent calls and vary by game, date and level', () => {
    for (const game of ['sudoku','petdoku']) for (const level of levels) { const key=dailyKey(game,level,'2026-11-13'); expect(makePuzzle(game,level,key)).toEqual(makePuzzle(game,level,key)); expect(key).not.toBe(dailyKey(game,level,'2026-11-14')); }
    expect(localDate(new Date(2026,0,3))).toBe('2026-01-03');
  });
});
