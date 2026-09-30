import { describe, expect, it } from 'vitest';
import { rngFixe } from './hasard';
import { niveauCible, tirerSerie, tirerUne, type Historique } from './tirage';
import type { EntreeHistorique, Niveau, Question } from './types';

function q(id: string, niveau: Niveau = 2): Question {
  return {
    id, categorie: 'histoire', theme: null, niveau, question: `Question ${id} ?`, reponse: id,
    variantes: [], mauvaises: ['a', 'b', 'c'], anecdote: '', origine: 'base', date_creation: '2026-09-30',
  };
}

function vue(id: string, reussie: boolean, derniereVue: number, niveau: Niveau = 2): EntreeHistorique {
  return { id, categorie: 'histoire', theme: null, niveau, derniereVue, reussie, mode: 'carre', nbVues: 1, nbReussites: reussie ? 1 : 0 };
}

const hist = (...entrees: EntreeHistorique[]): Historique => new Map(entrees.map((e) => [e.id, e]));
const rien = new Set<string>();

describe('tirage sans répétition', () => {
  it('propose toujours en priorité une question jamais vue', () => {
    const pool = [q('a'), q('b'), q('c')];
    const h = hist(vue('a', false, 1), vue('b', true, 2));
    for (let g = 0; g < 20; g++) {
      expect(tirerUne(pool, 2, 2, rien, h, rngFixe(g))?.id).toBe('c');
    }
  });

  it('puis les ratées, les plus anciennes d’abord', () => {
    const pool = [q('a'), q('b'), q('c'), q('d')];
    const h = hist(vue('a', true, 1), vue('b', false, 30), vue('c', false, 10), vue('d', true, 5));
    expect(tirerUne(pool, 2, 2, rien, h, rngFixe(1))?.id).toBe('c');
  });

  it('puis les réussies, les plus anciennes d’abord', () => {
    const pool = [q('a'), q('b'), q('c')];
    const h = hist(vue('a', true, 50), vue('b', true, 20), vue('c', true, 99));
    expect(tirerUne(pool, 2, 2, rien, h, rngFixe(1))?.id).toBe('b');
  });

  it('ne propose jamais une question exclue (signalée ou déjà posée)', () => {
    const pool = [q('a'), q('b')];
    expect(tirerUne(pool, 2, 2, new Set(['a']), new Map(), rngFixe(3))?.id).toBe('b');
    expect(tirerUne(pool, 2, 2, new Set(['a', 'b']), new Map(), rngFixe(3))).toBeNull();
  });

  it('préfère le niveau visé, puis une inédite d’un niveau voisin avant de répéter', () => {
    const pool = [q('n2', 2), q('n3', 3), q('n4', 4)];
    expect(tirerUne(pool, 3, 2, rien, new Map(), rngFixe(1))?.id).toBe('n3');
    // n2 déjà ratée : une inédite de niveau voisin passe avant
    const h = hist(vue('n2', false, 1));
    expect(tirerUne([q('n2', 2), q('n3', 3)], 2, 2, rien, h, rngFixe(1))?.id).toBe('n3');
  });

  it('ne sort de la bande de niveaux (± 1) que si elle est vide', () => {
    const pool = [q('n1', 1), q('n4', 4)];
    // joueur niveau 1 : la bande est 1-2 ; n1 (même déjà réussie) passe avant n4 inédite
    const h = hist(vue('n1', true, 1, 1));
    expect(tirerUne(pool, 1, 1, rien, h, rngFixe(1))?.id).toBe('n1');
    expect(tirerUne([q('n4', 4)], 1, 1, rien, new Map(), rngFixe(1))?.id).toBe('n4');
  });

  it('une série de 10 ne contient jamais deux fois la même question', () => {
    const pool = Array.from({ length: 12 }, (_, i) => q(`q${i}`, 2));
    for (let g = 0; g < 30; g++) {
      const serie = tirerSerie(Array(10).fill(pool), pool, { niveau: 2, historique: new Map(), exclus: rien, rng: rngFixe(g) });
      expect(serie).toHaveLength(10);
      expect(new Set(serie.map((x) => x.id)).size).toBe(10);
    }
  });

  it('une série pioche dans la réserve de secours quand une case est épuisée', () => {
    const vide: Question[] = [];
    const secours = [q('s1'), q('s2')];
    const serie = tirerSerie([vide, vide], secours, { niveau: 2, historique: new Map(), exclus: rien, rng: rngFixe(4) });
    expect(serie.map((x) => x.id).sort()).toEqual(['s1', 's2']);
  });

  it('une série exclut les questions signalées', () => {
    const pool = [q('a'), q('b'), q('c')];
    const serie = tirerSerie([pool, pool], pool, { niveau: 2, historique: new Map(), exclus: new Set(['b']), rng: rngFixe(5) });
    expect(serie.map((x) => x.id)).not.toContain('b');
    expect(serie).toHaveLength(2);
  });

  it('vise surtout le niveau choisi, un peu les voisins', () => {
    const rng = rngFixe(42);
    const compte = { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<Niveau, number>;
    for (let i = 0; i < 2000; i++) compte[niveauCible(2, rng)]++;
    expect(compte[2] / 2000).toBeGreaterThan(0.65);
    expect(compte[2] / 2000).toBeLessThan(0.75);
    expect(compte[1]).toBeGreaterThan(0);
    expect(compte[3]).toBeGreaterThan(0);
    expect(compte[4]).toBe(0);
    // niveau 1 : le seul voisin est 2
    expect(niveauCible(1, () => 0.9)).toBe(2);
  });
});
