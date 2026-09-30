import type { CategorieId, Question, QuestionDepartage, Theme } from '../logique/types';

/**
 * Chargement de la banque de questions, fichier par fichier (une catégorie ou un thème
 * à la fois), avec mémoire pour ne pas recharger deux fois.
 */

export interface IndexBanque {
  categories: Record<CategorieId, { nb: number; parNiveau: Record<string, number> }>;
  themes: { id: string; titre: string; categorie: CategorieId; description: string; nb: number }[];
  departage: number;
}

const memoire = new Map<string, Promise<unknown>>();

function charger<T>(chemin: string): Promise<T> {
  let p = memoire.get(chemin) as Promise<T> | undefined;
  if (!p) {
    p = fetch(`${import.meta.env.BASE_URL}data/${chemin}`).then((r) => {
      if (!r.ok) throw new Error(`Impossible de charger ${chemin} (${r.status})`);
      return r.json() as Promise<T>;
    });
    p.catch(() => memoire.delete(chemin));
    memoire.set(chemin, p);
  }
  return p;
}

export const chargerIndex = () => charger<IndexBanque>('index.json');
export const chargerCategorie = (id: CategorieId) => charger<Question[]>(`categories/${id}.json`);
export const chargerTheme = (id: string) => charger<Theme>(`themes/${id}.json`);
export const chargerDepartage = () => charger<QuestionDepartage[]>('departage.json');
