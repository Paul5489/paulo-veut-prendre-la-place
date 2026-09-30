import { useAppli } from '../navigation';

export function Accueil() {
  const { aller } = useAppli();
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
        <span class="statut-icone">🎤</span>
        <span>
          Statut : <strong>Candidat</strong>
        </span>
      </div>

      <nav class="modes-jeu">
        <button class="mode-jeu carriere" disabled>
          <span class="mode-emoji">🏆</span>
          <span class="mode-texte">
            <strong>Carrière</strong>
            <small>Bientôt disponible</small>
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
