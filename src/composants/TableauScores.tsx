import type { Participant } from '../logique/adversaires';
import { Avatar } from './Avatar';

export type StatutLigne = 'qualifie' | 'elimine' | 'balance' | 'challenger';

export interface LigneScore {
  participant: Participant;
  score: number;
  statut?: StatutLigne;
}

interface Props {
  lignes: LigneScore[];
  /** score maximal possible (pour la longueur des barres) */
  max: number;
  titre?: string;
}

const HAUTEUR = 54;

const ETIQUETTE: Record<StatutLigne, string> = {
  qualifie: 'Qualifié',
  elimine: 'Éliminé',
  balance: 'Départage',
  challenger: 'Challenger',
};

/** Tableau des scores : les lignes glissent à leur nouvelle place quand le classement change. */
export function TableauScores({ lignes, max, titre }: Props) {
  const ordre = [...lignes].sort((a, b) => b.score - a.score);
  const rang = new Map(ordre.map((l, i) => [l.participant.id, i]));
  return (
    <div class="tableau-scores">
      {titre && <p class="petit-titre">{titre}</p>}
      <div class="tableau-lignes" style={{ height: `${lignes.length * HAUTEUR}px` }}>
        {lignes.map((l) => (
          <div
            key={l.participant.id}
            class={`ligne-score ${l.participant.estJoueur ? 'joueur' : ''} ${l.statut ?? ''}`}
            style={{ transform: `translateY(${(rang.get(l.participant.id) ?? 0) * HAUTEUR}px)` }}
          >
            <span class="rang">{(rang.get(l.participant.id) ?? 0) + 1}</span>
            <Avatar p={l.participant} taille={34} />
            <span class="nom-score">
              <span>
                {l.participant.estJoueur ? `${l.participant.prenom} (toi)` : l.participant.prenom}
                {l.statut && <em class="statut-ligne">{ETIQUETTE[l.statut]}</em>}
              </span>
              <span class="barre-score">
                <span style={{ width: `${Math.max(0, Math.min(100, (l.score / max) * 100))}%` }} />
              </span>
            </span>
            <strong class="valeur-score">{l.score}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
