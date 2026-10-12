import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { DrawShape } from 'chessground/draw';
import type { Key } from 'chessground/types';
import Board from '../components/Board';
import { Header, Modal, PlayerBar, PromotionDialog, RatingDelta } from '../components/ui';
import { ENDGAMES, type EndgameLesson } from '../data/endgames';
import { chooseMove } from '../engine/opponent';
import { getAnalysisEngine, lineScore } from '../engine/stockfish';
import { colorName, isPromotion, lastMoveOf, moveFromUci, playSound, resultOf, soundFor, toDests } from '../lib/chessUtil';
import { applyResult, getState, update, useAppState } from '../lib/store';

export function recommendedEndgame(rating: number, done: Record<string, { wins: number }>): EndgameLesson {
  const pool = ENDGAMES.filter((e) => (done[e.id]?.wins ?? 0) < 2);
  const list = pool.length ? pool : ENDGAMES;
  return [...list].sort((a, b) => Math.abs(a.level - (rating + 80)) - Math.abs(b.level - (rating + 80)))[0];
}

export function EndgamesMenu({ go }: { go: (r: any) => void }) {
  const s = useAppState();
  const rec = recommendedEndgame(s.ratings.endgame, s.endgamesDone);
  return (
    <div className="screen">
      <Header title="Endspiele" onBack={() => go({ name: 'train' })} />
      <div className="card hero">
        <div>
          <div className="muted small">Deine Endspielwertung</div>
          <div className="big">{s.ratings.endgame}</div>
        </div>
        <button className="btn primary" onClick={() => go({ name: 'endgame-session', id: rec.id })}>
          ▶ Empfohlen: {rec.title}
        </button>
      </div>
      <p className="muted pad">Spiele die Standardstellungen gegen eine starke Engine, bis du sie sicher beherrschst.</p>
      <div className="list">
        {[...ENDGAMES]
          .sort((a, b) => a.level - b.level)
          .map((e) => {
            const d = s.endgamesDone[e.id];
            return (
              <button key={e.id} className="row" onClick={() => go({ name: 'endgame-session', id: e.id })}>
                <div className={`badge ${e.goal}`}>{e.goal === 'win' ? 'Sieg' : 'Remis'}</div>
                <div className="row-main">
                  <div className="row-title">{e.title}</div>
                  <div className="muted small">
                    Stufe {e.level} · {d ? `${d.wins}× geschafft, ${d.done} Versuche` : 'Noch nicht gespielt'}
                  </div>
                </div>
                <span className="chev">›</span>
              </button>
            );
          })}
      </div>
    </div>
  );
}

export function EndgameSession({ id, go }: { id: string; go: (r: any) => void }) {
  const lesson = ENDGAMES.find((e) => e.id === id)!;
  const s = useAppState();
  const chess = useRef(new Chess(lesson.fen));
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const [moves, setMoves] = useState(0); // player moves made
  const [lastMove, setLastMove] = useState<[Key, Key] | undefined>();
  const [hint, setHint] = useState<DrawShape[]>([]);
  const hints = useRef(0);
  const [thinking, setThinking] = useState(false);
  const [promo, setPromo] = useState<{ from: Key; to: Key } | null>(null);
  const [result, setResult] = useState<{ ok: boolean; reason: string; delta: number } | null>(null);
  const [run, setRun] = useState(0);
  const [msg, setMsg] = useState('');

  const me = lesson.side;
  const sound = () => getState().settings.sound;

  const finish = (ok: boolean, reason: string) => {
    const score = ok ? (hints.current > 0 ? 0.6 : 1) : 0;
    const delta = applyResult('endgame', lesson.level, score);
    update((st) => {
      const d = st.endgamesDone[lesson.id] ?? { best: 0, done: 0, wins: 0 };
      d.done++;
      if (ok) d.wins++;
      st.endgamesDone[lesson.id] = d;
    });
    playSound(ok ? 'correct' : 'end', sound());
    setResult({ ok, reason, delta });
  };

  useEffect(() => {
    chess.current = new Chess(lesson.fen);
    hints.current = 0;
    setMoves(0);
    setLastMove(undefined);
    setHint([]);
    setResult(null);
    setThinking(false);
    setMsg(lesson.goal === 'win' ? `Ziel: Setze in höchstens ${lesson.maxMoves} Zügen matt.` : `Ziel: Halte Remis (${lesson.maxMoves} Züge überstehen).`);
    if (chess.current.turn() !== me) void engineMove(0);
    rerender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, id]);

  const checkEnd = (played: number): boolean => {
    const r = resultOf(chess.current);
    if (r.over) {
      if (lesson.goal === 'win') finish(r.winner === me, r.winner === me ? 'Schachmatt – Ziel erreicht!' : `${r.reason ?? 'Remis'} – das Ziel war ein Sieg.`);
      else finish(r.winner !== (me === 'w' ? 'b' : 'w'), r.winner === me ? 'Du hast sogar gewonnen!' : r.winner ? 'Du wurdest mattgesetzt.' : `${r.reason} – Remis gehalten!`);
      return true;
    }
    if (played >= lesson.maxMoves) {
      if (lesson.goal === 'draw') finish(true, `${lesson.maxMoves} Züge überstanden – Remis gesichert!`);
      else finish(false, 'Zu langsam – das Matt gelang nicht rechtzeitig.');
      return true;
    }
    return false;
  };

  async function engineMove(played: number) {
    setThinking(true);
    await new Promise((r) => setTimeout(r, 250));
    const uci = await chooseMove(chess.current.fen(), 3000);
    const m = moveFromUci(chess.current, uci);
    setLastMove([m.from as Key, m.to as Key]);
    playSound(soundFor(m, chess.current), sound());
    setThinking(false);
    checkEnd(played);
    rerender();
  }

  const onUserMove = async (from: Key, to: Key, promotion?: string) => {
    if (result || thinking || chess.current.turn() !== me) return;
    if (!promotion && isPromotion(chess.current, from, to)) return setPromo({ from, to });
    let m;
    try {
      m = chess.current.move({ from, to, promotion });
    } catch {
      return rerender();
    }
    setLastMove([from, to]);
    setHint([]);
    playSound(soundFor(m, chess.current), sound());
    const played = moves + 1;
    setMoves(played);
    rerender();
    if (checkEnd(played)) return;
    // draw lessons: detect a lost position early
    if (lesson.goal === 'draw') {
      const [l] = await getAnalysisEngine().analyse(chess.current.fen(), { depth: 10 });
      // the score is from the engine's point of view (it is to move) – the user is losing badly
      if (lineScore(l) >= 500) {
        return finish(false, 'Die Stellung ist verloren – das Remis ist nicht mehr zu halten.');
      }
    }
    await engineMove(played);
  };

  const showHint = async () => {
    if (result || thinking) return;
    hints.current++;
    const [l] = await getAnalysisEngine().analyse(chess.current.fen(), { depth: 14 });
    if (l?.pv[0]) setHint([{ orig: l.pv[0].slice(0, 2) as Key, dest: l.pv[0].slice(2, 4) as Key, brush: 'green' }]);
    setMsg('Hinweis: Dieser Zug ist am stärksten. (Wertung ×0.6)');
  };

  const color = colorName(me);
  const userTurn = !result && !thinking && chess.current.turn() === me;
  const stats = s.endgamesDone[lesson.id];

  return (
    <div className="screen game-screen">
      <Header title={lesson.title} onBack={() => go({ name: 'endgames' })} right={<span className="pill">{lesson.level}</span>} />
      <div className="play-layout">
        <div className="board-col">
          <PlayerBar name="Engine" kind="bot" color={me === 'w' ? 'b' : 'w'} fen={chess.current.fen()} sub={thinking ? <span className="muted small">&nbsp;denkt …</span> : undefined} />
          <Board
            fen={chess.current.fen()}
            orientation={color}
            movable={userTurn ? color : undefined}
            dests={toDests(chess.current)}
            lastMove={lastMove ?? lastMoveOf(chess.current)}
            check={chess.current.inCheck()}
            shapes={hint}
            onMove={(f, t) => onUserMove(f, t)}
          />
          <PlayerBar name="Du" kind="you" color={me} fen={chess.current.fen()} active={userTurn} />
        </div>
        <div className="side-col">
          <div className="coach info">
            <div className="coach-title">{lesson.goal === 'win' ? 'Gewinne die Stellung' : 'Halte das Remis'}</div>
            <div>{msg}</div>
          </div>
          <div className="card">
            <div className="progress-line">
              <span>
                Zug {moves} / {lesson.maxMoves}
              </span>
              <span className="muted small">{stats ? `${stats.wins}× geschafft` : 'Erster Versuch'}</span>
            </div>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${(moves / lesson.maxMoves) * 100}%` }} />
            </div>
          </div>
          <div className="card">
            <div className="muted small">Merksätze</div>
            <ul className="tips">
              {lesson.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="actions">
            <button className="btn" disabled={!userTurn || !s.settings.hints} onClick={showHint}>
              💡 Hinweis
            </button>
            <button className="btn" onClick={() => setRun((r) => r + 1)}>
              ↺ Neustart
            </button>
          </div>
        </div>
      </div>
      {promo && (
        <PromotionDialog
          color={me}
          onCancel={() => setPromo(null)}
          onPick={(p) => {
            const pm = promo;
            setPromo(null);
            onUserMove(pm.from, pm.to, p);
          }}
        />
      )}
      {result && (
        <Modal>
          <h2>{result.ok ? 'Geschafft! 🎉' : 'Nicht gelungen'}</h2>
          <p>{result.reason}</p>
          <p>
            Endspielwertung: <b>{s.ratings.endgame}</b> <RatingDelta delta={result.delta} />
          </p>
          <div className="actions">
            <button className="btn primary" onClick={() => setRun((r) => r + 1)}>
              {result.ok ? 'Nochmal' : 'Erneut versuchen'}
            </button>
            <button
              className="btn"
              onClick={() => {
                const next = recommendedEndgame(getState().ratings.endgame, getState().endgamesDone);
                go({ name: 'endgame-session', id: next.id });
                if (next.id === id) setRun((r) => r + 1);
              }}
            >
              Nächste Aufgabe
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
