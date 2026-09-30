import type { CategorieId } from './types';

export interface Categorie {
  id: CategorieId;
  nom: string;
  emoji: string;
  /** préfixe des identifiants de questions (ex. hist-000123) */
  prefixe: string;
}

export const CATEGORIES: Categorie[] = [
  { id: 'histoire', nom: 'Histoire', emoji: '🏰', prefixe: 'hist' },
  { id: 'geographie', nom: 'Géographie', emoji: '🌍', prefixe: 'geo' },
  { id: 'sciences', nom: 'Sciences & techniques', emoji: '🔬', prefixe: 'sci' },
  { id: 'nature', nom: 'Nature & animaux', emoji: '🦊', prefixe: 'nat' },
  { id: 'corps', nom: 'Corps humain', emoji: '🫀', prefixe: 'corps' },
  { id: 'litterature', nom: 'Littérature & langue française', emoji: '📚', prefixe: 'litt' },
  { id: 'arts', nom: 'Arts & musique', emoji: '🎨', prefixe: 'arts' },
  { id: 'cinema', nom: 'Cinéma, télé & séries', emoji: '🎬', prefixe: 'cine' },
  { id: 'sport', nom: 'Sport', emoji: '⚽', prefixe: 'sport' },
  { id: 'gastronomie', nom: 'Gastronomie', emoji: '🧀', prefixe: 'gast' },
  { id: 'societe', nom: 'Société, institutions & économie', emoji: '🏛️', prefixe: 'soc' },
  { id: 'mythologie', nom: 'Mythologie & croyances', emoji: '⚡', prefixe: 'myth' },
  { id: 'insolite', nom: 'Insolite & divers', emoji: '🎲', prefixe: 'ins' },
];

export const CATEGORIES_PAR_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  CategorieId,
  Categorie
>;

export function estCategorie(id: string): id is CategorieId {
  return id in CATEGORIES_PAR_ID;
}
