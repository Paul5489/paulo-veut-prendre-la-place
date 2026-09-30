import { describe, expect, it } from 'vitest';
import {
  choisirMode,
  creerJoueur,
  estimerNombre,
  genererAdversaires,
  probaReussite,
  simulerReponse,
  type Profil,
} from './adversaires';
import {
  appliquerDefi,
  attribuerSuperCash,
  choisirThemesChampion,
  couperClassement,
  departager,
  designerChallenger,
  etatInitial,
  vainqueurDefi,
  type ThemeInfo,
} from './carriere';
import { rngFixe } from './hasard';
import type { Niveau, Question } from './types';

const q = (id: string, niveau: Niveau = 2): Question => ({
  id, categorie: 'histoire', theme: null, niveau, question: `${id} ?`, reponse: `R-${id}`,
  variantes: [], mauvaises: ['A', 'B', 'C'], anecdote: '', origine: 'base', date_creation: '2026-09-30',
});

describe('adversaires virtuels', () => {
  it('génère des adversaires aux prénoms différents', () => {
    const advs = genererAdversaires(6, rngFixe(1), ['Paulo']);
    expect(new Set(advs.map((a) => a.prenom)).size).toBe(6);
    expect(advs.every((a) => !a.estJoueur && a.metier && a.ville)).toBe(true);
  });

  it('réussite cohérente avec le mode : duo > carré > cash', () => {
    for (const ecart of [-2, -1, 0, 1]) {
      expect(probaReussite(ecart, 'duo')).toBeGreaterThan(probaReussite(ecart, 'carre'));
      expect(probaReussite(ecart, 'carre')).toBeGreaterThan(probaReussite(ecart, 'cash'));
    }
  });

  it('jamais d’omniscience, jamais de nullité totale', () => {
    expect(probaReussite(10, 'duo')).toBeLessThan(1);
    expect(probaReussite(10, 'cash')).toBeLessThanOrEqual(0.97);
    expect(probaReussite(-10, 'cash')).toBeGreaterThanOrEqual(0.03);
  });

  it('un bon candidat réussit plus souvent qu’un faible', () => {
    expect(probaReussite(1, 'cash')).toBeGreaterThan(probaReussite(-1, 'cash'));
  });

  it('choisit le cash quand il est sûr de lui, le duo quand il est perdu', () => {
    const rng = rngFixe(7);
    const compte = (ecart: number) => {
      const c = { duo: 0, carre: 0, cash: 0 };
      for (let i = 0; i < 500; i++) c[choisirMode(ecart, 0, rng)]++;
      return c;
    };
    const facile = compte(2);
    const dur = compte(-2.5);
    expect(facile.cash).toBeGreaterThan(facile.duo);
    expect(dur.duo).toBeGreaterThan(dur.cash);
  });

  it('rate parfois des questions faciles et réussit parfois des difficiles', () => {
    const [adv] = genererAdversaires(1, rngFixe(3));
    const rng = rngFixe(11);
    let rateFacile = 0;
    let reussitDure = 0;
    for (let i = 0; i < 300; i++) {
      if (!simulerReponse(adv, q('f', 1), 3, 'cash', rng).correct) rateFacile++;
      if (simulerReponse(adv, q('d', 4), 1, 'cash', rng).correct) reussitDure++;
    }
    expect(rateFacile).toBeGreaterThan(0);
    expect(reussitDure).toBeGreaterThan(0);
  });

  it('donne une mauvaise réponse plausible quand il se trompe', () => {
    const [adv] = genererAdversaires(1, rngFixe(5));
    const rng = rngFixe(2);
    for (let i = 0; i < 50; i++) {
      const r = simulerReponse(adv, q('x'), 2, null, rng);
      expect(r.correct ? r.saisie === 'R-x' : ['A', 'B', 'C'].includes(r.saisie)).toBe(true);
    }
  });

  it('estime les nombres avec une erreur plausible', () => {
    const profil: Profil = { force: 0, categories: {}, audace: 0 };
    const rng = rngFixe(9);
    const annee = { id: 'd', question: '?', valeur: 1889, unite: '', niveau: 2 as Niveau, anecdote: '' };
    for (let i = 0; i < 50; i++) {
      const e = estimerNombre(profil, annee, 2, rng);
      expect(Number.isInteger(e)).toBe(true);
      expect(Math.abs(e - 1889)).toBeLessThan(200);
    }
    const decimal = { ...annee, valeur: 42.195, unite: 'km' };
    expect(Math.abs(estimerNombre(profil, decimal, 2, rng) - 42.195)).toBeLessThan(40);
  });
});

describe('qualification et départage', () => {
  const ordre = ['a', 'b', 'c', 'd', 'e', 'f'];

  it('les 4 meilleurs sont qualifiés', () => {
    const c = couperClassement({ a: 12, b: 3, c: 9, d: 15, e: 7, f: 1 }, ordre, 4);
    expect(c.qualifies.sort()).toEqual(['a', 'c', 'd', 'e']);
    expect(c.enBalance).toEqual([]);
    expect(c.elimines.sort()).toEqual(['b', 'f']);
  });

  it('égalité à la limite : départage entre les ex æquo', () => {
    const c = couperClassement({ a: 12, b: 10, c: 8, d: 8, e: 8, f: 3 }, ordre, 4);
    expect(c.qualifies.sort()).toEqual(['a', 'b']);
    expect(c.enBalance.sort()).toEqual(['c', 'd', 'e']);
    expect(c.placesRestantes).toBe(2);
    expect(c.elimines).toEqual(['f']);
  });

  it('égalité au-dessus de la limite : pas de départage', () => {
    const c = couperClassement({ a: 9, b: 9, c: 9, d: 5, e: 2, f: 1 }, ordre, 4);
    expect(c.enBalance).toEqual([]);
    expect(c.qualifies).toHaveLength(4);
  });

  it('le plus proche de la bonne valeur gagne le départage', () => {
    const gagnants = departager({ a: 1786, b: 1795, c: 1789 }, 1789, 2, rngFixe(1));
    expect(gagnants.sort()).toEqual(['a', 'c']);
  });
});

describe('Compet’ et super cash', () => {
  it('le meilleur devient challenger', () => {
    expect(designerChallenger({ a: 20, b: 14, c: 22, d: 9 }, ['a', 'b', 'c', 'd'], {})).toEqual({ challenger: 'c', egalite: [] });
  });

  it('égalité : le champion choisit le moins dangereux', () => {
    const r = designerChallenger({ a: 20, b: 20, c: 12, d: 9 }, ['a', 'b', 'c', 'd'], { a: 0.5, b: -0.2 });
    expect(r.challenger).toBe('b');
    expect(r.egalite.sort()).toEqual(['a', 'b']);
  });

  it('les questions les plus dures vont aux candidats les plus dangereux', () => {
    const questions = [q('n1', 1), q('n4', 4), q('n2', 2), q('n3', 3)];
    const r = attribuerSuperCash(['a', 'b', 'c', 'd'], { a: 5, b: 22, c: 14, d: 9 }, {}, questions, rngFixe(4));
    expect(r.b.niveau).toBe(4);
    expect(r.a.niveau).toBe(1);
    expect(new Set(Object.values(r).map((x) => x.id)).size).toBe(4);
  });
});

describe('Défi', () => {
  it('le challenger doit faire strictement mieux', () => {
    expect(vainqueurDefi(21, 20)).toBe('challenger');
    expect(vainqueurDefi(20, 20)).toBe('champion');
    expect(vainqueurDefi(15, 20)).toBe('champion');
  });

  it('le champion virtuel donne au challenger son thème le plus faible (le plus souvent)', () => {
    const themes: ThemeInfo[] = [
      { id: 't-hist', titre: 'H', categorie: 'histoire', description: '', nb: 13 },
      { id: 't-sport', titre: 'S', categorie: 'sport', description: '', nb: 13 },
      { id: 't-arts', titre: 'A', categorie: 'arts', description: '', nb: 13 },
      { id: 't-geo', titre: 'G', categorie: 'geographie', description: '', nb: 13 },
    ];
    const niveauJoueur = (c: string) => (c === 'sport' ? 0.2 : 0.7);
    const profil: Profil = { force: 0, categories: { arts: 0.9, sport: -0.5 }, audace: 0 };
    const rng = rngFixe(8);
    let sport = 0;
    let artsPourLui = 0;
    for (let i = 0; i < 200; i++) {
      const r = choisirThemesChampion(themes, niveauJoueur, profil, rng);
      expect(r.pourChallenger.id).not.toBe(r.pourChampion.id);
      if (r.pourChallenger.id === 't-sport') sport++;
      if (r.pourChampion.id === 't-arts') artsPourLui++;
    }
    expect(sport).toBeGreaterThan(120);
    expect(artsPourLui).toBeGreaterThan(100);
  });
});

describe('fauteuil du champion et cagnotte', () => {
  const joueur = creerJoueur('Paulo');

  it('le challenger vainqueur devient champion avec son score × 100 €', () => {
    const etat = etatInitial(rngFixe(1), 'Paulo');
    const { etat: apres, evenements } = appliquerDefi(etat, joueur, 22, 18, '2026-10-01');
    expect(apres.champion.participant.estJoueur).toBe(true);
    expect(apres.champion.victoires).toBe(1);
    expect(apres.champion.cagnotte).toBe(2200);
    expect(apres.palmares.meilleureSerie).toBe(1);
    expect(evenements[0].type).toBe('nouveau-champion');
  });

  it('le champion qui gagne empoche 100 € par point du challenger', () => {
    const etat = etatInitial(rngFixe(2), 'Paulo');
    const avant = etat.champion;
    const { etat: apres } = appliquerDefi(etat, joueur, 17, 17, '2026-10-01');
    expect(apres.champion.participant.id).toBe(avant.participant.id);
    expect(apres.champion.victoires).toBe(avant.victoires + 1);
    expect(apres.champion.cagnotte).toBe(avant.cagnotte + 1700);
    expect(apres.palmares.defaites).toHaveLength(1);
  });

  it('trophées à 10, 30, 50, 100 et 200 victoires', () => {
    let etat = etatInitial(rngFixe(3), 'Paulo');
    etat = appliquerDefi(etat, joueur, 25, 10, 'j0').etat;
    const [adv] = genererAdversaires(1, rngFixe(4));
    const trophees: number[] = [];
    for (let i = 0; i < 30; i++) {
      const r = appliquerDefi(etat, adv, 10, 20, `j${i + 1}`);
      etat = r.etat;
      r.evenements.forEach((e) => e.type === 'trophee' && trophees.push(e.palier));
    }
    expect(etat.champion.victoires).toBe(31);
    expect(trophees).toEqual([10, 30]);
    expect(etat.palmares.meilleureSerie).toBe(31);
    expect(etat.champion.cagnotte).toBe(2500 + 30 * 1000);
  });

  it('le joueur détrôné : sa série est enregistrée au palmarès', () => {
    let etat = etatInitial(rngFixe(5), 'Paulo');
    etat = appliquerDefi(etat, joueur, 25, 10, 'j0').etat;
    const [adv] = genererAdversaires(1, rngFixe(6));
    const r = appliquerDefi(etat, adv, 24, 20, 'j1');
    expect(r.etat.champion.participant.id).toBe(adv.id);
    expect(r.etat.palmares.series).toHaveLength(1);
    expect(r.etat.palmares.series[0].battuPar).toBe(adv.prenom);
    expect(r.etat.palmares.defaites).toHaveLength(1);
  });
});
