/**
 * npm run check-questions
 *
 * Contrôle la banque : format, identifiants uniques, doublons, mauvaises réponses
 * différentes de la bonne, cohérence avec la validation des réponses cash.
 * Affiche ensuite la répartition par catégorie, niveau et thème.
 * Sort en erreur (code 1) si un problème bloquant est trouvé.
 */
import { basename } from 'node:path';
import { distance, verifierCash } from '../src/logique/cash';
import { CATEGORIES, CATEGORIES_PAR_ID, estCategorie } from '../src/logique/categories';
import { analyser, normaliser } from '../src/logique/texte';
import type { Question } from '../src/logique/types';
import { lireBanque } from './banque-fichiers';

const erreurs: string[] = [];
const avertissements: string[] = [];
const banque = lireBanque();

const toutes: { q: Question; ou: string }[] = [
  ...banque.categories.flatMap((c) => c.questions.map((q) => ({ q, ou: basename(c.fichier) }))),
  ...banque.themes.flatMap(({ fichier, theme }) => theme.questions.map((q) => ({ q, ou: basename(fichier) }))),
];

const texte = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

// --- Format de chaque question --------------------------------------------------
for (const { q, ou } of toutes) {
  const ref = `${ou} › ${q.id ?? '(sans id)'}`;
  const e = (m: string) => erreurs.push(`${ref} : ${m}`);
  const a = (m: string) => avertissements.push(`${ref} : ${m}`);

  if (!texte(q.id)) e('id manquant (lancer npm run formater-banque)');
  if (!estCategorie(q.categorie)) e(`catégorie inconnue « ${q.categorie} »`);
  if (![1, 2, 3, 4].includes(q.niveau)) e(`niveau invalide (${q.niveau})`);
  if (!texte(q.question)) e('question vide');
  if (!texte(q.reponse)) e('réponse vide');
  if (!texte(q.anecdote)) e('anecdote vide');
  if (!Array.isArray(q.variantes) || !q.variantes.every(texte)) e('variantes invalides');
  if (!Array.isArray(q.mauvaises) || q.mauvaises.length !== 3 || !q.mauvaises.every(texte)) {
    e('il faut exactement 3 mauvaises réponses');
    continue;
  }
  if (!['base', 'ia'].includes(q.origine)) e(`origine invalide (${q.origine})`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(q.date_creation ?? '')) e('date_creation invalide');
  if (q.theme === null && estCategorie(q.categorie) && !q.id.startsWith(CATEGORIES_PAR_ID[q.categorie].prefixe + '-')) {
    e(`l'identifiant devrait commencer par « ${CATEGORIES_PAR_ID[q.categorie].prefixe}- »`);
  }

  // Mauvaises réponses : jamais égales à la bonne, ni à une variante, ni entre elles
  const bonnes = [q.reponse, ...q.variantes].map(normaliser);
  const mauvaises = q.mauvaises.map(normaliser);
  mauvaises.forEach((m, i) => {
    if (bonnes.includes(m)) e(`la mauvaise réponse « ${q.mauvaises[i]} » est égale à la bonne`);
  });
  if (new Set(mauvaises).size !== 3) e('deux mauvaises réponses identiques');

  // Cohérence avec la correction des réponses cash
  for (const v of [q.reponse, ...q.variantes]) {
    if (!verifierCash(v, q.reponse, q.variantes, q.mauvaises)) e(`la réponse « ${v} » serait refusée en cash`);
  }
  for (const m of q.mauvaises) {
    if (verifierCash(m, q.reponse, q.variantes, q.mauvaises)) {
      e(`la mauvaise réponse « ${m} » serait acceptée en cash (trop proche de la bonne)`);
    }
  }

  // Style
  if (!q.question.trim().endsWith('?')) a('la question ne finit pas par « ? »');
  if (q.reponse.trim().split(/\s+/).length > 4) a(`réponse longue pour du cash (« ${q.reponse} »)`);
  if (q.anecdote.length > 260) a('anecdote longue (1 à 2 phrases attendues)');
}

// --- Identifiants uniques ---------------------------------------------------------
const vus = new Map<string, string>();
for (const { q, ou } of toutes) {
  if (!q.id) continue;
  if (vus.has(q.id)) erreurs.push(`identifiant « ${q.id} » en double (${vus.get(q.id)} et ${ou})`);
  vus.set(q.id, ou);
}

// --- Doublons : même réponse et texte de question très proche ----------------------
const parReponse = new Map<string, { q: Question; ou: string; texte: string }[]>();
for (const { q, ou } of toutes) {
  const cle = analyser(q.reponse).normal;
  const liste = parReponse.get(cle) ?? [];
  liste.push({ q, ou, texte: normaliser(q.question) });
  parReponse.set(cle, liste);
}
for (const [reponse, liste] of parReponse) {
  for (let i = 0; i < liste.length; i++) {
    for (let j = i + 1; j < liste.length; j++) {
      const a = liste[i];
      const b = liste[j];
      const d = distance(a.texte, b.texte);
      if (d <= Math.max(3, Math.min(a.texte.length, b.texte.length) * 0.2)) {
        erreurs.push(`doublon probable : ${a.q.id} et ${b.q.id} (réponse « ${reponse} »)`);
      } else if (a.q.theme === b.q.theme && !/^[\d ]+$/.test(reponse)) {
        // (les réponses purement numériques se répètent forcément : pas d'avertissement)
        avertissements.push(`même réponse « ${reponse} » : ${a.q.id} et ${b.q.id} (vérifier que ce n'est pas le même fait)`);
      }
    }
  }
}

// --- Thèmes ---------------------------------------------------------------------------
const idsThemes = new Set<string>();
for (const { fichier, theme } of banque.themes) {
  const ref = basename(fichier);
  if (theme.id !== basename(fichier, '.json')) erreurs.push(`${ref} : l'id du thème doit être le nom du fichier`);
  if (idsThemes.has(theme.id)) erreurs.push(`${ref} : thème en double`);
  idsThemes.add(theme.id);
  if (!texte(theme.titre) || !texte(theme.description)) erreurs.push(`${ref} : titre ou description manquant`);
  if (!estCategorie(theme.categorie)) erreurs.push(`${ref} : catégorie inconnue`);
  if (theme.questions.length < 12) erreurs.push(`${ref} : ${theme.questions.length} questions (12 minimum)`);
  if (new Set(theme.questions.map((q) => q.niveau)).size < 3) avertissements.push(`${ref} : niveaux peu variés`);
  for (const q of theme.questions) {
    if (q.theme !== theme.id) erreurs.push(`${ref} › ${q.id} : champ theme incohérent`);
  }
}

// --- Départage ----------------------------------------------------------------------------
const idsDep = new Set<string>();
const textesDep = new Set<string>();
for (const d of banque.departage) {
  const ref = `departage.json › ${d.id}`;
  if (!texte(d.id)) erreurs.push(`${ref} : id manquant`);
  if (idsDep.has(d.id)) erreurs.push(`${ref} : id en double`);
  idsDep.add(d.id);
  if (!texte(d.question)) erreurs.push(`${ref} : question vide`);
  if (typeof d.valeur !== 'number' || !Number.isFinite(d.valeur)) erreurs.push(`${ref} : valeur non numérique`);
  if (typeof d.unite !== 'string') erreurs.push(`${ref} : unité manquante (mettre "" si aucune)`);
  if (![1, 2, 3, 4].includes(d.niveau)) erreurs.push(`${ref} : niveau invalide`);
  if (!texte(d.anecdote)) erreurs.push(`${ref} : anecdote vide`);
  const t = normaliser(d.question);
  if (textesDep.has(t)) erreurs.push(`${ref} : question en double`);
  textesDep.add(t);
}

// --- Répartition ---------------------------------------------------------------------------
console.log('\nRépartition des questions générales');
console.log('Catégorie'.padEnd(34) + ['N1', 'N2', 'N3', 'N4', 'Total'].map((s) => s.padStart(6)).join(''));
let totalGeneral = 0;
const totauxNiveaux = [0, 0, 0, 0];
for (const cat of CATEGORIES) {
  const qs = banque.categories.find((c) => c.id === cat.id)?.questions ?? [];
  const parNiveau = [1, 2, 3, 4].map((n) => qs.filter((q) => q.niveau === n).length);
  parNiveau.forEach((n, i) => (totauxNiveaux[i] += n));
  totalGeneral += qs.length;
  console.log(`${cat.emoji} ${cat.nom}`.padEnd(34) + [...parNiveau, qs.length].map((n) => String(n).padStart(6)).join(''));
}
console.log('Total'.padEnd(34) + [...totauxNiveaux, totalGeneral].map((n) => String(n).padStart(6)).join(''));

console.log(`\nThèmes précis : ${banque.themes.length}`);
for (const { theme } of banque.themes) {
  const niv = [1, 2, 3, 4].map((n) => theme.questions.filter((q) => q.niveau === n).length).join('/');
  console.log(`  ${theme.titre.padEnd(40)} ${String(theme.questions.length).padStart(3)} questions (niveaux ${niv})`);
}
console.log(`\nQuestions de départage : ${banque.departage.length}`);
console.log(`Total : ${toutes.length + banque.departage.length} questions\n`);

if (avertissements.length) {
  console.log(`⚠️  ${avertissements.length} avertissement(s) :`);
  avertissements.forEach((m) => console.log('   - ' + m));
}
if (erreurs.length) {
  console.log(`\n❌ ${erreurs.length} erreur(s) :`);
  erreurs.forEach((m) => console.log('   - ' + m));
  process.exit(1);
}
console.log('✅ Aucune erreur bloquante.');
