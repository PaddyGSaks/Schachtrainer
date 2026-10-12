import { Uci } from './uci-node.mjs';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/data/endgames.ts', import.meta.url), 'utf8');
const items = [...src.matchAll(/id: '([^']+)'[\s\S]*?side: '(w|b)',\s*fen: '([^']+)',\s*goal: '(\w+)'/g)];
const u = new Uci(); await u.init({ Hash: 64 });
for (const [, id, side, fen, goal] of items) {
  const [l] = await u.analyse(fen, 22, 1);
  const stm = fen.split(' ')[1];
  const cp = l.mate !== undefined ? Math.sign(l.mate) * 9999 : l.cp;
  const mine = stm === side ? cp : -cp; // from the player's view
  console.log(id.padEnd(16), goal.padEnd(5), 'player eval:', l.mate !== undefined ? `M${stm === side ? l.mate : -l.mate}` : mine, 'best', l.pv[0]);
}
u.quit();
