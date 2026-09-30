import type { ComponentChildren } from 'preact';
import type { ResultatQuestion } from '../../composants/CarteQuestion';
import type { ItemDefile } from '../../composants/Defile';
import type { Participant } from '../../logique/adversaires';
import type { ReponseEnregistree } from '../../logique/carriere';
import type { Question } from '../../logique/types';
import type { PartieCarriere } from '../../jeu/carriere';
import { enregistrerReponse } from '../../stockage/db';

export interface PropsEtape {
  p: PartieCarriere;
  /** enregistre la nouvelle étape de la partie (et l'affiche) */
  maj: (suite: PartieCarriere | Promise<PartieCarriere>) => void;
  occupe: boolean;
  chrono: boolean;
}

export const cloner = <T,>(x: T): T => structuredClone(x);

export function versEnregistree(r: ResultatQuestion): ReponseEnregistree {
  return { mode: r.mode, correct: r.correct, saisie: r.saisie, points: r.points, contestee: r.contestee };
}

/** Réponse du joueur ajoutée à son historique (statistiques, anti-répétition). */
export function noter(q: Question, r: ReponseEnregistree) {
  enregistrerReponse(q, r.mode, r.correct, !!r.contestee, 'carriere');
}

export function itemDefile(participant: Participant, r: ReponseEnregistree, question?: Question): ItemDefile {
  return {
    participant,
    question,
    mode: r.mode,
    saisie: r.saisie,
    correct: r.correct,
    points: r.points,
    delai: r.delai ?? 2,
  };
}

export function BandeauEtape({ titre, detail, children }: { titre: string; detail?: string; children?: ComponentChildren }) {
  return (
    <div class="bandeau-etape">
      <h2>{titre}</h2>
      {detail && <p>{detail}</p>}
      {children}
    </div>
  );
}

export const accord = (p: Participant, masculin: string, feminin: string) => (p.feminin ? feminin : masculin);

/** « de Marc », mais « d’Isabelle » */
export const de = (prenom: string) => (/^[aeiouyhàâäéèêëîïôöùûü]/i.test(prenom) ? `d’${prenom}` : `de ${prenom}`);
