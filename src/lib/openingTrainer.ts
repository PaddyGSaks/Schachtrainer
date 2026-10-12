import { Chess } from 'chess.js';
import { OPENINGS, type Opening, type OpeningLine, lineRating } from '../data/openings';
import type { LineProgress, State } from './store';

export const lineSans = (l: OpeningLine) => l.moves.split(' ');

export const findOpening = (id: string) => OPENINGS.find((o) => o.id === id)!;
export const allLines = () => OPENINGS.flatMap((o) => o.lines.map((l) => ({ opening: o, line: l })));

/** Leitner intervals in hours for boxes 0..5 */
const INTERVALS_H = [0, 8, 24, 72, 24 * 7, 24 * 21];

export function progressOf(s: State, lineId: string): LineProgress {
  return s.lines[lineId] ?? { box: 0, due: 0, seen: 0, flawless: 0, lastMistakes: 0 };
}

export function scheduleAfter(p: LineProgress, mistakes: number): LineProgress {
  const box = mistakes === 0 ? Math.min(5, p.box + 1) : mistakes === 1 ? Math.max(0, p.box - 1) : 0;
  return {
    box,
    due: Date.now() + INTERVALS_H[box] * 3600_000,
    seen: p.seen + 1,
    flawless: p.flawless + (mistakes === 0 ? 1 : 0),
    lastMistakes: mistakes,
  };
}

/** 0..1: how well is this line known */
export const mastery = (p: LineProgress) => Math.min(1, p.box / 4);

export function openingMastery(s: State, o: Opening) {
  return o.lines.reduce((a, l) => a + mastery(progressOf(s, l.id)), 0) / o.lines.length;
}

/** Training mode derived from the line's learning box: new lines are shown, known ones are tested. */
export type TrainMode = 'learn' | 'practice' | 'test';
export const modeFor = (p: LineProgress): TrainMode => (p.box === 0 ? 'learn' : p.box < 3 ? 'practice' : 'test');

/**
 * Picks the next line adaptively: due repetitions first, otherwise the new line whose
 * difficulty best matches the player's opening rating.
 */
export function pickNextLine(s: State, openingId?: string): { opening: Opening; line: OpeningLine } {
  const pool = allLines().filter((x) => !openingId || x.opening.id === openingId);
  const rating = s.ratings.opening;
  const now = Date.now();
  const scored = pool.map((x) => {
    const p = progressOf(s, x.line.id);
    const due = p.seen > 0 && p.due <= now;
    const unseen = p.seen === 0;
    const gap = Math.abs(lineRating(x.opening, x.line) - rating);
    // lower = better. due repetitions win, then unseen lines close to the player's level
    const score = (due ? -5000 + p.box * 50 : unseen ? gap : 3000 + gap + p.box * 200 + (p.due - now) / 3600_000) + Math.random() * 40;
    return { x, score };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored[0].x;
}

export function dueCount(s: State): number {
  const now = Date.now();
  return allLines().filter((x) => {
    const p = s.lines[x.line.id];
    return p && p.seen > 0 && p.due <= now;
  }).length;
}

/** All book moves (SAN) that are acceptable in the position reached after `played` among the given lines. */
export function bookContinuations(lines: OpeningLine[], played: string[]): { san: string; lineIds: string[] }[] {
  const out = new Map<string, string[]>();
  for (const l of lines) {
    const m = lineSans(l);
    if (m.length <= played.length) continue;
    if (played.every((p, i) => p === m[i])) {
      const next = m[played.length];
      out.set(next, [...(out.get(next) ?? []), l.id]);
    }
  }
  return [...out.entries()].map(([san, lineIds]) => ({ san, lineIds }));
}

export function fenAfter(sans: string[]): string {
  const c = new Chess();
  for (const m of sans) c.move(m);
  return c.fen();
}
