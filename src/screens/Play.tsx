import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { DrawShape } from 'chessground/draw';
import type { Key } from 'chessground/types';
import Board from '../components/Board';
import { EvalBar, Header, Modal, PlayerBar, PromotionDialog, RatingDelta } from '../components/ui';
import { acceptsDraw, chooseMove } from '../engine/opponent';
import { getAnalysisEngine, getPlayEngine } from '../engine/stockfish';
import { colorName, isPromotion, lastMoveOf, moveFromUci, playSound, resultOf, soundFor, toDests } from '../lib/chessUtil';
import { expectedScore, levelName } from '../lib/rating';
import { applyResult, getState, update, useAppState, type GameRecord } from '../lib/store';

export function botElo(playRating: number, offset: number) {
  return Math.max(400, Math.min(2800, Math.round((playRating + offset) / 25) * 25));
}

const OFFSETS = [
  { v: -150, label: 'Leichter', hint: '−150' },
  { v: 0, label: 'Passend', hint: 'auf Augenhöhe' },
  { v: 150, label: 'Fordernd', hint: '+150' },
];

export function PlaySetup({ go }: { go: (r: any) => void }) {
  const s = useAppState();
  const [color, setColor] = useState<'w' | 'b' | 'r'>('r');
  const [offset, setOffset] = useState(s.settings.playOffset);
  const elo = botElo(s.ratings.play, offset);
  const last = s.games.slice(0, 5);
  const wins = last.filter((g) => g.result === 'win').length;
  return (
    <div className="screen">
      <Header title="Gegen den Computer" />
      <div className="card hero col">
        <div className="muted small">Der Computer passt sich an dich an</div>
        <div className="big">{elo}</div>
        <div className="muted">
          Gegner-Stärke ({levelName(elo)}) · deine Partie-Wertung {s.ratings.play}
        </div>
        <div className="muted small">
          Erwartete Gewinnchance: {Math.round(expectedScore(s.ratings.play, elo) * 100)}%
          {last.length > 0 && ` · letzte ${last.length}: ${wins} Siege`}
        </div>
      </div>
      <div className="section-title">Schwierigkeit</div>
      <div className="seg">
        {OFFSETS.map((o) => (
          <button key={o.v} className={offset === o.v ? 'on' : ''} onClick={() => setOffset(o.v)}>
            <b>{o.label}</b>
            <span className="muted small">{o.hint}</span>
          </button>
        ))}
      </div>
      <div className="section-title">Farbe</div>
      <div className="seg">
        {[
          { v: 'w', l: '♔ Weiß' },
          { v: 'r', l: '🎲 Zufall' },
          { v: 'b', l: '♚ Schwarz' },
        ].map((o) => (
          <button key={o.v} className={color === o.v ? 'on' : ''} onClick={() => setColor(o.v as 'w' | 'b' | 'r')}>
            <b>{o.l}</b>
          </button>
        ))}
      </div>
      <div className="pad">
        <button
          className="btn primary big-btn"
          onClick={() => {
            update((st) => {
              st.settings.playOffset = offset;
            });
            go({ name: 'play-game', color: color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : color, elo, token: Date.now() });
          }}
        >
          ▶ Partie starten
        </button>
      </div>
      {s.games.length > 0 && (
        <>
          <div className="section-title">Letzte Partien</div>
          <div className="list">
            {s.games.slice(0, 5).map((g) => (
              <button key={g.id} className="row" onClick={() => go({ name: 'review', id: g.id })}>
                <div className={`badge ${g.result}`}>{g.result === 'win' ? 'Sieg' : g.result === 'loss' ? 'Niederlage' : 'Remis'}</div>
                <div className="row-main">
                  <div className="row-title">
                    {g.color === 'w' ? '♔' : '♚'} vs Computer {g.opponentElo}
                  </div>
                  <div className="muted small">
                    {new Date(g.date).toLocaleDateString('de-DE')} · {g.reason}
                    {g.accuracy ? ` · Genauigkeit ${Math.round(g.accuracy)}%` : ''}
                  </div>
                </div>
                <span className="chev">›</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function PlayGame({ color, elo, go }: { color: 'w' | 'b'; elo: number; go: (r: any) => void }) {
  const s = useAppState();
  const chess = useRef(new Chess());
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const [lastMove, setLastMove] = useState<[Key, Key] | undefined>();
  const [thinking, setThinking] = useState(false);
  const [promo, setPromo] = useState<{ from: Key; to: Key } | null>(null);
  const [hint, setHint] = useState<DrawShape[]>([]);
  const [hints, setHints] = useState(0);
  const [takebacks, setTakebacks] = useState(0);
  const [ev, setEv] = useState<{ cp: number | null; mate: number | null }>({ cp: 0, mate: null });
  const [showEval, setShowEval] = useState(s.settings.evalBar);
  const [over, setOver] = useState<{ record: GameRecord; delta: number } | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const [note, setNote] = useState('');
  const token = useRef(0); // invalidates pending engine moves after undo/resign
  const finished = useRef(false);
  const assisted = useRef(false);

  const me = color;
  const sound = () => getState().settings.sound;
  const fen = chess.current.fen();
  const myTurn = !over && !thinking && chess.current.turn() === me;

  const finishGame = (result: 'win' | 'loss' | 'draw', reason: string) => {
    if (finished.current) return;
    finished.current = true;
    token.current++;
    setThinking(false);
    setHint([]);
    let score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
    const base = getState().ratings.play;
    // assisted games count only half
    if (assisted.current) score = expectedScore(base, elo) + (score - expectedScore(base, elo)) * 0.5;
    const plies = chess.current.history().length;
    const rated = plies >= 4 || result !== 'loss';
    const delta = rated ? applyResult('play', elo, score) : 0;
    const record: GameRecord = {
      id: String(Date.now()),
      date: Date.now(),
      color: me,
      opponentElo: elo,
      result,
      reason,
      pgn: chess.current.pgn(),
    };
    update((st) => {
      st.games.unshift(record);
      st.games = st.games.slice(0, 50);
    });
    playSound('end', sound());
    setOver({ record, delta });
  };

  const checkOver = (): boolean => {
    const r = resultOf(chess.current);
    if (!r.over) return false;
    finishGame(r.winner ? (r.winner === me ? 'win' : 'loss') : 'draw', r.reason!);
    return true;
  };

  const updateEval = async () => {
    if (!getState().settings.evalBar) return;
    const f = chess.current.fen();
    const [l] = await getAnalysisEngine().analyse(f, { depth: 10 });
    if (!l) return;
    const sign = f.split(' ')[1] === 'w' ? 1 : -1;
    if (chess.current.fen() !== f) return;
    setEv({ cp: l.mate !== undefined ? null : sign * (l.cp ?? 0), mate: l.mate !== undefined ? sign * l.mate : null });
  };

  const botMove = async () => {
    if (finished.current || chess.current.turn() === me) return;
    const t = ++token.current;
    setThinking(true);
    const started = Date.now();
    const uci = await chooseMove(chess.current.fen(), elo);
    const wait = Math.max(0, 500 - (Date.now() - started));
    if (wait) await new Promise((r) => setTimeout(r, wait));
    if (t !== token.current || finished.current) return;
    const m = moveFromUci(chess.current, uci);
    setLastMove([m.from as Key, m.to as Key]);
    playSound(soundFor(m, chess.current), sound());
    setThinking(false);
    rerender();
    if (!checkOver()) void updateEval();
  };

  useEffect(() => {
    // warm up both engines and let the bot open if the player has Black
    void getPlayEngine();
    void getAnalysisEngine();
    if (me === 'b') void botMove();
    return () => {
      token.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onUserMove = (from: Key, to: Key, promotion?: string) => {
    if (!myTurn) return;
    if (!promotion && isPromotion(chess.current, from, to)) return setPromo({ from, to });
    let m;
    try {
      m = chess.current.move({ from, to, promotion });
    } catch {
      return rerender();
    }
    setLastMove([m.from as Key, m.to as Key]);
    setHint([]);
    setNote('');
    playSound(soundFor(m, chess.current), sound());
    rerender();
    if (checkOver()) return;
    void updateEval();
    void botMove();
  };

  const showHint = async () => {
    if (!myTurn) return;
    assisted.current = true;
    setHints((h) => h + 1);
    const [l] = await getAnalysisEngine().analyse(chess.current.fen(), { depth: 14 });
    if (l?.pv[0] && chess.current.turn() === me) setHint([{ orig: l.pv[0].slice(0, 2) as Key, dest: l.pv[0].slice(2, 4) as Key, brush: 'green' }]);
  };

  const takeBack = () => {
    if (over || chess.current.history().length < (me === 'w' ? 1 : 2)) return;
    token.current++;
    setThinking(false);
    assisted.current = true;
    setTakebacks((n) => n + 1);
    // undo the bot's reply (if any) and the player's last move
    if (chess.current.turn() === me) {
      chess.current.undo();
      if (chess.current.turn() !== me) chess.current.undo();
    } else {
      chess.current.undo();
    }
    setHint([]);
    setLastMove(lastMoveOf(chess.current));
    rerender();
    void updateEval();
    if (chess.current.turn() !== me) void botMove();
  };

  const offerDraw = async () => {
    if (!myTurn) return;
    setNote('Remisangebot gesendet …');
    const ok = await acceptsDraw(chess.current.fen(), chess.current.history().length);
    if (ok) finishGame('draw', 'Remis vereinbart');
    else setNote('Der Computer lehnt das Remis ab.');
  };

  const history = chess.current.history();
  const rows = useMemo(() => {
    const r: [string, string | undefined][] = [];
    for (let i = 0; i < history.length; i += 2) r.push([history[i], history[i + 1]]);
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.length]);
  const movesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    movesRef.current?.scrollTo({ top: movesRef.current.scrollHeight });
  }, [history.length]);

  const orientation = colorName(me);
  const botColor = me === 'w' ? 'b' : 'w';

  return (
    <div className="screen game-screen">
      <Header
        title="Partie"
        onBack={() => (history.length > 1 && !over ? setConfirmResign(true) : go({ name: 'play' }))}
        right={
          <button
            className="icon-btn small"
            title="Bewertungsbalken"
            onClick={() => {
              const v = !showEval;
              setShowEval(v);
              update((st) => {
                st.settings.evalBar = v;
              });
              if (v) void updateEval();
            }}
          >
            <span style={{ opacity: showEval ? 1 : 0.35 }}>📊</span>
          </button>
        }
      />
      <div className="play-layout">
        <div className="board-col">
          <PlayerBar captured name={`Computer`} rating={elo} kind="bot" color={botColor} fen={fen} active={!over && thinking} sub={thinking ? <span className="muted small">&nbsp;denkt …</span> : undefined} />
          <div className="board-with-eval">
            {showEval && <EvalBar cp={ev.cp} mate={ev.mate} orientation={orientation} />}
            <Board
              fen={fen}
              orientation={orientation}
              movable={myTurn ? orientation : undefined}
              dests={toDests(chess.current)}
              lastMove={lastMove ?? lastMoveOf(chess.current)}
              check={chess.current.inCheck()}
              shapes={hint}
              onMove={(f, t) => onUserMove(f, t)}
            />
          </div>
          <PlayerBar captured name={s.name} rating={s.ratings.play} kind="you" color={me} fen={fen} active={myTurn} />
        </div>
        <div className="side-col">
          <div className="card moves" ref={movesRef}>
            {rows.length === 0 && <span className="muted">Die Partie beginnt …</span>}
            {rows.map(([w, b], i) => (
              <div key={i} className="move-row">
                <span className="num">{i + 1}.</span>
                <span>{w}</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
          {note && <div className="coach info">{note}</div>}
          <div className="actions grid2">
            <button className="btn" disabled={!myTurn || !s.settings.hints} onClick={showHint}>
              💡 Hinweis{hints ? ` (${hints})` : ''}
            </button>
            <button className="btn" disabled={!!over || history.length < (me === 'w' ? 1 : 2)} onClick={takeBack}>
              ↶ Zurück{takebacks ? ` (${takebacks})` : ''}
            </button>
            <button className="btn" disabled={!myTurn} onClick={offerDraw}>
              ½ Remis anbieten
            </button>
            <button className="btn danger" disabled={!!over} onClick={() => setConfirmResign(true)}>
              🏳 Aufgeben
            </button>
          </div>
          {(hints > 0 || takebacks > 0) && !over && <div className="muted small">Mit Hinweisen/Zurücknehmen zählt das Ergebnis nur halb für deine Wertung.</div>}
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
      {confirmResign && !over && (
        <Modal onClose={() => setConfirmResign(false)}>
          <h3>Partie aufgeben?</h3>
          <div className="actions">
            <button
              className="btn danger"
              onClick={() => {
                setConfirmResign(false);
                finishGame('loss', 'Aufgegeben');
              }}
            >
              Aufgeben
            </button>
            <button className="btn" onClick={() => setConfirmResign(false)}>
              Weiterspielen
            </button>
          </div>
        </Modal>
      )}
      {over && (
        <Modal>
          <h2>{over.record.result === 'win' ? 'Du hast gewonnen! 🏆' : over.record.result === 'loss' ? 'Niederlage' : 'Remis'}</h2>
          <p className="muted">{over.record.reason}</p>
          <p>
            Partie-Wertung: <b>{s.ratings.play}</b> <RatingDelta delta={over.delta} />
          </p>
          <div className="actions">
            <button className="btn primary" onClick={() => go({ name: 'review', id: over.record.id })}>
              🔍 Analysieren
            </button>
            <button className="btn" onClick={() => go({ name: 'play-game', color: me === 'w' ? 'b' : 'w', elo: botElo(getState().ratings.play, getState().settings.playOffset), token: Date.now() })}>
              Revanche (Farbe tauschen)
            </button>
            <button className="btn" onClick={() => go({ name: 'play' })}>
              Zurück
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

