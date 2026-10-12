import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { DrawShape } from 'chessground/draw';
import type { Key } from 'chessground/types';
import Board from '../components/Board';
import { Header, PlayerBar } from '../components/ui';
import { analyseGame, CLASS_LABEL, phaseNudge, winPct, type GameAnalysis, type MoveClass } from '../lib/analysis';
import { colorName } from '../lib/chessUtil';
import { AREA_LABEL, type Area } from '../lib/rating';
import { getState, update, useAppState } from '../lib/store';

const cache = new Map<string, GameAnalysis>();
const SYMBOL: Record<MoveClass, string> = { best: '★', good: '✓', inaccuracy: '?!', mistake: '?', blunder: '??' };

function EvalGraph({ analysis, current, onPick }: { analysis: GameAnalysis; current: number; onPick: (ply: number) => void }) {
  const pts = [analysis.startEval, ...analysis.plies.map((p) => p.evalAfter)];
  const W = 300;
  const H = 70;
  const x = (i: number) => (i / Math.max(1, pts.length - 1)) * W;
  const y = (cp: number) => H - (winPct(Math.max(-1500, Math.min(1500, cp))) / 100) * H;
  const path = pts.map((cp, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(cp).toFixed(1)}`).join(' ');
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="eval-graph"
      onClick={(e) => {
        const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        onPick(Math.round(((e.clientX - r.left) / r.width) * (pts.length - 1)));
      }}
    >
      <rect width={W} height={H} fill="var(--graph-dark)" />
      <path d={`${path} L${W},${H} L0,${H} Z`} fill="var(--graph-light)" />
      <line x1="0" x2={W} y1={H / 2} y2={H / 2} stroke="rgba(128,128,128,.4)" strokeDasharray="3 3" />
      <line x1={x(current)} x2={x(current)} y1="0" y2={H} stroke="var(--green)" strokeWidth="1.5" />
    </svg>
  );
}

export function Review({ id, go }: { id: string; go: (r: any) => void }) {
  const s = useAppState();
  const game = s.games.find((g) => g.id === id);
  const sans = useMemo(() => {
    if (!game) return [];
    const c = new Chess();
    c.loadPgn(game.pgn);
    return c.history();
  }, [game]);
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(cache.get(id) ?? null);
  const [progress, setProgress] = useState(0);
  const [ply, setPly] = useState(sans.length);
  const cancel = useRef({ cancelled: false });
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!game || analysis) return;
    cancel.current = { cancelled: false };
    const sig = cancel.current;
    analyseGame(sans, { signal: sig, onProgress: (d, t) => setProgress(d / t) }).then((a) => {
      if (!a || sig.cancelled) return;
      cache.set(id, a);
      setAnalysis(a);
      if (!getState().games.find((g) => g.id === id)?.analysed) commit(a);
    });
    return () => {
      sig.cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** Feeds the analysis back into the skill profile (once per game). */
  function commit(a: GameAnalysis) {
    const me = game!.color;
    update((st) => {
      const rec = st.games.find((g) => g.id === id);
      if (!rec) return;
      rec.analysed = true;
      rec.accuracy = a.accuracy[me];
      for (const [ph, acc] of Object.entries(a.phaseAccuracy[me] ?? {}) as [Area, number][]) {
        const prev = st.phaseAccuracy[ph];
        st.phaseAccuracy[ph] = prev === undefined ? acc : prev * 0.7 + acc * 0.3;
        if (ph !== 'play') st.ratings[ph] = Math.max(400, Math.min(2800, st.ratings[ph] + phaseNudge(acc)));
      }
      // turn the biggest mistakes into personal training tasks
      const bad = a.plies.filter((p) => p.color === me && (p.cls === 'blunder' || p.cls === 'mistake') && p.bestUci && p.phase !== 'opening');
      for (const p of bad.sort((x, y) => y.loss - x.loss).slice(0, 4)) {
        const tid = `m-${p.fenBefore.split(' ').slice(0, 4).join('_')}`;
        if (!st.mistakes.some((m) => m.id === tid)) st.mistakes.unshift({ id: tid, fen: p.fenBefore, best: p.bestUci, phase: p.phase, created: Date.now(), solved: false });
      }
      st.mistakes = st.mistakes.slice(0, 40);
    });
  }

  useEffect(() => {
    const el = listRef.current?.querySelector('.sel');
    el?.scrollIntoView({ block: 'nearest' });
  }, [ply]);

  if (!game) return <div className="screen"><Header title="Analyse" onBack={() => go({ name: 'play' })} /><p className="pad">Partie nicht gefunden.</p></div>;

  const chess = new Chess();
  for (let i = 0; i < ply; i++) chess.move(sans[i]);
  const cur = analysis && ply > 0 ? analysis.plies[ply - 1] : null;
  const lastMove: [Key, Key] | undefined = cur ? [cur.uci.slice(0, 2) as Key, cur.uci.slice(2, 4) as Key] : undefined;
  const shapes: DrawShape[] = [];
  if (cur && (cur.cls === 'mistake' || cur.cls === 'blunder' || cur.cls === 'inaccuracy') && cur.bestUci)
    shapes.push({ orig: cur.bestUci.slice(0, 2) as Key, dest: cur.bestUci.slice(2, 4) as Key, brush: 'green' });
  const orientation = colorName(game.color);
  const me = game.color;
  const opp = me === 'w' ? 'b' : 'w';

  return (
    <div className="screen game-screen">
      <Header title="Partieanalyse" onBack={() => go({ name: 'play' })} />
      <div className="play-layout">
        <div className="board-col">
          <PlayerBar captured name="Computer" rating={game.opponentElo} kind="bot" color={opp} fen={chess.fen()} sub={analysis ? <span className="muted small">&nbsp;Genauigkeit {Math.round(analysis.accuracy[opp])}%</span> : undefined} />
          <Board fen={chess.fen()} orientation={orientation} lastMove={lastMove} check={chess.inCheck()} shapes={shapes} />
          <PlayerBar captured name={s.name} kind="you" color={me} fen={chess.fen()} sub={analysis ? <span className="muted small">&nbsp;Genauigkeit {Math.round(analysis.accuracy[me])}%</span> : undefined} />
          <div className="nav-row">
            <button className="btn" onClick={() => setPly(0)}>⏮</button>
            <button className="btn" onClick={() => setPly((p) => Math.max(0, p - 1))}>◀</button>
            <button className="btn" onClick={() => setPly((p) => Math.min(sans.length, p + 1))}>▶</button>
            <button className="btn" onClick={() => setPly(sans.length)}>⏭</button>
          </div>
        </div>
        <div className="side-col">
          {!analysis ? (
            <div className="card">
              <div className="coach-title">Engine analysiert deine Partie …</div>
              <div className="bar">
                <div className="bar-fill" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          ) : (
            <>
              <div className="card">
                <div className="stats-grid">
                  <div>
                    <div className="big green">{Math.round(analysis.accuracy[me])}%</div>
                    <div className="muted small">Deine Genauigkeit</div>
                  </div>
                  <div>
                    <div className="big">{Math.round(analysis.accuracy[opp])}%</div>
                    <div className="muted small">Computer</div>
                  </div>
                </div>
                <EvalGraph analysis={analysis} current={ply} onPick={setPly} />
                <table className="count-table">
                  <tbody>
                    {(Object.keys(CLASS_LABEL) as MoveClass[]).map((k) => (
                      <tr key={k}>
                        <td><span className={`sym ${k}`}>{SYMBOL[k]}</span> {CLASS_LABEL[k]}</td>
                        <td>{analysis.counts[me][k]}</td>
                        <td className="muted">{analysis.counts[opp][k]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="phase-row">
                  {(['opening', 'middlegame', 'endgame'] as Area[]).map((ph) => {
                    const v = analysis.phaseAccuracy[me]?.[ph];
                    return (
                      <div key={ph}>
                        <div className="muted small">{AREA_LABEL[ph]}</div>
                        <b>{v === undefined ? '–' : `${Math.round(v)}%`}</b>
                      </div>
                    );
                  })}
                </div>
              </div>
              {cur && (
                <div className={`coach ${cur.cls === 'blunder' || cur.cls === 'mistake' ? 'bad' : cur.cls === 'best' ? 'good' : 'info'}`}>
                  <div className="coach-title">
                    {Math.ceil(cur.ply / 2)}
                    {cur.color === 'w' ? '.' : '...'} {cur.san} · {CLASS_LABEL[cur.cls]}
                  </div>
                  {cur.cls !== 'best' && cur.cls !== 'good' && cur.bestSan && <div>Besser war {cur.bestSan}.</div>}
                </div>
              )}
            </>
          )}
          <div className="card moves" ref={listRef}>
            {Array.from({ length: Math.ceil(sans.length / 2) }).map((_, i) => (
              <div key={i} className="move-row">
                <span className="num">{i + 1}.</span>
                {[2 * i, 2 * i + 1].map((j) =>
                  sans[j] ? (
                    <button key={j} className={`mv ${ply === j + 1 ? 'sel' : ''}`} onClick={() => setPly(j + 1)}>
                      {sans[j]}
                      {analysis && analysis.plies[j].cls !== 'best' && analysis.plies[j].cls !== 'good' && <span className={`sym ${analysis.plies[j].cls}`}>{SYMBOL[analysis.plies[j].cls]}</span>}
                    </button>
                  ) : (
                    <span key={j} />
                  ),
                )}
              </div>
            ))}
          </div>
          {analysis && s.mistakes.filter((m) => !m.solved).length > 0 && (
            <button className="btn primary" onClick={() => go({ name: 'mistakes' })}>
              🎯 Aus deinen Fehlern lernen ({s.mistakes.filter((m) => !m.solved).length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
