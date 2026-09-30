import { useState } from 'preact/hooks';
import { MOTIFS_SIGNALEMENT, type MotifSignalement } from '../logique/types';

interface Props {
  onAnnuler: () => void;
  onEnvoyer: (motif: MotifSignalement | null) => void;
}

export function ModalSignalement({ onAnnuler, onEnvoyer }: Props) {
  const [motif, setMotif] = useState<MotifSignalement | null>(null);
  return (
    <div class="voile" onClick={onAnnuler}>
      <div class="modal" role="dialog" aria-label="Signaler une erreur" onClick={(e) => e.stopPropagation()}>
        <h2>⚑ Signaler une erreur</h2>
        <p class="doux">
          La question sera retirée du jeu. Tu pourras la restaurer dans les Réglages.
        </p>
        <p class="petit-titre">Motif (facultatif)</p>
        <div class="motifs">
          {(Object.keys(MOTIFS_SIGNALEMENT) as MotifSignalement[]).map((m) => (
            <button
              key={m}
              class={`motif ${motif === m ? 'actif' : ''}`}
              onClick={() => setMotif(motif === m ? null : m)}
            >
              {MOTIFS_SIGNALEMENT[m]}
            </button>
          ))}
        </div>
        <button class="bouton principal" onClick={() => onEnvoyer(motif)}>
          Signaler et retirer
        </button>
        <button class="bouton fantome" onClick={onAnnuler}>
          Annuler
        </button>
      </div>
    </div>
  );
}
