import { melanger, type Rng } from './hasard';
import type { ModeReponse, Question } from './types';

/**
 * Propositions affichées au joueur : la bonne réponse + 1 mauvaise (duo, la plus plausible)
 * ou + 3 mauvaises (carré), dans un ordre mélangé. Rien en cash.
 */
export function construirePropositions(q: Question, mode: ModeReponse, rng: Rng = Math.random): string[] {
  if (mode === 'cash') return [];
  const mauvaises = mode === 'duo' ? q.mauvaises.slice(0, 1) : q.mauvaises.slice(0, 3);
  return melanger([q.reponse, ...mauvaises], rng);
}
