import type { ModeReponse } from './types';

export const POINTS: Record<ModeReponse, number> = { duo: 1, carre: 3, cash: 5 };

export const NOM_MODE: Record<ModeReponse, string> = { duo: 'Duo', carre: 'Carré', cash: 'Cash' };

/** Points gagnés sur une question (0 si faux ou sans réponse). */
export function pointsObtenus(mode: ModeReponse | null, correct: boolean): number {
  return mode && correct ? POINTS[mode] : 0;
}

/** Super cash de la Compet' : +5 si juste, −5 si faux. */
export function pointsSuperCash(correct: boolean): number {
  return correct ? 5 : -5;
}

/** « Score potentiel » : ce que rapporteraient les réponses si elles étaient toutes justes. */
export function scorePotentiel(modes: (ModeReponse | null)[]): number {
  return modes.reduce((total, m) => total + (m ? POINTS[m] : 0), 0);
}

export function total(points: number[]): number {
  return points.reduce((a, b) => a + b, 0);
}

/** Score maximal d'une série de questions à mode libre (toutes en cash). */
export function scoreMaximal(nbQuestions: number): number {
  return nbQuestions * POINTS.cash;
}
