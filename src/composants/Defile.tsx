import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { Participant } from '../logique/adversaires';
import { CATEGORIES_PAR_ID } from '../logique/categories';
import { NOM_MODE } from '../logique/scores';
import type { ModeReponse, Question } from '../logique/types';
import { sons } from '../son';
import { Avatar } from './Avatar';
import type { EtatPupitre } from './Plateau';

export interface ItemDefile {
  participant: Participant;
  /** absent : question commune à tous */
  question?: Question;
  mode: ModeReponse | null;
  saisie: string | null;
  correct: boolean;
  points: number;
  /** temps de réflexion, en secondes */
  delai: number;
}

interface Props {
  titre: string;
  questionCommune?: Question;
  items: ItemDefile[];
  /** false : on ne montre que le mode choisi (réponses du challenger au Défi) */
  correction: boolean;
  libelleFin: string;
  onFin: () => void;
  /** affiché une fois le défilé terminé (tableau des scores…) */
  apres?: ComponentChildren;
  /** plateau affiché au-dessus (remplace la liste des réponses déjà données) */
  scene?: (etat: EtatDefile) => ComponentChildren;
}

export interface EtatDefile {
  index: number;
  phase: 'reflexion' | 'reponse';
  fini: boolean;
}

/**
 * États des pupitres pendant un défilé : buzzers allumés pour ceux qui ont répondu,
 * projecteur et bulle sur celui qui répond, scores mis à jour au fil des réponses.
 */
export function etatsDefile(
  items: ItemDefile[],
  correction: boolean,
  etat: EtatDefile,
  depart: Record<string, EtatPupitre>,
): Record<string, EtatPupitre> {
  const etats: Record<string, EtatPupitre> = {};
  for (const [id, e] of Object.entries(depart)) etats[id] = { ...e };
  items.forEach((it, i) => {
    const e = (etats[it.participant.id] ??= {});
    const revele = etat.fini || i < etat.index || (i === etat.index && etat.phase === 'reponse');
    if (revele) {
      e.buzzer = correction ? (it.correct ? 'juste' : 'faux') : 'appuye';
      if (correction && e.score !== undefined) e.score += it.points;
    }
    if (!etat.fini && i === etat.index) {
      e.eclaire = true;
      e.bulle = etat.phase === 'reflexion' ? '…' : `« ${it.saisie} »`;
      e.gain = etat.phase === 'reponse' && correction ? it.points : null;
    }
  });
  if (!etat.fini) {
    const actif = items[etat.index]?.participant.id;
    for (const [id, e] of Object.entries(etats)) if (id !== actif) e.attenue = true;
  }
  return etats;
}

/**
 * Les réponses des adversaires, l'une après l'autre, avec un temps de réflexion simulé.
 * « Accélérer » va quatre fois plus vite, « Passer » montre tout d'un coup.
 */
export function Defile({ titre, questionCommune, items, correction, libelleFin, onFin, apres, scene }: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'reflexion' | 'reponse'>('reflexion');
  const [rapide, setRapide] = useState(false);
  const fini = index >= items.length;

  useEffect(() => {
    if (fini) return;
    const vitesse = rapide ? 4 : 1;
    const duree = phase === 'reflexion' ? (items[index].delai * 1000) / vitesse : 1500 / vitesse;
    const t = setTimeout(() => {
      if (phase === 'reflexion') {
        setPhase('reponse');
        sons.buzz();
        if (correction) setTimeout(items[index].correct ? sons.bonne : sons.mauvaise, 220);
      } else {
        setPhase('reflexion');
        setIndex(index + 1);
      }
    }, duree);
    return () => clearTimeout(t);
  }, [index, phase, rapide, fini]);

  const passes = items.slice(0, fini ? items.length : index);
  const actuel = fini ? null : items[index];

  const resultat = (it: ItemDefile) =>
    correction ? (
      <span class={`resultat ${it.correct ? 'juste' : 'faux'}`}>
        {it.correct ? '✓' : '✗'} {it.points > 0 ? `+${it.points}` : it.points}
      </span>
    ) : (
      <span class="resultat masque">?</span>
    );

  return (
    <div class="defile">
      <p class="petit-titre">{titre}</p>
      {scene?.({ index, phase, fini })}

      {questionCommune && (
        <div class="question-commune">
          <p>{questionCommune.question}</p>
          <p class="doux petit">
            Réponse : <strong class="or">{questionCommune.reponse}</strong>
          </p>
        </div>
      )}

      {!scene && passes.length > 0 && (
        <ul class="defile-liste">
          {passes.map((it) => (
            <li key={it.participant.id + (it.question?.id ?? '')}>
              <Avatar p={it.participant} taille={30} />
              <span class="defile-nom">
                {it.participant.prenom}
                <small>
                  {it.mode ? NOM_MODE[it.mode] : '—'}
                  {it.question && ` · ${CATEGORIES_PAR_ID[it.question.categorie].emoji} ${it.question.question}`}
                </small>
              </span>
              {resultat(it)}
            </li>
          ))}
        </ul>
      )}

      {actuel && (
        <div class="defile-carte" key={index}>
          <div class="defile-entete">
            <Avatar p={actuel.participant} taille={46} />
            <strong>{actuel.participant.prenom}</strong>
            {actuel.mode && phase === 'reponse' && <span class={`chip mode-choisi ${actuel.mode}`}>{NOM_MODE[actuel.mode]}</span>}
          </div>
          {actuel.question && <p class="defile-question">{actuel.question.question}</p>}
          {phase === 'reflexion' ? (
            <p class="reflechit">
              {actuel.question ? 'réfléchit' : 'répond'}
              <span class="points-suspension">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </p>
          ) : (
            <div class="defile-reponse">
              <p>« {actuel.saisie} »</p>
              {resultat(actuel)}
              {correction && !actuel.correct && actuel.question && (
                <p class="doux petit">
                  Bonne réponse : <strong class="or">{actuel.question.reponse}</strong>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {fini ? (
        <>
          {apres}
          <button class="bouton principal grand" onClick={onFin}>
            {libelleFin} →
          </button>
        </>
      ) : (
        <div class="defile-commandes">
          <button class="bouton secondaire" onClick={() => setRapide(!rapide)}>
            {rapide ? '▶ Vitesse normale' : '⏩ Accélérer'}
          </button>
          <button class="bouton fantome" onClick={() => setIndex(items.length)}>
            ⏭ Passer
          </button>
        </div>
      )}
    </div>
  );
}
