export function solvePets(regions, size, limit = 2) {
  if (!Array.isArray(regions) || regions.length !== size * size || regions.some(n => !Number.isInteger(n) || n < 0 || n >= size) || new Set(regions).size !== size) return [];
  const result = [], path = [], cols = new Set(), used = new Set();
  function visit(r) {
    if (result.length >= limit) return;
    if (r === size) { result.push([...path]); return; }
    for (let c = 0; c < size; c++) {
      const region = regions[r * size + c];
      if (cols.has(c) || used.has(region) || (r && Math.abs(path[r - 1] % size - c) <= 1)) continue;
      cols.add(c); used.add(region); path.push(r * size + c); visit(r + 1); path.pop(); cols.delete(c); used.delete(region);
    }
  }
  visit(0); return result;
}
export function petConflicts(board, regions, size) {
  const pets = board.flatMap((n, i) => n === 2 ? [i] : []), bad = new Set();
  for (const a of pets) for (const b of pets) if (a < b) {
    const ar = Math.floor(a / size), br = Math.floor(b / size), ac = a % size, bc = b % size;
    if (ar === br || ac === bc || regions[a] === regions[b] || (Math.abs(ar - br) <= 1 && Math.abs(ac - bc) <= 1)) { bad.add(a); bad.add(b); }
  }
  return [...bad];
}
export function petsComplete(board, regions, size) { return board.filter(n => n === 2).length === size && petConflicts(board, regions, size).length === 0; }

// Derived from confirmed pets, so removing/undoing a pet also removes its
// automatic crosses without erasing any exclusions marked by the player.
export function petExclusions(board, regions, size, solution) {
  const excluded = new Set();
  for (const pet of solution) {
    if (board[pet] !== 2) continue;
    const row = Math.floor(pet / size), col = pet % size;
    for (let i = 0; i < board.length; i++) {
      if (i === pet) continue;
      const r = Math.floor(i / size), c = i % size;
      if (r === row || c === col || regions[i] === regions[pet] || (Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1)) excluded.add(i);
    }
  }
  return excluded;
}
