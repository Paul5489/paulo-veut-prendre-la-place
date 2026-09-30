import { normaliser } from './texte';

/**
 * Règles du Duel à deux, sur le même iPhone :
 * manches façon Défi, match en 1, 2 ou 3 manches gagnantes, historique entre les deux joueurs.
 */

export type IdJoueurDuel = 'j1' | 'j2';

export const autre = (id: IdJoueurDuel): IdJoueurDuel => (id === 'j1' ? 'j2' : 'j1');

export interface ResultatManche {
  vainqueur: IdJoueurDuel;
  scores: Record<IdJoueurDuel, number>;
  /** gagnée au départage numérique après une égalité */
  auDepartage: boolean;
}

/** Le meilleur score gagne la manche ; null en cas d'égalité (on passe au départage). */
export function vainqueurManche(scores: Record<IdJoueurDuel, number>): IdJoueurDuel | null {
  if (scores.j1 === scores.j2) return null;
  return scores.j1 > scores.j2 ? 'j1' : 'j2';
}

/** Départage : le plus proche de la bonne valeur ; null si les deux sont exactement aussi proches. */
export function vainqueurDepartage(reponses: Record<IdJoueurDuel, number>, valeur: number): IdJoueurDuel | null {
  const e1 = Math.abs(reponses.j1 - valeur);
  const e2 = Math.abs(reponses.j2 - valeur);
  if (e1 === e2) return null;
  return e1 < e2 ? 'j1' : 'j2';
}

export function scoreMatch(resultats: ResultatManche[]): Record<IdJoueurDuel, number> {
  return {
    j1: resultats.filter((r) => r.vainqueur === 'j1').length,
    j2: resultats.filter((r) => r.vainqueur === 'j2').length,
  };
}

/** Vainqueur du match s'il est déjà décidé (1, 2 ou 3 manches gagnantes). */
export function vainqueurMatch(resultats: ResultatManche[], manchesGagnantes: number): IdJoueurDuel | null {
  const s = scoreMatch(resultats);
  if (s.j1 >= manchesGagnantes) return 'j1';
  if (s.j2 >= manchesGagnantes) return 'j2';
  return null;
}

/** 1re manche : le gagnant du pile ou face ; ensuite, le gagnant de la manche précédente. */
export function championDeLaManche(resultats: ResultatManche[], gagnantPileOuFace: IdJoueurDuel): IdJoueurDuel {
  return resultats.length ? resultats[resultats.length - 1].vainqueur : gagnantPileOuFace;
}

// ---------------------------------------------------------------------------
// Historique des duels entre deux joueurs
// ---------------------------------------------------------------------------

export interface MatchPasse {
  date: string;
  vainqueur: string;
  /** « 2 – 1 » */
  score: string;
}

export interface HistoriqueDuo {
  prenoms: [string, string];
  victoires: Record<string, number>;
  meilleursScores: Record<string, number>;
  matchs: MatchPasse[];
}

/** Même clé quel que soit l'ordre des prénoms (et sans tenir compte des accents ni majuscules). */
export function cleDuo(a: string, b: string): string {
  return [normaliser(a), normaliser(b)].sort().join('|');
}

export function ajouterMatch(
  h: HistoriqueDuo | undefined,
  prenoms: [string, string],
  vainqueur: string,
  meilleurs: Record<string, number>,
  score: string,
  date: string,
): HistoriqueDuo {
  const base: HistoriqueDuo = h ?? {
    prenoms,
    victoires: { [prenoms[0]]: 0, [prenoms[1]]: 0 },
    meilleursScores: { [prenoms[0]]: 0, [prenoms[1]]: 0 },
    matchs: [],
  };
  const victoires = { ...base.victoires, [vainqueur]: (base.victoires[vainqueur] ?? 0) + 1 };
  const meilleursScores = { ...base.meilleursScores };
  for (const [p, s] of Object.entries(meilleurs)) meilleursScores[p] = Math.max(meilleursScores[p] ?? 0, s);
  return { prenoms: base.prenoms, victoires, meilleursScores, matchs: [...base.matchs, { date, vainqueur, score }].slice(-30) };
}
