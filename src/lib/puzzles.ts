import raw from '../data/puzzles.json';
import { Chess } from 'chess.js';
import type { Area } from './rating';
import type { State } from './store';

export interface Puzzle {
  id: string;
  fen: string;
  moves: string[]; // uci, solver first
  rating: number;
  mateIn: number;
  eval: number;
  source: 'library' | 'mistake';
  phase: Area;
}

type Tuple = [string, string, number, number, number];

export const PUZZLES: Puzzle[] = (raw as Tuple[]).map(([fen, moves, rating, mateIn, ev], i) => ({
  id: `p${i}-${fen.length}${fen.charCodeAt(5)}`,
  fen,
  moves: moves.split(' '),
  rating,
  mateIn,
  eval: ev,
  source: 'library',
  phase: 'middlegame',
}));

export function themeOf(p: Puzzle): string {
  if (p.source === 'mistake') return 'Dein Fehler aus einer Partie';
  if (p.mateIn) return p.mateIn === 1 ? 'Matt in 1' : `Matt in ${p.mateIn}`;
  return p.moves.length > 1 ? 'Materialgewinn' : 'Gewinne Material';
}

/**
 * Chooses the next puzzle: slightly harder than the current rating, avoiding recent repeats.
 * Every third puzzle comes from the player's own game mistakes if there are any.
 */
export function pickPuzzle(s: State, counter: number, onlyMistakes = false): Puzzle | null {
  const open = s.mistakes.filter((m) => !m.solved);
  if (open.length && (onlyMistakes || counter % 3 === 2)) {
    const m = open[Math.floor(Math.random() * open.length)];
    return { id: m.id, fen: m.fen, moves: [m.best], rating: s.ratings[m.phase], mateIn: 0, eval: 0, source: 'mistake', phase: m.phase };
  }
  if (onlyMistakes) return null;
  const target = s.ratings.middlegame + 40 + (Math.random() - 0.3) * 160;
  const now = Date.now();
  let best: Puzzle | null = null;
  let bestScore = Infinity;
  for (const p of PUZZLES) {
    const seen = s.puzzlesSeen[p.id];
    const recent = seen && now - seen < 6 * 3600_000 ? 400 : 0;
    const score = Math.abs(p.rating - target) + recent + Math.random() * 25;
    if (score < bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

export function validPuzzle(p: Puzzle): boolean {
  try {
    const c = new Chess(p.fen);
    for (const m of p.moves) c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
    return true;
  } catch {
    return false;
  }
}
