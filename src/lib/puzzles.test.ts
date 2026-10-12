import { describe, expect, it } from 'vitest';
import { PUZZLES, pickPuzzle, validPuzzle } from './puzzles';

const baseState = (over: object = {}) =>
  ({ ratings: { opening: 800, middlegame: 800, endgame: 800, play: 800 }, mistakes: [], puzzlesSeen: {}, ...over }) as any;

describe('puzzles', () => {
  it('library is non-empty and every solution is legal', () => {
    expect(PUZZLES.length).toBeGreaterThan(50);
    for (const p of PUZZLES) expect(validPuzzle(p), p.id).toBe(true);
  });
  it('picks a puzzle near the player rating', () => {
    const p = pickPuzzle(baseState(), 0)!;
    expect(p).toBeTruthy();
    expect(Math.abs(p.rating - 850)).toBeLessThan(400);
  });
  it('mistake tasks are served when requested', () => {
    const m = { id: 'm1', fen: PUZZLES[0].fen, best: PUZZLES[0].moves[0], phase: 'middlegame', created: 0, solved: false };
    expect(pickPuzzle(baseState({ mistakes: [m] }), 0, true)!.source).toBe('mistake');
    expect(pickPuzzle(baseState(), 0, true)).toBeNull();
  });
});
