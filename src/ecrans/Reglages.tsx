import { useEffect, useState } from 'preact/hooks';
import { Interrupteur } from '../composants/Interrupteur';
import { CATEGORIES_PAR_ID } from '../logique/categories';
import { MOTIFS_SIGNALEMENT } from '../logique/types';
import { useAppli } from '../navigation';
import { partagerJSON } from '../outils/fichiers';
import {
  lireReglages,
  listerSignalements,
  restaurerQuestion,
  toutEffacer,
  type Signalement,
} from '../stockage/db';

const dateCourte = (t: number) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

export function EcranReglages() {
  const { aller, reglages, changerReglages } = useAppli();
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [etapeRaz, setEtapeRaz] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    listerSignalements().then(setSignalements);
  }, []);

  const restaurer = async (id: string) => {
    await restaurerQuestion(id);
    setSignalements(await listerSignalements());
  };

  const exporter = () =>
    partagerJSON(`signalements-${new Date().toISOString().slice(0, 10)}.json`, {
      type: 'signalements',
      exporte_le: new Date().toISOString(),
      signalements: signalements.map((s) => ({
        id: s.id,
        date: new Date(s.date).toISOString(),
        motif: s.motif,
        ...s.question,
      })),
    });

  const remettreAZero = async () => {
    await toutEffacer();
    changerReglages(await lireReglages());
    setSignalements([]);
    setEtapeRaz(3);
  };

  return (
    <div class="ecran reglages">
      <header class="barre-titre">
        <button class="retour" onClick={() => aller({ nom: 'accueil' })} aria-label="Retour">
          ‹
        </button>
        <h1>⚙️ Réglages</h1>
      </header>

      <section class="bloc">
        <h2 class="petit-titre">Jeu</h2>
        <Interrupteur libelle="🔊 Son" actif={reglages.son} onChange={(son) => changerReglages({ son })} />
        <Interrupteur
          libelle="⏱️ Chrono de 20 secondes"
          detail="Pour chaque question, dans tous les modes"
          actif={reglages.chrono}
          onChange={(chrono) => changerReglages({ chrono })}
        />
      </section>

      <section class="bloc">
        <h2 class="petit-titre">Questions signalées ({signalements.length})</h2>
        {signalements.length === 0 ? (
          <p class="doux">Aucune question signalée.</p>
        ) : (
          <>
            <ul class="liste-signalements">
              {signalements.map((s) => (
                <li key={s.id}>
                  <p class="signalement-question">{s.question.question}</p>
                  <p class="doux petit">
                    Réponse : {s.question.reponse} · {CATEGORIES_PAR_ID[s.question.categorie]?.nom} ·{' '}
                    {s.motif ? MOTIFS_SIGNALEMENT[s.motif] : 'sans motif'} · {dateCourte(s.date)}
                  </p>
                  <button class="bouton petit secondaire" onClick={() => restaurer(s.id)}>
                    ↩︎ Restaurer
                  </button>
                </li>
              ))}
            </ul>
            <button class="bouton secondaire" onClick={exporter}>
              📤 Exporter les signalements
            </button>
            <p class="doux petit">
              Envoie ce fichier lors d’une prochaine session de travail pour corriger la banque.
            </p>
          </>
        )}
      </section>

      <section class="bloc">
        <h2 class="petit-titre">Remise à zéro</h2>
        {etapeRaz === 0 && (
          <button class="bouton danger" onClick={() => setEtapeRaz(1)}>
            🗑️ Tout remettre à zéro
          </button>
        )}
        {etapeRaz === 1 && (
          <div class="confirmation">
            <p>Effacer l’historique des questions vues, les records, les signalements et les réglages ?</p>
            <button class="bouton danger" onClick={() => setEtapeRaz(2)}>
              Oui, continuer
            </button>
            <button class="bouton fantome" onClick={() => setEtapeRaz(0)}>
              Annuler
            </button>
          </div>
        )}
        {etapeRaz === 2 && (
          <div class="confirmation">
            <p>
              <strong>Dernière confirmation.</strong> Cette action est définitive.
            </p>
            <button class="bouton danger" onClick={remettreAZero}>
              Effacer définitivement
            </button>
            <button class="bouton fantome" onClick={() => setEtapeRaz(0)}>
              Annuler
            </button>
          </div>
        )}
        {etapeRaz === 3 && <p class="doux">✓ Tout a été remis à zéro.</p>}
      </section>

      <p class="version">Version du {__DATE_VERSION__}</p>
    </div>
  );
}
