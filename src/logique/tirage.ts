import { choisir, type Rng } from './hasard';
import type { EntreeHistorique, Niveau, Question } from './types';

/**
 * Tirage des questions sans répétition.
 *
 * Priorités, dans la bande de niveaux autorisée (niveau choisi ± 1, niveau visé d'abord) :
 *   1. les questions jamais vues (au hasard) ;
 *   2. puis les questions ratées, les plus anciennes d'abord ;
 *   3. puis les questions réussies, les plus anciennes d'abord.
 * Ce n'est que si la bande est vide qu'on sort des niveaux autorisés.
 * Les questions exclues (signalées, ou déjà posées dans la partie) ne sortent jamais.
 */

export type Historique = Map<string, EntreeHistorique>;

/** 0 = jamais vue, 1 = ratée, 2 = réussie */
function palier(q: Question, historique: Historique): 0 | 1 | 2 {
  const h = historique.get(q.id);
  if (!h) return 0;
  return h.reussie ? 2 : 1;
}

function niveauxValides(niveaux: number[]): Niveau[] {
  return niveaux.filter((n): n is Niveau => n >= 1 && n <= 4);
}

/** Surtout le niveau choisi (70 %), un peu les niveaux voisins pour la variété. */
export function niveauCible(niveau: Niveau, rng: Rng): Niveau {
  if (rng() < 0.7) return niveau;
  return choisir(niveauxValides([niveau - 1, niveau + 1]), rng);
}

export function tirerUne(
  pool: readonly Question[],
  cible: Niveau,
  niveauJoueur: Niveau,
  exclus: ReadonlySet<string>,
  historique: Historique,
  rng: Rng,
): Question | null {
  const dispo = pool.filter((q) => !exclus.has(q.id));
  if (!dispo.length) return null;

  const bande = niveauxValides([cible, niveauJoueur, niveauJoueur - 1, niveauJoueur + 1]);
  const bandeUnique = [...new Set(bande)];
  const horsBande = niveauxValides([1, 2, 3, 4])
    .filter((n) => !bandeUnique.includes(n))
    .sort((a, b) => Math.abs(a - niveauJoueur) - Math.abs(b - niveauJoueur));

  for (const groupe of [bandeUnique, horsBande]) {
    for (const p of [0, 1, 2] as const) {
      for (const niv of groupe) {
        const candidats = dispo.filter((q) => q.niveau === niv && palier(q, historique) === p);
        if (!candidats.length) continue;
        if (p === 0) return choisir(candidats, rng);
        const plusAncienne = Math.min(...candidats.map((q) => historique.get(q.id)!.derniereVue));
        return choisir(
          candidats.filter((q) => historique.get(q.id)!.derniereVue === plusAncienne),
          rng,
        );
      }
    }
  }
  return null;
}

export interface OptionsSerie {
  niveau: Niveau;
  historique: Historique;
  /** questions à ne jamais proposer (signalées…) */
  exclus: ReadonlySet<string>;
  rng: Rng;
}

/**
 * Tire une série : une question par case, chaque case ayant sa propre réserve
 * (par exemple une catégorie différente). Si une réserve est épuisée, on pioche dans `secours`.
 * Jamais deux fois la même question dans la série.
 */
export function tirerSerie(
  reservesParCase: readonly (readonly Question[])[],
  secours: readonly Question[],
  o: OptionsSerie,
): Question[] {
  const exclus = new Set(o.exclus);
  const serie: Question[] = [];
  for (const reserve of reservesParCase) {
    const cible = niveauCible(o.niveau, o.rng);
    const q =
      tirerUne(reserve, cible, o.niveau, exclus, o.historique, o.rng) ??
      tirerUne(secours, cible, o.niveau, exclus, o.historique, o.rng);
    if (!q) break;
    exclus.add(q.id);
    serie.push(q);
  }
  return serie;
}
