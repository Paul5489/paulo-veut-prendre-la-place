import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { verifierCash } from '../logique/cash';
import { CATEGORIES_PAR_ID } from '../logique/categories';
import { construirePropositions } from '../logique/propositions';
import { POINTS, pointsObtenus, pointsSuperCash } from '../logique/scores';
import { NIVEAUX, type ModeReponse, type Question } from '../logique/types';
import { sons } from '../son';
import { signalerQuestion } from '../stockage/db';
import { ModalArbitrage } from './ModalArbitrage';
import { ModalSignalement } from './ModalSignalement';

export interface ResultatQuestion {
  question: Question;
  mode: ModeReponse | null;
  correct: boolean;
  contestee: boolean;
  saisie: string | null;
  points: number;
  tempsEcoule: boolean;
}

export const DUREE_CHRONO = 20;

/** Compte à rebours ; appelle `auBout` une seule fois quand il atteint zéro. */
function useChrono(actif: boolean, auBout: () => void): number {
  const [restant, setRestant] = useState(DUREE_CHRONO);
  const debut = useRef(Date.now());
  const rappel = useRef(auBout);
  rappel.current = auBout;
  useEffect(() => {
    if (!actif) return;
    let derniereSeconde = DUREE_CHRONO;
    const id = setInterval(() => {
      const r = Math.max(0, DUREE_CHRONO - (Date.now() - debut.current) / 1000);
      setRestant(r);
      const s = Math.ceil(r);
      if (s < derniereSeconde && s <= 5 && s > 0) sons.tictac();
      derniereSeconde = s;
      if (r <= 0) {
        clearInterval(id);
        rappel.current();
      }
    }, 100);
    return () => clearInterval(id);
  }, [actif]);
  return restant;
}

const DESCRIPTION_MODE: Record<ModeReponse, string> = {
  duo: '2 propositions',
  carre: '4 propositions',
  cash: 'Sans proposition',
};
const NOM_BOUTON_MODE: Record<ModeReponse, string> = { duo: 'Duo', carre: 'Carré', cash: 'Cash' };

interface Props {
  question: Question;
  chrono: boolean;
  modeImpose?: ModeReponse;
  libelleSuivant: string;
  onSuivant: (r: ResultatQuestion) => void;
  /** super cash de la Compet' : +5 si juste, −5 si faux */
  superCash?: boolean;
  /** Défi, côté challenger : la correction reste cachée jusqu'à la révélation */
  differee?: boolean;
  /** score potentiel déjà accumulé (mode différé) */
  potentiel?: number;
  /** prévenu dès la réponse (null = réponse enregistrée sans correction), pour allumer le buzzer */
  onCorrection?: (correct: boolean | null, points: number) => void;
  /** en duel : prénom de l'autre joueur, qui tranche les contestations */
  arbitre?: string;
}

/**
 * Une question, de la lecture à la correction :
 * choix du mode (duo / carré / cash) → réponse → bonne réponse, anecdote, contestation, signalement.
 */
export function CarteQuestion({
  question: q,
  chrono,
  modeImpose,
  libelleSuivant,
  onSuivant,
  superCash = false,
  differee = false,
  potentiel = 0,
  onCorrection,
  arbitre,
}: Props) {
  const [mode, setMode] = useState<ModeReponse | null>(modeImpose ?? null);
  const [reponse, setReponse] = useState<string | null>(null);
  const [saisie, setSaisie] = useState('');
  const [corrigee, setCorrigee] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [contestee, setContestee] = useState(false);
  const [tempsEcoule, setTempsEcoule] = useState(false);
  const [signalement, setSignalement] = useState<'ferme' | 'ouvert' | 'fait'>('ferme');
  const [arbitrage, setArbitrage] = useState<'non' | 'en-cours' | 'refuse'>('non');
  const champ = useRef<HTMLInputElement>(null);
  const propositions = useMemo(() => (mode ? construirePropositions(q, mode) : []), [q, mode]);

  const corriger = (ok: boolean) => {
    setCorrect(ok);
    setCorrigee(true);
    onCorrection?.(differee ? null : ok, superCash ? pointsSuperCash(ok) : pointsObtenus(mode, ok));
    if (differee) sons.clic();
    else if (ok) sons.bonne();
    else sons.mauvaise();
  };

  const restant = useChrono(chrono && !corrigee, () => {
    setTempsEcoule(true);
    corriger(false);
  });

  const choisirMode = (m: ModeReponse) => {
    // Sur iPhone, le clavier ne s'ouvre que si le champ reçoit le focus pendant le toucher.
    if (m === 'cash') champ.current?.focus();
    sons.clic();
    setMode(m);
  };

  const repondre = (p: string) => {
    if (corrigee) return;
    setReponse(p);
    corriger(p === q.reponse);
  };

  const validerCash = (e: Event) => {
    e.preventDefault();
    if (corrigee || !saisie.trim()) return;
    champ.current?.blur();
    setReponse(saisie.trim());
    corriger(verifierCash(saisie, q.reponse, q.variantes, q.mauvaises));
  };

  const contester = () => {
    setContestee(true);
    setCorrect(true);
    onCorrection?.(true, superCash ? pointsSuperCash(true) : pointsObtenus(mode, true));
    sons.bonne();
  };

  const points = superCash ? pointsSuperCash(correct) : pointsObtenus(mode, correct);
  const categorie = CATEGORIES_PAR_ID[q.categorie];

  const classeProposition = (p: string) => {
    if (!corrigee) return 'proposition';
    if (differee) return p === reponse ? 'proposition choisie' : 'proposition eteinte';
    if (p === q.reponse) return 'proposition bonne';
    if (p === reponse) return 'proposition choisie-fausse';
    return 'proposition eteinte';
  };

  return (
    <div class="carte-question">
      <div class="meta-question">
        <span class="chip">
          {categorie.emoji} {categorie.nom}
        </span>
        <span class={`chip niveau n${q.niveau}`}>{NIVEAUX[q.niveau - 1].nom}</span>
        {mode && (
          <span class={`chip mode-choisi ${mode}`}>
            {superCash ? 'Super cash ±5' : `${NOM_BOUTON_MODE[mode]} +${POINTS[mode]}`}
          </span>
        )}
      </div>

      {chrono && (
        <div class={`chrono ${restant <= 5 ? 'urgent' : ''}`} aria-label={`${Math.ceil(restant)} secondes`}>
          <div class="chrono-barre" style={{ width: `${(restant / DUREE_CHRONO) * 100}%` }} />
          <span>{Math.ceil(restant)} s</span>
        </div>
      )}

      <p class="texte-question">{q.question}</p>

      {!mode && !corrigee && (
        <div class="choix-modes">
          <p class="consigne">Choisis ton mode de réponse</p>
          {(['duo', 'carre', 'cash'] as const).map((m) => (
            <button key={m} class={`bouton-mode ${m}`} onClick={() => choisirMode(m)}>
              <span class="nom-mode">{NOM_BOUTON_MODE[m]}</span>
              <span class="detail-mode">{DESCRIPTION_MODE[m]}</span>
              <span class="points-mode">+{POINTS[m]}</span>
            </button>
          ))}
        </div>
      )}

      {mode && mode !== 'cash' && (
        <div class={`propositions ${mode}`}>
          {propositions.map((p) => (
            <button key={p} class={classeProposition(p)} disabled={corrigee} onClick={() => repondre(p)}>
              {p}
            </button>
          ))}
        </div>
      )}

      {!corrigee && (
        <form class={`saisie-cash ${mode === 'cash' ? '' : 'cachee'}`} onSubmit={validerCash}>
          <input
            ref={champ}
            type="text"
            value={saisie}
            onInput={(e) => setSaisie(e.currentTarget.value)}
            placeholder="Tape ta réponse…"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck={false}
            enterkeyhint="done"
            aria-label="Ta réponse"
            tabIndex={mode === 'cash' ? 0 : -1}
          />
          <button type="submit" class="bouton principal" disabled={!saisie.trim()}>
            Valider
          </button>
        </form>
      )}

      {corrigee && differee && (
        <div class="correction neutre">
          <div class="verdict">
            <span>{tempsEcoule ? '⏱️ Temps écoulé !' : '📝 Réponse enregistrée'}</span>
          </div>
          {reponse !== null && <p class="ta-reponse">Ta réponse : « {reponse} »</p>}
          <p class="doux">
            La correction sera révélée à la fin du Défi. Score potentiel :{' '}
            <strong>{potentiel + (mode && !tempsEcoule ? POINTS[mode] : 0)} points</strong>
          </p>
          <button
            class="bouton principal"
            onClick={() => onSuivant({ question: q, mode, correct, contestee, saisie: reponse, points, tempsEcoule })}
          >
            {libelleSuivant} →
          </button>
        </div>
      )}

      {corrigee && !differee && (
        <div class={`correction ${correct ? 'juste' : 'faux'}`}>
          <div class="verdict">
            <span>
              {tempsEcoule
                ? '⏱️ Temps écoulé !'
                : correct
                  ? contestee
                    ? '✅ Validée après contestation'
                    : '✅ Bonne réponse !'
                  : '❌ Mauvaise réponse'}
            </span>
            {points > 0 && <span class="gain">+{points}</span>}
            {points < 0 && <span class="gain perte">{points}</span>}
          </div>
          {mode === 'cash' && reponse !== null && <p class="ta-reponse">Ta réponse : « {reponse} »</p>}
          {(mode === 'cash' || !mode || !correct) && (
            <p class="bonne-reponse">
              La réponse : <strong>{q.reponse}</strong>
            </p>
          )}
          <p class="anecdote">💡 {q.anecdote}</p>
          {mode === 'cash' && !correct && !tempsEcoule && arbitrage !== 'refuse' && (
            <button class="bouton secondaire" onClick={arbitre ? () => setArbitrage('en-cours') : contester}>
              🙋 Contester : j'avais juste
            </button>
          )}
          {arbitrage === 'refuse' && <p class="doux petit">{arbitre} a refusé la contestation.</p>}
          <button
            class="bouton principal"
            onClick={() =>
              onSuivant({ question: q, mode, correct, contestee, saisie: reponse, points, tempsEcoule })
            }
          >
            {libelleSuivant} →
          </button>
          <button
            class="lien-signaler"
            disabled={signalement === 'fait'}
            onClick={() => setSignalement('ouvert')}
          >
            {signalement === 'fait' ? '✓ Question signalée et retirée du jeu' : '⚑ Signaler une erreur'}
          </button>
        </div>
      )}

      {arbitrage === 'en-cours' && arbitre && (
        <ModalArbitrage
          arbitre={arbitre}
          reponse={reponse ?? ''}
          bonne={q.reponse}
          onOui={() => {
            setArbitrage('non');
            contester();
          }}
          onNon={() => setArbitrage('refuse')}
        />
      )}

      {signalement === 'ouvert' && (
        <ModalSignalement
          onAnnuler={() => setSignalement('ferme')}
          onEnvoyer={(motif) => {
            signalerQuestion(q, motif);
            setSignalement('fait');
          }}
        />
      )}
    </div>
  );
}
