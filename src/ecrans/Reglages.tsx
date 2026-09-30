import { useEffect, useState } from 'preact/hooks';
import { Interrupteur } from '../composants/Interrupteur';
import { ReglageChrono } from '../composants/ReglageChrono';
import { CATEGORIES_PAR_ID } from '../logique/categories';
import { MOTIFS_SIGNALEMENT } from '../logique/types';
import { useAppli } from '../navigation';
import { partagerJSON } from '../outils/fichiers';
import { ecrireEtatCarriere, lireEtatCarriere } from '../jeu/carriere';
import { Avatar } from '../composants/Avatar';
import { creerJoueur, initiales } from '../logique/adversaires';
import {
  exporterDonnees,
  importerDonnees,
  lireReglages,
  listerSignalements,
  restaurerQuestion,
  toutEffacer,
  type Sauvegarde,
  type Signalement,
} from '../stockage/db';

const dateCourte = (t: number) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

export function EcranReglages() {
  const { aller, reglages, changerReglages } = useAppli();
  const [signalements, setSignalements] = useState<Signalement[]>([]);
  const [etapeRaz, setEtapeRaz] = useState<0 | 1 | 2 | 3>(0);
  const [messageSauvegarde, setMessageSauvegarde] = useState('');
  const [prenom, setPrenom] = useState(reglages.prenom);

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

  const enregistrerPrenom = async () => {
    const propre = prenom.trim().slice(0, 20) || 'Paulo';
    setPrenom(propre);
    changerReglages({ prenom: propre });
    const etat = await lireEtatCarriere();
    if (etat.champion.participant.estJoueur) {
      const participant = { ...etat.champion.participant, prenom: propre, avatar: { ...etat.champion.participant.avatar, initiales: initiales(propre) } };
      await ecrireEtatCarriere({ ...etat, champion: { ...etat.champion, participant } });
    }
  };

  const changerLook = async () => {
    const avatarGraine = reglages.avatarGraine + 1;
    changerReglages({ avatarGraine });
    const etat = await lireEtatCarriere();
    if (etat.champion.participant.estJoueur) {
      const participant = { ...etat.champion.participant, avatar: { ...etat.champion.participant.avatar, graine: avatarGraine } };
      await ecrireEtatCarriere({ ...etat, champion: { ...etat.champion, participant } });
    }
  };

  const sauvegarder = async () => {
    await partagerJSON(`paulo-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, await exporterDonnees());
  };

  const restaurerSauvegarde = async (e: Event) => {
    const champ = e.currentTarget as HTMLInputElement;
    const fichier = champ.files?.[0];
    champ.value = '';
    if (!fichier) return;
    try {
      const s = JSON.parse(await fichier.text()) as Sauvegarde;
      const date = s.date ? new Date(s.date).toLocaleString('fr-FR') : 'date inconnue';
      if (!confirm(`Remplacer toutes tes données actuelles par cette sauvegarde (${date}) ?`)) return;
      await importerDonnees(s);
      const r = await lireReglages();
      changerReglages(r);
      setPrenom(r.prenom);
      setSignalements(await listerSignalements());
      setMessageSauvegarde('✓ Sauvegarde restaurée.');
    } catch (err) {
      setMessageSauvegarde(`❌ ${(err as Error).message}`);
    }
  };

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
        <div class="ligne-avatar">
          <Avatar p={creerJoueur(prenom, reglages.avatarGraine)} taille={64} />
          <button class="bouton secondaire petit" onClick={changerLook}>
            🎲 Changer de look
          </button>
        </div>
        <label class="ligne-prenom">
          <span>Ton prénom sur le plateau</span>
          <input
            type="text"
            value={prenom}
            maxLength={20}
            autocomplete="off"
            autocorrect="off"
            enterkeyhint="done"
            onInput={(e) => setPrenom(e.currentTarget.value)}
            onBlur={enregistrerPrenom}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
          />
        </label>
        <Interrupteur libelle="🔊 Son" actif={reglages.son} onChange={(son) => changerReglages({ son })} />
        <ReglageChrono />
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
        <h2 class="petit-titre">Sauvegarde</h2>
        <p class="doux petit">
          Tes données (historique, carrière, palmarès, réglages) sont gardées dans l’iPhone. Si tu supprimes l’appli de
          l’écran d’accueil, elles sont perdues : sauvegarde-les de temps en temps (dans Fichiers ou par e-mail).
        </p>
        <button class="bouton secondaire" onClick={sauvegarder}>
          💾 Sauvegarder mes données
        </button>
        <label class="bouton secondaire bouton-fichier">
          📂 Restaurer une sauvegarde
          <input type="file" accept="application/json,.json" onChange={restaurerSauvegarde} />
        </label>
        {messageSauvegarde && <p class="doux">{messageSauvegarde}</p>}
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
            <p>Effacer l’historique des questions vues, les records, la carrière et le palmarès, les signalements et les réglages ?</p>
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
