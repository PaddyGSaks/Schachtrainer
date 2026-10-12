// Merges .mine/*.jsonl into src/data/puzzles.json (deduplicated, sorted by rating).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
const seen = new Set();
const out = [];
for (const f of readdirSync('.mine').filter((f) => f.endsWith('.jsonl'))) {
  for (const line of readFileSync(`.mine/${f}`, 'utf8').split('\n').filter(Boolean)) {
    const p = JSON.parse(line);
    const key = p.fen.split(' ').slice(0, 4).join(' ');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push([p.fen, p.moves.join(' '), p.rating, p.kind === 'mate' ? p.mateIn : 0, p.eval]);
  }
}
out.sort((a, b) => a[2] - b[2]);
// compact tuple format: [fen, "uci uci ...", rating, mateIn(0 if none), evalCp]
writeFileSync('src/data/puzzles.json', JSON.stringify(out));
const r = out.map((p) => p[2]);
console.log(out.length, 'puzzles; rating range', r[0], '-', r[r.length - 1], 'median', r[Math.floor(r.length / 2)]);
