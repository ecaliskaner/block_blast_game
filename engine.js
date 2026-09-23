export const SIZE = 8;
export const neighbors = i => [i % SIZE > 0 ? i - 1 : -1, i % SIZE < SIZE - 1 ? i + 1 : -1, i - SIZE, i + SIZE].filter(n => n >= 0 && n < SIZE * SIZE);
export function groupAt(board, start) {
  const cell = board[start];
  if (!cell || cell.type !== 'color') return [];
  const seen = new Set([start]), queue = [start];
  for (const i of queue) for (const n of neighbors(i)) if (!seen.has(n) && board[n]?.type === 'color' && board[n].color === cell.color) { seen.add(n); queue.push(n); }
  return queue;
}
export function blastAt(board, start) {
  const hit = new Set(), fired = new Set(), queue = [start];
  let combo = false;
  const add = i => { if (i >= 0 && i < SIZE * SIZE) { hit.add(i); if (board[i]?.type !== 'color' && board[i] && !fired.has(i)) queue.push(i); } };
  while (queue.length) {
    const i = queue.shift(); if (fired.has(i)) continue; fired.add(i);
    const cell = board[i], row = Math.floor(i / SIZE), col = i % SIZE;
    if (cell.type === 'rocket') {
      const partner = neighbors(i).find(n => board[n]?.type === 'rocket' && !fired.has(n));
      if (partner !== undefined) {
        combo = true; fired.add(partner); add(partner);
        for (let n = 0; n < SIZE * SIZE; n++) if (Math.abs(Math.floor(n / SIZE) - row) <= 1 || Math.abs(n % SIZE - col) <= 1) add(n);
      } else for (let n = 0; n < SIZE; n++) add(cell.axis === 'row' ? row * SIZE + n : n * SIZE + col);
    } else if (cell.type === 'tnt') {
      for (let r = Math.max(0, row - 2); r <= Math.min(SIZE - 1, row + 2); r++) for (let c = Math.max(0, col - 2); c <= Math.min(SIZE - 1, col + 2); c++) add(r * SIZE + c);
    }
    add(i);
  }
  return { cells: [...hit], combo };
}
export function hasMoves(board) { return board.some((cell, i) => cell.type !== 'color' || groupAt(board, i).length >= 4); }
export function collapse(board, randomCell) {
  const result = [...board];
  for (let col = 0; col < SIZE; col++) {
    const kept = [];
    for (let row = SIZE - 1; row >= 0; row--) if (board[row * SIZE + col]) kept.push(board[row * SIZE + col]);
    for (let row = SIZE - 1; row >= 0; row--) result[row * SIZE + col] = kept[SIZE - 1 - row] || randomCell();
  }
  return result;
}
