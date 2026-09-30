import { describe, expect, it } from 'vitest';
import { construirePropositions } from './propositions';
import { rngFixe } from './hasard';
import { pointsObtenus, pointsSuperCash, scoreMaximal, scorePotentiel, total } from './scores';
import type { Question } from './types';

describe('scores', () => {
  it('duo 1 point, carré 3 points, cash 5 points', () => {
    expect(pointsObtenus('duo', true)).toBe(1);
    expect(pointsObtenus('carre', true)).toBe(3);
    expect(pointsObtenus('cash', true)).toBe(5);
  });
  it('0 point pour une mauvaise réponse ou sans réponse', () => {
    expect(pointsObtenus('cash', false)).toBe(0);
    expect(pointsObtenus('duo', false)).toBe(0);
    expect(pointsObtenus(null, false)).toBe(0);
  });
  it('super cash : +5 ou −5', () => {
    expect(pointsSuperCash(true)).toBe(5);
    expect(pointsSuperCash(false)).toBe(-5);
  });
  it('score potentiel = somme des modes choisis', () => {
    expect(scorePotentiel(['cash', 'carre', 'duo', 'cash', 'cash', 'carre'])).toBe(22);
  });
  it('scores maximaux de chaque manche', () => {
    expect(scoreMaximal(10)).toBe(50); // partie rapide
    expect(scoreMaximal(6)).toBe(30); // Défi
    // Qualifs : duo + carré + cash imposés, puis 2 questions libres
    expect(total([1, 3, 5, scoreMaximal(2)])).toBe(19);
    // Compet' : 3 duo, 3 carré, 2 cash, puis super cash
    expect(total([1, 1, 1, 3, 3, 3, 5, 5, pointsSuperCash(true)])).toBe(27);
  });
});

describe('propositions', () => {
  const q: Question = {
    id: 'hist-000001', categorie: 'histoire', theme: null, niveau: 1,
    question: 'Quel roi de France était surnommé le Roi-Soleil ?', reponse: 'Louis XIV',
    variantes: [], mauvaises: ['Louis XV', 'Louis XIII', 'Henri IV'],
    anecdote: '', origine: 'base', date_creation: '2026-09-30',
  };
  it('duo : la bonne réponse + la mauvaise la plus plausible', () => {
    const p = construirePropositions(q, 'duo', rngFixe(1));
    expect(p).toHaveLength(2);
    expect(new Set(p)).toEqual(new Set(['Louis XIV', 'Louis XV']));
  });
  it('carré : la bonne réponse + les 3 mauvaises', () => {
    const p = construirePropositions(q, 'carre', rngFixe(2));
    expect(new Set(p)).toEqual(new Set(['Louis XIV', 'Louis XV', 'Louis XIII', 'Henri IV']));
  });
  it('cash : aucune proposition', () => {
    expect(construirePropositions(q, 'cash')).toEqual([]);
  });
  it("l'ordre est mélangé", () => {
    const positions = new Set<number>();
    for (let g = 0; g < 40; g++) positions.add(construirePropositions(q, 'carre', rngFixe(g)).indexOf('Louis XIV'));
    expect(positions.size).toBe(4);
  });
});
