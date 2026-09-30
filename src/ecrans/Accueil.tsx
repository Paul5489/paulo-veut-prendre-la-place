import { useEffect, useState } from 'preact/hooks';
import { lireEtatCarriere, lirePartie } from '../jeu/carriere';
import { formaterEuros, type EtatCarriere } from '../logique/carriere';
import { useAppli } from '../navigation';

export function Accueil() {
  const { aller } = useAppli();
  const [etat, setEtat] = useState<EtatCarriere | null>(null);
  const [partieEnCours, setPartieEnCours] = useState(false);
  useEffect(() => {
    lireEtatCarriere().then(setEtat);
    lirePartie().then((p) => setPartieEnCours(!!p));
  }, []);

  const ch = etat?.champion;
  const statut = !ch ? (
    <span>…</span>
  ) : ch.participant.estJoueur ? (
    <span>
      <strong>Champion</strong> depuis {ch.victoires} victoire{ch.victoires > 1 ? 's' : ''}, cagnotte {formaterEuros(ch.cagnotte)}
    </span>
  ) : (
    <span>
      Statut : <strong>Candidat</strong> · champion en titre : {ch.participant.prenom} ({ch.victoires} victoire
      {ch.victoires > 1 ? 's' : ''})
    </span>
  );

  return (
    <div class="ecran accueil">
      <div class="projecteurs" aria-hidden="true">
        <span />
        <span />
      </div>

      <header class="titre-jeu">
        <div class="titre-paulo">Paulo</div>
        <h1>veut prendre la place</h1>
      </header>

      <div class="statut">
        <span class="statut-icone">{ch?.participant.estJoueur ? '👑' : '🎤'}</span>
        {statut}
      </div>

      <nav class="modes-jeu">
        <button class="mode-jeu carriere" onClick={() => aller({ nom: 'carriere' })}>
          <span class="mode-emoji">🏆</span>
          <span class="mode-texte">
            <strong>Carrière</strong>
            <small>{partieEnCours ? 'Une partie t’attend : reprends-la !' : 'Qualifs, Compet’ et Défi contre le champion'}</small>
          </span>
        </button>
        <button class="mode-jeu duel" disabled>
          <span class="mode-emoji">👥</span>
          <span class="mode-texte">
            <strong>Duel à deux</strong>
            <small>Bientôt disponible</small>
          </span>
        </button>
        <button class="mode-jeu rapide" onClick={() => aller({ nom: 'rapide-config' })}>
          <span class="mode-emoji">⚡</span>
          <span class="mode-texte">
            <strong>Partie rapide</strong>
            <small>10 questions, jusqu'à 50 points</small>
          </span>
        </button>
      </nav>

      <footer class="pied-accueil">
        <button class="bouton-pied" disabled>
          📊 Statistiques
        </button>
        <button class="bouton-pied" onClick={() => aller({ nom: 'reglages' })}>
          ⚙️ Réglages
        </button>
      </footer>
    </div>
  );
}
