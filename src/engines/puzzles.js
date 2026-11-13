import catalogue from '../data/catalogue.json';
import { hash, random, shuffle, levels } from './random';

export function makePuzzle(game, difficulty, seed) {
  if (!['sudoku', 'petdoku'].includes(game) || !levels.includes(difficulty)) throw Error('Unknown puzzle');
  const rng = random(hash(`v${catalogue.version}:${game}:${difficulty}:${seed}`));
  const list = catalogue[game][difficulty], item = list[Math.floor(rng() * list.length)];
  if (game === 'sudoku') {
    const digits = [0, ...shuffle([1,2,3,4,5,6,7,8,9], rng)];
    const transpose = rng() < .5;
    const rows = shuffle([0,1,2], rng).flatMap(b => shuffle([0,1,2], rng).map(r => b * 3 + r));
    const cols = shuffle([0,1,2], rng).flatMap(b => shuffle([0,1,2], rng).map(c => b * 3 + c));
    const transform = str => Array.from({ length: 81 }, (_, i) => { const r = rows[Math.floor(i / 9)], c = cols[i % 9]; return digits[Number(str[transpose ? c * 9 + r : r * 9 + c])]; });
    return { size: 9, givens: transform(item.puzzle), solution: transform(item.solution) };
  }
  const n = item.size, rotations = Math.floor(rng() * 4), mirror = rng() < .5;
  const map = i => { let r = Math.floor(i / n), c = i % n; if (mirror) c = n - 1 - c; for (let k = 0; k < rotations; k++) [r,c] = [c,n - 1 - r]; return r * n + c; };
  const labels = shuffle(Array.from({ length: n }, (_, i) => i), rng), regions = Array(n * n);
  item.regions.forEach((v,i) => regions[map(i)] = labels[v]);
  return { size: n, regions, solution: item.solution.map(map).sort((a,b) => a-b), givens: Array(n*n).fill(0) };
}
export function localDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function dailyKey(game, difficulty, date = localDate()) { return `v${catalogue.version}:${date}:${game}:${difficulty}`; }
