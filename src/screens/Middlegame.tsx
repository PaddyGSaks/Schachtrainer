import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { DrawShape } from 'chessground/draw';
import type { Key } from 'chessground/types';
import Board from '../components/Board';
import { Header, Modal, PlayerBar, PromotionDialog, RatingDelta } from '../components/ui';
import { getAnalysisEngine, lineScore } from '../engine/stockfish';
import { colorName, isPromotion, lastMoveOf, moveFromUci, playSound, soundFor, toDests } from '../lib/chessUtil';
import { pickPuzzle, themeOf, type Puzzle } from '../lib/puzzles';
import { applyResult, getState, update, useAppState } from '../lib/store';

const SESSION_LENGTH = 8;

type Status = 'solving' | 'wrong' | 'solved' | 'revealed';

/** Is `uci` (played from `fen`) about as good as the engine's best move? */
async function isEquivalentMove(fen: string, uci: string): Promise<boolean> {
  const engine = getAnalysisEngine();
  const [best] = await engine.analyse(fen, { depth: 12 });
  const [mine] = await engine.analyse(fen, { depth: 12, searchmoves: [uci] });
  if (!best || !mine) return false;
  const b = lineScore(best);
  const m = lineScore(mine);
  return m >= b - 50 || (b >= 600 && m >= 600);
}

export function PuzzleSession({ onlyMistakes = false, go }: { onlyMistakes?: boolean; go: (r: any) => void }) {
  const [initial] = useState(() => pickPuzzle(getState(), 0, onlyMistakes));
  const back = onlyMistakes ? { name: 'profile' } : { name: 'train' };
  if (!initial)
    return (
      <div className="screen">
        <Header title="Deine Fehler" onBack={() => go(back)} />
        <p className="pad muted">Keine offenen Fehler-Aufgaben. Spiele Partien und lass sie analysieren, dann erscheinen hier deine Schwächen.</p>
      </div>
    );
  return <PuzzleRun initial={initial} onlyMistakes={onlyMistakes} go={go} />;
}

function PuzzleRun({ initial, onlyMistakes, go }: { initial: Puzzle; onlyMistakes: boolean; go: (r: any) => void }) {
  const s = useAppState();
  const chess = useRef(new Chess());
  const [counter, setCounter] = useState(0);
  const [puzzle, setPuzzle] = useState<Puzzle>(initial);
  const back = onlyMistakes ? { name: 'profile' } : { name: 'train' };
  const step = useRef(0);
  const [status, setStatus] = useState<Status>('solving');
  const [msg, setMsg] = useState('Finde den besten Zug.');
  const [hints, setHints] = useState(0);
  const [lastMove, setLastMove] = useState<[Key, Key] | undefined>();
  const [promo, setPromo] = useState<{ from: Key; to: Key } | null>(null);
  const [results, setResults] = useState<{ ok: boolean; delta: number }[]>([]);
  const [summary, setSummary] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const failedOnce = useRef(false);
  const rated = useRef(false);

  const solver = new Chess(puzzle.fen).turn();

  useEffect(() => {
    chess.current = new Chess(puzzle.fen);
    step.current = 0;
    failedOnce.current = false;
    rated.current = false;
    setStatus('solving');
    setHints(0);
    setLastMove(undefined);
    setBusy(false);
    setMsg(`${themeOf(puzzle)} – ${solver === 'w' ? 'Weiß' : 'Schwarz'} am Zug.`);
    update((st) => {
      st.puzzlesSeen[puzzle.id] = Date.now();
    });
    rerender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle]);

  const record = (ok: boolean) => {
    if (rated.current) return;
    rated.current = true;
    const score = ok ? (hints > 0 ? 0.4 : 1) : 0;
    const delta = applyResult(puzzle.source === 'mistake' ? puzzle.phase : 'middlegame', puzzle.rating, score);
    setResults((r) => [...r, { ok, delta }]);
    if (puzzle.source === 'mistake' && ok)
      update((st) => {
        const m = st.mistakes.find((x) => x.id === puzzle.id);
        if (m) m.solved = true;
      });
  };

  const sound = () => getState().settings.sound;
  const apply = (uci: string) => {
    const m = moveFromUci(chess.current, uci);
    setLastMove([m.from as Key, m.to as Key]);
    playSound(soundFor(m, chess.current), sound());
    return m;
  };

  const solved = () => {
    setStatus('solved');
    playSound('correct', sound());
    setMsg(failedOnce.current ? 'Gelöst – diesmal mit Anlauf.' : hints ? 'Gelöst (mit Hinweis).' : 'Richtig! Perfekt gelöst.');
    record(!failedOnce.current);
  };

  const onUserMove = async (from: Key, to: Key, promotion?: string) => {
    if (status !== 'solving' || busy) return;
    if (!promotion && isPromotion(chess.current, from, to)) return setPromo({ from, to });
    const uci = from + to + (promotion ?? '');
    const expected = puzzle.moves[step.current];
    const probe = new Chess(chess.current.fen());
    let isMate = false;
    try {
      probe.move({ from, to, promotion });
      isMate = probe.isCheckmate();
    } catch {
      return rerender();
    }
    let good = uci === expected || isMate;
    if (!good) {
      setBusy(true);
      setMsg('Ich prüfe deinen Zug …');
      good = await isEquivalentMove(chess.current.fen(), uci);
      setBusy(false);
    }
    if (!good) {
      playSound('wrong', sound());
      failedOnce.current = true;
      record(false);
      setStatus('wrong');
      setMsg('Das ist nicht der beste Zug.');
      return rerender();
    }
    apply(uci);
    step.current++;
    if (step.current >= puzzle.moves.length || uci !== expected || chess.current.isGameOver()) return solved();
    // opponent's forced reply, then the user continues
    setBusy(true);
    setTimeout(() => {
      apply(puzzle.moves[step.current]);
      step.current++;
      setBusy(false);
      setMsg('Gut! Weiter …');
      rerender();
    }, 450);
    rerender();
  };

  const retry = () => {
    chess.current = new Chess(puzzle.fen);
    step.current = 0;
    setLastMove(undefined);
    setStatus('solving');
    setMsg('Neuer Versuch (zählt nicht für die Wertung).');
  };

  const reveal = () => {
    chess.current = new Chess(puzzle.fen);
    setLastMove(undefined);
    step.current = 0;
    setStatus('revealed');
    setMsg('Lösung:');
    record(false);
    let i = 0;
    const tick = () => {
      if (i >= puzzle.moves.length) return;
      apply(puzzle.moves[i++]);
      rerender();
      setTimeout(tick, 800);
    };
    setTimeout(tick, 400);
  };

  const nextPuzzle = () => {
    if (results.length >= SESSION_LENGTH) return setSummary(true);
    const n = counter + 1;
    setCounter(n);
    const nxt = pickPuzzle(getState(), n, onlyMistakes);
    if (!nxt) return setSummary(true);
    setPuzzle(nxt);
  };

  // hint: first the piece, then the target square
  const shapes: DrawShape[] = [];
  if (hints > 0 && status === 'solving') {
    const mv = puzzle.moves[step.current];
    if (mv) {
      if (hints === 1) shapes.push({ orig: mv.slice(0, 2) as Key, brush: 'green' });
      else shapes.push({ orig: mv.slice(0, 2) as Key, dest: mv.slice(2, 4) as Key, brush: 'green' });
    }
  }

  const wins = results.filter((r) => r.ok).length;
  const area = puzzle.source === 'mistake' ? puzzle.phase : 'middlegame';
  const total = results.reduce((a, r) => a + r.delta, 0);
  const color = colorName(solver);
  const userTurn = status === 'solving' && !busy && chess.current.turn() === solver;

  return (
    <div className="screen game-screen">
      <Header
        title={onlyMistakes ? 'Deine Fehler' : 'Mittelspiel'}
        onBack={() => go(back)}
        right={<span className="pill">{puzzle.rating}</span>}
      />
      <div className="play-layout">
        <div className="board-col">
          <PlayerBar name={themeOf(puzzle)} kind="bot" color={solver === 'w' ? 'b' : 'w'} fen={chess.current.fen()} sub={<span className="muted small">&nbsp;Schwierigkeit {puzzle.rating}</span>} />
          <Board
            fen={chess.current.fen()}
            orientation={color}
            movable={userTurn ? color : undefined}
            dests={toDests(chess.current)}
            lastMove={lastMove ?? lastMoveOf(chess.current)}
            check={chess.current.inCheck()}
            shapes={shapes}
            onMove={(f, t) => onUserMove(f, t)}
          />
          <PlayerBar name={`Du (${s.ratings[area]})`} kind="you" color={solver} fen={chess.current.fen()} active={userTurn} />
        </div>
        <div className="side-col">
          <div className={`coach ${status === 'solved' ? 'good' : status === 'wrong' ? 'bad' : 'info'}`}>
            <div className="coach-title">
              Aufgabe {Math.min(results.length + (status === 'solving' ? 1 : 0), SESSION_LENGTH)} / {SESSION_LENGTH}
            </div>
            <div>{msg}</div>
          </div>
          <div className="dots">
            {Array.from({ length: SESSION_LENGTH }).map((_, i) => (
              <span key={i} className={`dot ${results[i] ? (results[i].ok ? 'ok' : 'bad') : i === results.length ? 'cur' : ''}`} />
            ))}
          </div>
          <div className="actions">
            {status === 'solving' && (
              <>
                <button className="btn" disabled={hints >= 2 || busy} onClick={() => setHints((h) => h + 1)}>
                  💡 Hinweis
                </button>
                <button className="btn" disabled={busy} onClick={reveal}>
                  Lösung zeigen
                </button>
              </>
            )}
            {status === 'wrong' && (
              <>
                <button className="btn primary" onClick={retry}>
                  ↺ Nochmal versuchen
                </button>
                <button className="btn" onClick={reveal}>
                  Lösung zeigen
                </button>
              </>
            )}
            {(status === 'solved' || status === 'revealed') && (
              <button className="btn primary" onClick={nextPuzzle}>
                Weiter →
              </button>
            )}
          </div>
          {results.length > 0 && (
            <div className="muted small">
              Gelöst: {wins}/{results.length} · Wertung: {s.ratings[area]} <RatingDelta delta={total} />
            </div>
          )}
        </div>
      </div>
      {promo && (
        <PromotionDialog
          color={solver}
          onCancel={() => setPromo(null)}
          onPick={(p) => {
            const pm = promo;
            setPromo(null);
            if (pm) onUserMove(pm.from, pm.to, p);
          }}
        />
      )}
      {summary && (
        <Modal>
          <h2>Session beendet</h2>
          <p>
            Gelöst: <b>{wins}</b> von {results.length}
          </p>
          <p>
            Neue Wertung: <b>{s.ratings[area]}</b> <RatingDelta delta={total} />
          </p>
          <p className="muted">{wins >= 6 ? 'Stark! Die nächste Session wird schwieriger.' : wins <= 3 ? 'Die nächsten Aufgaben werden etwas leichter.' : 'Solide Leistung.'}</p>
          <div className="actions">
            <button
              className="btn primary"
              onClick={() => {
                setResults([]);
                setSummary(false);
                const n = counter + 1;
                setCounter(n);
                const nxt = pickPuzzle(getState(), n, onlyMistakes);
                if (nxt) setPuzzle(nxt);
                else go(back);
              }}
            >
              Neue Session
            </button>
            <button className="btn" onClick={() => go(back)}>
              Beenden
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

