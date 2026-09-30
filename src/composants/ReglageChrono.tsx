import { useAppli } from '../navigation';
import { Interrupteur } from './Interrupteur';

const DUREES = [15, 20, 30];

/** Chrono : activé ou non, et temps accordé pour chaque question. */
export function ReglageChrono() {
  const { reglages, changerReglages } = useAppli();
  return (
    <div class="reglage-chrono">
      <Interrupteur
        libelle="⏱️ Temps limité pour répondre"
        detail="Le chrono démarre dès l’affichage de la question."
        actif={reglages.chrono}
        onChange={(chrono) => changerReglages({ chrono })}
      />
      {reglages.chrono && (
        <div class="durees-chrono">
          {DUREES.map((d) => (
            <button
              key={d}
              class={`choix-duree ${reglages.dureeChrono === d ? 'actif' : ''}`}
              onClick={() => changerReglages({ dureeChrono: d })}
            >
              {d} s
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
