import { makePuzzle } from '../engines/puzzles';
import { sudokuConflicts } from '../engines/sudoku';
import { petConflicts, petsComplete } from '../engines/petdoku';
export function createGame(game, difficulty, seed, daily = null) {
  const upgraded=game==='petdoku'&&difficulty==='expert';
  const puzzle = makePuzzle(game, difficulty, seed, upgraded?2:1);
  return { id: crypto.randomUUID(), game, difficulty, seed, daily, ...(upgraded?{puzzleVersion:2}:{}), ...puzzle, board: [...puzzle.givens], notes: {}, undo: [], redo: [], elapsed: 0, accounted: 0, mistakes: 0, hints: 0, status: 'playing' };
}
export function conflicts(g) { return g.game === 'sudoku' ? sudokuConflicts(g.board) : petConflicts(g.board, g.regions, g.size); }
export function complete(g) { return g.game === 'sudoku' ? g.board.every((n, i) => n === g.solution[i]) : petsComplete(g.board, g.regions, g.size); }
const snapshot = g => ({ board: [...g.board], notes: structuredClone(g.notes) });
export function act(g, action) {
  if (g.status !== 'playing') return g;
  if (action.type === 'undo' || action.type === 'redo') {
    const from = action.type, to = from === 'undo' ? 'redo' : 'undo';
    if (!g[from].length) return g;
    return { ...g, ...g[from].at(-1), [from]: g[from].slice(0,-1), [to]: [...g[to], snapshot(g)].slice(-100) };
  }
  const next = { ...g, ...snapshot(g), undo: [...g.undo, snapshot(g)].slice(-100), redo: [] };
  let i = action.index;
  if (action.type === 'hint') {
    i = g.game === 'sudoku' ? g.board.findIndex((n,j) => n !== g.solution[j]) : g.solution.find(j => g.board[j] !== 2);
    if (i === undefined || i < 0) return g;
    next.board[i] = g.game === 'sudoku' ? g.solution[i] : 2;
    delete next.notes[i]; next.hints++;
  } else {
    if (!Number.isInteger(i) || i < 0 || i >= g.board.length || (g.game === 'sudoku' && g.givens[i])) return g;
    if (action.type === 'note' && g.game === 'sudoku' && !g.board[i]) {
      const set = new Set(next.notes[i] || []); set.has(action.value) ? set.delete(action.value) : set.add(action.value); next.notes[i] = [...set].sort();
    } else if (action.type === 'erase') { next.board[i] = 0; delete next.notes[i]; }
    else if (action.type === 'value') {
      next.board[i] = action.value; delete next.notes[i];
      if (action.value && (g.game === 'sudoku' ? action.value !== g.solution[i] : action.value === 2 && !g.solution.includes(i))) next.mistakes++;
    } else return g;
  }
  return next;
}
export function elapsedAt(accumulated, started, now = Date.now()) { return accumulated + (started === null ? 0 : Math.max(0, now - started)); }
export function formatTime(ms = 0) { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return `${h ? `${h}:` : ''}${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`; }
