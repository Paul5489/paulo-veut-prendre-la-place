import type { ComponentChildren, ComponentProps } from 'preact';
import { useState } from 'preact/hooks';
import { CarteQuestion, type ResultatQuestion } from '../../composants/CarteQuestion';
import { Plateau, type EtatBuzzer, type EtatPupitre } from '../../composants/Plateau';
import { sons } from '../../son';
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

/** États de départ des pupitres : les scores, et éventuellement le buzzer déjà allumé du joueur. */
export function pupitres(participants: Participant[], scores: Record<string, number>): Record<string, EtatPupitre> {
  return Object.fromEntries(participants.map((x) => [x.id, { score: scores[x.id] ?? 0 }]));
}

type PropsCarte = ComponentProps<typeof CarteQuestion>;

/** Ta question, avec le plateau au-dessus : projecteur sur toi, ton buzzer s'allume quand tu réponds. */
export function QuestionSurPlateau({
  participants,
  scores,
  ...carte
}: PropsCarte & { participants: Participant[]; scores: Record<string, number> }) {
  const [buzzer, setBuzzer] = useState<EtatBuzzer>('eteint');
  const [gain, setGain] = useState<number | null>(null);
  const etats: Record<string, EtatPupitre> = {};
  for (const x of participants) {
    etats[x.id] = x.estJoueur
      ? { score: (scores[x.id] ?? 0) + (gain ?? 0), eclaire: true, buzzer, gain }
      : { score: scores[x.id] ?? 0, attenue: true };
  }
  return (
    <>
      <Plateau participants={participants} etats={etats} compact />
      <CarteQuestion
        {...carte}
        onCorrection={(correct, points) => {
          sons.buzz();
          setBuzzer(correct === null ? 'appuye' : correct ? 'juste' : 'faux');
          setGain(correct === null ? null : points);
        }}
      />
    </>
  );
}
