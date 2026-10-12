import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { OPENINGS } from '../data/openings';
import { bookContinuations } from './openingTrainer';

describe('opening data', () => {
  for (const o of OPENINGS) {
    for (const l of o.lines) {
      it(`${l.id} is legal and starts on the right side`, () => {
        const c = new Chess();
        for (const m of l.moves.split(' ')) expect(() => c.move(m), `${l.id}: ${m}`).not.toThrow();
        expect(l.moves.split(' ').length).toBeGreaterThanOrEqual(10);
      });
    }
  }
  it('merges shared prefixes', () => {
    const najdorf = OPENINGS.find((o) => o.id === 'najdorf')!;
    const next = bookContinuations(najdorf.lines, 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6'.split(' '));
    expect(next.map((n) => n.san).sort()).toEqual(['Be3', 'Bg5']);
  });
});
