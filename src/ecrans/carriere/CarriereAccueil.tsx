import { useEffect, useState } from 'preact/hooks';
import { Avatar, presentation } from '../../composants/Avatar';
import { Interrupteur } from '../../composants/Interrupteur';
import {
  ecrireEtatCarriere,
  lireEtatCarriere,
  lirePartie,
  nouvellePartie,
  sauverPartie,
  supprimerPartie,
  type PartieCarriere,
} from '../../jeu/carriere';
import { formaterEuros, type EtatCarriere } from '../../logique/carriere';
import { NIVEAUX, type Niveau } from '../../logique/types';
import { useAppli } from '../../navigation';

const ETAPES_LISIBLES: Record<string, string> = {
  presentation: 'présentation des candidats',
  qualifs: 'Qualifs',
  departage: 'départage des Qualifs',
  'qualifs-bilan': 'fin des Qualifs',
  compet: 'Compet’',
  'super-cash': 'super cash',
  'compet-bilan': 'fin de la Compet’',
  preliminaires: 'préliminaires',
  'defi-themes': 'choix des thèmes du Défi',
  'defi-challenger': 'Défi',
  'defi-champion': 'Défi',
  revelation: 'révélation du Défi',
  fin: 'fin de l’émission',
};

function lireNiveau(): Niveau {
  try {
    const n = Number(localStorage.getItem('carriere-niveau'));
    return ([1, 2, 3, 4].includes(n) ? n : 2) as Niveau;
  } catch {
    return 2;
  }
}

export function CarriereAccueil() {
  const { aller } = useAppli();
  const [etat, setEtat] = useState<EtatCarriere | null>(null);
  const [enCours, setEnCours] = useState<PartieCarriere | null | undefined>(undefined);
  const [niveau, setNiveau] = useState<Niveau>(lireNiveau);
  const [prepa, setPrepa] = useState(false);

  useEffect(() => {
    lireEtatCarriere().then(setEtat);
    lirePartie().then((p) => setEnCours(p ?? null));
  }, []);

  if (!etat || enCours === undefined) {
    return (
      <div class="ecran centre">
        <p class="chargement">Ouverture du studio…</p>
      </div>
    );
  }

  const ch = etat.champion;
  const joueurChampion = ch.participant.estJoueur;

  const lancer = async () => {
    setPrepa(true);
    try {
      localStorage.setItem('carriere-niveau', String(niveau));
    } catch {
      /* sans importance */
    }
    try {
      const p = await nouvellePartie(niveau);
      await sauverPartie(p);
      aller({ nom: 'carriere-partie' });
    } catch (e) {
      alert(`Impossible de préparer la partie : ${(e as Error).message}`);
      setPrepa(false);
    }
  };

  const abandonner = async () => {
    if (!confirm('Abandonner la partie en cours ? Elle ne comptera pas.')) return;
    await supprimerPartie();
    setEnCours(null);
  };

  return (
    <div class="ecran config">
      <header class="barre-titre">
        <button class="retour" onClick={() => aller({ nom: 'accueil' })} aria-label="Retour">
          ‹
        </button>
        <h1>🏆 Carrière</h1>
      </header>

      <div class="fauteuil-champion">
        <p class="petit-titre">{joueurChampion ? 'Le champion, c’est toi !' : 'Champion en titre'}</p>
        <Avatar p={ch.participant} taille={72} couronne />
        <strong>{joueurChampion ? `${ch.participant.prenom} (toi)` : ch.participant.prenom}</strong>
        {!joueurChampion && <span class="doux">{presentation(ch.participant)}</span>}
        <span class="or">
          {ch.victoires} victoire{ch.victoires > 1 ? 's' : ''} · cagnotte {formaterEuros(ch.cagnotte)}
        </span>
        <span class="doux petit">
          {joueurChampion
            ? 'Qualifs et Compet’ se jouent sans toi : tu affrontes directement le challenger.'
            : 'Qualifie-toi, remporte la Compet’, puis bats le champion au Défi pour lui prendre sa place.'}
        </span>
      </div>

      {enCours ? (
        <section class="bloc">
          <p>
            Une partie est en cours (niveau {NIVEAUX[enCours.niveau - 1].nom}, étape : {ETAPES_LISIBLES[enCours.etape]}).
          </p>
          <button class="bouton principal grand" onClick={() => aller({ nom: 'carriere-partie' })}>
            ▶ Reprendre la partie
          </button>
          <button class="bouton fantome" onClick={abandonner}>
            Abandonner cette partie
          </button>
        </section>
      ) : (
        <section>
          <h2 class="petit-titre">Niveau de la partie</h2>
          <div class="grille-niveaux">
            {NIVEAUX.map(({ niveau: n, nom }) => (
              <button key={n} class={`choix-niveau n${n} ${niveau === n ? 'actif' : ''}`} onClick={() => setNiveau(n)}>
                <strong>{nom}</strong>
                <small>{['Questions accessibles', 'Pour les curieux', 'Pour les érudits', 'Pour les experts'][n - 1]}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      <section class="bloc">
        <Interrupteur
          libelle="📈 Challengers de plus en plus forts"
          detail="Quand tu es champion, chaque victoire rend les suivants un peu plus redoutables."
          actif={etat.progression}
          onChange={(progression) => {
            const e = { ...etat, progression };
            setEtat(e);
            ecrireEtatCarriere(e);
          }}
        />
        <button class="bouton secondaire" onClick={() => aller({ nom: 'palmares' })}>
          🏅 Palmarès
        </button>
      </section>

      {!enCours && (
        <div class="bas-fixe">
          <button class="bouton principal grand" disabled={prepa} onClick={lancer}>
            {prepa ? 'Préparation du plateau…' : joueurChampion ? '👑 Défendre mon titre' : '🎬 Lancer l’émission'}
          </button>
        </div>
      )}
    </div>
  );
}
