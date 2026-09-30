import { useEffect, useMemo, useState } from 'preact/hooks';
import type { QuestionPerso } from '../jeu/carriere';
import { NOM_MODE } from '../logique/scores';
import { sons } from '../son';

interface Props {
  liste: QuestionPerso[];
  revelees: number;
  /** enregistre le nombre de réponses dévoilées */
  onReveler: (n: number) => void;
  /** prévient le parent pendant le roulement de tambour (pour éclairer le plateau) */
  onSuspense?: (suspense: boolean) => void;
  contestable?: (i: number) => boolean;
  onContester?: (i: number) => void;
  /** petite note sous une réponse (contestation refusée…) */
  notes?: Record<number, string>;
}

const DUREE_SUSPENSE = 1000;

/**
 * Révélation des réponses du challenger : un seul appui, puis les réponses se dévoilent
 * toutes seules, avec un roulement de tambour et une carte qui se retourne.
 */
export function Revelation({ liste, revelees, onReveler, onSuspense, contestable, onContester, notes = {} }: Props) {
  const [auto, setAuto] = useState(false);
  const [suspense, setSuspense] = useState(false);
  const fini = revelees >= liste.length;

  useEffect(() => {
    // tout est dévoilé : on remonte vers le verdict
    if (fini && revelees > 0) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fini]);

  useEffect(() => {
    if (!auto || fini) {
      if (fini) setAuto(false);
      return;
    }
    setSuspense(true);
    onSuspense?.(true);
    sons.roulement();
    // on suit la révélation à l'écran
    requestAnimationFrame(() =>
      document.querySelector('.liste-revelation li.suspense')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    );
    const t = setTimeout(() => {
      setSuspense(false);
      onSuspense?.(false);
      (liste[revelees].reponse?.correct ? sons.bonne : sons.mauvaise)();
      onReveler(revelees + 1);
    }, DUREE_SUSPENSE);
    return () => clearTimeout(t);
  }, [auto, revelees]);

  return (
    <>
      <ul class="liste-revelation">
        {liste.map((x, i) => {
          const r = x.reponse!;
          const montre = i < revelees;
          const enSuspense = !montre && i === revelees && suspense;
          return (
            <li
              key={x.question.id}
              class={`${montre ? (r.correct ? 'juste revele' : 'faux revele') : ''} ${enSuspense ? 'suspense' : ''}`}
            >
              <p class="revelation-question">{x.question.question}</p>
              <p class="revelation-reponse">
                <span class={`chip mode-choisi ${r.mode ?? ''}`}>{r.mode ? NOM_MODE[r.mode] : '—'}</span>
                <span class="revelation-saisie">« {r.saisie ?? 'pas de réponse'} »</span>
                <span
                  class={`resultat ${montre ? (r.correct ? 'juste' : 'faux') : 'masque'} ${montre ? 'retourne' : ''}`}
                  key={montre ? 'r' : 'm'}
                >
                  {montre ? (r.correct ? `✓ +${r.points}` : '✗') : enSuspense ? '🥁' : '?'}
                </span>
              </p>
              {montre && !r.correct && (
                <p class="doux petit">
                  Bonne réponse : <strong class="or">{x.question.reponse}</strong>
                </p>
              )}
              {montre && contestable?.(i) && (
                <button class="bouton petit secondaire" onClick={() => onContester?.(i)}>
                  🙋 Contester
                </button>
              )}
              {notes[i] && <p class="doux petit">{notes[i]}</p>}
            </li>
          );
        })}
      </ul>
      {!fini && (
        <div class="commandes-revelation">
          {!auto ? (
            <button class="bouton principal grand" onClick={() => setAuto(true)}>
              🥁 {revelees === 0 ? 'Lancer la révélation' : 'Continuer la révélation'}
            </button>
          ) : (
            <p class="reflechit centre-texte">Révélation en cours…</p>
          )}
          <button
            class="bouton fantome"
            onClick={() => {
              setAuto(false);
              setSuspense(false);
              onSuspense?.(false);
              onReveler(liste.length);
            }}
          >
            ⏭ Tout révéler d'un coup
          </button>
        </div>
      )}
    </>
  );
}

const COULEURS = ['#ffc83d', '#ff3d8b', '#2de2e6', '#2ee59d', '#8b5cf6', '#ff7a3d'];

/** Pluie de confettis (purement décorative). */
export function Confettis({ nombre = 40 }: { nombre?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: nombre }, (_, i) => ({
        gauche: Math.random() * 100,
        retard: Math.random() * 0.7,
        duree: 2.2 + Math.random() * 1.4,
        couleur: COULEURS[i % COULEURS.length],
        largeur: 6 + Math.random() * 6,
        rotation: Math.random() * 360,
      })),
    [],
  );
  return (
    <div class="confettis" aria-hidden="true">
      {pieces.map((c, i) => (
        <span
          key={i}
          style={{
            left: `${c.gauche}%`,
            width: `${c.largeur}px`,
            height: `${c.largeur * 0.45}px`,
            background: c.couleur,
            animationDelay: `${c.retard}s`,
            animationDuration: `${c.duree}s`,
            transform: `rotate(${c.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}
