import { describe, expect, it } from 'vitest';
import { distance, tolerance, verifierCash } from './cash';
import { analyser, lireNombre, normaliser } from './texte';

const roi = {
  reponse: 'Louis XIV',
  variantes: ['Louis 14', 'Louis quatorze'],
  mauvaises: ['Louis XV', 'Louis XIII', 'Henri IV'],
};
const ok = (saisie: string, q = roi) => verifierCash(saisie, q.reponse, q.variantes, q.mauvaises);

describe('normalisation', () => {
  it('retire majuscules, accents, ponctuation et espaces en trop', () => {
    expect(normaliser('  Élisabeth   II !  ')).toBe('elisabeth ii');
    expect(normaliser('Saint-Étienne')).toBe('saint etienne');
    expect(normaliser('Œdipe')).toBe('oedipe');
  });
  it('ignore les articles en début de réponse', () => {
    expect(normaliser('Le Havre')).toBe('havre');
    expect(normaliser("L'Everest")).toBe('everest');
    expect(normaliser('de la farine')).toBe('farine');
    expect(normaliser('Les Misérables')).toBe('miserables');
    expect(normaliser('du beurre')).toBe('beurre');
  });
  it("garde le mot s'il n'y a que l'article", () => {
    expect(normaliser('La')).toBe('la');
  });
  it('regroupe les milliers', () => {
    expect(normaliser('10 000')).toBe('10000');
  });
});

describe('nombres', () => {
  it('reconnaît chiffres, lettres et chiffres romains', () => {
    expect(analyser('14').nombres).toEqual([14]);
    expect(analyser('quatorze').nombres).toEqual([14]);
    expect(analyser('XIV').nombres).toEqual([14]);
    expect(analyser('mille sept cent quatre-vingt-neuf').nombres).toEqual([1789]);
    expect(analyser('soixante-dix').nombres).toEqual([70]);
    expect(analyser('quatre-vingts').nombres).toEqual([80]);
    expect(analyser('quatre-vingt-dix-neuf').nombres).toEqual([99]);
    expect(analyser('vingt et un').nombres).toEqual([21]);
    expect(analyser('deux cents').nombres).toEqual([200]);
    expect(analyser('trois mille').nombres).toEqual([3000]);
  });
  it('reconnaît les ordinaux', () => {
    expect(analyser('François Ier').nombres).toEqual([1]);
    expect(analyser('François 1er').nombres).toEqual([1]);
    expect(analyser('François premier').nombres).toEqual([1]);
    expect(analyser('XIXe siècle').nombres).toEqual([19]);
    expect(analyser('19e siècle').nombres).toEqual([19]);
    expect(analyser('dix-neuvième siècle').nombres).toEqual([19]);
  });
  it('ne prend pas les mots courants pour des chiffres romains', () => {
    expect(analyser('de').nombres).toEqual([]);
    expect(analyser('vitamine C').nombres).toEqual([]);
    expect(analyser('la vie').nombres).toEqual([]);
  });
  it('lit un nombre saisi pour un départage', () => {
    expect(lireNombre('1789')).toBe(1789);
    expect(lireNombre('1 789')).toBe(1789);
    expect(lireNombre('42,195')).toBe(42.195);
    expect(lireNombre('-273')).toBe(-273);
    expect(lireNombre('mille neuf cent')).toBe(1900);
    expect(lireNombre('bonjour')).toBeNull();
  });
});

describe('distance et tolérance', () => {
  it('compte les fautes de frappe', () => {
    expect(distance('paris', 'paris')).toBe(0);
    expect(distance('paris', 'pari')).toBe(1);
    expect(distance('paris', 'parsi')).toBe(1); // inversion = 1 faute
    expect(distance('chat', 'chien')).toBe(3);
  });
  it('suit le barème : 0 faute ≤ 3 lettres, 1 ≤ 5, 2 ≤ 10, 3 au-delà', () => {
    expect(tolerance(2)).toBe(0);
    expect(tolerance(3)).toBe(0);
    expect(tolerance(4)).toBe(1);
    expect(tolerance(5)).toBe(1);
    expect(tolerance(6)).toBe(2);
    expect(tolerance(10)).toBe(2);
    expect(tolerance(11)).toBe(3);
  });
});

describe('validation des réponses cash', () => {
  it('accepte la bonne réponse et ses variantes, quelle que soit la forme', () => {
    expect(ok('Louis XIV')).toBe(true);
    expect(ok('louis xiv')).toBe(true);
    expect(ok('Louis 14')).toBe(true);
    expect(ok('louis quatorze')).toBe(true);
    expect(ok('  LOUIS   XIV. ')).toBe(true);
  });
  it('tolère les fautes de frappe', () => {
    expect(ok('Loui XIV')).toBe(true);
    expect(ok('Luois 14')).toBe(true);
  });
  it('refuse un autre numéro de roi (nombres exacts)', () => {
    expect(ok('Louis XV')).toBe(false);
    expect(ok('Louis 13')).toBe(false);
    expect(ok('Louis')).toBe(false);
  });
  it('refuse une réponse vide', () => {
    expect(ok('')).toBe(false);
    expect(ok('   ')).toBe(false);
  });
  it('dates : 1788 ne valide jamais 1789', () => {
    const q = { reponse: '1789', variantes: [], mauvaises: ['1788', '1792', '1799'] };
    expect(ok('1789', q)).toBe(true);
    expect(ok('en 1789', q)).toBe(true);
    expect(ok('mille sept cent quatre-vingt-neuf', q)).toBe(true);
    expect(ok('1788', q)).toBe(false);
    expect(ok('1798', q)).toBe(false);
  });
  it('refuse une mauvaise proposition proche (Irak / Iran)', () => {
    const q = { reponse: 'Irak', variantes: ['Iraq'], mauvaises: ['Iran', 'Syrie', 'Jordanie'] };
    expect(ok('Irak', q)).toBe(true);
    expect(ok('Iraq', q)).toBe(true);
    expect(ok('Iran', q)).toBe(false);
  });
  it('refuse le nom de famille d’une mauvaise proposition proche (Monet / Manet)', () => {
    const q = { reponse: 'Claude Monet', variantes: ['Monet'], mauvaises: ['Édouard Manet', 'Auguste Renoir', 'Edgar Degas'] };
    expect(ok('Monet', q)).toBe(true);
    expect(ok('Monnet', q)).toBe(true);
    expect(ok('Manet', q)).toBe(false);
    expect(ok('Edouard Manet', q)).toBe(false);
  });
  it("aucune faute tolérée pour les réponses de 3 lettres ou moins", () => {
    const fer = { reponse: 'Fe', variantes: [], mauvaises: ['Fr', 'Ag', 'Au'] };
    expect(ok('Fe', fer)).toBe(true);
    expect(ok('fe', fer)).toBe(true);
    expect(ok('Fr', fer)).toBe(false);
    expect(ok('Fi', fer)).toBe(false);
  });
  it('1 faute tolérée jusqu’à 5 lettres, 2 jusqu’à 10, 3 au-delà', () => {
    const paris = { reponse: 'Paris', variantes: [], mauvaises: ['Lyon', 'Marseille', 'Lille'] };
    expect(ok('Pari', paris)).toBe(true);
    expect(ok('Pa', paris)).toBe(false);
    const bordeaux = { reponse: 'Bordeaux', variantes: [], mauvaises: ['Toulouse', 'Nantes', 'Rennes'] };
    expect(ok('Bordo', bordeaux)).toBe(false); // 3 fautes
    expect(ok('Bordeau', bordeaux)).toBe(true);
    expect(ok('Bordaux', bordeaux)).toBe(true);
    const long = { reponse: 'Constantinople', variantes: [], mauvaises: ['Byzance', 'Ankara', 'Smyrne'] };
    expect(ok('Constantinopel', long)).toBe(true);
    expect(ok('Konstantinopl', long)).toBe(true);
  });
  it('ignore les articles et les apostrophes', () => {
    const q = { reponse: "Jeanne d'Arc", variantes: [], mauvaises: ['Jeanne Hachette', 'Catherine de Médicis', 'Aliénor d’Aquitaine'] };
    expect(ok('jeanne darc', q)).toBe(true);
    expect(ok("Jeanne d’Arc", q)).toBe(true);
    const havre = { reponse: 'Le Havre', variantes: [], mauvaises: ['Brest', 'Cherbourg', 'Dieppe'] };
    expect(ok('Havre', havre)).toBe(true);
    expect(ok('le havre', havre)).toBe(true);
  });
  it('lettres isolées et codes (vitamines, formules) : exacts', () => {
    const vitD = { reponse: 'La vitamine D', variantes: ['D'], mauvaises: ['La vitamine C', 'La vitamine A', 'La vitamine B12'] };
    expect(ok('vitamine D', vitD)).toBe(true);
    expect(ok('vitamne d', vitD)).toBe(true);
    expect(ok('d', vitD)).toBe(true);
    expect(ok('vitamine E', vitD)).toBe(false);
    expect(ok('vitamine C', vitD)).toBe(false);
    const b12 = { reponse: 'B12', variantes: ['Vitamine B12'], mauvaises: ['B6', 'B9', 'D'] };
    expect(ok('b12', b12)).toBe(true);
    expect(ok('vitamine b 12', b12)).toBe(true);
    expect(ok('B6', b12)).toBe(false);
    const eau = { reponse: 'H2O', variantes: [], mauvaises: ['CO2', 'O2', 'H2O2'] };
    expect(ok('h2o', eau)).toBe(true);
    expect(ok('H2O2', eau)).toBe(false);
    expect(ok('CO2', eau)).toBe(false);
  });
  it('ordinaux collés : « 1ère », « 14e »', () => {
    const q = { reponse: 'Élisabeth Ire', variantes: ['Elizabeth I'], mauvaises: ['Marie Tudor', 'Marie Stuart', 'Anne Boleyn'] };
    expect(ok('Elisabeth 1ere', q)).toBe(true);
    expect(ok('élisabeth première', q)).toBe(true);
    expect(ok('Elizabeth I', q)).toBe(true);
    expect(ok('Elisabeth II', q)).toBe(false);
  });
  it('accepte chiffres, lettres et chiffres romains pour un même nombre', () => {
    const q = { reponse: '14', variantes: [], mauvaises: ['12', '15', '16'] };
    expect(ok('quatorze', q)).toBe(true);
    expect(ok('XIV', q)).toBe(true);
    expect(ok('14', q)).toBe(true);
    expect(ok('15', q)).toBe(false);
  });
});
