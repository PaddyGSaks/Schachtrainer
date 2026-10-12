import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { DrawShape } from 'chessground/draw';
import type { Key } from 'chessground/types';
import Board from '../components/Board';
import { Header, Modal, PlayerBar, PromotionDialog, RatingDelta } from '../components/ui';
import { OPENINGS, lineRating } from '../data/openings';
import {
  bookContinuations,
  lineSans,
  modeFor,
  openingMastery,
  pickNextLine,
  progressOf,
  scheduleAfter,
} from '../lib/openingTrainer';
import { applyResult, getState, update, useAppState } from '../lib/store';
import { isPromotion, lastMoveOf, playSound, soundFor, toDests } from '../lib/chessUtil';
import { ProgressRing } from '../components/ui';

export function OpeningsMenu({ go }: { go: (r: any) => void }) {
  const s = useAppState();
  return (
    <div className="screen">
      <Header title="Eröffnungen" onBack={() => go({ name: 'train' })} />
      <div className="card hero">
        <div>
          <div className="muted small">Deine Eröffnungswertung</div>
          <div className="big">{s.ratings.opening}</div>
        </div>
        <button className="btn primary" onClick={() => go({ name: 'opening-session' })}>
          ▶ Adaptive Session
        </button>
      </div>
      <p className="muted pad">
        Die Session wählt automatisch Linien, die zu deinem Niveau passen. Neue Linien werden dir gezeigt, gelernte werden abgefragt (Wiederholungsplan).
      </p>
      <div className="list">
        {OPENINGS.map((o) => {
          const m = openingMastery(s, o);
          return (
            <button key={o.id} className="row" onClick={() => go({ name: 'opening-session', openingId: o.id })}>
              <ProgressRing value={m} size={48} />
              <div className="row-main">
                <div className="row-title">{o.name}</div>
                <div className="muted small">
                  {o.side === 'w' ? '♔ Weiß' : '♚ Schwarz'} · {o.lines.length} {o.lines.length === 1 ? 'Linie' : 'Linien'} · Stufe {o.level}
                </div>
                <div className="muted small">{o.summary}</div>
              </div>
              <span className="chev">›</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function OpeningSession({ openingId, go }: { openingId?: string; go: (r: any) => void }) {
  const settings = useAppState().settings;
  const [run, setRun] = useState(0);
  const [target, setTarget] = useState(() => pickNextLine(getState(), openingId));
  const { opening } = target;
  const [lineId, setLineId] = useState(target.line.id);
  const line = opening.lines.find((l) => l.id === lineId) ?? target.line;
  const sans = useMemo(() => lineSans(line), [line]);
  const [mode, setMode] = useState(() => modeFor(progressOf(getState(), target.line.id)));

  const chess = useRef(new Chess());
  const played = useRef<string[]>([]);
  const mistakes = useRef(0);
  const busy = useRef(false);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const [message, setMessage] = useState<{ text: string; tone: 'good' | 'bad' | 'info' }>({ text: '', tone: 'info' });
  const [promo, setPromo] = useState<{ from: Key; to: Key } | null>(null);
  const [done, setDone] = useState<{ delta: number; mistakes: number } | null>(null);
  const [hintShown, setHintShown] = useState(false);
  const [lastMove, setLastMove] = useState<[Key, Key] | undefined>();

  const userColor = opening.side;
  const idx = played.current.length;
  const finished = idx >= sans.length;
  const userTurn = !finished && chess.current.turn() === userColor && !busy.current && !done;

  const playBook = (san: string) => {
    const m = chess.current.move(san);
    played.current.push(san);
    setLastMove([m.from as Key, m.to as Key]);
    playSound(soundFor(m, chess.current), getState().settings.sound);
  };

  const finish = (usedLine: typeof line) => {
    const m = mistakes.current;
    const score = m === 0 ? 1 : m === 1 ? 0.6 : m === 2 ? 0.3 : 0;
    let delta = 0;
    if (mode === 'learn') {
      // first pass is only a demonstration: schedule a quick check, no rating change
      update((s) => {
        s.lines[usedLine.id] = { ...progressOf(s, usedLine.id), box: 1, due: Date.now(), seen: progressOf(s, usedLine.id).seen + 1 };
      });
    } else {
      delta = applyResult('opening', lineRating(opening, usedLine), score);
      update((s) => {
        s.lines[usedLine.id] = scheduleAfter(progressOf(s, usedLine.id), m);
      });
    }
    playSound(m === 0 ? 'correct' : 'end', getState().settings.sound);
    setDone({ delta, mistakes: m });
  };

  const opponentReply = (usedLine: typeof line) => {
    busy.current = true;
    rerender();
    const lineMoves = lineSans(usedLine);
    setTimeout(() => {
      playBook(lineMoves[played.current.length]);
      busy.current = false;
      if (played.current.length >= lineMoves.length) finish(usedLine);
      rerender();
    }, 450);
  };

  // (re)start a run: reset the board and let the opponent open if the player has Black
  useEffect(() => {
    chess.current = new Chess();
    played.current = [];
    mistakes.current = 0;
    busy.current = false;
    setLastMove(undefined);
    setHintShown(false);
    setDone(null);
    const m = modeFor(progressOf(getState(), target.line.id));
    setMode(m);
    setLineId(target.line.id);
    setMessage({
      text: m === 'learn' ? 'Neue Linie – der Pfeil zeigt dir den nächsten Zug.' : m === 'practice' ? 'Spiele die Buchzüge aus dem Gedächtnis.' : 'Testmodus – ohne Hilfe. Jeder Hinweis zählt als Fehler.',
      tone: 'info',
    });
    if (opening.side === 'b') opponentReply(target.line);
    rerender();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  const book = bookContinuations(opening.lines, played.current);
  const showArrow = userTurn && (mode === 'learn' || hintShown);
  const shapes = useMemo<DrawShape[]>(() => {
    if (!showArrow || finished) return [];
    try {
      const m = new Chess(chess.current.fen()).move(sans[idx]);
      return [{ orig: m.from as Key, dest: m.to as Key, brush: 'green' }];
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArrow, idx, finished, lineId]);

  const tryMove = (from: Key, to: Key, promotion?: string) => {
    if (!userTurn) return;
    if (!promotion && isPromotion(chess.current, from, to)) {
      setPromo({ from, to });
      return;
    }
    let san: string;
    try {
      san = new Chess(chess.current.fen()).move({ from, to, promotion }).san;
    } catch {
      rerender();
      return;
    }
    const ok = book.find((b) => b.san === san);
    if (!ok) {
      mistakes.current++;
      playSound('wrong', getState().settings.sound);
      setMessage({ text: `Das ist nicht der Buchzug. Richtig ist ${sans[idx]}.`, tone: 'bad' });
      setHintShown(true);
      rerender(); // snaps the piece back
      return;
    }
    // follow whichever line the player chose when the opening branches
    let active = line;
    if (lineSans(line)[idx] !== san) {
      const alt = opening.lines.find((l) => bookContinuations([l], played.current).some((b) => b.san === san));
      if (alt) {
        active = alt;
        setLineId(alt.id);
      }
    }
    playBook(san);
    setHintShown(false);
    setMessage({ text: ok.lineIds.length > 1 ? 'Gut! Hier sind mehrere Fortsetzungen möglich.' : 'Richtig!', tone: 'good' });
    if (played.current.length >= lineSans(active).length) finish(active);
    else opponentReply(active);
    rerender();
  };

  const next = () => {
    const nxt = pickNextLine(getState(), openingId);
    setTarget(nxt);
    setLineId(nxt.line.id);
    setRun((r) => r + 1);
  };

  const stats = progressOf(getState(), line.id);
  const modeLabel = mode === 'learn' ? 'Lernen' : mode === 'practice' ? 'Üben' : 'Test';

  return (
    <div className="screen game-screen">
      <Header title={opening.name} onBack={() => go({ name: 'openings' })} right={<span className="pill">{modeLabel}</span>} />
      <div className="play-layout">
        <div className="board-col">
          <PlayerBar captured name="Buch-Gegner" kind="bot" color={userColor === 'w' ? 'b' : 'w'} fen={chess.current.fen()} />
          <Board
            fen={chess.current.fen()}
            orientation={userColor === 'w' ? 'white' : 'black'}
            movable={userTurn ? (userColor === 'w' ? 'white' : 'black') : undefined}
            dests={toDests(chess.current)}
            lastMove={lastMove ?? lastMoveOf(chess.current)}
            check={chess.current.inCheck()}
            shapes={shapes}
            onMove={(f, t) => tryMove(f, t)}
          />
          <PlayerBar captured name="Du" kind="you" color={userColor} fen={chess.current.fen()} active={userTurn} />
        </div>
        <div className="side-col">
          <div className={`coach ${message.tone}`}>
            <div className="coach-title">{line.name}</div>
            <div>{message.text}</div>
          </div>
          <div className="card">
            <div className="muted small">Idee der Linie</div>
            <p style={{ margin: '4px 0 0' }}>{line.idea}</p>
          </div>
          <div className="card">
            <div className="progress-line">
              <span>
                Zug {Math.min(idx + 1, sans.length)} / {sans.length}
              </span>
              <span className="muted small">
                Fehler: {mistakes.current} · Lernstufe {stats.box}/5
              </span>
            </div>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${(idx / sans.length) * 100}%` }} />
            </div>
            <div className="moves-chips">
              {played.current.map((m, i) => (
                <span key={i} className="chip">
                  {i % 2 === 0 ? `${i / 2 + 1}. ` : ''}
                  {m}
                </span>
              ))}
            </div>
          </div>
          <div className="actions">
            <button
              className="btn"
              disabled={!userTurn || !settings.hints || mode === 'learn'}
              onClick={() => {
                if (mode === 'test' && !hintShown) mistakes.current++;
                setHintShown(true);
                rerender();
              }}
            >
              💡 Hinweis
            </button>
            <button className="btn" onClick={next}>
              ⏭ Andere Linie
            </button>
          </div>
        </div>
      </div>
      {promo && (
        <PromotionDialog
          color={userColor}
          onCancel={() => setPromo(null)}
          onPick={(p) => {
            const pm = promo;
            setPromo(null);
            tryMove(pm.from, pm.to, p);
          }}
        />
      )}
      {done && (
        <Modal>
          <h2>{mode === 'learn' ? 'Linie gezeigt ✔' : done.mistakes === 0 ? 'Linie gemeistert! 🎉' : 'Linie abgeschlossen'}</h2>
          {mode === 'learn' ? (
            <p>Gleich wird die Linie ohne Pfeil abgefragt. Danach steigt sie in deinem Wiederholungsplan auf.</p>
          ) : (
            <>
              <p className="muted">{done.mistakes === 0 ? 'Keine Fehler.' : `${done.mistakes} Fehler/Hinweise – die Linie kommt bald wieder.`}</p>
              <p>
                Eröffnungswertung: <b>{getState().ratings.opening}</b> <RatingDelta delta={done.delta} />
              </p>
            </>
          )}
          <div className="actions">
            <button className="btn primary" onClick={next}>
              Nächste Linie
            </button>
            <button className="btn" onClick={() => go({ name: 'openings' })}>
              Beenden
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

