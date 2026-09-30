import { analyser, type TexteAnalyse } from './texte';

/**
 * Distance entre deux textes : nombre de fautes de frappe (lettre en trop, en moins,
 * remplacée, ou deux lettres inversées qui comptent pour une seule faute).
 */
export function distance(a: string, b: string): number {
  const n = a.length;
  const m = b.length;
  if (!n) return m;
  if (!m) return n;
  const d: number[][] = [];
  for (let i = 0; i <= n; i++) d.push([i, ...new Array<number>(m).fill(0)]);
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cout);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[n][m];
}

/** Nombre de fautes tolérées selon la longueur de la bonne réponse. */
export function tolerance(longueur: number): number {
  if (longueur <= 3) return 0;
  if (longueur <= 5) return 1;
  if (longueur <= 10) return 2;
  return 3;
}

function memesNombres(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((n, i) => n === b[i]);
}

/**
 * Nombre de fautes entre la saisie et une réponse, ou null si elles sont incompatibles
 * (nombres différents : 1788 ne valide jamais 1789, Louis XV ne valide jamais Louis XIV).
 */
function ecart(saisie: TexteAnalyse, attendu: TexteAnalyse): number | null {
  if (!memesNombres(saisie.nombres, attendu.nombres)) return null;
  // Lettres isolées exactes : « vitamine E » ne valide pas « vitamine D »
  if (saisie.initiales !== attendu.initiales && attendu.lettres !== '') return null;
  // Réponse purement numérique : les mots autour du nombre (« en 1789 ») sont ignorés.
  if (attendu.lettres === '' && attendu.nombres.length) return 0;
  return distance(saisie.lettres, attendu.lettres);
}

/**
 * Vérifie une réponse cash.
 * - comparaison avec la bonne réponse et ses variantes, fautes de frappe tolérées ;
 * - nombres exacts ;
 * - refusée si elle correspond à une des mauvaises propositions, ou en est plus proche.
 */
export function verifierCash(
  saisie: string,
  reponse: string,
  variantes: string[] = [],
  mauvaises: string[] = [],
): boolean {
  const s = analyser(saisie);
  if (!s.normal) return false;

  let meilleur: number | null = null;
  for (const texte of [reponse, ...variantes]) {
    const a = analyser(texte);
    const e = ecart(s, a);
    if (e !== null && e <= tolerance(a.lettres.length) && (meilleur === null || e < meilleur)) meilleur = e;
  }
  if (meilleur === null) return false;
  if (meilleur === 0) return true;

  for (const texte of formesMauvaises(mauvaises)) {
    const e = ecart(s, analyser(texte));
    if (e !== null && e < meilleur) return false;
  }
  return true;
}

/** Les mauvaises réponses, plus le dernier mot de chacune (« Édouard Manet » → « Manet »). */
function formesMauvaises(mauvaises: string[]): string[] {
  const formes = [...mauvaises];
  for (const m of mauvaises) {
    const mots = analyser(m).normal.split(' ');
    if (mots.length >= 2) formes.push(mots[mots.length - 1]);
  }
  return formes;
}
