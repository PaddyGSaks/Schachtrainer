// Offline puzzle miner: plays randomised low-depth engine games and keeps positions
// where the side to move has a *unique*, verified (depth 12) winning continuation.
// usage: node scripts/mine-puzzles.mjs <seconds> <out.jsonl> [seed]
import { Chess } from 'chess.js';
import { appendFileSync } from 'node:fs';
import { Uci } from './uci-node.mjs';

const [secs = '120', out = 'puzzles.jsonl', seedArg = '1'] = process.argv.slice(2);
let seed = +seedArg * 7919 + 17;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const deadline = Date.now() + +secs * 1000;

const u = new Uci();
await u.init({ Hash: 32 });
const seen = new Set();
let found = 0;

const score = (r) => (r.mate !== undefined ? Math.sign(r.mate) * (10000 - Math.abs(r.mate) * 10) : r.cp);

function pickMove(lines, ply) {
  // opening: wide variety; later: mostly good moves with occasional slips
  const r = rnd();
  const n = lines.length;
  if (ply < 8) return lines[Math.floor(rnd() * Math.min(n, 3))];
  if (r < 0.12) return lines[Math.floor(rnd() * n)];
  if (r < 0.5) return lines[Math.floor(rnd() * Math.min(n, 2))];
  return lines[0];
}

async function checkPuzzle(chess, ply) {
  const fen = chess.fen();
  const key = fen.split(' ').slice(0, 4).join(' ');
  if (seen.has(key)) return;
  const deep = await u.analyse(fen, 13, 3);
  if (deep.length < 2) return;
  const best = score(deep[0]);
  const second = score(deep[1]);
  const isMate = deep[0].mate !== undefined && deep[0].mate > 0 && deep[0].mate <= 4;
  const wins = isMate || (best >= 300 && best < 5000);
  if (!wins) return;
  if (second > Math.min(best - 220, 120)) return; // not unique enough
  if (deep[0].pv.length < 1) return;
  // build solution: solver, opp, solver, ... end on a solver move
  let pv = deep[0].pv.slice(0, isMate ? 2 * deep[0].mate - 1 : 5);
  if (pv.length % 2 === 0) pv = pv.slice(0, -1);
  const test = new Chess(fen);
  const sans = [];
  for (const m of pv) {
    try { sans.push(test.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }).san); } catch { return; }
  }
  if (isMate && !test.isCheckmate()) return;
  const board = fen.split(' ')[0];
  const pieces = (board.match(/[nbrqNBRQ]/g) || []).length;
  if (pieces < 5) return; // keep these for the endgame section
  seen.add(key);
  const first = new Chess(fen).move({ from: pv[0].slice(0, 2), to: pv[0].slice(2, 4), promotion: pv[0][4] });
  const quiet = !first.captured && !first.san.includes('+') && !first.san.includes('#');
  const solverMoves = (pv.length + 1) / 2;
  const rating = Math.round(
    500 + (solverMoves - 1) * 260 + (isMate ? 120 : 0) + (quiet ? 220 : 0) + Math.min(250, Math.max(0, (best - second - 200) / -4 + 100)) + (pieces > 10 ? 60 : 0),
  );
  const rec = { fen, moves: pv, san: sans, kind: isMate ? 'mate' : 'material', mateIn: isMate ? deep[0].mate : undefined, eval: best, quiet, rating, ply };
  appendFileSync(out, JSON.stringify(rec) + '\n');
  found++;
  process.stderr.write(`#${found} ${rating} ${rec.kind} ${sans.join(' ')}\n`);
}

while (Date.now() < deadline) {
  const chess = new Chess();
  for (let ply = 0; ply < 90 && !chess.isGameOver() && Date.now() < deadline; ply++) {
    const fen = chess.fen();
    const lines = await u.analyse(fen, 7, 4);
    if (!lines.length) break;
    if (ply >= 10) {
      const b = score(lines[0]);
      const s = lines.length > 1 ? score(lines[1]) : -99999;
      if (b >= 250 && b - s >= 120) await checkPuzzle(chess, ply);
    }
    const mv = pickMove(lines, ply);
    const m = mv.pv[0];
    chess.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
  }
}
u.quit();
process.exit(0);
