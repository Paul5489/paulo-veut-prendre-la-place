import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  CategorieId,
  EntreeHistorique,
  ModeReponse,
  MotifSignalement,
  Niveau,
  Question,
} from '../logique/types';

/** Chaque réponse donnée, pour les statistiques. */
export interface EntreeJournal {
  n?: number;
  id: string;
  date: number;
  categorie: CategorieId;
  theme: string | null;
  niveau: Niveau;
  mode: ModeReponse | null;
  correct: boolean;
  contestee: boolean;
  /** partie rapide, carrière, duel… */
  jeu: string;
}

export interface Signalement {
  id: string;
  date: number;
  motif: MotifSignalement | null;
  question: Pick<Question, 'question' | 'reponse' | 'categorie' | 'theme' | 'niveau'>;
}

export interface Reglages {
  son: boolean;
  chrono: boolean;
  /** prénom affiché sur le plateau */
  prenom: string;
  /** variation du dessin de l'avatar du joueur */
  avatarGraine: number;
  /** durée du chrono, en secondes */
  dureeChrono: number;
  /** version des réglages (pour les changements de valeurs par défaut) */
  versionReglages: number;
}

export const REGLAGES_DEFAUT: Reglages = {
  son: true,
  chrono: true,
  prenom: 'Paulo',
  avatarGraine: 0,
  dureeChrono: 20,
  versionReglages: 2,
};

/** Meilleur score de la partie rapide, par niveau */
export type Records = Partial<Record<Niveau, number>>;

interface Schema extends DBSchema {
  historique: { key: string; value: EntreeHistorique };
  journal: { key: number; value: EntreeJournal };
  signalements: { key: string; value: Signalement };
  kv: { key: string; value: unknown };
  questionsIA: { key: string; value: Question };
}

let connexion: Promise<IDBPDatabase<Schema>> | null = null;

function db(): Promise<IDBPDatabase<Schema>> {
  connexion ??= openDB<Schema>('paulo-veut-prendre-la-place', 1, {
    upgrade(d) {
      d.createObjectStore('historique', { keyPath: 'id' });
      d.createObjectStore('journal', { keyPath: 'n', autoIncrement: true });
      d.createObjectStore('signalements', { keyPath: 'id' });
      d.createObjectStore('kv');
      d.createObjectStore('questionsIA', { keyPath: 'id' });
    },
  });
  return connexion;
}

/** Demande à l'iPhone de ne pas effacer nos données pour faire de la place. */
export function demanderStockagePersistant(): void {
  navigator.storage?.persist?.().catch(() => {});
}

// --- Historique des questions vues ------------------------------------------

export async function lireHistorique(): Promise<Map<string, EntreeHistorique>> {
  const tout = await (await db()).getAll('historique');
  return new Map(tout.map((h) => [h.id, h]));
}

export async function enregistrerReponse(
  q: Question,
  mode: ModeReponse | null,
  correct: boolean,
  contestee: boolean,
  jeu: string,
): Promise<void> {
  const d = await db();
  const tx = d.transaction(['historique', 'journal'], 'readwrite');
  const avant = await tx.objectStore('historique').get(q.id);
  const maintenant = Date.now();
  await tx.objectStore('historique').put({
    id: q.id,
    categorie: q.categorie,
    theme: q.theme,
    niveau: q.niveau,
    derniereVue: maintenant,
    reussie: correct,
    mode,
    nbVues: (avant?.nbVues ?? 0) + 1,
    nbReussites: (avant?.nbReussites ?? 0) + (correct ? 1 : 0),
  });
  await tx.objectStore('journal').add({
    id: q.id,
    date: maintenant,
    categorie: q.categorie,
    theme: q.theme,
    niveau: q.niveau,
    mode,
    correct,
    contestee,
    jeu,
  });
  await tx.done;
}

/**
 * Questions montrées pendant le tour des adversaires : elles comptent comme déjà vues
 * (reproposées en dernier), sans entrer dans les statistiques du joueur.
 */
export async function marquerVues(questions: Question[]): Promise<void> {
  if (!questions.length) return;
  const d = await db();
  const tx = d.transaction('historique', 'readwrite');
  const maintenant = Date.now();
  for (const q of questions) {
    const avant = await tx.store.get(q.id);
    if (avant) continue;
    await tx.store.put({
      id: q.id, categorie: q.categorie, theme: q.theme, niveau: q.niveau,
      derniereVue: maintenant, reussie: true, mode: null, nbVues: 1, nbReussites: 0,
    });
  }
  await tx.done;
}

/** Taux de réussite du joueur par catégorie (toutes parties confondues). */
export async function tauxParCategorie(): Promise<Partial<Record<CategorieId, { bonnes: number; total: number }>>> {
  const journal = await (await db()).getAll('journal');
  const res: Partial<Record<CategorieId, { bonnes: number; total: number }>> = {};
  for (const e of journal) {
    const t = (res[e.categorie] ??= { bonnes: 0, total: 0 });
    t.total++;
    if (e.correct) t.bonnes++;
  }
  return res;
}

// --- Petites valeurs (réglages, records, carrière…) --------------------------

export async function lireValeur<T>(cle: string): Promise<T | undefined> {
  return (await (await db()).get('kv', cle)) as T | undefined;
}

export async function ecrireValeur(cle: string, valeur: unknown): Promise<void> {
  await (await db()).put('kv', valeur, cle);
}

export async function supprimerValeur(cle: string): Promise<void> {
  await (await db()).delete('kv', cle);
}

// --- Réglages et records -----------------------------------------------------

export async function lireReglages(): Promise<Reglages> {
  const r = (await (await db()).get('kv', 'reglages')) as Partial<Reglages> | undefined;
  if (r && (r.versionReglages ?? 1) < 2) {
    // Paul a demandé un temps limité pour répondre : le chrono passe activé par défaut (une seule fois).
    const maj = { ...REGLAGES_DEFAUT, ...r, chrono: true, versionReglages: 2 };
    await ecrireReglages(maj);
    return maj;
  }
  return { ...REGLAGES_DEFAUT, ...r };
}

export async function ecrireReglages(r: Reglages): Promise<void> {
  await (await db()).put('kv', r, 'reglages');
}

export async function lireRecords(): Promise<Records> {
  return ((await (await db()).get('kv', 'records')) as Records | undefined) ?? {};
}

/** Enregistre un score de partie rapide ; renvoie true si c'est un nouveau record. */
export async function enregistrerScoreRapide(niveau: Niveau, score: number): Promise<boolean> {
  const records = await lireRecords();
  const ancien = records[niveau];
  if (ancien !== undefined && score <= ancien) return false;
  records[niveau] = score;
  await (await db()).put('kv', records, 'records');
  return score > 0;
}

// --- Signalements ------------------------------------------------------------

export async function signalerQuestion(q: Question, motif: MotifSignalement | null): Promise<void> {
  await (await db()).put('signalements', {
    id: q.id,
    date: Date.now(),
    motif,
    question: { question: q.question, reponse: q.reponse, categorie: q.categorie, theme: q.theme, niveau: q.niveau },
  });
}

export async function listerSignalements(): Promise<Signalement[]> {
  const tout = await (await db()).getAll('signalements');
  return tout.sort((a, b) => b.date - a.date);
}

export async function idsSignales(): Promise<Set<string>> {
  return new Set(await (await db()).getAllKeys('signalements'));
}

export async function restaurerQuestion(id: string): Promise<void> {
  await (await db()).delete('signalements', id);
}

// --- Sauvegarde et restauration ----------------------------------------------

const MAGASINS = ['historique', 'journal', 'signalements', 'kv', 'questionsIA'] as const;

export interface Sauvegarde {
  type: 'paulo-sauvegarde';
  version: 1;
  date: string;
  historique: EntreeHistorique[];
  journal: EntreeJournal[];
  signalements: Signalement[];
  kv: { cle: string; valeur: unknown }[];
  questionsIA: Question[];
}

/** Toutes les données du joueur, dans un seul objet à enregistrer en fichier. */
export async function exporterDonnees(): Promise<Sauvegarde> {
  const d = await db();
  const cles = await d.getAllKeys('kv');
  const kv = await Promise.all(cles.map(async (cle) => ({ cle, valeur: await d.get('kv', cle) })));
  return {
    type: 'paulo-sauvegarde',
    version: 1,
    date: new Date().toISOString(),
    historique: await d.getAll('historique'),
    journal: await d.getAll('journal'),
    signalements: await d.getAll('signalements'),
    kv,
    questionsIA: await d.getAll('questionsIA'),
  };
}

/** Remplace toutes les données par celles d'une sauvegarde. */
export async function importerDonnees(s: Sauvegarde): Promise<void> {
  if (s?.type !== 'paulo-sauvegarde' || !Array.isArray(s.historique) || !Array.isArray(s.kv)) {
    throw new Error("Ce fichier n'est pas une sauvegarde de « Paulo veut prendre la place ».");
  }
  const d = await db();
  const tx = d.transaction([...MAGASINS], 'readwrite');
  await Promise.all(MAGASINS.map((n) => tx.objectStore(n).clear()));
  for (const h of s.historique) await tx.objectStore('historique').put(h);
  for (const j of s.journal ?? []) await tx.objectStore('journal').put(j);
  for (const x of s.signalements ?? []) await tx.objectStore('signalements').put(x);
  for (const { cle, valeur } of s.kv) await tx.objectStore('kv').put(valeur, cle);
  for (const q of s.questionsIA ?? []) await tx.objectStore('questionsIA').put(q);
  await tx.done;
}

// --- Remise à zéro -----------------------------------------------------------

export async function toutEffacer(): Promise<void> {
  const d = await db();
  const tx = d.transaction([...MAGASINS], 'readwrite');
  await Promise.all(MAGASINS.map((n) => tx.objectStore(n).clear()));
  await tx.done;
}
