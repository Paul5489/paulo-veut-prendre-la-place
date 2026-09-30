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
}

export const REGLAGES_DEFAUT: Reglages = { son: true, chrono: false };

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

// --- Réglages et records -----------------------------------------------------

export async function lireReglages(): Promise<Reglages> {
  const r = (await (await db()).get('kv', 'reglages')) as Partial<Reglages> | undefined;
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

// --- Remise à zéro -----------------------------------------------------------

export async function toutEffacer(): Promise<void> {
  const d = await db();
  const noms = ['historique', 'journal', 'signalements', 'kv', 'questionsIA'] as const;
  const tx = d.transaction([...noms], 'readwrite');
  await Promise.all(noms.map((n) => tx.objectStore(n).clear()));
  await tx.done;
}
