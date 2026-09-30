import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { ResultatQuestion } from './composants/CarteQuestion';
import type { CategorieId, Niveau } from './logique/types';
import type { Reglages } from './stockage/db';

export type Ecran =
  | { nom: 'accueil' }
  | { nom: 'rapide-config' }
  | { nom: 'rapide-jeu'; niveau: Niveau; categorie: CategorieId | 'melange' }
  | {
      nom: 'rapide-fin';
      niveau: Niveau;
      categorie: CategorieId | 'melange';
      resultats: ResultatQuestion[];
      record: boolean;
    }
  | { nom: 'reglages' }
  | { nom: 'carriere' }
  | { nom: 'carriere-partie' }
  | { nom: 'palmares' }
  | { nom: 'duel' }
  | { nom: 'duel-match' };

export type Aller = (e: Ecran) => void;

export interface ValeurContexte {
  reglages: Reglages;
  changerReglages: (r: Partial<Reglages>) => void;
  aller: Aller;
}

export const Contexte = createContext<ValeurContexte>(null!);
export const useAppli = () => useContext(Contexte);
