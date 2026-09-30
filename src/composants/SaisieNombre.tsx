import { useState } from 'preact/hooks';
import { lireNombre } from '../logique/texte';

interface Props {
  unite: string;
  onValider: (n: number) => void;
}

/** Saisie d'un nombre pour les questions de départage (clavier numérique sur iPhone). */
export function SaisieNombre({ unite, onValider }: Props) {
  const [texte, setTexte] = useState('');
  const [erreur, setErreur] = useState(false);
  const valider = (e: Event) => {
    e.preventDefault();
    const n = lireNombre(texte);
    if (n === null) setErreur(true);
    else onValider(n);
  };
  return (
    <form class="saisie-cash saisie-nombre" onSubmit={valider}>
      <div class="champ-nombre">
        <input
          type="text"
          inputMode="decimal"
          value={texte}
          onInput={(e) => {
            setTexte(e.currentTarget.value);
            setErreur(false);
          }}
          placeholder="Ton estimation"
          autocomplete="off"
          enterkeyhint="done"
          aria-label="Ton estimation"
        />
        {unite && <span class="unite">{unite}</span>}
      </div>
      {erreur && <p class="erreur">Tape un nombre, par exemple 1789 ou 42,5.</p>}
      <button type="submit" class="bouton principal" disabled={!texte.trim()}>
        Valider
      </button>
    </form>
  );
}
