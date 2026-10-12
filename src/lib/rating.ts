export type Area = 'opening' | 'middlegame' | 'endgame' | 'play';

export const AREAS: Area[] = ['opening', 'middlegame', 'endgame', 'play'];

export const AREA_LABEL: Record<Area, string> = {
  opening: 'Eröffnung',
  middlegame: 'Mittelspiel',
  endgame: 'Endspiel',
  play: 'Partie',
};

export const MIN_RATING = 400;
export const MAX_RATING = 2800;

export const expectedScore = (rating: number, opponent: number) => 1 / (1 + 10 ** ((opponent - rating) / 400));

/** Elo update. K is larger for new players so the trainer finds your level quickly. */
export function updateRating(rating: number, opponent: number, score: number, games: number): number {
  const k = games < 10 ? 48 : games < 30 ? 32 : 20;
  const next = rating + k * (score - expectedScore(rating, opponent));
  return Math.round(Math.max(MIN_RATING, Math.min(MAX_RATING, next)));
}

export const LEVELS = [
  { id: 'beginner', label: 'Anfänger', hint: 'Ich kenne die Regeln', rating: 600 },
  { id: 'casual', label: 'Gelegenheitsspieler', hint: 'Ich spiele ab und zu online', rating: 1000 },
  { id: 'club', label: 'Fortgeschritten', hint: 'Ich kenne Eröffnungen & Taktik', rating: 1400 },
  { id: 'strong', label: 'Stark', hint: 'Vereins- oder Turnierspieler', rating: 1800 },
] as const;

export const levelName = (r: number) =>
  r < 800 ? 'Anfänger' : r < 1100 ? 'Gelegenheitsspieler' : r < 1500 ? 'Fortgeschritten' : r < 1900 ? 'Stark' : 'Experte';
