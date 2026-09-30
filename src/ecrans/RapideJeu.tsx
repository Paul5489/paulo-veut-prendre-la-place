import { useEffect, useState } from 'preact/hooks';
import { CarteQuestion, type ResultatQuestion } from '../composants/CarteQuestion';
import { preparerPartieRapide } from '../jeu/partieRapide';
import { total } from '../logique/scores';
import type { CategorieId, Niveau, Question } from '../logique/types';
import { useAppli } from '../navigation';
import { enregistrerReponse, enregistrerScoreRapide } from '../stockage/db';

interface Props {
  niveau: Niveau;
  categorie: CategorieId | 'melange';
}

export function RapideJeu({ niveau, categorie }: Props) {
  const { aller, reglages } = useAppli();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [index, setIndex] = useState(0);
  const [resultats, setResultats] = useState<ResultatQuestion[]>([]);

  useEffect(() => {
    preparerPartieRapide(niveau, categorie)
      .then(setQuestions)
      .catch(() => setErreur(true));
  }, []);

  const quitter = () => {
    if (resultats.length === 0 || confirm('Abandonner la partie ?')) aller({ nom: 'accueil' });
  };

  if (erreur || (questions && questions.length === 0)) {
    return (
      <div class="ecran centre">
        <p>😕 Impossible de préparer la partie : {erreur ? 'la banque de questions n’a pas pu être chargée.' : 'aucune question disponible.'}</p>
        <button class="bouton principal" onClick={() => aller({ nom: 'accueil' })}>
          Retour à l'accueil
        </button>
      </div>
    );
  }
  if (!questions) {
    return (
      <div class="ecran centre">
        <p class="chargement">Préparation du plateau…</p>
      </div>
    );
  }

  const score = total(resultats.map((r) => r.points));
  const derniere = index === questions.length - 1;

  const suivant = async (r: ResultatQuestion) => {
    enregistrerReponse(r.question, r.mode, r.correct, r.contestee, 'rapide');
    const tous = [...resultats, r];
    if (derniere) {
      const record = await enregistrerScoreRapide(niveau, total(tous.map((x) => x.points)));
      aller({ nom: 'rapide-fin', niveau, categorie, resultats: tous, record });
    } else {
      setResultats(tous);
      setIndex(index + 1);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div class="ecran jeu">
      <header class="barre-jeu">
        <button class="retour" onClick={quitter} aria-label="Quitter la partie">
          ✕
        </button>
        <div class="progression">
          Question {index + 1}/{questions.length}
        </div>
        <div class="score-jeu">{score} pts</div>
      </header>
      <div class="pastilles" aria-hidden="true">
        {questions.map((_, i) => (
          <span
            key={i}
            class={i < resultats.length ? (resultats[i].correct ? 'juste' : 'faux') : i === index ? 'encours' : ''}
          />
        ))}
      </div>
      <CarteQuestion
        key={questions[index].id}
        question={questions[index]}
        chrono={reglages.chrono}
        libelleSuivant={derniere ? 'Voir le résultat' : 'Question suivante'}
        onSuivant={suivant}
      />
    </div>
  );
}
