import type { Participant } from '../logique/adversaires';

interface Props {
  p: Participant;
  taille?: number;
  couronne?: boolean;
}

/** Pastille colorée aux initiales du candidat (avec une couronne pour le champion). */
export function Avatar({ p, taille = 40, couronne = false }: Props) {
  return (
    <span
      class={`avatar ${p.estJoueur ? 'joueur' : ''}`}
      style={{ background: p.avatar.couleur, width: `${taille}px`, height: `${taille}px`, fontSize: `${taille * 0.4}px` }}
      aria-hidden="true"
    >
      {p.avatar.initiales}
      {couronne && <span class="couronne">👑</span>}
    </span>
  );
}

/** « Léa, fleuriste à Brest » */
export function presentation(p: Participant): string {
  if (p.estJoueur) return '';
  return `${p.metier.charAt(0).toUpperCase()}${p.metier.slice(1)} à ${p.ville}`;
}
