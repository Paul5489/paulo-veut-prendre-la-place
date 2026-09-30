import { chargerCategorie, chargerDepartage, chargerIndex, chargerTheme } from '../donnees/banque';
import {
  choisirMode,
  creerJoueur,
  ecartCompetence,
  estimerNombre,
  genererAdversaires,
  ID_JOUEUR,
  probaReussite,
  simulerReponse,
  type Participant,
} from '../logique/adversaires';
import {
  appliquerDefi,
  attribuerSuperCash,
  bonusProgression,
  choisirThemesChampion,
  couperClassement,
  departager,
  designerChallenger,
  etatInitial,
  vainqueurDefi,
  type EtatCarriere,
  type Evenement,
  type ReponseEnregistree,
  type Scores,
  type ThemeInfo,
} from '../logique/carriere';
import { CATEGORIES } from '../logique/categories';
import { choisir, melanger, type Rng } from '../logique/hasard';
import { pointsObtenus, pointsSuperCash } from '../logique/scores';
import { niveauCible, tirerSerie } from '../logique/tirage';
import type { CategorieId, ModeReponse, Niveau, Question, QuestionDepartage } from '../logique/types';
import {
  ecrireValeur,
  idsSignales,
  lireHistorique,
  lireReglages,
  lireValeur,
  supprimerValeur,
  tauxParCategorie,
} from '../stockage/db';

/**
 * Déroulé d'une partie de Carrière : Qualifs → (départage) → Compet' → super cash → Défi.
 * Tout l'état de la partie tient dans un objet enregistré après chaque étape :
 * on peut quitter l'appli et reprendre exactement là où on en était.
 */

const CLE_ETAT = 'carriere';
const CLE_PARTIE = 'carriere-partie';

export type Etape =
  | 'presentation'
  | 'qualifs'
  | 'departage'
  | 'qualifs-bilan'
  | 'compet'
  | 'super-cash'
  | 'compet-bilan'
  | 'preliminaires'
  | 'defi-themes'
  | 'defi-challenger'
  | 'defi-champion'
  | 'revelation'
  | 'fin';

/** Question posée à tous, avec un mode imposé (Qualifs collectives, Compet'). */
export interface QuestionPartagee {
  question: Question;
  mode: ModeReponse;
  reponses: Record<string, ReponseEnregistree>;
}

/** Question posée à un seul candidat. */
export interface QuestionPerso {
  candidat: string;
  question: Question;
  reponse?: ReponseEnregistree;
}

export interface DepartageEnCours {
  question: QuestionDepartage;
  candidats: string[];
  places: number;
  reponses: Record<string, number>;
  gagnants?: string[];
}

/** Photo des scores à un moment donné, pour rejouer les préliminaires « en accéléré ». */
export interface Instantane {
  libelle: string;
  scores: Scores;
}

export interface Preliminaires {
  qualifs: Instantane[];
  qualifies: string[];
  departageQualifs?: string[];
  theme: ThemeInfo;
  compet: Instantane[];
}

export interface DefiEnCours {
  themes: ThemeInfo[];
  themeChallenger?: ThemeInfo;
  themeChampion?: ThemeInfo;
  strategique?: boolean;
  questionsChallenger: QuestionPerso[];
  questionsChampion: QuestionPerso[];
}

export interface Issue {
  type: 'elimine-qualifs' | 'elimine-compet' | 'defi';
  vainqueur?: 'challenger' | 'champion';
  scoreChallenger?: number;
  scoreChampion?: number;
  evenements: Evenement[];
  /** ce qui s'est passé sans le joueur (Compet' et Défi simulés après son élimination) */
  pendantCeTemps?: string;
}

export interface PartieCarriere {
  version: 1;
  creeLe: string;
  niveau: Niveau;
  role: 'candidat' | 'champion';
  bonus: number;
  candidats: Participant[];
  champion: Participant;
  championVictoires: number;
  championCagnotte: number;
  etape: Etape;
  pas: number;
  qualifs?: { collectives: QuestionPartagee[]; individuelles: QuestionPerso[][] };
  departage?: DepartageEnCours;
  qualifies: string[];
  preliminaires?: Preliminaires;
  compet?: { theme: ThemeInfo; questions: QuestionPartagee[]; reserve: Question[]; superCash: QuestionPerso[] };
  /** ex æquo de la Compet' (le champion a dû choisir) */
  egaliteCompet?: string[];
  challenger?: string;
  defi?: DefiEnCours;
  issue?: Issue;
}

export const MODES_COLLECTIFS: ModeReponse[] = ['duo', 'carre', 'cash'];
export const MODES_COMPET: ModeReponse[] = ['duo', 'duo', 'duo', 'carre', 'carre', 'carre', 'cash', 'cash'];
export const NB_QUESTIONS_DEFI = 6;

const rng: Rng = Math.random;

// ---------------------------------------------------------------------------
// Lecture et enregistrement
// ---------------------------------------------------------------------------

export async function lireEtatCarriere(): Promise<EtatCarriere> {
  const etat = await lireValeur<EtatCarriere>(CLE_ETAT);
  if (etat) return etat;
  const { prenom } = await lireReglages();
  const nouveau = etatInitial(rng, prenom);
  await ecrireValeur(CLE_ETAT, nouveau);
  return nouveau;
}

export const ecrireEtatCarriere = (e: EtatCarriere) => ecrireValeur(CLE_ETAT, e);
export const lirePartie = () => lireValeur<PartieCarriere>(CLE_PARTIE);
export const sauverPartie = (p: PartieCarriere) => ecrireValeur(CLE_PARTIE, p);
export const supprimerPartie = () => supprimerValeur(CLE_PARTIE);

// ---------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------

export function trouver(p: PartieCarriere, id: string): Participant {
  return id === p.champion.id ? p.champion : p.candidats.find((c) => c.id === id)!;
}

function enregistree(r: { mode: ModeReponse; correct: boolean; saisie: string; delai: number }, superCash = false): ReponseEnregistree {
  return {
    mode: r.mode,
    correct: r.correct,
    saisie: r.saisie,
    delai: r.delai,
    points: superCash ? pointsSuperCash(r.correct) : pointsObtenus(r.mode, r.correct),
  };
}

/** Un « tour » = le joueur répond (pas pair), puis les autres (pas impair). */
function visible(unite: number, qui: 'joueur' | 'autres', pas: number): boolean {
  return qui === 'joueur' ? 2 * unite < pas : 2 * unite + 1 < pas;
}

function ajouter(scores: Scores, id: string, r?: ReponseEnregistree) {
  if (r) scores[id] = (scores[id] ?? 0) + r.points;
}

/** Scores des Qualifs, en ne comptant que ce qui a déjà été montré. */
export function scoresQualifs(p: PartieCarriere): Scores {
  const scores: Scores = Object.fromEntries(p.candidats.map((c) => [c.id, 0]));
  const fini = p.etape !== 'qualifs';
  const unites: [number, [string, ReponseEnregistree | undefined][]][] = [
    ...(p.qualifs?.collectives ?? []).map((c, i) => [i, Object.entries(c.reponses)] as [number, [string, ReponseEnregistree][]]),
    ...(p.qualifs?.individuelles ?? []).map(
      (tour, r) => [3 + r, tour.map((x) => [x.candidat, x.reponse])] as [number, [string, ReponseEnregistree | undefined][]],
    ),
  ];
  for (const [unite, reponses] of unites) {
    for (const [id, r] of reponses) {
      if (fini || visible(unite, id === ID_JOUEUR ? 'joueur' : 'autres', p.pas)) ajouter(scores, id, r);
    }
  }
  return scores;
}

/** Scores de la Compet' (8 questions + super cash), en ne comptant que ce qui a été montré. */
export function scoresCompet(p: PartieCarriere): Scores {
  const scores: Scores = Object.fromEntries(p.qualifies.map((id) => [id, 0]));
  const c = p.compet;
  if (!c) return scores;
  c.questions.forEach((qp, i) => {
    for (const [id, r] of Object.entries(qp.reponses)) {
      if (p.etape !== 'compet' || visible(i, id === ID_JOUEUR ? 'joueur' : 'autres', p.pas)) ajouter(scores, id, r);
    }
  });
  for (const x of c.superCash) {
    const montre =
      p.etape !== 'compet' && (p.etape !== 'super-cash' || (x.candidat === ID_JOUEUR ? p.pas >= 2 : p.pas >= 3));
    if (montre) ajouter(scores, x.candidat, x.reponse);
  }
  return scores;
}

export function scoreDefi(questions: QuestionPerso[], seulementCorrigees = true): number {
  return questions.reduce((s, x) => s + (x.reponse && (!seulementCorrigees || x.reponse.correct) ? x.reponse.points : 0), 0);
}

/** Somme des modes choisis (ce que rapporteraient les réponses si elles étaient toutes justes). */
export function scorePotentiel(questions: QuestionPerso[]): number {
  return questions.reduce((s, x) => s + (x.reponse?.mode ? pointsObtenus(x.reponse.mode, true) : 0), 0);
}

/** « Dangerosité » estimée de chaque candidat, du point de vue du champion. */
async function dangers(p: PartieCarriere): Promise<Record<string, number>> {
  const taux = await tauxParCategorie();
  const total = Object.values(taux).reduce((a, t) => ({ b: a.b + (t?.bonnes ?? 0), n: a.n + (t?.total ?? 0) }), { b: 0, n: 0 });
  const tauxJoueur = total.n >= 10 ? total.b / total.n : 0.5;
  return Object.fromEntries(
    [...p.candidats, p.champion].map((c) => [c.id, c.estJoueur ? (tauxJoueur - 0.5) * 2 : c.profil.force]),
  );
}

async function exclusions(): Promise<{ historique: Awaited<ReturnType<typeof lireHistorique>>; exclus: Set<string> }> {
  const [historique, exclus] = await Promise.all([lireHistorique(), idsSignales()]);
  return { historique, exclus };
}

/** Thèmes les moins joués d'abord (un peu de hasard pour varier). */
async function themesFrais(nb: number, eviter: string[] = []): Promise<ThemeInfo[]> {
  const [index, historique] = await Promise.all([chargerIndex(), lireHistorique()]);
  const vus: Record<string, number> = {};
  for (const h of historique.values()) if (h.theme) vus[h.theme] = (vus[h.theme] ?? 0) + 1;
  return index.themes
    .filter((t) => !eviter.includes(t.id) && t.nb >= 12)
    .map((t) => ({ t, cle: (vus[t.id] ?? 0) / t.nb + rng() * 0.15 }))
    .sort((a, b) => a.cle - b.cle)
    .slice(0, nb)
    .map(({ t }) => t);
}

async function questionsDuTheme(themeId: string, nb: number, niveau: Niveau, deja: Set<string>): Promise<Question[]> {
  const [theme, { historique, exclus }] = await Promise.all([chargerTheme(themeId), exclusions()]);
  const tousExclus = new Set([...exclus, ...deja]);
  return tirerSerie(Array(nb).fill(theme.questions), theme.questions, { niveau, historique, exclus: tousExclus, rng });
}

// ---------------------------------------------------------------------------
// Nouvelle partie
// ---------------------------------------------------------------------------

export async function nouvellePartie(niveau: Niveau): Promise<PartieCarriere> {
  const etat = await lireEtatCarriere();
  const { prenom } = await lireReglages();
  const joueur = creerJoueur(prenom);
  const role = etat.champion.participant.estJoueur ? 'champion' : 'candidat';
  const bonus = bonusProgression(etat);
  const exclure = [prenom, etat.champion.participant.prenom];
  const adversaires = genererAdversaires(role === 'candidat' ? 5 : 6, rng, exclure, bonus);

  const p: PartieCarriere = {
    version: 1,
    creeLe: new Date().toISOString(),
    niveau,
    role,
    bonus,
    candidats: role === 'candidat' ? melanger([joueur, ...adversaires], rng) : adversaires,
    champion: role === 'champion' ? joueur : etat.champion.participant,
    championVictoires: etat.champion.victoires,
    championCagnotte: etat.champion.cagnotte,
    etape: 'presentation',
    pas: 0,
    qualifies: [],
  };

  if (role === 'candidat') p.qualifs = await preparerQualifs(p);
  else await simulerPreliminaires(p);
  return p;
}

async function preparerQualifs(p: PartieCarriere): Promise<NonNullable<PartieCarriere['qualifs']>> {
  const nb = 3 + 2 * p.candidats.length;
  const cases: CategorieId[] = [];
  while (cases.length < nb) cases.push(...melanger(CATEGORIES.map((c) => c.id), rng));
  cases.length = nb;
  const utiles = [...new Set(cases)];
  const reserves = new Map(await Promise.all(utiles.map(async (c) => [c, await chargerCategorie(c)] as const)));
  const { historique, exclus } = await exclusions();
  const serie = tirerSerie(
    cases.map((c) => reserves.get(c)!),
    [...reserves.values()].flat(),
    { niveau: p.niveau, historique, exclus, rng },
  );

  const collectives: QuestionPartagee[] = MODES_COLLECTIFS.map((mode, i) => ({
    question: serie[i],
    mode,
    reponses: Object.fromEntries(
      p.candidats
        .filter((c) => !c.estJoueur)
        .map((c) => [c.id, enregistree(simulerReponse(c, serie[i], p.niveau, mode, rng, p.bonus))]),
    ),
  }));
  const individuelles: QuestionPerso[][] = [0, 1].map((tour) =>
    p.candidats.map((c, j) => {
      const question = serie[3 + tour * p.candidats.length + j];
      return {
        candidat: c.id,
        question,
        reponse: c.estJoueur ? undefined : enregistree(simulerReponse(c, question, p.niveau, null, rng, p.bonus)),
      };
    }),
  );
  return { collectives, individuelles };
}

// ---------------------------------------------------------------------------
// Qualifs → départage → bilan
// ---------------------------------------------------------------------------

export async function terminerQualifs(p: PartieCarriere): Promise<PartieCarriere> {
  const fini = { ...p, etape: 'qualifs-bilan' as Etape, pas: 0 };
  const coupe = couperClassement(scoresQualifs(fini), p.candidats.map((c) => c.id), 4);
  if (!coupe.enBalance.length) return { ...fini, qualifies: coupe.qualifies };

  const questions = await chargerDepartage();
  const question = choisir(questions, rng);
  const reponses = Object.fromEntries(
    coupe.enBalance
      .filter((id) => id !== ID_JOUEUR)
      .map((id) => [id, estimerNombre(trouver(p, id).profil, question, p.niveau, rng, p.bonus)]),
  );
  return {
    ...fini,
    etape: 'departage',
    qualifies: coupe.qualifies,
    departage: { question, candidats: coupe.enBalance, places: coupe.placesRestantes, reponses },
  };
}

export function resoudreDepartage(p: PartieCarriere, reponseJoueur?: number): PartieCarriere {
  const d = p.departage!;
  const reponses = reponseJoueur === undefined ? d.reponses : { ...d.reponses, [ID_JOUEUR]: reponseJoueur };
  const gagnants = departager(reponses, d.question.valeur, d.places, rng);
  return { ...p, departage: { ...d, reponses, gagnants }, qualifies: [...p.qualifies, ...gagnants] };
}

// ---------------------------------------------------------------------------
// Compet'
// ---------------------------------------------------------------------------

export async function preparerCompet(p: PartieCarriere): Promise<PartieCarriere> {
  const [theme] = await themesFrais(1);
  const questions = await questionsDuTheme(theme.id, 12, p.niveau, new Set());
  const principales = questions.slice(0, 8).sort((a, b) => a.niveau - b.niveau);
  const virtuels = p.qualifies.filter((id) => id !== ID_JOUEUR).map((id) => trouver(p, id));
  return {
    ...p,
    etape: 'compet',
    pas: 0,
    compet: {
      theme,
      questions: principales.map((question, i) => ({
        question,
        mode: MODES_COMPET[i],
        reponses: Object.fromEntries(
          virtuels.map((c) => [c.id, enregistree(simulerReponse(c, question, p.niveau, MODES_COMPET[i], rng, p.bonus))]),
        ),
      })),
      reserve: questions.slice(8),
      superCash: [],
    },
  };
}

/** Le champion attribue les questions de super cash (les plus dures aux plus dangereux). */
export async function preparerSuperCash(p: PartieCarriere): Promise<PartieCarriere> {
  const c = p.compet!;
  const apresHuit = { ...p, etape: 'super-cash' as Etape, pas: 0 };
  const attribution = attribuerSuperCash(p.qualifies, scoresCompet(apresHuit), await dangers(p), c.reserve, rng);
  const superCash: QuestionPerso[] = p.qualifies.map((id) => {
    const question = attribution[id];
    const cand = trouver(p, id);
    return {
      candidat: id,
      question,
      reponse: cand.estJoueur ? undefined : enregistree(simulerReponse(cand, question, p.niveau, 'cash', rng, p.bonus), true),
    };
  });
  return { ...apresHuit, compet: { ...c, superCash } };
}

export async function terminerCompet(p: PartieCarriere): Promise<PartieCarriere> {
  const fini = { ...p, etape: 'compet-bilan' as Etape, pas: 0 };
  const { challenger, egalite } = designerChallenger(scoresCompet(fini), p.qualifies, await dangers(p));
  return { ...fini, challenger, egaliteCompet: egalite };
}

// ---------------------------------------------------------------------------
// Rôle champion : Qualifs et Compet' simulées entre adversaires virtuels
// ---------------------------------------------------------------------------

function pointsAbstraits(c: Participant, categorie: CategorieId, niveau: Niveau, niveauPartie: Niveau, mode: ModeReponse | null, bonus: number, superCash = false): number {
  const ecart = ecartCompetence(c.profil, categorie, niveau, niveauPartie, bonus);
  const m = mode ?? choisirMode(ecart, c.profil.audace, rng);
  const ok = rng() < probaReussite(ecart, m);
  return superCash ? pointsSuperCash(ok) : pointsObtenus(m, ok);
}

async function simulerPreliminaires(p: PartieCarriere): Promise<void> {
  const ids = p.candidats.map((c) => c.id);
  const scores: Scores = Object.fromEntries(ids.map((id) => [id, 0]));
  const qualifs: Instantane[] = [];
  const cat = () => choisir(CATEGORIES, rng).id;

  MODES_COLLECTIFS.forEach((mode, i) => {
    const categorie = cat();
    const niveau = niveauCible(p.niveau, rng);
    for (const c of p.candidats) scores[c.id] += pointsAbstraits(c, categorie, niveau, p.niveau, mode, p.bonus);
    qualifs.push({ libelle: `Question collective ${i + 1} (${mode === 'carre' ? 'carré' : mode})`, scores: { ...scores } });
  });
  for (const tour of [1, 2]) {
    for (const c of p.candidats) scores[c.id] += pointsAbstraits(c, cat(), niveauCible(p.niveau, rng), p.niveau, null, p.bonus);
    qualifs.push({ libelle: `Questions individuelles, tour ${tour}`, scores: { ...scores } });
  }

  const coupe = couperClassement(scores, ids, 4);
  let qualifies = coupe.qualifies;
  let departageQualifs: string[] | undefined;
  if (coupe.enBalance.length) {
    const d = choisir(await chargerDepartage(), rng);
    const reponses = Object.fromEntries(coupe.enBalance.map((id) => [id, estimerNombre(trouver(p, id).profil, d, p.niveau, rng, p.bonus)]));
    const gagnants = departager(reponses, d.valeur, coupe.placesRestantes, rng);
    qualifies = [...qualifies, ...gagnants];
    departageQualifs = coupe.enBalance;
  }

  const [theme] = await themesFrais(1);
  const sc: Scores = Object.fromEntries(qualifies.map((id) => [id, 0]));
  const compet: Instantane[] = [];
  MODES_COMPET.forEach((mode, i) => {
    const niveau = niveauCible(p.niveau, rng);
    for (const id of qualifies) sc[id] += pointsAbstraits(trouver(p, id), theme.categorie, niveau, p.niveau, mode, p.bonus);
    if (i === 2 || i === 5 || i === 7) compet.push({ libelle: `Après ${i + 1} questions`, scores: { ...sc } });
  });
  for (const id of qualifies) {
    sc[id] += pointsAbstraits(trouver(p, id), theme.categorie, niveauCible(p.niveau, rng), p.niveau, 'cash', p.bonus, true);
  }
  compet.push({ libelle: 'Après la super cash', scores: { ...sc } });

  const { challenger, egalite } = designerChallenger(sc, qualifies, Object.fromEntries(qualifies.map((id) => [id, trouver(p, id).profil.force])));
  p.qualifies = qualifies;
  p.preliminaires = { qualifs, qualifies, departageQualifs, theme, compet };
  // à égalité, c'est le joueur (champion) qui choisira son challenger
  if (egalite.length) p.egaliteCompet = egalite;
  else p.challenger = challenger;
}

// ---------------------------------------------------------------------------
// Défi
// ---------------------------------------------------------------------------

function deja(p: PartieCarriere): Set<string> {
  return new Set([...(p.compet?.questions.map((x) => x.question.id) ?? []), ...(p.compet?.reserve.map((q) => q.id) ?? [])]);
}

export async function preparerDefi(p: PartieCarriere): Promise<PartieCarriere> {
  const eviter = [p.compet?.theme.id ?? p.preliminaires?.theme.id ?? ''];
  const themes = await themesFrais(4, eviter);
  const suite: PartieCarriere = {
    ...p,
    etape: 'defi-themes',
    pas: 0,
    defi: { themes, questionsChallenger: [], questionsChampion: [] },
  };
  if (p.role === 'champion') return suite; // le joueur choisira lui-même

  const taux = await tauxParCategorie();
  const niveauJoueur = (c: CategorieId) => {
    const t = taux[c];
    return t && t.total >= 3 ? t.bonnes / t.total : 0.5 + (rng() - 0.5) * 0.2;
  };
  const choix = choisirThemesChampion(themes, niveauJoueur, p.champion.profil, rng);
  return attribuerThemes(suite, choix.pourChallenger, choix.pourChampion, choix.strategique);
}

/** Thèmes choisis (par le champion virtuel, ou par le joueur champion) : on prépare les 2 × 6 questions. */
export async function attribuerThemes(
  p: PartieCarriere,
  themeChallenger: ThemeInfo,
  themeChampion: ThemeInfo,
  strategique = false,
): Promise<PartieCarriere> {
  const utilisees = deja(p);
  const qChallenger = await questionsDuTheme(themeChallenger.id, NB_QUESTIONS_DEFI, p.niveau, utilisees);
  const qChampion = await questionsDuTheme(themeChampion.id, NB_QUESTIONS_DEFI, p.niveau, utilisees);
  const challenger = trouver(p, p.challenger!);
  const perso = (c: Participant, qs: Question[]): QuestionPerso[] =>
    qs.map((question) => ({
      candidat: c.id,
      question,
      reponse: c.estJoueur ? undefined : enregistree(simulerReponse(c, question, p.niveau, null, rng, p.bonus)),
    }));
  return {
    ...p,
    defi: {
      ...p.defi!,
      themeChallenger,
      themeChampion,
      strategique,
      questionsChallenger: perso(challenger, qChallenger),
      questionsChampion: perso(p.champion, qChampion),
    },
  };
}

// ---------------------------------------------------------------------------
// Fin de partie
// ---------------------------------------------------------------------------

async function majPalmaresPartie(etat: EtatCarriere, p: PartieCarriere): Promise<EtatCarriere> {
  const pal = { ...etat.palmares, parties: etat.palmares.parties + 1 };
  if (p.role === 'candidat' && p.qualifies.includes(ID_JOUEUR)) pal.qualifsReussies += 1;
  if (p.role === 'candidat' && p.challenger === ID_JOUEUR) pal.competsGagnees += 1;
  return { ...etat, palmares: pal };
}

export async function terminerDefi(p: PartieCarriere): Promise<PartieCarriere> {
  const d = p.defi!;
  const scoreChallenger = scoreDefi(d.questionsChallenger);
  const scoreChampion = scoreDefi(d.questionsChampion);
  let etat = await majPalmaresPartie(await lireEtatCarriere(), p);
  const r = appliquerDefi(etat, trouver(p, p.challenger!), scoreChallenger, scoreChampion, new Date().toISOString());
  etat = r.etat;
  await ecrireEtatCarriere(etat);
  return {
    ...p,
    etape: 'fin',
    pas: 0,
    issue: {
      type: 'defi',
      vainqueur: vainqueurDefi(scoreChallenger, scoreChampion),
      scoreChallenger,
      scoreChampion,
      evenements: r.evenements,
    },
  };
}

/** Défi entre deux candidats virtuels, simulé sans questions réelles. */
function simulerDefiAbstrait(challenger: Participant, champion: Participant, p: PartieCarriere): [number, number] {
  const categories = melanger(CATEGORIES.map((c) => c.id), rng).slice(0, 4);
  const pourChallenger = [...categories].sort((a, b) => (challenger.profil.categories[a] ?? 0) - (challenger.profil.categories[b] ?? 0))[0];
  const pourChampion = categories
    .filter((c) => c !== pourChallenger)
    .sort((a, b) => (champion.profil.categories[b] ?? 0) - (champion.profil.categories[a] ?? 0))[0];
  let sc = 0;
  let sch = 0;
  for (let i = 0; i < NB_QUESTIONS_DEFI; i++) {
    sc += pointsAbstraits(challenger, pourChallenger, niveauCible(p.niveau, rng), p.niveau, null, p.bonus);
    sch += pointsAbstraits(champion, pourChampion, niveauCible(p.niveau, rng), p.niveau, null, p.bonus);
  }
  return [sc, sch];
}

/** Le joueur est éliminé : la fin de l'émission se joue sans lui (en coulisses). */
export async function terminerElimination(p: PartieCarriere, type: 'elimine-qualifs' | 'elimine-compet'): Promise<PartieCarriere> {
  let challengerId = p.challenger;
  if (type === 'elimine-qualifs') {
    const sc: Scores = Object.fromEntries(p.qualifies.map((id) => [id, 0]));
    const categorie = choisir(CATEGORIES, rng).id;
    for (const id of p.qualifies) {
      for (const mode of MODES_COMPET) sc[id] += pointsAbstraits(trouver(p, id), categorie, niveauCible(p.niveau, rng), p.niveau, mode, p.bonus);
      sc[id] += pointsAbstraits(trouver(p, id), categorie, niveauCible(p.niveau, rng), p.niveau, 'cash', p.bonus, true);
    }
    challengerId = designerChallenger(sc, p.qualifies, Object.fromEntries(p.qualifies.map((id) => [id, trouver(p, id).profil.force]))).challenger;
  }
  const challenger = trouver(p, challengerId!);
  const [sc, sch] = simulerDefiAbstrait(challenger, p.champion, p);
  let etat = await majPalmaresPartie(await lireEtatCarriere(), p);
  const r = appliquerDefi(etat, challenger, sc, sch, new Date().toISOString());
  etat = r.etat;
  await ecrireEtatCarriere(etat);

  const championNom = p.champion.prenom;
  const pendantCeTemps =
    vainqueurDefi(sc, sch) === 'challenger'
      ? `${challenger.prenom} a remporté la Compet', puis battu ${championNom} au Défi (${sc} à ${sch}) : ${challenger.feminin ? 'c’est la nouvelle championne' : 'c’est le nouveau champion'} !`
      : `${challenger.prenom} a remporté la Compet', mais ${championNom} a gardé sa place au Défi (${sch} à ${sc}) : ${etat.champion.victoires} victoires, cagnotte de ${etat.champion.cagnotte.toLocaleString('fr-FR')} €.`;
  return { ...p, etape: 'fin', pas: 0, challenger: challengerId, issue: { type, evenements: [], pendantCeTemps } };
}
