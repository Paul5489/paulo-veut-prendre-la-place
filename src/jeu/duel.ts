import { chargerDepartage } from '../donnees/banque';
import { initiales, type Participant } from '../logique/adversaires';
import type { ThemeInfo } from '../logique/carriere';
import {
  ajouterMatch,
  autre,
  championDeLaManche,
  cleDuo,
  scoreMatch,
  vainqueurDepartage,
  vainqueurManche,
  vainqueurMatch,
  type HistoriqueDuo,
  type IdJoueurDuel,
} from '../logique/duel';
import { choisir } from '../logique/hasard';
import type { Niveau, QuestionDepartage } from '../logique/types';
import { ecrireValeur, lireReglages, lireValeur, supprimerValeur } from '../stockage/db';
import { NB_QUESTIONS_DEFI, questionsDuTheme, scoreDefi, themesFrais, type QuestionPerso } from './carriere';

/**
 * Déroulé d'un match de Duel à deux. Comme en Carrière, tout l'état est enregistré
 * après chaque étape : on peut fermer l'appli et reprendre le match.
 */

const CLE_MATCH = 'duel-match';
const CLE_JOUEURS = 'duel-joueurs';
const CLE_HISTORIQUE = 'duel-historique';

export interface ProfilJoueurDuel {
  prenom: string;
  feminin: boolean;
  graine: number;
}

export type EtapeDuel =
  | 'pile-ou-face'
  | 'themes'
  | 'passe-challenger'
  | 'challenger'
  | 'passe-champion'
  | 'champion'
  | 'revelation'
  | 'departage'
  | 'bilan-manche'
  | 'fin';

export interface DepartageDuel {
  question: QuestionDepartage;
  reponses: Partial<Record<IdJoueurDuel, number>>;
  /** undefined : pas encore joué ; null : égalité parfaite, il faut une autre question */
  gagnant?: IdJoueurDuel | null;
}

export interface MancheDuel {
  /** choisit les thèmes et joue en second */
  champion: IdJoueurDuel;
  themes: ThemeInfo[];
  themeChallenger?: ThemeInfo;
  themeChampion?: ThemeInfo;
  questionsChallenger: QuestionPerso[];
  questionsChampion: QuestionPerso[];
  departages: DepartageDuel[];
  resultat?: { vainqueur: IdJoueurDuel; scores: Record<IdJoueurDuel, number>; auDepartage: boolean };
}

export interface MatchDuel {
  version: 1;
  creeLe: string;
  niveau: Niveau;
  manchesGagnantes: 1 | 2 | 3;
  joueurs: Record<IdJoueurDuel, Participant>;
  pileOuFace: IdJoueurDuel;
  manches: MancheDuel[];
  etape: EtapeDuel;
  pas: number;
}

export const COULEURS_DUEL: Record<IdJoueurDuel, string> = { j1: '#ffc83d', j2: '#2de2e6' };

// ---------------------------------------------------------------------------
// Joueurs et enregistrement
// ---------------------------------------------------------------------------

export async function lireJoueursDuel(): Promise<[ProfilJoueurDuel, ProfilJoueurDuel]> {
  const enregistres = await lireValeur<[ProfilJoueurDuel, ProfilJoueurDuel]>(CLE_JOUEURS);
  if (enregistres) return enregistres;
  const r = await lireReglages();
  return [
    { prenom: r.prenom, feminin: false, graine: r.avatarGraine },
    { prenom: '', feminin: true, graine: 0 },
  ];
}

export const ecrireJoueursDuel = (j: [ProfilJoueurDuel, ProfilJoueurDuel]) => ecrireValeur(CLE_JOUEURS, j);
export const lireMatch = () => lireValeur<MatchDuel>(CLE_MATCH);
export const sauverMatch = (m: MatchDuel) => ecrireValeur(CLE_MATCH, m);
export const supprimerMatch = () => supprimerValeur(CLE_MATCH);

export function participantDuel(id: IdJoueurDuel, profil: ProfilJoueurDuel): Participant {
  const prenom = profil.prenom.trim() || (id === 'j1' ? 'Joueur 1' : 'Joueur 2');
  return {
    id,
    prenom,
    feminin: profil.feminin,
    metier: '',
    ville: '',
    avatar: { initiales: initiales(prenom), couleur: COULEURS_DUEL[id], graine: profil.graine },
    estJoueur: false,
    profil: { force: 0, categories: {}, audace: 0 },
  };
}

export async function lireHistoriqueDuo(a: string, b: string): Promise<HistoriqueDuo | undefined> {
  const tout = (await lireValeur<Record<string, HistoriqueDuo>>(CLE_HISTORIQUE)) ?? {};
  return tout[cleDuo(a, b)];
}

// ---------------------------------------------------------------------------
// Déroulé
// ---------------------------------------------------------------------------

export const mancheEnCours = (m: MatchDuel) => m.manches[m.manches.length - 1];
export const challengerDe = (manche: MancheDuel) => autre(manche.champion);

export function nouveauMatch(
  niveau: Niveau,
  manchesGagnantes: 1 | 2 | 3,
  profils: [ProfilJoueurDuel, ProfilJoueurDuel],
): MatchDuel {
  return {
    version: 1,
    creeLe: new Date().toISOString(),
    niveau,
    manchesGagnantes,
    joueurs: { j1: participantDuel('j1', profils[0]), j2: participantDuel('j2', profils[1]) },
    pileOuFace: Math.random() < 0.5 ? 'j1' : 'j2',
    manches: [],
    etape: 'pile-ou-face',
    pas: 0,
  };
}

/** Nouvelle manche : 4 thèmes frais, le « champion » de la manche va choisir. */
export async function preparerManche(m: MatchDuel): Promise<MatchDuel> {
  const resultats = m.manches.flatMap((x) => (x.resultat ? [x.resultat] : []));
  const dejaJoues = m.manches.flatMap((x) => [x.themeChallenger?.id ?? '', x.themeChampion?.id ?? '']);
  const themes = await themesFrais(4, dejaJoues);
  const manche: MancheDuel = {
    champion: championDeLaManche(resultats, m.pileOuFace),
    themes,
    questionsChallenger: [],
    questionsChampion: [],
    departages: [],
  };
  return { ...m, manches: [...m.manches, manche], etape: 'themes', pas: 0 };
}

export async function choisirThemesDuel(m: MatchDuel, pourChallenger: ThemeInfo, pourChampion: ThemeInfo): Promise<MatchDuel> {
  const deja = new Set(
    m.manches.flatMap((x) => [...x.questionsChallenger, ...x.questionsChampion].map((q) => q.question.id)),
  );
  const manche = mancheEnCours(m);
  const qChallenger = await questionsDuTheme(pourChallenger.id, NB_QUESTIONS_DEFI, m.niveau, deja);
  const qChampion = await questionsDuTheme(pourChampion.id, NB_QUESTIONS_DEFI, m.niveau, deja);
  const nouvelle: MancheDuel = {
    ...manche,
    themeChallenger: pourChallenger,
    themeChampion: pourChampion,
    questionsChallenger: qChallenger.map((question) => ({ candidat: challengerDe(manche), question })),
    questionsChampion: qChampion.map((question) => ({ candidat: manche.champion, question })),
  };
  return { ...m, manches: [...m.manches.slice(0, -1), nouvelle], etape: 'passe-challenger', pas: 0 };
}

export function scoresManche(manche: MancheDuel): Record<IdJoueurDuel, number> {
  const challenger = challengerDe(manche);
  return {
    [challenger]: scoreDefi(manche.questionsChallenger),
    [manche.champion]: scoreDefi(manche.questionsChampion),
  } as Record<IdJoueurDuel, number>;
}

function avecManche(m: MatchDuel, manche: MancheDuel, etape: EtapeDuel): MatchDuel {
  return { ...m, manches: [...m.manches.slice(0, -1), manche], etape, pas: 0 };
}

/** Après la révélation : un vainqueur, ou un départage en cas d'égalité. */
export async function terminerRevelation(m: MatchDuel): Promise<MatchDuel> {
  const manche = mancheEnCours(m);
  const scores = scoresManche(manche);
  const vainqueur = vainqueurManche(scores);
  if (vainqueur) return avecManche(m, { ...manche, resultat: { vainqueur, scores, auDepartage: false } }, 'bilan-manche');
  return nouveauDepartage(m);
}

export async function nouveauDepartage(m: MatchDuel): Promise<MatchDuel> {
  const manche = mancheEnCours(m);
  const deja = new Set(manche.departages.map((d) => d.question.id));
  const toutes = await chargerDepartage();
  const question = choisir(toutes.filter((d) => !deja.has(d.id)).length ? toutes.filter((d) => !deja.has(d.id)) : toutes);
  return avecManche(m, { ...manche, departages: [...manche.departages, { question, reponses: {} }] }, 'departage');
}

/** Réponse d'un joueur au départage ; quand les deux ont répondu, on désigne le plus proche. */
export function repondreDepartage(m: MatchDuel, joueur: IdJoueurDuel, valeur: number): MatchDuel {
  const manche = mancheEnCours(m);
  const d = manche.departages[manche.departages.length - 1];
  const reponses = { ...d.reponses, [joueur]: valeur };
  const complet = reponses.j1 !== undefined && reponses.j2 !== undefined;
  const gagnant = complet ? vainqueurDepartage(reponses as Record<IdJoueurDuel, number>, d.question.valeur) : undefined;
  const departages = [...manche.departages.slice(0, -1), { ...d, reponses, gagnant }];
  let nouvelle: MancheDuel = { ...manche, departages };
  if (gagnant) nouvelle = { ...nouvelle, resultat: { vainqueur: gagnant, scores: scoresManche(manche), auDepartage: true } };
  return { ...m, manches: [...m.manches.slice(0, -1), nouvelle], pas: m.pas + 1 };
}

export function resultatsMatch(m: MatchDuel) {
  return m.manches.flatMap((x) => (x.resultat ? [x.resultat] : []));
}

export function vainqueurDuMatch(m: MatchDuel): IdJoueurDuel | null {
  return vainqueurMatch(resultatsMatch(m), m.manchesGagnantes);
}

/** Fin du match : l'historique entre ces deux joueurs est mis à jour. */
export async function terminerMatch(m: MatchDuel): Promise<MatchDuel> {
  const vainqueur = vainqueurDuMatch(m)!;
  const { j1, j2 } = m.joueurs;
  const meilleurs: Record<string, number> = { [j1.prenom]: 0, [j2.prenom]: 0 };
  for (const r of resultatsMatch(m)) {
    meilleurs[j1.prenom] = Math.max(meilleurs[j1.prenom], r.scores.j1);
    meilleurs[j2.prenom] = Math.max(meilleurs[j2.prenom], r.scores.j2);
  }
  const s = scoreMatch(resultatsMatch(m));
  const tout = (await lireValeur<Record<string, HistoriqueDuo>>(CLE_HISTORIQUE)) ?? {};
  const cle = cleDuo(j1.prenom, j2.prenom);
  tout[cle] = ajouterMatch(tout[cle], [j1.prenom, j2.prenom], m.joueurs[vainqueur].prenom, meilleurs, `${s.j1} – ${s.j2}`, new Date().toISOString());
  await ecrireValeur(CLE_HISTORIQUE, tout);
  return { ...m, etape: 'fin', pas: 0 };
}
