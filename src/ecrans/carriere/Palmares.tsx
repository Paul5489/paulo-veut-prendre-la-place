import { useEffect, useState } from 'preact/hooks';
import { lireEtatCarriere } from '../../jeu/carriere';
import { formaterEuros, PALIERS_TROPHEES, type EtatCarriere } from '../../logique/carriere';
import { useAppli } from '../../navigation';

const dateCourte = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

export function Palmares() {
  const { aller } = useAppli();
  const [etat, setEtat] = useState<EtatCarriere | null>(null);
  useEffect(() => {
    lireEtatCarriere().then(setEtat);
  }, []);
  if (!etat) return null;
  const pal = etat.palmares;
  const ch = etat.champion;
  const serieEnCours = ch.participant.estJoueur ? ch.victoires : 0;

  return (
    <div class="ecran reglages">
      <header class="barre-titre">
        <button class="retour" onClick={() => aller({ nom: 'carriere' })} aria-label="Retour">
          ‹
        </button>
        <h1>🏅 Palmarès</h1>
      </header>

      <section class="grille-stats">
        <div class="stat">
          <strong>{Math.max(pal.meilleureSerie, serieEnCours)}</strong>
          <span>meilleure série de victoires</span>
        </div>
        <div class="stat">
          <strong>{formaterEuros(pal.cagnotteRecord)}</strong>
          <span>cagnotte record</span>
        </div>
        <div class="stat">
          <strong>{serieEnCours}</strong>
          <span>victoires en cours</span>
        </div>
        <div class="stat">
          <strong>{pal.parties}</strong>
          <span>parties jouées</span>
        </div>
        <div class="stat">
          <strong>{pal.qualifsReussies}</strong>
          <span>Qualifs réussies</span>
        </div>
        <div class="stat">
          <strong>{pal.defisGagnes}</strong>
          <span>Défis gagnés</span>
        </div>
      </section>

      <section class="bloc">
        <h2 class="petit-titre">Trophées</h2>
        <div class="trophees">
          {PALIERS_TROPHEES.map((palier) => {
            const ok = pal.trophees.includes(palier);
            return (
              <div key={palier} class={`trophee ${ok ? 'obtenu' : ''}`}>
                <span>{ok ? '🏆' : '🔒'}</span>
                <small>{palier} victoires</small>
              </div>
            );
          })}
        </div>
      </section>

      <section class="bloc">
        <h2 class="petit-titre">Tes séries de champion</h2>
        {pal.series.length === 0 ? (
          <p class="doux">Aucune série terminée pour l’instant.</p>
        ) : (
          <ul class="liste-signalements">
            {[...pal.series].reverse().map((s, i) => (
              <li key={i}>
                <p class="signalement-question">
                  {s.victoires} victoire{s.victoires > 1 ? 's' : ''} · {formaterEuros(s.cagnotte)}
                </p>
                <p class="doux petit">
                  Du {dateCourte(s.debut)} au {dateCourte(s.fin)} · battu par {s.battuPar}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section class="bloc">
        <h2 class="petit-titre">Ceux qui t'ont battu</h2>
        {pal.defaites.length === 0 ? (
          <p class="doux">Personne… pour l’instant !</p>
        ) : (
          <ul class="liste-signalements">
            {[...pal.defaites].reverse().map((d, i) => (
              <li key={i}>
                <p class="signalement-question">{d.par}</p>
                <p class="doux petit">
                  {d.detail} · {dateCourte(d.date)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
