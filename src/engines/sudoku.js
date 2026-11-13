export const units = [
  ...Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => r * 9 + c)),
  ...Array.from({ length: 9 }, (_, c) => Array.from({ length: 9 }, (_, r) => r * 9 + c)),
  ...Array.from({ length: 9 }, (_, b) => Array.from({ length: 9 }, (_, k) => (Math.floor(b / 3) * 3 + Math.floor(k / 3)) * 9 + b % 3 * 3 + k % 3))
];
export const peers = Array.from({ length: 81 }, (_, i) => [...new Set(units.filter(u => u.includes(i)).flat())].filter(j => j !== i));
export function candidates(board, i) { return board[i] ? [] : [1,2,3,4,5,6,7,8,9].filter(n => !peers[i].some(j => board[j] === n)); }
export function sudokuConflicts(board) { return board.flatMap((n, i) => n && peers[i].some(j => board[j] === n) ? [i] : []); }
export function solveSudoku(input, limit = 2) {
  if (!Array.isArray(input) || input.length !== 81 || input.some(n => !Number.isInteger(n) || n < 0 || n > 9) || sudokuConflicts(input).length) return [];
  const board = [...input], solutions = [];
  function visit() {
    if (solutions.length >= limit) return;
    let index = -1, options = null;
    for (let i = 0; i < 81; i++) if (!board[i]) { const ns = candidates(board, i); if (!ns.length) return; if (!options || ns.length < options.length) { index = i; options = ns; if (ns.length === 1) break; } }
    if (index < 0) { solutions.push([...board]); return; }
    for (const n of options) { board[index] = n; visit(); if (solutions.length >= limit) break; }
    board[index] = 0;
  }
  visit(); return solutions;
}
// Difficulty measures the strongest technique required, rather than clue count.
// Easy: naked singles. Medium: hidden singles. Hard: locked candidates / pairs.
// Expert: needs search after these techniques are exhausted.
export function rateSudoku(input) {
  const board = [...input]; let rank = 0;
  const opts = board.map((_, i) => new Set(candidates(board, i)));
  const fill = (i, n) => { board[i] = n; opts[i].clear(); for (const j of peers[i]) opts[j].delete(n); };
  for (let step = 0; step < 1000; step++) {
    if (board.every(Boolean)) return ['easy','medium','hard'][rank];
    let changed = false;
    for (let i = 0; i < 81; i++) if (!board[i] && opts[i].size === 1) { fill(i, [...opts[i]][0]); changed = true; }
    if (changed) continue;
    for (const u of units) for (let n = 1; n <= 9; n++) { const cells = u.filter(i => opts[i].has(n)); if (cells.length === 1) { fill(cells[0], n); rank = Math.max(rank, 1); changed = true; } }
    if (changed) continue;
    const remove = (i, n) => { if (opts[i].delete(n)) changed = true; };
    for (const u of units) {
      for (const i of u) if (opts[i].size === 2) {
        const pair = u.filter(j => opts[j].size === 2 && [...opts[i]].every(n => opts[j].has(n)));
        if (pair.length === 2) for (const j of u.filter(j => !pair.includes(j))) for (const n of opts[i]) remove(j, n);
      }
      for (let n = 1; n <= 9; n++) {
        const cells = u.filter(i => opts[i].has(n));
        if (cells.length > 1) for (const other of units) if (other !== u && cells.every(i => other.includes(i))) for (const j of other.filter(j => !u.includes(j))) remove(j, n);
      }
    }
    if (changed) { rank = 2; continue; }
    return 'expert';
  }
  return 'expert';
}
