import { mkdirSync, writeFileSync } from 'node:fs';
import { random, shuffle } from '../src/engines/random.js';
import { solveSudoku, rateSudoku } from '../src/engines/sudoku.js';
import { solvePets } from '../src/engines/petdoku.js';
const rng = random(927134);
const sudoku = { easy: [], medium: [], hard: [], expert: [] };
for (let attempt = 0; attempt < 4000 && Object.values(sudoku).some(a => a.length < 6); attempt++) {
  const digits = shuffle([1,2,3,4,5,6,7,8,9], rng);
  const board = Array.from({ length: 81 }, (_, i) => digits[(Math.floor(i / 9) * 3 + Math.floor(Math.floor(i / 9) / 3) + i % 9) % 9]);
  const solution = [...board];
  for (const i of shuffle(Array.from({ length: 81 }, (_, j) => j), rng)) {
    const n = board[i]; board[i] = 0;
    if (solveSudoku(board).length !== 1) board[i] = n;
    const level = rateSudoku(board);
    if (sudoku[level].length < 6 && board.filter(Boolean).length < 42 && !sudoku[level].some(p => p.puzzle === board.join(''))) sudoku[level].push({ puzzle: board.join(''), solution: solution.join('') });
  }
}
const petdoku = {};
for (const [level, size] of Object.entries({ easy: 5, medium: 6, hard: 7, expert: 8 })) {
  petdoku[level] = [];
  for (let attempt = 0; attempt < 400000 && petdoku[level].length < 12; attempt++) {
    const cols = shuffle(Array.from({ length: size }, (_, i) => i), rng);
    if (cols.some((c, r) => r && Math.abs(c - cols[r - 1]) <= 1)) continue;
    const solution = cols.map((c, r) => r * size + c), regions = Array(size * size).fill(-1);
    solution.forEach((i, r) => regions[i] = r);
    // Grow contiguous regions outward from the intended pets.
    while (regions.includes(-1)) {
      const edges = [];
      for (let i = 0; i < regions.length; i++) if (regions[i] >= 0) for (const j of [i % size ? i - 1 : -1, i % size < size - 1 ? i + 1 : -1, i - size, i + size]) if (j >= 0 && j < regions.length && regions[j] === -1) edges.push([j, regions[i]]);
      const [i, region] = edges[Math.floor(rng() * edges.length)]; regions[i] = region;
    }
    if (solvePets(regions, size).length === 1) petdoku[level].push({ size, regions, solution });
  }
}
console.log('Counts', Object.fromEntries(Object.entries(sudoku).map(([k,v]) => [k,v.length])), Object.fromEntries(Object.entries(petdoku).map(([k,v]) => [k,v.length])));
if (Object.values(sudoku).some(a => a.length < 6) || Object.values(petdoku).some(a => a.length < 12)) throw Error('Catalogue generation did not meet minimum variety');
mkdirSync('src/data', { recursive: true });
writeFileSync('src/data/catalogue.json', JSON.stringify({ version: 1, sudoku, petdoku }));
console.log('Validated catalogue:', Object.fromEntries(Object.entries(sudoku).map(([k,v]) => [k,v.length])), Object.fromEntries(Object.entries(petdoku).map(([k,v]) => [k,v.length])));
