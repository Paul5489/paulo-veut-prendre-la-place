/**
 * npm run formater-banque
 *
 * Complète les champs automatiques des questions (id, categorie, theme, origine, date_creation),
 * remet les champs dans l'ordre, réécrit les fichiers au format « une question par ligne »
 * et régénère public/data/index.json (le sommaire chargé par l'appli).
 *
 * Pour ajouter des questions, il suffit donc d'écrire question, niveau, reponse, variantes,
 * mauvaises et anecdote : ce script s'occupe du reste.
 */
import { writeFileSync } from 'node:fs';
import { CATEGORIES_PAR_ID, estCategorie } from '../src/logique/categories';
import type { CategorieId, Question, QuestionDepartage } from '../src/logique/types';
import { ecrireListe, ecrireTheme, FICHIER_DEPARTAGE, FICHIER_INDEX, lireBanque } from './banque-fichiers';

const aujourdhui = new Date().toISOString().slice(0, 10);
const banque = lireBanque();

function numeroMax(ids: string[], prefixe: string): number {
  return ids.reduce((max, id) => {
    const m = id.match(new RegExp(`^${prefixe}-(\\d+)$`));
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
}

function remettreEnOrdre(q: Partial<Question>, id: string, categorie: CategorieId, theme: string | null): Question {
  return {
    id,
    categorie,
    theme,
    niveau: q.niveau!,
    question: q.question!,
    reponse: q.reponse!,
    variantes: q.variantes ?? [],
    mauvaises: q.mauvaises!,
    anecdote: q.anecdote!,
    origine: q.origine ?? 'base',
    date_creation: q.date_creation ?? aujourdhui,
  };
}

// --- Questions générales, par catégorie --------------------------------------
for (const c of banque.categories) {
  if (!estCategorie(c.id)) throw new Error(`Fichier de catégorie inconnue : ${c.fichier}`);
  const prefixe = CATEGORIES_PAR_ID[c.id].prefixe;
  let suivant = numeroMax(c.questions.map((q) => q.id ?? ''), prefixe);
  c.questions = c.questions.map((q) =>
    remettreEnOrdre(q, q.id || `${prefixe}-${String(++suivant).padStart(6, '0')}`, c.id as CategorieId, null),
  );
  ecrireListe(c.fichier, c.questions);
}

// --- Thèmes -------------------------------------------------------------------
for (const { fichier, theme } of banque.themes) {
  const prefixe = `t-${theme.id}`;
  let suivant = numeroMax(theme.questions.map((q) => q.id ?? ''), prefixe);
  theme.questions = theme.questions.map((q) =>
    remettreEnOrdre(q, q.id || `${prefixe}-${String(++suivant).padStart(2, '0')}`, theme.categorie, theme.id),
  );
  ecrireTheme(fichier, theme);
}

// --- Départage ------------------------------------------------------------------
let suivantDep = numeroMax(banque.departage.map((d) => d.id ?? ''), 'dep');
banque.departage = banque.departage.map(
  (d): QuestionDepartage => ({
    id: d.id || `dep-${String(++suivantDep).padStart(4, '0')}`,
    question: d.question,
    valeur: d.valeur,
    unite: d.unite ?? '',
    niveau: d.niveau,
    anecdote: d.anecdote,
  }),
);
ecrireListe(FICHIER_DEPARTAGE, banque.departage);

// --- Sommaire -------------------------------------------------------------------
const index = {
  categories: Object.fromEntries(
    banque.categories.map((c) => [
      c.id,
      {
        nb: c.questions.length,
        parNiveau: Object.fromEntries([1, 2, 3, 4].map((n) => [n, c.questions.filter((q) => q.niveau === n).length])),
      },
    ]),
  ),
  themes: banque.themes.map(({ theme }) => ({
    id: theme.id,
    titre: theme.titre,
    categorie: theme.categorie,
    description: theme.description,
    nb: theme.questions.length,
  })),
  departage: banque.departage.length,
};
writeFileSync(FICHIER_INDEX, JSON.stringify(index, null, 2) + '\n');

const nbGenerales = banque.categories.reduce((s, c) => s + c.questions.length, 0);
console.log(
  `✓ Banque formatée : ${nbGenerales} questions générales, ${banque.themes.length} thèmes, ${banque.departage.length} départages.`,
);
