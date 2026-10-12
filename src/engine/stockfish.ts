// Promise-based UCI wrapper around the Stockfish.js web worker (lite, single-threaded).

export interface EngineLine {
  multipv: number;
  depth: number;
  /** centipawns from the side-to-move's point of view */
  cp?: number;
  /** mate distance from the side-to-move's point of view (negative = being mated) */
  mate?: number;
  pv: string[];
}

/** Normalised score (cp) used for comparisons; mates are mapped to large values. */
export const lineScore = (l: Pick<EngineLine, 'cp' | 'mate'>): number =>
  l.mate !== undefined ? Math.sign(l.mate) * (10000 - Math.min(99, Math.abs(l.mate)) * 10) : (l.cp ?? 0);

type Job = { run: () => Promise<void> };

export class Engine {
  private worker: Worker;
  private listeners = new Set<(line: string) => void>();
  private queue: Job[] = [];
  private busy = false;
  private readyPromise: Promise<void>;
  private lastElo: number | null | undefined;
  private lastMultiPV = 1;

  constructor() {
    this.worker = new Worker(`${import.meta.env.BASE_URL}engine/stockfish-19-lite-single.js`);
    this.worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === 'string' ? e.data : String(e.data);
      this.listeners.forEach((l) => l(line));
    };
    this.readyPromise = this.init();
  }

  private send(cmd: string) {
    this.worker.postMessage(cmd);
  }

  private waitFor(re: RegExp, collect?: (line: string) => void): Promise<string> {
    return new Promise((resolve) => {
      const l = (line: string) => {
        collect?.(line);
        if (re.test(line)) {
          this.listeners.delete(l);
          resolve(line);
        }
      };
      this.listeners.add(l);
    });
  }

  private async init() {
    const ok = this.waitFor(/^uciok/);
    this.send('uci');
    await ok;
    this.send('setoption name Hash value 32');
    const r = this.waitFor(/^readyok/);
    this.send('isready');
    await r;
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        run: async () => {
          try {
            await this.readyPromise;
            resolve(await fn());
          } catch (e) {
            reject(e);
          }
        },
      });
      this.pump();
    });
  }

  private async pump() {
    if (this.busy) return;
    this.busy = true;
    while (this.queue.length) await this.queue.shift()!.run();
    this.busy = false;
  }

  /** Sets full strength (null) or a limited Elo (>= 1320 uses UCI_Elo). */
  private setStrength(elo: number | null) {
    if (this.lastElo === elo) return;
    this.lastElo = elo;
    if (elo === null) {
      this.send('setoption name UCI_LimitStrength value false');
    } else {
      this.send('setoption name UCI_LimitStrength value true');
      this.send(`setoption name UCI_Elo value ${Math.max(1320, Math.min(3190, Math.round(elo)))}`);
    }
  }

  private setMultiPV(n: number) {
    if (this.lastMultiPV === n) return;
    this.lastMultiPV = n;
    this.send(`setoption name MultiPV value ${n}`);
  }

  /** Raw analysis. Returns the best line per MultiPV slot, from the side to move's point of view. */
  analyse(
    fen: string,
    opts: { depth?: number; movetime?: number; multipv?: number; elo?: number | null; searchmoves?: string[] } = {},
  ): Promise<EngineLine[]> {
    return this.enqueue(async () => {
      this.setStrength(opts.elo ?? null);
      this.setMultiPV(opts.multipv ?? 1);
      const best = new Map<number, EngineLine>();
      const done = this.waitFor(/^bestmove/, (line) => {
        const m = line.match(/ depth (\d+).*? multipv (\d+) score (cp|mate) (-?\d+).*? pv (.*)$/);
        if (!m) return;
        const idx = +m[2];
        const prev = best.get(idx);
        if (prev && prev.depth > +m[1]) return;
        best.set(idx, { multipv: idx, depth: +m[1], [m[3]]: +m[4], pv: m[5].trim().split(' ') });
      });
      this.send('ucinewgame');
      this.send(`position fen ${fen}`);
      const go = opts.movetime ? `movetime ${opts.movetime}` : `depth ${opts.depth ?? 12}`;
      this.send(`go ${go}${opts.searchmoves ? ` searchmoves ${opts.searchmoves.join(' ')}` : ''}`);
      const final = await done;
      const lines = [...best.values()].sort((a, b) => a.multipv - b.multipv);
      if (!lines.length) {
        const mv = final.split(' ')[1];
        if (mv && mv !== '(none)') lines.push({ multipv: 1, depth: 0, cp: 0, pv: [mv] });
      }
      return lines;
    });
  }

  /** Interrupts a running search; the pending promise resolves with what was found so far. */
  stop() {
    this.send('stop');
  }

  terminate() {
    this.worker.terminate();
  }
}

let analysisEngine: Engine | null = null;
let playEngine: Engine | null = null;

/** Full-strength engine used for evaluations, hints and puzzle checks. */
export const getAnalysisEngine = () => (analysisEngine ??= new Engine());
/** Separate engine instance so the opponent's thinking never blocks analysis (and vice versa). */
export const getPlayEngine = () => (playEngine ??= new Engine());
