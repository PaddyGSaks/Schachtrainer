import { Chess } from 'chess.js';
import { getAnalysisEngine, lineScore } from '../engine/stockfish';
import { nonPawnMaterial } from './chessUtil';
import type { Area } from './rating';

export type MoveClass = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export const CLASS_LABEL: Record<MoveClass, string> = {
  best: 'Bester Zug',
  good: 'Gut',
  inaccuracy: 'Ungenauigkeit',
  mistake: 'Fehler',
  blunder: 'Patzer',
};

export interface PlyAnalysis {
  ply: number; // 1-based
  color: 'w' | 'b';
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  /** engine score after the move, White's point of view, centipawns (mate mapped to ±10000) */
  evalAfter: number;
  bestUci: string;
  bestSan: string;
  /** win-probability points lost by the mover (0..100) */
  loss: number;
  accuracy: number;
  cls: MoveClass;
  phase: Area;
}

export interface GameAnalysis {
  plies: PlyAnalysis[];
  startEval: number;
  accuracy: { w: number; b: number };
  counts: Record<'w' | 'b', Record<MoveClass, number>>;
  phaseAccuracy: Partial<Record<'w' | 'b', Partial<Record<Area, number>>>>;
}

export const winPct = (cp: number) => 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
const moveAccuracy = (loss: number) => Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669));

export const classify = (loss: number, isBest: boolean): MoveClass =>
  isBest || loss < 1.5 ? 'best' : loss < 5 ? 'good' : loss < 10 ? 'inaccuracy' : loss < 20 ? 'mistake' : 'blunder';

function phaseOf(fen: string, ply: number): Area {
  if (nonPawnMaterial(fen) <= 24) return 'endgame';
  return ply <= 20 ? 'opening' : 'middlegame';
}

export async function analyseGame(
  sans: string[],
  opts: { depth?: number; onProgress?: (done: number, total: number) => void; signal?: { cancelled: boolean } } = {},
): Promise<GameAnalysis | null> {
  const engine = getAnalysisEngine();
  const depth = opts.depth ?? 11;
  const chess = new Chess();
  const fens = [chess.fen()];
  const ucis: string[] = [];
  for (const san of sans) {
    const m = chess.move(san);
    ucis.push(m.from + m.to + (m.promotion ?? ''));
    fens.push(chess.fen());
  }

  // score (side-to-move POV) and best move for every position
  const scores: number[] = [];
  const bests: string[] = [];
  for (let i = 0; i < fens.length; i++) {
    if (opts.signal?.cancelled) return null;
    const probe = new Chess(fens[i]);
    if (probe.isGameOver()) {
      scores.push(probe.isCheckmate() ? -10000 : 0);
      bests.push('');
    } else {
      const [l] = await engine.analyse(fens[i], { depth });
      scores.push(lineScore(l));
      bests.push(l.pv[0]);
    }
    opts.onProgress?.(i + 1, fens.length);
  }

  const whitePov = scores.map((s, i) => (fens[i].split(' ')[1] === 'w' ? s : -s));
  const plies: PlyAnalysis[] = [];
  for (let i = 0; i < sans.length; i++) {
    const color = fens[i].split(' ')[1] as 'w' | 'b';
    const before = scores[i]; // mover POV
    const after = -scores[i + 1]; // mover POV
    const loss = Math.max(0, winPct(before) - winPct(after));
    const isBest = bests[i] === ucis[i];
    let bestSan = '';
    if (bests[i]) {
      try {
        bestSan = new Chess(fens[i]).move({ from: bests[i].slice(0, 2), to: bests[i].slice(2, 4), promotion: bests[i][4] }).san;
      } catch {
        /* ignore */
      }
    }
    plies.push({
      ply: i + 1,
      color,
      san: sans[i],
      uci: ucis[i],
      fenBefore: fens[i],
      fenAfter: fens[i + 1],
      evalAfter: whitePov[i + 1],
      bestUci: bests[i],
      bestSan,
      loss,
      accuracy: moveAccuracy(loss),
      cls: classify(loss, isBest),
      phase: phaseOf(fens[i], i + 1),
    });
  }

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const counts = { w: {} as Record<MoveClass, number>, b: {} as Record<MoveClass, number> };
  for (const c of ['w', 'b'] as const) for (const k of Object.keys(CLASS_LABEL) as MoveClass[]) counts[c][k] = 0;
  const phaseAccuracy: GameAnalysis['phaseAccuracy'] = { w: {}, b: {} };
  for (const c of ['w', 'b'] as const) {
    for (const ph of ['opening', 'middlegame', 'endgame'] as Area[]) {
      const xs = plies.filter((p) => p.color === c && p.phase === ph).map((p) => p.accuracy);
      if (xs.length >= 3) phaseAccuracy[c]![ph] = avg(xs);
    }
  }
  for (const p of plies) counts[p.color][p.cls]++;
  return {
    plies,
    startEval: whitePov[0],
    accuracy: {
      w: avg(plies.filter((p) => p.color === 'w').map((p) => p.accuracy)),
      b: avg(plies.filter((p) => p.color === 'b').map((p) => p.accuracy)),
    },
    counts,
    phaseAccuracy,
  };
}

/** Skill-profile nudge: phases with high accuracy raise that area's rating, low accuracy lowers it. */
export const phaseNudge = (acc: number) => Math.round(Math.max(-14, Math.min(12, (acc - 72) * 0.5)));
