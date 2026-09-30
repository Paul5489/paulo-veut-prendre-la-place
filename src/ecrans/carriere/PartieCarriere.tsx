import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Avatar, presentation } from '../../composants/Avatar';
import { Fauteuil, Plateau } from '../../composants/Plateau';
import { Confettis } from '../../composants/Revelation';
import {
  lireEtatCarriere,
  lirePartie,
  sauverPartie,
  scoresCompet,
  scoresQualifs,
  supprimerPartie,
  trouver,
  type Etape,
  type PartieCarriere,
} from '../../jeu/carriere';
import { ID_JOUEUR } from '../../logique/adversaires';
import { EUROS_PAR_POINT, formaterEuros, type EtatCarriere } from '../../logique/carriere';
import { NIVEAUX } from '../../logique/types';
import { useAppli } from '../../navigation';
import { sons } from '../../son';
import { BandeauEtape, type PropsEtape } from './commun';
import { EtapeDefiJeu, EtapeDefiThemes, EtapeRevelation } from './Defi';
import {
  EtapeBilanCompet,
  EtapeBilanQualifs,
  EtapeCompet,
  EtapeDepartage,
  EtapePreliminaires,
  EtapeQualifs,
  EtapeSuperCash,
} from './Manches';

const TITRES: Record<Etape, string> = {
  presentation: 'Le plateau',
  qualifs: 'Les Qualifs',
  departage: 'Les Qualifs',
  'qualifs-bilan': 'Les Qualifs',
  compet: 'La Compet’',
  'super-cash': 'La Compet’',
  'compet-bilan': 'La Compet’',
  preliminaires: 'Les préliminaires',
  'defi-themes': 'Le Défi',
  'defi-challenger': 'Le Défi',
  'defi-champion': 'Le Défi',
  revelation: 'Le Défi',
  fin: 'Fin de l’émission',
};

/** Une partie de Carrière : chaque étape est enregistrée, on peut quitter et reprendre à tout moment. */
export function EcranPartieCarriere() {
  const { aller, reglages } = useAppli();
  const [p, setP] = useState<PartieCarriere | null>(null);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    lirePartie().then((x) => (x ? setP(x) : aller({ nom: 'carriere' })));
  }, []);

  if (!p) {
    return (
      <div class="ecran centre">
        <p class="chargement">Installation du plateau…</p>
      </div>
    );
  }

  const maj = async (suite: PartieCarriere | Promise<PartieCarriere>, options?: { defiler?: boolean }) => {
    setOccupe(true);
    try {
      const s = await suite;
      await sauverPartie(s);
      setP(s);
      if (options?.defiler !== false) window.scrollTo(0, 0);
    } catch (e) {
      alert(`Oups, un problème est survenu : ${(e as Error).message}`);
    } finally {
      setOccupe(false);
    }
  };

  const quitter = () => {
    if (p.etape === 'fin' || confirm('Quitter la partie ? Elle est sauvegardée : tu pourras la reprendre plus tard.')) {
      aller({ nom: 'carriere' });
    }
  };

  const props: PropsEtape = { p, maj, occupe, chrono: reglages.chrono };
  const etapes: Record<Etape, () => JSX.Element> = {
    presentation: () => <EtapePresentation {...props} />,
    qualifs: () => <EtapeQualifs {...props} />,
    departage: () => <EtapeDepartage {...props} />,
    'qualifs-bilan': () => <EtapeBilanQualifs {...props} />,
    compet: () => <EtapeCompet {...props} />,
    'super-cash': () => <EtapeSuperCash {...props} />,
    'compet-bilan': () => <EtapeBilanCompet {...props} />,
    preliminaires: () => <EtapePreliminaires {...props} />,
    'defi-themes': () => <EtapeDefiThemes {...props} />,
    'defi-challenger': () => <EtapeDefiJeu key="challenger" {...props} />,
    'defi-champion': () => <EtapeDefiJeu key="champion" {...props} />,
    revelation: () => <EtapeRevelation {...props} />,
    fin: () => <EtapeFin {...props} />,
  };

  return (
    <div class="ecran jeu carriere">
      <header class="barre-jeu">
        <button class="retour" onClick={quitter} aria-label="Quitter la partie">
          ✕
        </button>
        <div class="progression">{TITRES[p.etape]}</div>
        <span class={`chip niveau n${p.niveau}`}>{NIVEAUX[p.niveau - 1].nom}</span>
      </header>
      {etapes[p.etape]()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Présentation des candidats
// ---------------------------------------------------------------------------

function EtapePresentation({ p, maj }: PropsEtape) {
  const champion = p.champion;
  return (
    <>
      <BandeauEtape
        titre={p.role === 'champion' ? 'Tu es dans le fauteuil !' : 'Les candidats du jour'}
        detail={
          p.role === 'champion'
            ? 'Six candidats vont s’affronter pour gagner le droit de te défier.'
            : 'Six candidats, quatre places pour la Compet’, un seul challenger face au champion.'
        }
      />
      <div class="fauteuil-champion">
        <p class="petit-titre">Dans le fauteuil</p>
        <Fauteuil p={champion} taille={64} />
        <strong>{champion.estJoueur ? `${champion.prenom} (toi)` : champion.prenom}</strong>
        {!champion.estJoueur && <span class="doux">{presentation(champion)}</span>}
        <span class="or">
          {p.championVictoires} victoire{p.championVictoires > 1 ? 's' : ''} · cagnotte {formaterEuros(p.championCagnotte)}
        </span>
      </div>
      <Plateau participants={p.candidats} etats={Object.fromEntries(p.candidats.map((c) => [c.id, { eclaire: c.estJoueur }]))} />
      <ul class="liste-candidats">
        {p.candidats
          .filter((c) => !c.estJoueur)
          .map((c) => (
            <li key={c.id}>
              <Avatar p={c} taille={30} />
              <strong>{c.prenom}</strong>
              <span class="doux">{presentation(c)}</span>
            </li>
          ))}
      </ul>
      <button
        class="bouton principal grand"
        onClick={() => maj({ ...p, etape: p.role === 'champion' ? 'preliminaires' : 'qualifs', pas: 0 })}
      >
        {p.role === 'champion' ? 'Voir les préliminaires →' : 'Lancer les Qualifs →'}
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Fin de l'émission
// ---------------------------------------------------------------------------

const pointsTexte = (n: number) => `${n} point${Math.abs(n) > 1 ? 's' : ''}`;

function EtapeFin({ p }: PropsEtape) {
  const { aller } = useAppli();
  const [etat, setEtat] = useState<EtatCarriere | null>(null);
  const i = p.issue!;
  const challenger = p.challenger ? trouver(p, p.challenger) : null;
  const champion = p.champion;
  const joueurGagne =
    i.type === 'defi' && ((i.vainqueur === 'challenger') === (challenger?.estJoueur ?? false));

  useEffect(() => {
    supprimerPartie();
    lireEtatCarriere().then(setEtat);
    if (i.type === 'defi') (joueurGagne ? sons.victoire : sons.defaite)();
  }, []);

  let titre = '';
  let texte = '';
  if (i.type === 'defi' && challenger) {
    const sc = i.scoreChallenger!;
    const sch = i.scoreChampion!;
    if (p.role === 'candidat') {
      if (i.vainqueur === 'challenger') {
        titre = '🎉 Tu prends la place !';
        texte = `Tu bats ${champion.prenom} ${sc} à ${sch}. Te voilà dans le fauteuil du champion, avec une cagnotte de départ de ${formaterEuros(sc * EUROS_PAR_POINT)}.`;
      } else {
        titre = `${champion.prenom} garde sa place`;
        texte = `${sc === sch ? `Égalité ${sc} partout : à égalité, le champion reste dans le fauteuil.` : `${champion.prenom} l'emporte ${sch} à ${sc}.`} Tes ${sc} points lui rapportent ${formaterEuros(sc * EUROS_PAR_POINT)}.`;
      }
    } else if (i.vainqueur === 'champion') {
      titre = '👑 Tu gardes ta place !';
      texte = `Tu bats ${challenger.prenom} ${sch} à ${sc}, et ses ${sc} points te rapportent ${formaterEuros(sc * EUROS_PAR_POINT)}.`;
    } else {
      titre = `💔 ${challenger.prenom} te prend la place`;
      texte = `${challenger.prenom} l'emporte ${sc} à ${sch}. Ta série entre au palmarès.`;
    }
  } else if (i.type === 'elimine-qualifs') {
    titre = 'Éliminé aux Qualifs';
    texte = `Tu termines avec ${pointsTexte(scoresQualifs(p)[ID_JOUEUR] ?? 0)} sur 19.`;
  } else {
    titre = 'Éliminé à la Compet’';
    texte = `Tu termines avec ${pointsTexte(scoresCompet(p)[ID_JOUEUR] ?? 0)} sur 27.`;
  }

  const trophees = i.evenements.filter((e) => e.type === 'trophee');

  return (
    <div class="fin-carriere">
      {joueurGagne && <Confettis />}
      <h1 class="titre-fin">{titre}</h1>
      <p class="centre-texte">{texte}</p>
      {i.pendantCeTemps && <p class="encart">📺 Pendant ce temps : {i.pendantCeTemps}</p>}
      {trophees.map((t) => (
        <div key={t.type === 'trophee' ? t.palier : 0} class="nouveau-record">
          🏆 Trophée débloqué : {t.type === 'trophee' && t.palier} victoires !
        </div>
      ))}
      {etat && (
        <div class="fauteuil-champion">
          <p class="petit-titre">Champion en titre</p>
          <Fauteuil p={etat.champion.participant} taille={60} />
          <strong>{etat.champion.participant.estJoueur ? `${etat.champion.participant.prenom} (toi)` : etat.champion.participant.prenom}</strong>
          <span class="or">
            {etat.champion.victoires} victoire{etat.champion.victoires > 1 ? 's' : ''} · cagnotte {formaterEuros(etat.champion.cagnotte)}
          </span>
        </div>
      )}
      <div class="boutons-fin">
        <button class="bouton principal grand" onClick={() => aller({ nom: 'carriere' })}>
          🔁 Nouvelle partie
        </button>
        <button class="bouton secondaire" onClick={() => aller({ nom: 'palmares' })}>
          🏅 Palmarès
        </button>
        <button class="bouton fantome" onClick={() => aller({ nom: 'accueil' })}>
          Accueil
        </button>
      </div>
    </div>
  );
}
