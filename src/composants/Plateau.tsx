import type { ComponentChildren } from 'preact';
import type { Participant } from '../logique/adversaires';
import { Avatar } from './Avatar';

/**
 * Le plateau télé : les candidats derrière leurs pupitres, chacun avec son buzzer.
 * Le buzzer s'enfonce quand on répond, puis s'allume en vert (juste) ou en rouge (faux).
 */

export type EtatBuzzer = 'eteint' | 'appuye' | 'juste' | 'faux';

export interface EtatPupitre {
  buzzer?: EtatBuzzer;
  /** réponse dans une bulle au-dessus de la tête */
  bulle?: string | null;
  score?: number;
  /** points gagnés à l'instant (+3, −5…) */
  gain?: number | null;
  /** sous le projecteur */
  eclaire?: boolean;
  /** dans l'ombre (pas son tour, ou éliminé) */
  attenue?: boolean;
  /** petite étiquette : Qualifié, Éliminé… */
  statut?: string;
}

interface PropsPupitre {
  p: Participant;
  e: EtatPupitre;
  taille: number;
  bord?: 'gauche' | 'droite' | '';
}

function Pupitre({ p, e, taille, bord = '' }: PropsPupitre) {
  return (
    <div class={`pupitre ${e.eclaire ? 'eclaire' : ''} ${e.attenue ? 'attenue' : ''}`}>
      <div class="pupitre-perso">
        {e.bulle && (
          <div class={`bulle ${bord}`} key={e.bulle}>
            {e.bulle}
          </div>
        )}
        <Avatar p={p} taille={taille} />
      </div>
      <div class="pupitre-corps" style={`--couleur:${p.avatar.couleur}`}>
        <span class={`buzzer ${e.buzzer ?? 'eteint'}`} />
        <span class="pupitre-nom">{p.estJoueur ? 'Toi' : p.prenom}</span>
        {e.score !== undefined && <span class="pupitre-score">{e.score}</span>}
      </div>
      {e.gain != null && (
        <span class={`pupitre-gain ${e.gain > 0 ? 'plus' : e.gain < 0 ? 'moins' : 'nul'}`} key={`g${e.gain}`}>
          {e.gain > 0 ? `+${e.gain}` : e.gain}
        </span>
      )}
      {e.statut && <span class="pupitre-statut">{e.statut}</span>}
    </div>
  );
}

interface Props {
  participants: Participant[];
  etats?: Record<string, EtatPupitre>;
  compact?: boolean;
}

export function Plateau({ participants, etats = {}, compact = false }: Props) {
  const n = participants.length;
  return (
    <div class={`plateau ${compact ? 'compact' : ''}`}>
      <div class="pupitres" style={`--n:${n}`}>
        {participants.map((p, i) => (
          <Pupitre
            key={p.id}
            p={p}
            e={etats[p.id] ?? {}}
            taille={compact ? 38 : n > 4 ? 46 : 54}
            bord={i === 0 && n > 3 ? 'gauche' : i === n - 1 && n > 3 ? 'droite' : ''}
          />
        ))}
      </div>
      <div class="plateau-sol" />
    </div>
  );
}

/** Le fauteuil doré du champion, avec son occupant. */
export function Fauteuil({ p, taille = 60, children }: { p: Participant; taille?: number; children?: ComponentChildren }) {
  return (
    <div class="fauteuil">
      <svg class="fauteuil-dessin" viewBox="0 0 120 100" aria-hidden="true">
        <defs>
          <linearGradient id="fauteuil-or" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#ffe27a" />
            <stop offset="0.55" stop-color="#ffc83d" />
            <stop offset="1" stop-color="#d98200" />
          </linearGradient>
        </defs>
        <rect x="26" y="4" width="68" height="70" rx="18" fill="url(#fauteuil-or)" />
        <rect x="8" y="48" width="26" height="44" rx="12" fill="url(#fauteuil-or)" />
        <rect x="86" y="48" width="26" height="44" rx="12" fill="url(#fauteuil-or)" />
        <rect x="28" y="66" width="64" height="24" rx="9" fill="#ffd45c" />
        <rect x="16" y="90" width="8" height="10" rx="3" fill="#b86e00" />
        <rect x="96" y="90" width="8" height="10" rx="3" fill="#b86e00" />
      </svg>
      <div class="fauteuil-occupant">
        <Avatar p={p} taille={taille} couronne />
      </div>
      {children}
    </div>
  );
}

/** Face-à-face du Défi : le challenger à son pupitre, le champion dans son fauteuil. */
export function SceneDuel({
  challenger,
  champion,
  etatChallenger = {},
  etatChampion = {},
  texteChallenger,
  texteChampion,
}: {
  challenger: Participant;
  champion: Participant;
  etatChallenger?: EtatPupitre;
  etatChampion?: EtatPupitre;
  texteChallenger: string;
  texteChampion: string;
}) {
  return (
    <div class="scene-duel">
      <div class={`duel-cote ${etatChallenger.eclaire ? 'eclaire' : ''}`}>
        <Pupitre p={challenger} e={{ ...etatChallenger, eclaire: false }} taille={60} />
        <span class="duel-texte">{texteChallenger}</span>
      </div>
      <span class="duel-vs">VS</span>
      <div class={`duel-cote ${etatChampion.eclaire ? 'eclaire' : ''}`}>
        <Fauteuil p={champion} taille={52}>
          <span class={`buzzer ${etatChampion.buzzer ?? 'eteint'}`} />
          {etatChampion.bulle && (
            <div class="bulle droite" key={etatChampion.bulle}>
              {etatChampion.bulle}
            </div>
          )}
        </Fauteuil>
        <strong class="duel-nom">{champion.estJoueur ? 'Toi' : champion.prenom}</strong>
        <span class="duel-texte">{texteChampion}</span>
      </div>
    </div>
  );
}
