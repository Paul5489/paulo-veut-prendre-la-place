/**
 * Lecture et écriture des fichiers de la banque (public/data), partagées par les scripts.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { Question, QuestionDepartage, Theme } from '../src/logique/types';

export const DOSSIER = join(import.meta.dirname, '..', 'public', 'data');
export const DOSSIER_CATEGORIES = join(DOSSIER, 'categories');
export const DOSSIER_THEMES = join(DOSSIER, 'themes');
export const FICHIER_DEPARTAGE = join(DOSSIER, 'departage.json');
export const FICHIER_INDEX = join(DOSSIER, 'index.json');

export interface Banque {
  categories: { fichier: string; id: string; questions: Question[] }[];
  themes: { fichier: string; theme: Theme }[];
  departage: QuestionDepartage[];
}

const lireJSON = <T>(chemin: string): T => JSON.parse(readFileSync(chemin, 'utf8')) as T;

const fichiersJSON = (dossier: string) =>
  readdirSync(dossier)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => join(dossier, f));

export function lireBanque(): Banque {
  return {
    categories: fichiersJSON(DOSSIER_CATEGORIES).map((fichier) => ({
      fichier,
      id: basename(fichier, '.json'),
      questions: lireJSON<Question[]>(fichier),
    })),
    themes: fichiersJSON(DOSSIER_THEMES).map((fichier) => ({ fichier, theme: lireJSON<Theme>(fichier) })),
    departage: lireJSON<QuestionDepartage[]>(FICHIER_DEPARTAGE),
  };
}

/** Une question par ligne : fichiers compacts et faciles à relire. */
export function formaterListe(objets: object[], indentation = '  '): string {
  return `[\n${objets.map((o) => indentation + JSON.stringify(o)).join(',\n')}\n${indentation.slice(2)}]`;
}

export function ecrireListe(chemin: string, objets: object[]): void {
  writeFileSync(chemin, formaterListe(objets) + '\n');
}

export function ecrireTheme(chemin: string, t: Theme): void {
  const entete = JSON.stringify({ id: t.id, titre: t.titre, categorie: t.categorie, description: t.description }, null, 2);
  writeFileSync(chemin, `${entete.slice(0, -2)},\n  "questions": ${formaterListe(t.questions, '    ')}\n}\n`);
}
