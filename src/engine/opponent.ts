import { Chess } from 'chess.js';
import { getPlayEngine, lineScore } from './stockfish';

/** Plays the opponent's move for a given target Elo. Below ~1350 Elo the move is picked
 *  from several candidates with a softmax so the engine plays plausible, human-like mistakes. */
export async function chooseMove(fen: string, elo: number): Promise<string> {
  const engine = getPlayEngine();
  if (elo >= 1350) {
    const think = Math.round(250 + Math.min(1, (elo - 1350) / 1500) * 900);
    const [best] = await engine.analyse(fen, { movetime: think, elo });
    return best.pv[0];
  }
  const depth = elo < 700 ? 1 : elo < 1000 ? 2 : elo < 1200 ? 3 : 4;
  const lines = await engine.analyse(fen, { depth, multipv: 6, elo: null });
  if (lines.length === 1) return lines[0].pv[0];
  // temperature (in centipawns): high for beginners, low for stronger opponents
  const temp = Math.max(40, 330 - (elo - 400) * 0.3);
  const top = lineScore(lines[0]);
  const weights = lines.map((l) => Math.exp((lineScore(l) - top) / temp));
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < lines.length; i++) {
    r -= weights[i];
    if (r <= 0) return lines[i].pv[0];
  }
  return lines[0].pv[0];
}

/** Would the engine accept a draw offer? `fen` is the position with the *offering human* to move.
 *  Only accepted when the engine is not better and the game is already long. */
export async function acceptsDraw(fen: string, ply: number): Promise<boolean> {
  if (ply < 30) return false;
  const [l] = await getPlayEngine().analyse(fen, { depth: 10 });
  return -lineScore(l) <= 30;
}

export const uciToMove = (chess: Chess, uci: string) =>
  chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
