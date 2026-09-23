import { SIZE } from './engine.js';

// Shared timing for the visible projectile and the tiles it hits.
export function planBlast(bursts) {
  const hits = new Map();
  const events = bursts.map(burst => {
    const start = hits.get(burst.index) ?? 0;
    const row = Math.floor(burst.index / SIZE), col = burst.index % SIZE;
    for (const i of burst.cells) {
      const dr = Math.abs(Math.floor(i / SIZE) - row), dc = Math.abs(i % SIZE - col);
      const distance = burst.type === 'tnt' ? Math.hypot(dr,dc) : burst.combo ? Math.min(dr <= 1 ? dc : Infinity, dc <= 1 ? dr : Infinity) : dr + dc;
      const at = start + 120 + distance * 45;
      hits.set(i,Math.min(hits.get(i) ?? Infinity,at));
    }
    return {...burst,start};
  });
  return {events,hits,duration:Math.max(0,...hits.values()) + 190};
}
