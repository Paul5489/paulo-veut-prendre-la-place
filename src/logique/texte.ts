/**
 * Mise en forme des textes pour les comparer : minuscules, sans accents ni ponctuation,
 * articles de tête retirés, et nombres ramenés à des chiffres (« quatorze », « XIV » → 14).
 */

export function sansAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const ARTICLES = /^(de la |de l'|l'|le |la |les |un |une |des |du )/;

/** Minuscules, sans accents, sans ponctuation, espaces simples, sans article en tête. */
export function normaliser(s: string): string {
  let t = s.toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae');
  t = sansAccents(t).replace(/[’'`´ʼ‘]/g, "'");
  t = t.replace(/[^a-z0-9' ]+/g, ' ');
  t = t.replace(/\s*'\s*/g, "'").replace(/\s+/g, ' ').trim();
  const sansArticle = t.replace(ARTICLES, '');
  if (sansArticle.trim()) t = sansArticle;
  t = t.replace(/'/g, '');
  // « 10 000 » → « 10000 »
  const milliers = /(\d) (\d{3})(?!\d)/;
  while (milliers.test(t)) t = t.replace(milliers, '$1$2');
  // lettres et chiffres collés séparés (« B12 » → « b 12 », « H2O » → « h 2 o »), sauf ordinaux (« 1er », « 14e »)
  t = t.replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)(?!(?:er|re|ere|e|eme|ieme|nd|nde)\b)([a-z])/g, '$1 $2');
  return t.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Nombres écrits en lettres, en chiffres romains ou ordinaux
// ---------------------------------------------------------------------------

const CARDINAUX: Record<string, number> = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9,
  dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
  vingt: 20, vingts: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60,
  cent: 100, cents: 100, mille: 1000, million: 1e6, millions: 1e6, milliard: 1e9, milliards: 1e9,
};

const ORDINAUX: Record<string, number> = {
  premier: 1, premiere: 1, unieme: 1, deuxieme: 2, troisieme: 3, quatrieme: 4, cinquieme: 5,
  sixieme: 6, septieme: 7, huitieme: 8, neuvieme: 9, dixieme: 10, onzieme: 11, douzieme: 12,
  treizieme: 13, quatorzieme: 14, quinzieme: 15, seizieme: 16, vingtieme: 20, trentieme: 30,
  quarantieme: 40, cinquantieme: 50, soixantieme: 60, centieme: 100, millieme: 1000,
};

function valeurMot(m: string): number | undefined {
  return CARDINAUX[m] ?? ORDINAUX[m];
}

/** « mille sept cent quatre vingt neuf » → 1789 */
function valeurMots(mots: string[]): number {
  let total = 0;
  let courant = 0;
  let precedent = '';
  for (const m of mots) {
    const v = valeurMot(m)!;
    if (v >= 1000) {
      total += (courant || 1) * v;
      courant = 0;
    } else if (v === 100) {
      courant = (courant || 1) * 100;
    } else if (v === 20 && precedent === 'quatre') {
      courant += 80 - 4; // quatre-vingt(s)
    } else {
      courant += v;
    }
    precedent = m;
  }
  return total + courant;
}

const ROMAIN = /^m{0,4}(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/;
/** Mots qui ressemblent à des chiffres romains mais n'en sont (presque) jamais. */
const PAS_ROMAIN = new Set([
  'd', 'l', 'c', 'm', 'mi', 'mil', 'di', 'ci', 'li', 'dc', 'cd', 'mix', 'cm', 'mm', 'ml', 'cl', 'dl',
  'mc', 'xl', 'vie', 'mie', 'lie', 'cie', 'die', 'dive', 'ive',
]);
const VALEURS_ROMAINES: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };

function valeurRomaine(r: string): number {
  let total = 0;
  for (let i = 0; i < r.length; i++) {
    const v = VALEURS_ROMAINES[r[i]];
    const suivant = VALEURS_ROMAINES[r[i + 1]] ?? 0;
    total += v < suivant ? -v : v;
  }
  return total;
}

/** « 14 », « 14e », « 1er », « XIV », « XIVe », « Ier » → nombre ; sinon null. */
function nombreSimple(tok: string): number | null {
  const chiffres = tok.match(/^(\d+)(er|re|ere|e|eme|ieme|nd|nde)?$/);
  if (chiffres) return Number(chiffres[1]);
  if (tok === 'ier' || tok === 'ire') return 1;
  if (PAS_ROMAIN.has(tok)) return null;
  const romain = tok.match(/^([ivxlcdm]+)(e|eme|er|re)?$/);
  if (!romain || PAS_ROMAIN.has(romain[1]) || !ROMAIN.test(romain[1])) return null;
  return valeurRomaine(romain[1]);
}

export interface TexteAnalyse {
  /** texte normalisé complet */
  normal: string;
  /** lettres hors nombres, sans espaces (pour la tolérance aux fautes) */
  lettres: string;
  /** nombres trouvés, dans l'ordre */
  nombres: number[];
  /** lettres isolées (vitamine « D », « K » 2…), qui doivent correspondre exactement */
  initiales: string;
}

/** Mots d'une lettre qui ne sont pas des initiales (« à », « y », « ô ») */
const PAS_INITIALE = new Set(['a', 'y', 'o']);

export function analyser(s: string): TexteAnalyse {
  const normal = normaliser(s);
  const mots = normal ? normal.split(' ') : [];
  const nombres: number[] = [];
  const lettres: string[] = [];
  const initiales: string[] = [];
  let i = 0;
  while (i < mots.length) {
    if (valeurMot(mots[i]) !== undefined) {
      // suite de mots-nombres, avec « et » autorisé entre deux d'entre eux (vingt et un)
      const suite: string[] = [];
      while (i < mots.length) {
        if (valeurMot(mots[i]) !== undefined) suite.push(mots[i++]);
        else if (mots[i] === 'et' && suite.length && valeurMot(mots[i + 1] ?? '') !== undefined) i++;
        else break;
      }
      nombres.push(valeurMots(suite));
      continue;
    }
    const n = nombreSimple(mots[i]);
    if (n !== null) nombres.push(n);
    else {
      lettres.push(mots[i]);
      if (mots[i].length === 1 && !PAS_INITIALE.has(mots[i])) initiales.push(mots[i]);
    }
    i++;
  }
  return { normal, lettres: lettres.join(''), nombres, initiales: initiales.sort().join('') };
}

/** Lit un nombre tapé par le joueur (départage) : « 1 789 », « 42,195 », « -273 », « mille ». */
export function lireNombre(saisie: string): number | null {
  const brut = saisie.trim().replace(/[\s  ]/g, '').replace(',', '.');
  if (/^-?\d+(\.\d+)?$/.test(brut)) return Number(brut);
  const a = analyser(saisie);
  if (a.nombres.length === 1 && a.lettres === '') return a.nombres[0];
  return null;
}
