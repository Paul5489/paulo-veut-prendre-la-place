import { useEffect, useState } from 'preact/hooks';
import { appliquerMiseAJour, miseAJourDisponible, surMiseAJour } from '../pwa';

export function BanniereMiseAJour() {
  const [dispo, setDispo] = useState(miseAJourDisponible());
  useEffect(() => surMiseAJour(() => setDispo(true)), []);
  if (!dispo) return null;
  return (
    <div class="banniere-maj" role="status">
      <span>✨ Nouvelle version disponible</span>
      <button class="bouton petit principal" onClick={appliquerMiseAJour}>
        Mettre à jour
      </button>
    </div>
  );
}
