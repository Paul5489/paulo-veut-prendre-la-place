import { describe, expect, it } from 'vitest';
import {
  ajouterMatch,
  autre,
  championDeLaManche,
  cleDuo,
  scoreMatch,
  vainqueurDepartage,
  vainqueurManche,
  vainqueurMatch,
  type ResultatManche,
} from './duel';

const manche = (vainqueur: 'j1' | 'j2', j1 = 10, j2 = 8): ResultatManche => ({ vainqueur, scores: { j1, j2 }, auDepartage: false });

describe('Duel à deux', () => {
  it('le meilleur score gagne la manche, égalité = départage', () => {
    expect(vainqueurManche({ j1: 18, j2: 12 })).toBe('j1');
    expect(vainqueurManche({ j1: 9, j2: 21 })).toBe('j2');
    expect(vainqueurManche({ j1: 15, j2: 15 })).toBeNull();
  });

  it('départage : le plus proche gagne, égalité parfaite = nouvelle question', () => {
    expect(vainqueurDepartage({ j1: 1780, j2: 1795 }, 1789)).toBe('j2');
    expect(vainqueurDepartage({ j1: 1786, j2: 1795 }, 1789)).toBe('j1');
    expect(vainqueurDepartage({ j1: 1787, j2: 1791 }, 1789)).toBeNull();
  });

  it('match en 1, 2 ou 3 manches gagnantes', () => {
    expect(vainqueurMatch([manche('j2')], 1)).toBe('j2');
    expect(vainqueurMatch([manche('j1'), manche('j2')], 2)).toBeNull();
    expect(vainqueurMatch([manche('j1'), manche('j2'), manche('j1')], 2)).toBe('j1');
    expect(vainqueurMatch([manche('j1'), manche('j1')], 3)).toBeNull();
    expect(scoreMatch([manche('j1'), manche('j2'), manche('j1')])).toEqual({ j1: 2, j2: 1 });
  });

  it('le gagnant du pile ou face, puis celui de la manche précédente, choisit les thèmes', () => {
    expect(championDeLaManche([], 'j2')).toBe('j2');
    expect(championDeLaManche([manche('j1')], 'j2')).toBe('j1');
    expect(championDeLaManche([manche('j1'), manche('j2')], 'j1')).toBe('j2');
    expect(autre('j1')).toBe('j2');
  });

  it('historique entre deux joueurs, quel que soit l’ordre des prénoms', () => {
    expect(cleDuo('Paulo', 'Léa')).toBe(cleDuo('lea', 'PAULO'));
    let h = ajouterMatch(undefined, ['Paulo', 'Léa'], 'Léa', { Paulo: 18, Léa: 22 }, '0 – 1', 'd1');
    h = ajouterMatch(h, ['Léa', 'Paulo'], 'Paulo', { Paulo: 25, Léa: 14 }, '2 – 1', 'd2');
    expect(h.victoires).toEqual({ Paulo: 1, Léa: 1 });
    expect(h.meilleursScores).toEqual({ Paulo: 25, Léa: 22 });
    expect(h.matchs).toHaveLength(2);
  });
});
