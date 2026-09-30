import { useEffect } from 'preact/hooks';
import type { ResultatQuestion } from '../composants/CarteQuestion';
import { NOM_MODE, scoreMaximal, total } from '../logique/scores';
import { NIVEAUX, type CategorieId, type Niveau } from '../logique/types';
import { useAppli } from '../navigation';
import { sons } from '../son';

interface Props {
  niveau: Niveau;
  categorie: CategorieId | 'melange';
  resultats: ResultatQuestion[];
  record: boolean;
}

function commentaire(score: number, max: number): string {
  const taux = score / max;
  if (taux >= 0.9) return 'Stratosphérique ! Le fauteuil t’attend.';
  if (taux >= 0.7) return 'Superbe partie !';
  if (taux >= 0.5) return 'Belle prestation.';
  if (taux >= 0.3) return 'Pas mal, tu peux mieux faire !';
  return 'On a tous des jours sans… Revanche ?';
}

export function RapideFin({ niveau, categorie, resultats, record }: Props) {
  const { aller } = useAppli();
  const score = total(resultats.map((r) => r.points));
  const max = scoreMaximal(resultats.length);
  const bonnes = resultats.filter((r) => r.correct).length;

  useEffect(() => {
    if (record) sons.victoire();
  }, []);

  return (
    <div class="ecran fin">
      <h1 class="titre-fin">Partie terminée</h1>
      <div class="score-final">
        <span class="valeur">{score}</span>
        <span class="sur">/ {max} points</span>
      </div>
      {record && <div class="nouveau-record">🏆 Nouveau record en niveau {NIVEAUX[niveau - 1].nom} !</div>}
      <p class="doux centre-texte">
        {bonnes} bonne{bonnes > 1 ? 's' : ''} réponse{bonnes > 1 ? 's' : ''} sur {resultats.length}. {commentaire(score, max)}
      </p>

      <ul class="recap">
        {resultats.map((r) => (
          <li key={r.question.id} class={r.correct ? 'juste' : 'faux'}>
            <span class="recap-icone">{r.correct ? '✓' : '✗'}</span>
            <span class="recap-texte">
              {r.question.question}
              <small>{r.question.reponse}</small>
            </span>
            <span class="recap-points">
              {r.mode ? NOM_MODE[r.mode] : '—'}
              <strong>{r.points > 0 ? `+${r.points}` : '0'}</strong>
            </span>
          </li>
        ))}
      </ul>

      <div class="boutons-fin">
        <button class="bouton principal grand" onClick={() => aller({ nom: 'rapide-jeu', niveau, categorie })}>
          🔁 Rejouer
        </button>
        <button class="bouton secondaire" onClick={() => aller({ nom: 'rapide-config' })}>
          Changer de niveau ou de catégorie
        </button>
        <button class="bouton fantome" onClick={() => aller({ nom: 'accueil' })}>
          Accueil
        </button>
      </div>
    </div>
  );
}
