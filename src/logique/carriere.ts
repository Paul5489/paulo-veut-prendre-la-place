import { genererAdversaires, type Participant, type Profil } from './adversaires';
import { melanger, type Rng } from './hasard';
import type { CategorieId, ModeReponse, Question } from './types';

/**
 * Règles du mode Carrière : classements, qualification, départage, désignation du challenger,
 * attribution de la super cash, choix des thèmes, issue du Défi, cagnotte, trophées.
 */

export interface ReponseEnregistree {
  mode: ModeReponse | null;
  correct: boolean;
  saisie: string | null;
  points: number;
  contestee?: boolean;
  /** temps de réflexion simulé (adversaires) */
  delai?: number;
}

export type Scores = Record<string, number>;

/** Classement par score décroissant ; à égalité, l'ordre de départ est conservé. */
export function classer(scores: Scores, ordre: string[]): string[] {
  return [...ordre].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
}

export interface Coupe {
  /** qualifiés sans discussion */
  qualifies: string[];
  /** à égalité sur la limite : ils passent au départage */
  enBalance: string[];
  /** places à attribuer parmi ceux en balance */
  placesRestantes: number;
  elimines: string[];
}

/** Qui passe, qui est éliminé, et qui doit être départagé. */
export function couperClassement(scores: Scores, ordre: string[], places: number): Coupe {
  const classement = classer(scores, ordre);
  if (classement.length <= places) {
    return { qualifies: classement, enBalance: [], placesRestantes: 0, elimines: [] };
  }
  const limite = scores[classement[places - 1]] ?? 0;
  const premierDehors = scores[classement[places]] ?? 0;
  if (premierDehors < limite) {
    return { qualifies: classement.slice(0, places), enBalance: [], placesRestantes: 0, elimines: classement.slice(places) };
  }
  const qualifies = classement.filter((id) => (scores[id] ?? 0) > limite);
  const enBalance = classement.filter((id) => (scores[id] ?? 0) === limite);
  const elimines = classement.filter((id) => (scores[id] ?? 0) < limite);
  return { qualifies, enBalance, placesRestantes: places - qualifies.length, elimines };
}

/** Départage numérique : les plus proches de la bonne valeur l'emportent (au hasard en cas d'égalité parfaite). */
export function departager(reponses: Record<string, number>, valeur: number, places: number, rng: Rng): string[] {
  const ids = melanger(Object.keys(reponses), rng);
  ids.sort((a, b) => Math.abs(reponses[a] - valeur) - Math.abs(reponses[b] - valeur));
  return ids.slice(0, places);
}

/**
 * Le meilleur de la Compet' devient challenger. En cas d'égalité, le champion choisit :
 * il prend celui qu'il juge le moins dangereux. `egalite` liste les ex æquo (vide sinon).
 */
export function designerChallenger(
  scores: Scores,
  ordre: string[],
  danger: Record<string, number>,
): { challenger: string; egalite: string[] } {
  const classement = classer(scores, ordre);
  const max = scores[classement[0]] ?? 0;
  const exAequo = classement.filter((id) => (scores[id] ?? 0) === max);
  if (exAequo.length === 1) return { challenger: exAequo[0], egalite: [] };
  const moinsDangereux = [...exAequo].sort((a, b) => (danger[a] ?? 0) - (danger[b] ?? 0))[0];
  return { challenger: moinsDangereux, egalite: exAequo };
}

/**
 * Super cash : le champion attribue les questions les plus dures aux candidats
 * qu'il juge les plus dangereux (score actuel d'abord, puis réputation).
 */
export function attribuerSuperCash(
  candidats: string[],
  scores: Scores,
  danger: Record<string, number>,
  questions: Question[],
  rng: Rng,
): Record<string, Question> {
  const menace = (id: string) => (scores[id] ?? 0) + (danger[id] ?? 0) * 2 + rng() * 0.5;
  const parMenace = [...candidats].sort((a, b) => menace(b) - menace(a));
  const parDifficulte = melanger(questions, rng).sort((a, b) => b.niveau - a.niveau);
  return Object.fromEntries(parMenace.map((id, i) => [id, parDifficulte[i]]));
}

export interface ThemeInfo {
  id: string;
  titre: string;
  categorie: CategorieId;
  description: string;
  nb: number;
}

/**
 * Choix des thèmes du Défi par un champion virtuel : il donne au challenger le thème
 * de la catégorie où celui-ci est le plus faible, et garde celui où lui-même est le plus fort,
 * avec une part d'aléatoire.
 */
export function choisirThemesChampion(
  themes: ThemeInfo[],
  niveauChallenger: (c: CategorieId) => number,
  profilChampion: Profil,
  rng: Rng,
): { pourChallenger: ThemeInfo; pourChampion: ThemeInfo; strategique: boolean } {
  const strategique = rng() < 0.7;
  const pourChallenger = strategique
    ? [...themes].sort((a, b) => niveauChallenger(a.categorie) - niveauChallenger(b.categorie))[0]
    : themes[Math.floor(rng() * themes.length)];
  const restants = themes.filter((t) => t.id !== pourChallenger.id);
  const force = (t: ThemeInfo) => profilChampion.categories[t.categorie] ?? 0;
  const pourChampion =
    rng() < 0.7 ? [...restants].sort((a, b) => force(b) - force(a))[0] : restants[Math.floor(rng() * restants.length)];
  return { pourChallenger, pourChampion, strategique };
}

/** Le challenger doit faire strictement mieux : à égalité, le champion garde sa place. */
export function vainqueurDefi(scoreChallenger: number, scoreChampion: number): 'challenger' | 'champion' {
  return scoreChallenger > scoreChampion ? 'challenger' : 'champion';
}

// ---------------------------------------------------------------------------
// Le fauteuil du champion, d'une partie à l'autre
// ---------------------------------------------------------------------------

export const EUROS_PAR_POINT = 100;
export const PALIERS_TROPHEES = [10, 30, 50, 100, 200];

export interface ChampionEnTitre {
  participant: Participant;
  victoires: number;
  cagnotte: number;
  depuis: string;
}

export interface SeriePassee {
  debut: string;
  fin: string;
  victoires: number;
  cagnotte: number;
  battuPar: string;
}

export interface Defaite {
  date: string;
  /** prénom du champion (ou du challenger) qui t'a battu */
  par: string;
  detail: string;
}

export interface Palmares {
  meilleureSerie: number;
  cagnotteRecord: number;
  trophees: number[];
  series: SeriePassee[];
  defaites: Defaite[];
  parties: number;
  qualifsReussies: number;
  competsGagnees: number;
  defisGagnes: number;
}

export interface EtatCarriere {
  version: 1;
  champion: ChampionEnTitre;
  palmares: Palmares;
  /** les challengers deviennent plus forts au fil des victoires du joueur */
  progression: boolean;
}

export function palmaresVide(): Palmares {
  return {
    meilleureSerie: 0,
    cagnotteRecord: 0,
    trophees: [],
    series: [],
    defaites: [],
    parties: 0,
    qualifsReussies: 0,
    competsGagnees: 0,
    defisGagnes: 0,
  };
}

/** Un champion virtuel déjà installé dans le fauteuil, comme à la télé. */
export function creerChampionVirtuel(rng: Rng, exclure: string[] = []): ChampionEnTitre {
  const [participant] = genererAdversaires(1, rng, exclure, 0.3);
  const victoires = 1 + Math.floor(rng() * 6);
  let cagnotte = 0;
  for (let i = 0; i < victoires; i++) cagnotte += (8 + Math.floor(rng() * 17)) * EUROS_PAR_POINT;
  return { participant, victoires, cagnotte, depuis: new Date().toISOString() };
}

export function etatInitial(rng: Rng, prenomJoueur: string): EtatCarriere {
  return { version: 1, champion: creerChampionVirtuel(rng, [prenomJoueur]), palmares: palmaresVide(), progression: true };
}

/** Renforcement des challengers quand le joueur enchaîne les victoires (option). */
export function bonusProgression(etat: EtatCarriere): number {
  if (!etat.progression || !etat.champion.participant.estJoueur) return 0;
  return Math.min(0.8, etat.champion.victoires * 0.04);
}

export type Evenement =
  | { type: 'nouveau-champion'; prenom: string; estJoueur: boolean; cagnotte: number }
  | { type: 'titre-conserve'; prenom: string; estJoueur: boolean; victoires: number; gain: number }
  | { type: 'trophee'; palier: number };

/**
 * Applique l'issue d'un Défi au fauteuil et au palmarès.
 * - Le challenger l'emporte : il devient champion (1re victoire), cagnotte de départ = son score × 100 €.
 * - Le champion l'emporte : +1 victoire, et il gagne 100 € par point marqué par le challenger.
 */
export function appliquerDefi(
  etat: EtatCarriere,
  challenger: Participant,
  scoreChallenger: number,
  scoreChampion: number,
  date: string,
): { etat: EtatCarriere; evenements: Evenement[] } {
  const champion = etat.champion;
  const palmares: Palmares = { ...etat.palmares, trophees: [...etat.palmares.trophees] };
  const evenements: Evenement[] = [];
  const gain = scoreChallenger * EUROS_PAR_POINT;
  let nouveau: ChampionEnTitre;

  if (vainqueurDefi(scoreChallenger, scoreChampion) === 'challenger') {
    nouveau = { participant: challenger, victoires: 1, cagnotte: gain, depuis: date };
    evenements.push({ type: 'nouveau-champion', prenom: challenger.prenom, estJoueur: challenger.estJoueur, cagnotte: gain });
    if (champion.participant.estJoueur) {
      palmares.series = [
        ...palmares.series,
        { debut: champion.depuis, fin: date, victoires: champion.victoires, cagnotte: champion.cagnotte, battuPar: challenger.prenom },
      ];
      palmares.defaites = [
        ...palmares.defaites,
        { date, par: challenger.prenom, detail: `Détrôné après ${champion.victoires} victoire${champion.victoires > 1 ? 's' : ''} (${scoreChampion} à ${scoreChallenger})` },
      ];
    }
  } else {
    nouveau = { ...champion, victoires: champion.victoires + 1, cagnotte: champion.cagnotte + gain };
    evenements.push({
      type: 'titre-conserve',
      prenom: champion.participant.prenom,
      estJoueur: champion.participant.estJoueur,
      victoires: nouveau.victoires,
      gain,
    });
    if (challenger.estJoueur) {
      palmares.defaites = [
        ...palmares.defaites,
        { date, par: champion.participant.prenom, detail: `Défi perdu ${scoreChallenger} à ${scoreChampion}` },
      ];
    }
  }

  if (nouveau.participant.estJoueur) {
    palmares.meilleureSerie = Math.max(palmares.meilleureSerie, nouveau.victoires);
    palmares.cagnotteRecord = Math.max(palmares.cagnotteRecord, nouveau.cagnotte);
    for (const palier of PALIERS_TROPHEES) {
      if (nouveau.victoires >= palier && !palmares.trophees.includes(palier)) {
        palmares.trophees.push(palier);
        evenements.push({ type: 'trophee', palier });
      }
    }
  }
  if (challenger.estJoueur && nouveau.participant.estJoueur) palmares.defisGagnes += 1;
  if (champion.participant.estJoueur && nouveau.participant.estJoueur) palmares.defisGagnes += 1;

  return { etat: { ...etat, champion: nouveau, palmares }, evenements };
}

export function formaterEuros(montant: number): string {
  return `${montant.toLocaleString('fr-FR')} €`;
}
