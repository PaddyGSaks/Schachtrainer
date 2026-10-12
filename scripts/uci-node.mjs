// Minimal promise wrapper around stockfish.js (Node) for offline tooling.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export class Uci {
  constructor(flavor = 'lite-single') {
    this.waiters = [];
    this.sf = require('stockfish')(flavor, (line) => {
      for (const w of [...this.waiters]) w(line);
    });
  }
  send(cmd) { this.sf.processCommand(cmd); }
  waitFor(re) {
    return new Promise((resolve) => {
      const lines = [];
      const w = (line) => {
        lines.push(line);
        if (re.test(line)) { this.waiters = this.waiters.filter((x) => x !== w); resolve(lines); }
      };
      this.waiters.push(w);
    });
  }
  async init(opts = {}) {
    const p = this.waitFor(/^uciok/);
    this.send('uci');
    await p;
    for (const [k, v] of Object.entries(opts)) this.send(`setoption name ${k} value ${v}`);
    const r = this.waitFor(/^readyok/);
    this.send('isready');
    await r;
  }
  /** Returns [{multipv, cp|mate, pv:[uci...]}] sorted by multipv, from side-to-move POV. */
  async analyse(fen, depth = 12, multipv = 1) {
    this.send(`setoption name MultiPV value ${multipv}`);
    this.send('ucinewgame');
    this.send(`position fen ${fen}`);
    const p = this.waitFor(/^bestmove/);
    this.send(`go depth ${depth}`);
    const lines = await p;
    const best = new Map();
    for (const l of lines) {
      const m = l.match(/ depth (\d+).* multipv (\d+) score (cp|mate) (-?\d+).* pv (.*)$/);
      if (!m) continue;
      const d = +m[1];
      const prev = best.get(+m[2]);
      if (!prev || d >= prev.depth) best.set(+m[2], { depth: d, multipv: +m[2], [m[3]]: +m[4], pv: m[5].trim().split(' ') });
    }
    return [...best.values()].sort((a, b) => a.multipv - b.multipv);
  }
  quit() { try { this.sf.terminate?.(); } catch {} }
}
