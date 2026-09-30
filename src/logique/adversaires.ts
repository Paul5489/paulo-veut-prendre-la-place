import { CATEGORIES } from './categories';
import { choisir, melanger, type Rng } from './hasard';
import type { CategorieId, ModeReponse, Niveau, Question, QuestionDepartage } from './types';

/**
 * Les adversaires virtuels : identité fictive, profil de connaissances et comportement.
 *
 * La compétence s'exprime sur la même échelle que la difficulté des questions (1 à 4).
 * Un adversaire moyen a une compétence égale au niveau de la partie ; son profil ajoute
 * une force générale et des points forts ou faibles selon les catégories.
 */

export interface Avatar {
  initiales: string;
  couleur: string;
}

export interface Profil {
  /** force générale, en « niveaux » (−0,7 à +0,7 ; 0 = candidat moyen) */
  force: number;
  /** bonus ou malus par catégorie */
  categories: Partial<Record<CategorieId, number>>;
  /** goût du risque : −1 prudent (duo), +1 audacieux (cash) */
  audace: number;
}

export interface Participant {
  id: string;
  prenom: string;
  feminin: boolean;
  metier: string;
  ville: string;
  avatar: Avatar;
  estJoueur: boolean;
  profil: Profil;
}

export const ID_JOUEUR = 'joueur';

// ---------------------------------------------------------------------------
// Identités fictives
// ---------------------------------------------------------------------------

const PRENOMS: [string, boolean][] = [
  ['Amandine', true], ['Baptiste', false], ['Camille', true], ['Damien', false], ['Élodie', true],
  ['Fabrice', false], ['Gaëlle', true], ['Hugo', false], ['Inès', true], ['Julien', false],
  ['Karine', true], ['Lucas', false], ['Manon', true], ['Nicolas', false], ['Océane', true],
  ['Pascal', false], ['Quentin', false], ['Romain', false], ['Sandrine', true], ['Thomas', false],
  ['Valérie', true], ['William', false], ['Yasmine', true], ['Zoé', true], ['Bernard', false],
  ['Chantal', true], ['Denis', false], ['Françoise', true], ['Gérard', false], ['Hélène', true],
  ['Isabelle', true], ['Jacques', false], ['Laurence', true], ['Marc', false], ['Nadine', true],
  ['Olivier', false], ['Patricia', true], ['Régis', false], ['Sylvie', true], ['Thierry', false],
  ['Véronique', true], ['Xavier', false], ['Alice', true], ['Léo', false], ['Chloé', true],
  ['Mathis', false], ['Jade', true], ['Nathan', false], ['Louise', true], ['Théo', false],
  ['Emma', true], ['Gabriel', false], ['Lina', true], ['Arthur', false], ['Rose', true],
  ['Jules', false], ['Mehdi', false], ['Samia', true], ['Karim', false], ['Nora', true],
  ['Kevin', false], ['Mélanie', true], ['Aurélien', false], ['Justine', true], ['Florian', false],
  ['Pauline', true], ['Guillaume', false], ['Charlotte', true], ['Antoine', false], ['Margaux', true],
  ['Maxime', false], ['Clémence', true], ['Benoît', false], ['Agnès', true], ['Yves', false],
  ['Monique', true], ['Jean-Pierre', false], ['Marie-Claude', true], ['Sébastien', false], ['Estelle', true],
];

const METIERS: [string, string][] = [
  ['boulanger', 'boulangère'], ['infirmier', 'infirmière'], ['professeur des écoles', 'professeure des écoles'],
  ['chauffeur de bus', 'conductrice de bus'], ['pharmacien', 'pharmacienne'], ['retraité de la SNCF', 'retraitée de la SNCF'],
  ['étudiant en droit', 'étudiante en droit'], ['fromager', 'fromagère'], ['bibliothécaire', 'bibliothécaire'],
  ['kinésithérapeute', 'kinésithérapeute'], ['viticulteur', 'viticultrice'], ['agent immobilier', 'agente immobilière'],
  ['pompier volontaire', 'pompière volontaire'], ['ingénieur', 'ingénieure'], ['facteur', 'factrice'],
  ['fleuriste', 'fleuriste'], ['ostréiculteur', 'ostréicultrice'], ['contrôleur aérien', 'contrôleuse aérienne'],
  ['maïeuticien', 'sage-femme'], ['libraire', 'libraire'], ['coiffeur', 'coiffeuse'], ['apiculteur', 'apicultrice'],
  ['guide de montagne', 'guide de montagne'], ['comptable', 'comptable'], ['chef de rayon', 'cheffe de rayon'],
  ['architecte', 'architecte'], ['vétérinaire', 'vétérinaire'], ['développeur web', 'développeuse web'],
  ['restaurateur', 'restauratrice'], ['électricien', 'électricienne'], ['conseiller bancaire', 'conseillère bancaire'],
  ['garde forestier', 'garde forestière'], ['professeur de piano', 'professeure de piano'], ['sommelier', 'sommelière'],
  ['notaire', 'notaire'], ['chauffeur routier', 'chauffeuse routière'], ['animateur radio', 'animatrice radio'],
  ['luthier', 'luthière'], ['maraîcher', 'maraîchère'], ['secrétaire médical', 'secrétaire médicale'],
];

const VILLES = [
  'Lille', 'Brest', 'Annecy', 'Nancy', 'Pau', 'Perpignan', 'Quimper', 'Colmar', 'Arles', 'Vannes', 'Dijon',
  'Limoges', 'Rouen', 'Toulon', 'Angers', 'Metz', 'Reims', 'Tours', 'Bayonne', 'Chambéry', 'Albi',
  'Saint-Malo', 'La Rochelle', 'Besançon', 'Clermont-Ferrand', 'Amiens', 'Poitiers', 'Nîmes', 'Caen',
  'Grenoble', 'Montauban', 'Biarritz', 'Ajaccio', 'Mulhouse', 'Troyes', 'Laval', 'Niort', 'Carcassonne',
  'Orléans', 'Valence', 'Lorient', 'Épinal', 'Cahors', 'Dunkerque', 'Saint-Étienne',
];

export const COULEURS_AVATAR = ['#ff3d8b', '#2de2e6', '#8b5cf6', '#ffc83d', '#2ee59d', '#ff7a3d', '#3d8bff', '#e056fd'];

export function initiales(prenom: string): string {
  const parties = prenom.split(/[\s-]+/).filter(Boolean);
  return (parties.length > 1 ? parties[0][0] + parties[1][0] : prenom.slice(0, 2)).toUpperCase();
}

function aleaEntre(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

/** Profil de connaissances aléatoire : deux points forts, deux points faibles. */
export function genererProfil(rng: Rng, bonusForce = 0): Profil {
  const categories: Partial<Record<CategorieId, number>> = {};
  const ordre = melanger(CATEGORIES.map((c) => c.id), rng);
  ordre.forEach((c, i) => {
    categories[c] = i < 2 ? aleaEntre(rng, 0.5, 0.9) : i < 4 ? -aleaEntre(rng, 0.5, 0.9) : aleaEntre(rng, -0.25, 0.25);
  });
  const force = Math.max(-0.7, Math.min(0.7, (rng() + rng() + rng() - 1.5) * 0.6)) + bonusForce;
  return { force, categories, audace: aleaEntre(rng, -1, 1) };
}

/** Génère des adversaires aux prénoms différents (et différents de ceux à exclure). */
export function genererAdversaires(nb: number, rng: Rng, exclure: string[] = [], bonusForce = 0): Participant[] {
  const pris = new Set(exclure.map((p) => p.toLowerCase()));
  const prenoms = melanger(PRENOMS, rng).filter(([p]) => !pris.has(p.toLowerCase()));
  const couleurs = melanger(COULEURS_AVATAR, rng);
  return prenoms.slice(0, nb).map(([prenom, feminin], i) => {
    const [m, f] = choisir(METIERS, rng);
    return {
      id: `adv-${prenom.toLowerCase()}-${Math.floor(rng() * 1e6)}`,
      prenom,
      feminin,
      metier: feminin ? f : m,
      ville: choisir(VILLES, rng),
      avatar: { initiales: initiales(prenom), couleur: couleurs[i % couleurs.length] },
      estJoueur: false,
      profil: genererProfil(rng, bonusForce),
    };
  });
}

export function creerJoueur(prenom: string): Participant {
  return {
    id: ID_JOUEUR,
    prenom,
    feminin: false,
    metier: '',
    ville: '',
    avatar: { initiales: initiales(prenom || 'Moi'), couleur: '#ffc83d' },
    estJoueur: true,
    profil: { force: 0, categories: {}, audace: 0 },
  };
}

// ---------------------------------------------------------------------------
// Comportement face à une question
// ---------------------------------------------------------------------------

const sigmoide = (x: number) => 1 / (1 + Math.exp(-x));
const borner = (p: number) => Math.min(0.97, Math.max(0.03, p));

/** Écart entre la compétence du candidat et la difficulté de la question (positif = plutôt facile pour lui). */
export function ecartCompetence(
  profil: Profil,
  categorie: CategorieId,
  niveauQuestion: Niveau,
  niveauPartie: Niveau,
  bonus = 0,
): number {
  return niveauPartie + profil.force + (profil.categories[categorie] ?? 0) + bonus - niveauQuestion;
}

/**
 * Probabilité de bonne réponse selon l'écart et le mode : plus facile en duo, plus dure en cash.
 * Jamais 0 ni 1 : même les meilleurs ratent parfois une question facile.
 */
export function probaReussite(ecart: number, mode: ModeReponse): number {
  const x = 1.4 * ecart;
  if (mode === 'cash') return borner(sigmoide(x - 0.3));
  if (mode === 'carre') {
    const r = sigmoide(x + 0.4);
    return borner(r + (1 - r) * 0.3);
  }
  const r = sigmoide(x + 0.8);
  return borner(r + (1 - r) * 0.55);
}

const GAIN: Record<ModeReponse, number> = { duo: 1, carre: 3, cash: 5 };

/**
 * Choix du mode selon la « confiance » : le candidat estime (imparfaitement) ses chances
 * et met en balance le gain espéré et le risque, selon son goût du risque.
 */
export function choisirMode(ecart: number, audace: number, rng: Rng): ModeReponse {
  const percu = ecart + (rng() - 0.5) * 1.2;
  const aversion = 0.45 - 0.4 * audace;
  let meilleur: ModeReponse = 'carre';
  let utiliteMax = -Infinity;
  for (const mode of ['duo', 'carre', 'cash'] as const) {
    const p = probaReussite(percu, mode);
    const esperance = GAIN[mode] * p;
    const risque = GAIN[mode] * Math.sqrt(p * (1 - p));
    const utilite = esperance - aversion * risque;
    if (utilite > utiliteMax) {
      utiliteMax = utilite;
      meilleur = mode;
    }
  }
  return meilleur;
}

export interface ReponseSimulee {
  mode: ModeReponse;
  correct: boolean;
  /** ce que le candidat a répondu (la bonne réponse, ou une mauvaise plausible) */
  saisie: string;
  /** temps de réflexion simulé, en secondes */
  delai: number;
}

export function simulerReponse(
  participant: Participant,
  q: Question,
  niveauPartie: Niveau,
  modeImpose: ModeReponse | null,
  rng: Rng,
  bonus = 0,
): ReponseSimulee {
  const ecart = ecartCompetence(participant.profil, q.categorie, q.niveau, niveauPartie, bonus);
  const mode = modeImpose ?? choisirMode(ecart, participant.profil.audace, rng);
  const correct = rng() < probaReussite(ecart, mode);
  const saisie = correct ? q.reponse : mode === 'duo' ? q.mauvaises[0] : choisir(q.mauvaises, rng);
  const delai = 1.2 + (1 - probaReussite(ecart, 'carre')) * 2.5 + rng() * 1.2;
  return { mode, correct, saisie, delai: Math.round(delai * 10) / 10 };
}

/** Tirage gaussien (Box-Muller). */
function gauss(rng: Rng): number {
  const u = Math.max(rng(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** Réponse à une question de départage : une erreur plausible, plus faible pour les bons candidats. */
export function estimerNombre(profil: Profil, d: QuestionDepartage, niveauPartie: Niveau, rng: Rng, bonus = 0): number {
  const ecart = niveauPartie + profil.force + bonus - d.niveau;
  const imprecision = Math.max(0.25, 1 - 0.35 * ecart);
  const bruit = gauss(rng) * imprecision;
  const estUneAnnee = d.unite === '' && Number.isInteger(d.valeur) && d.valeur >= 500 && d.valeur <= 2100;
  const brut = estUneAnnee ? d.valeur + bruit * 30 : d.valeur * (1 + bruit * 0.3);
  const decimales = (String(d.valeur).split('.')[1] ?? '').length;
  const arrondi = Math.round(brut * 10 ** decimales) / 10 ** decimales;
  return d.valeur > 0 ? Math.max(0, arrondi) : arrondi;
}
