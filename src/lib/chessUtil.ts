import { Chess, type Move, type Square } from 'chess.js';
import type { Key } from 'chessground/types';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const toDests = (chess: Chess): Map<Key, Key[]> => {
  const dests = new Map<Key, Key[]>();
  for (const m of chess.moves({ verbose: true })) {
    const list = dests.get(m.from as Key) ?? [];
    if (!list.includes(m.to as Key)) list.push(m.to as Key);
    dests.set(m.from as Key, list);
  }
  return dests;
};

export const isPromotion = (chess: Chess, from: string, to: string) =>
  chess.moves({ verbose: true }).some((m) => m.from === from && m.to === to && m.promotion);

export const colorName = (c: 'w' | 'b') => (c === 'w' ? 'white' : 'black');

export const moveFromUci = (chess: Chess, uci: string): Move =>
  chess.move({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: uci[4] });

export const uciOf = (m: Move) => m.from + m.to + (m.promotion ?? '');

export const lastMoveOf = (chess: Chess): [Key, Key] | undefined => {
  const h = chess.history({ verbose: true });
  const m = h[h.length - 1];
  return m ? [m.from as Key, m.to as Key] : undefined;
};

export const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Non-pawn material of both sides – used to guess the game phase. */
export function nonPawnMaterial(fen: string): number {
  let sum = 0;
  for (const ch of fen.split(' ')[0].toLowerCase()) sum += ch !== 'p' && PIECE_VALUE[ch] ? PIECE_VALUE[ch] : 0;
  return sum;
}

/** Captured pieces (and material difference) from a FEN, relative to the starting set. */
export function capturedFromFen(fen: string) {
  const start: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  const have: Record<string, number> = {};
  for (const ch of fen.split(' ')[0]) if (/[pnbrqPNBRQ]/.test(ch)) have[ch] = (have[ch] ?? 0) + 1;
  const lostBy = (white: boolean) => {
    const out: string[] = [];
    for (const t of ['q', 'r', 'b', 'n', 'p']) {
      const key = white ? t.toUpperCase() : t;
      for (let i = 0; i < start[t] - (have[key] ?? 0); i++) out.push(t);
    }
    return out;
  };
  const material = (white: boolean) =>
    Object.entries(have).reduce((a, [k, n]) => a + ((k === k.toUpperCase()) === white ? PIECE_VALUE[k.toLowerCase()] * n : 0), 0);
  return { whiteLost: lostBy(true), blackLost: lostBy(false), diff: material(true) - material(false) };
}

export function resultOf(chess: Chess): { over: boolean; winner?: 'w' | 'b'; reason?: string } {
  if (chess.isCheckmate()) return { over: true, winner: chess.turn() === 'w' ? 'b' : 'w', reason: 'Schachmatt' };
  if (chess.isStalemate()) return { over: true, reason: 'Patt' };
  if (chess.isInsufficientMaterial()) return { over: true, reason: 'Unzureichendes Material' };
  if (chess.isThreefoldRepetition()) return { over: true, reason: 'Dreifache Stellungswiederholung' };
  if (chess.isDrawByFiftyMoves()) return { over: true, reason: '50-Züge-Regel' };
  return { over: false };
}

/** Pawn/knight/etc. glyph name used by the cburnett piece CSS */
export const ROLE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

// ---- tiny synthesized sounds, no assets required ----
let ctx: AudioContext | null = null;
export function playSound(kind: 'move' | 'capture' | 'check' | 'end' | 'wrong' | 'correct', enabled = true) {
  if (!enabled) return;
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime;
    const tone = (freq: number, dur: number, type: OscillatorType = 'triangle', gain = 0.15, delay = 0) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t + delay);
      g.gain.setValueAtTime(gain, t + delay);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);
      o.connect(g).connect(ctx!.destination);
      o.start(t + delay);
      o.stop(t + delay + dur);
    };
    if (kind === 'move') tone(220, 0.07);
    else if (kind === 'capture') (tone(140, 0.12, 'square', 0.12), tone(90, 0.1, 'triangle', 0.18));
    else if (kind === 'check') (tone(520, 0.1), tone(390, 0.12, 'triangle', 0.15, 0.08));
    else if (kind === 'end') (tone(392, 0.2), tone(294, 0.3, 'triangle', 0.15, 0.18));
    else if (kind === 'wrong') tone(120, 0.25, 'sawtooth', 0.1);
    else tone(660, 0.12, 'sine', 0.12), tone(880, 0.16, 'sine', 0.12, 0.1);
  } catch {
    /* audio not available */
  }
}

export const soundFor = (m: Move, chess: Chess): 'move' | 'capture' | 'check' =>
  chess.inCheck() ? 'check' : m.captured ? 'capture' : 'move';
