import { useEffect, useState } from 'preact/hooks';
import { CATEGORIES, estCategorie } from '../logique/categories';
import { NIVEAUX, type CategorieId, type Niveau } from '../logique/types';
import { useAppli } from '../navigation';
import { lireRecords, type Records } from '../stockage/db';

/** Petit confort : on se souvient du dernier choix (sans importance si ça échoue). */
function lireDernierChoix(): { niveau: Niveau; categorie: CategorieId | 'melange' } {
  try {
    const c = JSON.parse(localStorage.getItem('rapide-choix') ?? '{}');
    return {
      niveau: [1, 2, 3, 4].includes(c.niveau) ? c.niveau : 1,
      categorie: c.categorie === 'melange' || estCategorie(c.categorie) ? c.categorie : 'melange',
    };
  } catch {
    return { niveau: 1, categorie: 'melange' };
  }
}

export function RapideConfig() {
  const { aller } = useAppli();
  const [choix, setChoix] = useState(lireDernierChoix);
  const [records, setRecords] = useState<Records>({});
  useEffect(() => {
    lireRecords().then(setRecords);
  }, []);

  const lancer = () => {
    try {
      localStorage.setItem('rapide-choix', JSON.stringify(choix));
    } catch {
      /* stockage indisponible : tant pis */
    }
    aller({ nom: 'rapide-jeu', ...choix });
  };

  return (
    <div class="ecran config">
      <header class="barre-titre">
        <button class="retour" onClick={() => aller({ nom: 'accueil' })} aria-label="Retour">
          ‹
        </button>
        <h1>⚡ Partie rapide</h1>
      </header>

      <section>
        <h2 class="petit-titre">Niveau</h2>
        <div class="grille-niveaux">
          {NIVEAUX.map(({ niveau, nom }) => (
            <button
              key={niveau}
              class={`choix-niveau n${niveau} ${choix.niveau === niveau ? 'actif' : ''}`}
              onClick={() => setChoix({ ...choix, niveau })}
            >
              <strong>{nom}</strong>
              <small>{records[niveau] !== undefined ? `Record ${records[niveau]}/50` : 'Pas de record'}</small>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 class="petit-titre">Catégorie</h2>
        <button
          class={`choix-categorie melange ${choix.categorie === 'melange' ? 'actif' : ''}`}
          onClick={() => setChoix({ ...choix, categorie: 'melange' })}
        >
          🎲 Culture générale mélangée
        </button>
        <div class="grille-categories">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              class={`choix-categorie ${choix.categorie === c.id ? 'actif' : ''}`}
              onClick={() => setChoix({ ...choix, categorie: c.id })}
            >
              <span class="emoji-cat">{c.emoji}</span>
              <span>{c.nom}</span>
            </button>
          ))}
        </div>
      </section>

      <div class="bas-fixe">
        <button class="bouton principal grand" onClick={lancer}>
          C'est parti !
        </button>
      </div>
    </div>
  );
}
