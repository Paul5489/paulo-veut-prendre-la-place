export type Niveau = 1 | 2 | 3 | 4;
export type ModeReponse = 'duo' | 'carre' | 'cash';

export type CategorieId =
  | 'histoire'
  | 'geographie'
  | 'sciences'
  | 'nature'
  | 'corps'
  | 'litterature'
  | 'arts'
  | 'cinema'
  | 'sport'
  | 'gastronomie'
  | 'societe'
  | 'mythologie'
  | 'insolite';

export interface Question {
  id: string;
  categorie: CategorieId;
  /** null = culture générale ; sinon l'identifiant d'un thème précis */
  theme: string | null;
  niveau: Niveau;
  question: string;
  reponse: string;
  variantes: string[];
  /** 3 mauvaises réponses ; la première (la plus plausible) sert en mode duo */
  mauvaises: string[];
  anecdote: string;
  origine: 'base' | 'ia';
  date_creation: string;
}

export interface Theme {
  id: string;
  titre: string;
  categorie: CategorieId;
  description: string;
  questions: Question[];
}

export interface QuestionDepartage {
  id: string;
  question: string;
  valeur: number;
  unite: string;
  niveau: Niveau;
  anecdote: string;
}

/** Ce que l'appli retient de chaque question déjà vue */
export interface EntreeHistorique {
  id: string;
  categorie: CategorieId;
  theme: string | null;
  niveau: Niveau;
  derniereVue: number;
  reussie: boolean;
  mode: ModeReponse | null;
  nbVues: number;
  nbReussites: number;
}

export type MotifSignalement = 'fausse' | 'ambigue' | 'faute' | 'niveau';

export const MOTIFS_SIGNALEMENT: Record<MotifSignalement, string> = {
  fausse: 'Réponse fausse',
  ambigue: 'Question ambiguë',
  faute: "Faute d'orthographe",
  niveau: 'Niveau mal évalué',
};

export const NIVEAUX: { niveau: Niveau; nom: string }[] = [
  { niveau: 1, nom: 'Facile' },
  { niveau: 2, nom: 'Moyen' },
  { niveau: 3, nom: 'Difficile' },
  { niveau: 4, nom: 'Expert' },
];
