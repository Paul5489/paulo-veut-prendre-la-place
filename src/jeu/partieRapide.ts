import { chargerCategorie } from '../donnees/banque';
import { CATEGORIES } from '../logique/categories';
import { melanger } from '../logique/hasard';
import { tirerSerie } from '../logique/tirage';
import type { CategorieId, Niveau, Question } from '../logique/types';
import { idsSignales, lireHistorique } from '../stockage/db';

export const NB_QUESTIONS_RAPIDE = 10;

/** Prépare les 10 questions d'une partie rapide : mélange de catégories, ou une seule. */
export async function preparerPartieRapide(
  niveau: Niveau,
  categorie: CategorieId | 'melange',
): Promise<Question[]> {
  const [historique, exclus] = await Promise.all([lireHistorique(), idsSignales()]);
  const cases: CategorieId[] =
    categorie === 'melange'
      ? melanger(CATEGORIES.map((c) => c.id)).slice(0, NB_QUESTIONS_RAPIDE)
      : Array<CategorieId>(NB_QUESTIONS_RAPIDE).fill(categorie);
  const utiles = [...new Set(cases)];
  const reserves = new Map(await Promise.all(utiles.map(async (c) => [c, await chargerCategorie(c)] as const)));
  const secours = [...reserves.values()].flat();
  return tirerSerie(
    cases.map((c) => reserves.get(c)!),
    secours,
    { niveau, historique, exclus, rng: Math.random },
  );
}
