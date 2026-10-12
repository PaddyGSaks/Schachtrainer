import { useSyncExternalStore } from 'react';
import { AREAS, type Area, updateRating } from './rating';

export interface LineProgress {
  box: number; // Leitner box 0..5
  due: number; // timestamp
  seen: number;
  flawless: number;
  lastMistakes: number;
}

export interface MistakeTask {
  id: string;
  fen: string;
  best: string; // uci
  phase: Area;
  created: number;
  solved: boolean;
}

export interface GameRecord {
  id: string;
  date: number;
  color: 'w' | 'b';
  opponentElo: number;
  result: 'win' | 'loss' | 'draw';
  reason: string;
  pgn: string;
  accuracy?: number;
  analysed?: boolean;
}

export interface State {
  version: 1;
  onboarded: boolean;
  name: string;
  ratings: Record<Area, number>;
  counts: Record<Area, number>;
  /** exponential moving average of accuracy (0..100) per game phase from analysed games */
  phaseAccuracy: Partial<Record<Area, number>>;
  lines: Record<string, LineProgress>;
  puzzlesSeen: Record<string, number>; // puzzle id -> last seen
  endgamesDone: Record<string, { best: number; done: number; wins: number }>;
  mistakes: MistakeTask[];
  games: GameRecord[];
  settings: { evalBar: boolean; hints: boolean; sound: boolean; playOffset: number };
  history: { date: number; ratings: Record<Area, number> }[];
  streak: { days: number; last: string };
}

const KEY = 'schachtrainer.v1';

const fresh = (): State => ({
  version: 1,
  onboarded: false,
  name: 'Spieler',
  ratings: { opening: 800, middlegame: 800, endgame: 800, play: 800 },
  counts: { opening: 0, middlegame: 0, endgame: 0, play: 0 },
  phaseAccuracy: {},
  lines: {},
  puzzlesSeen: {},
  endgamesDone: {},
  mistakes: [],
  games: [],
  settings: { evalBar: false, hints: true, sound: true, playOffset: 0 },
  history: [],
  streak: { days: 0, last: '' },
});

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch {
    /* ignore corrupt storage */
  }
  return fresh();
}

let state = load();
const subs = new Set<() => void>();

function commit(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full / blocked – app keeps working in memory */
  }
  subs.forEach((s) => s());
}

export const getState = () => state;
export function update(fn: (s: State) => State | void) {
  const draft = structuredClone(state);
  commit(fn(draft) ?? draft);
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => (subs.add(cb), () => subs.delete(cb)),
    () => selector(state),
  );
}

export const useAppState = () => useStore((s) => s);

const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/** Records activity for the daily streak and a rating snapshot (at most one per hour). */
function touch(s: State) {
  const today = dayKey();
  if (s.streak.last !== today) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    s.streak = { days: s.streak.last === dayKey(y) ? s.streak.days + 1 : 1, last: today };
  }
  const last = s.history[s.history.length - 1];
  if (!last || Date.now() - last.date > 3600_000) s.history.push({ date: Date.now(), ratings: { ...s.ratings } });
  else last.ratings = { ...s.ratings };
  s.history = s.history.slice(-200);
}

/** Applies a rating result and returns the change. */
export function applyResult(area: Area, opponentRating: number, score: number): number {
  let delta = 0;
  update((s) => {
    const before = s.ratings[area];
    s.ratings[area] = updateRating(before, opponentRating, score, s.counts[area]);
    s.counts[area]++;
    delta = s.ratings[area] - before;
    touch(s);
  });
  return delta;
}

export function setInitialLevel(rating: number, name: string) {
  update((s) => {
    for (const a of AREAS) s.ratings[a] = rating;
    s.name = name || 'Spieler';
    s.onboarded = true;
    touch(s);
  });
}

export const overallRating = (s: State) =>
  Math.round(s.ratings.opening * 0.2 + s.ratings.middlegame * 0.25 + s.ratings.endgame * 0.2 + s.ratings.play * 0.35);

export function resetAll() {
  commit(fresh());
}
