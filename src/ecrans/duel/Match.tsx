import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Avatar } from '../../composants/Avatar';
import { CarteQuestion } from '../../composants/CarteQuestion';
import { ModalArbitrage } from '../../composants/ModalArbitrage';
import { SceneDuel, type EtatBuzzer, type EtatPupitre } from '../../composants/Plateau';
import { SaisieNombre } from '../../composants/SaisieNombre';
import { NB_QUESTIONS_DEFI, scoreDefi, scorePotentiel, type QuestionPerso } from '../../jeu/carriere';
import {
  challengerDe,
  choisirThemesDuel,
  lireHistoriqueDuo,
  lireMatch,
  mancheEnCours,
  nouveauDepartage,
  nouveauMatch,
  preparerManche,
  repondreDepartage,
  resultatsMatch,
  sauverMatch,
  scoresManche,
  supprimerMatch,
  terminerMatch,
  terminerRevelation,
  vainqueurDuMatch,
  type EtapeDuel,
  type MatchDuel,
} from '../../jeu/duel';
import type { ThemeInfo } from '../../logique/carriere';
import { autre, scoreMatch, type HistoriqueDuo, type IdJoueurDuel } from '../../logique/duel';
import { NOM_MODE, pointsObtenus } from '../../logique/scores';
import type { Question } from '../../logique/types';
import { useAppli } from '../../navigation';
import { sons } from '../../son';
import { enregistrerReponse, marquerVues } from '../../stockage/db';
import { CarteTheme } from '../carriere/Defi';
import { BandeauEtape, cloner, de, versEnregistree } from '../carriere/commun';
import type { ReponseEnregistree } from '../../logique/carriere';

interface PropsEtape {
  m: MatchDuel;
  maj: (suite: MatchDuel | Promise<MatchDuel>) => void;
  occupe: boolean;
  chrono: boolean;
}

const e = (feminin: boolean) => (feminin ? 'e' : '');

/**
 * Les réponses du joueur 1 (le propriétaire de l'iPhone) comptent dans ses statistiques ;
 * celles du joueur 2 marquent seulement les questions comme vues.
 */
function noterDuel(joueur: IdJoueurDuel, q: Question, r: ReponseEnregistree) {
  if (joueur === 'j1') enregistrerReponse(q, r.mode, r.correct, !!r.contestee, 'duel');
  else marquerVues([q]);
}

function Scene({
  m,
  etatChallenger,
  etatChampion,
  gauche,
  droite,
}: {
  m: MatchDuel;
  etatChallenger?: EtatPupitre;
  etatChampion?: EtatPupitre;
  gauche: string;
  droite: string;
}) {
  const manche = mancheEnCours(m);
  return (
    <SceneDuel
      challenger={m.joueurs[challengerDe(manche)]}
      champion={m.joueurs[manche.champion]}
      etatChallenger={etatChallenger}
      etatChampion={etatChampion}
      texteChallenger={gauche}
      texteChampion={droite}
    />
  );
}

// ---------------------------------------------------------------------------
// Conteneur
// ---------------------------------------------------------------------------

export function EcranMatchDuel() {
  const { aller, reglages } = useAppli();
  const [m, setM] = useState<MatchDuel | null>(null);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    lireMatch().then((x) => (x ? setM(x) : aller({ nom: 'duel' })));
  }, []);

  if (!m) return null;

  const maj = async (suite: MatchDuel | Promise<MatchDuel>) => {
    setOccupe(true);
    try {
      const s = await suite;
      await sauverMatch(s);
      setM(s);
      window.scrollTo(0, 0);
    } catch (err) {
      alert(`Oups, un problème est survenu : ${(err as Error).message}`);
    } finally {
      setOccupe(false);
    }
  };

  const quitter = () => {
    if (m.etape === 'fin' || confirm('Quitter le match ? Il est sauvegardé : vous pourrez le reprendre.')) aller({ nom: 'duel' });
  };

  const s = scoreMatch(resultatsMatch(m));
  const props: PropsEtape = { m, maj, occupe, chrono: reglages.chrono };
  const etapes: Record<EtapeDuel, () => JSX.Element> = {
    'pile-ou-face': () => <EtapePileOuFace {...props} />,
    themes: () => <EtapeThemes key={m.manches.length} {...props} />,
    'passe-challenger': () => <EtapePasse {...props} />,
    challenger: () => <EtapeJeu key="challenger" {...props} />,
    'passe-champion': () => <EtapePasse {...props} />,
    champion: () => <EtapeJeu key="champion" {...props} />,
    revelation: () => <EtapeRevelation {...props} />,
    departage: () => <EtapeDepartage {...props} />,
    'bilan-manche': () => <EtapeBilanManche {...props} />,
    fin: () => <EtapeFin {...props} />,
  };

  return (
    <div class="ecran jeu match-duel">
      <header class="barre-jeu">
        <button class="retour" onClick={quitter} aria-label="Quitter le match">
          ✕
        </button>
        <div class="progression">{m.manches.length ? `Manche ${m.manches.length}` : 'Duel à deux'}</div>
        <span class="score-jeu">
          {m.joueurs.j1.prenom} {s.j1} – {s.j2} {m.joueurs.j2.prenom}
        </span>
      </header>
      {etapes[m.etape]()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pile ou face
// ---------------------------------------------------------------------------

function EtapePileOuFace({ m, maj, occupe }: PropsEtape) {
  const [lance, setLance] = useState(false);
  const [fini, setFini] = useState(false);
  const { j1, j2 } = m.joueurs;
  const gagnant = m.joueurs[m.pileOuFace];

  const lancer = () => {
    setLance(true);
    sons.suspense();
    setTimeout(() => {
      setFini(true);
      sons.victoire();
    }, 2600);
  };

  return (
    <>
      <BandeauEtape
        titre="🪙 Pile ou face"
        detail={`Pile : ${j1.prenom} · Face : ${j2.prenom}. Le gagnant choisit les thèmes de la 1re manche et joue en second.`}
      />
      <div class="piece-scene">
        <div class={`piece ${lance ? (m.pileOuFace === 'j1' ? 'lance-pile' : 'lance-face') : ''}`}>
          <div class="piece-face pile">
            <Avatar p={j1} taille={86} />
            <span>Pile</span>
          </div>
          <div class="piece-face face">
            <Avatar p={j2} taille={86} />
            <span>Face</span>
          </div>
        </div>
      </div>
      {!lance && (
        <button class="bouton principal grand" onClick={lancer}>
          Lancer la pièce
        </button>
      )}
      {fini && (
        <>
          <p class="encart centre-texte">
            {m.pileOuFace === 'j1' ? 'Pile' : 'Face'} ! <strong>{gagnant.prenom}</strong> choisit les thèmes de la
            1re manche.
          </p>
          <button class="bouton principal grand" disabled={occupe} onClick={() => maj(preparerManche(m))}>
            {gagnant.prenom}, à toi de choisir →
          </button>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Choix des thèmes
// ---------------------------------------------------------------------------

function EtapeThemes({ m, maj, occupe }: PropsEtape) {
  const manche = mancheEnCours(m);
  const champion = m.joueurs[manche.champion];
  const challenger = m.joueurs[challengerDe(manche)];
  const [pourLui, setPourLui] = useState<ThemeInfo | null>(null);
  const [pourMoi, setPourMoi] = useState<ThemeInfo | null>(null);
  return (
    <>
      <BandeauEtape
        titre={`${champion.prenom} choisit les thèmes`}
        detail={
          !pourLui
            ? `${champion.prenom}, choisis d'abord le thème ${de(challenger.prenom)}.`
            : !pourMoi
              ? `${champion.prenom}, choisis maintenant ton propre thème.`
              : 'Thèmes choisis !'
        }
      />
      <Scene m={m} gauche="Joue en premier" droite="Choisit les thèmes" etatChampion={{ eclaire: true }} />
      <div class="grille-themes">
        {manche.themes.map((t) => {
          const classe = pourLui?.id === t.id ? 'pour-challenger' : pourMoi?.id === t.id ? 'pour-champion' : '';
          const action = !pourLui ? () => setPourLui(t) : !pourMoi && t.id !== pourLui.id ? () => setPourMoi(t) : undefined;
          return (
            <CarteTheme
              key={t.id}
              t={t}
              classe={classe}
              onClick={action}
              note={pourLui?.id === t.id ? `Pour ${challenger.prenom}` : pourMoi?.id === t.id ? `Pour ${champion.prenom}` : undefined}
            />
          );
        })}
      </div>
      {pourLui && pourMoi ? (
        <button class="bouton principal grand" disabled={occupe} onClick={() => maj(choisirThemesDuel(m, pourLui, pourMoi))}>
          Valider les thèmes →
        </button>
      ) : (
        pourLui && (
          <button class="bouton fantome" onClick={() => setPourLui(null)}>
            ↺ Changer le thème {de(challenger.prenom)}
          </button>
        )
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Passe le téléphone
// ---------------------------------------------------------------------------

function EtapePasse({ m, maj }: PropsEtape) {
  const manche = mancheEnCours(m);
  const enChallenger = m.etape === 'passe-challenger';
  const qui = m.joueurs[enChallenger ? challengerDe(manche) : manche.champion];
  const lautre = m.joueurs[enChallenger ? manche.champion : challengerDe(manche)];
  const theme = enChallenger ? manche.themeChallenger! : manche.themeChampion!;
  return (
    <div class="passe-telephone">
      <Avatar p={qui} taille={110} />
      <h2>📱 Passe le téléphone à {qui.prenom}</h2>
      <p class="doux">{lautre.prenom}, ne regarde pas l'écran !</p>
      <p class="encart">
        Thème : <strong>{theme.titre}</strong> · {NB_QUESTIONS_DEFI} questions, mode au choix.
        <br />
        {enChallenger
          ? 'Tes réponses ne seront corrigées qu’à la fin : seul ton score potentiel s’affiche.'
          : `${lautre.prenom} a un score potentiel de ${scorePotentiel(manche.questionsChallenger)} points.`}
      </p>
      <button
        class="bouton principal grand"
        onClick={() => maj({ ...m, etape: enChallenger ? 'challenger' : 'champion', pas: 0 })}
      >
        Je suis {qui.prenom}, je suis prêt{e(qui.feminin)} !
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Les 6 questions de chacun
// ---------------------------------------------------------------------------

function EtapeJeu({ m, maj, chrono }: PropsEtape) {
  const manche = mancheEnCours(m);
  const enChallenger = m.etape === 'challenger';
  const idQui = enChallenger ? challengerDe(manche) : manche.champion;
  const lautre = m.joueurs[autre(idQui)];
  const liste = enChallenger ? manche.questionsChallenger : manche.questionsChampion;
  const theme = enChallenger ? manche.themeChallenger! : manche.themeChampion!;
  const potentiel = scorePotentiel(manche.questionsChallenger);
  const [buzzer, setBuzzer] = useState<EtatBuzzer>('eteint');
  const x = liste[m.pas];
  const dernier = m.pas + 1 >= NB_QUESTIONS_DEFI;

  return (
    <>
      <BandeauEtape
        titre={`${m.joueurs[idQui].prenom} · ${theme.titre}`}
        detail={`Question ${m.pas + 1}/${NB_QUESTIONS_DEFI}${enChallenger ? ' · corrections à la fin' : ` · score à battre : ${potentiel} au maximum`}`}
      />
      <Scene
        m={m}
        gauche={`Potentiel : ${potentiel} pts`}
        droite={enChallenger ? 'Joue ensuite' : `${scoreDefi(manche.questionsChampion.slice(0, m.pas))} pts`}
        etatChallenger={enChallenger ? { eclaire: true, buzzer } : {}}
        etatChampion={enChallenger ? {} : { eclaire: true, buzzer }}
      />
      <CarteQuestion
        key={x.question.id}
        question={x.question}
        chrono={chrono}
        differee={enChallenger}
        potentiel={potentiel}
        arbitre={lautre.prenom}
        onCorrection={(correct) => {
          sons.buzz();
          setBuzzer(correct === null ? 'appuye' : correct ? 'juste' : 'faux');
        }}
        libelleSuivant={dernier ? (enChallenger ? `Au tour ${de(lautre.prenom)}` : 'La révélation') : 'Question suivante'}
        onSuivant={(r) => {
          const rep = versEnregistree(r);
          if (!enChallenger) noterDuel(idQui, x.question, rep);
          const s = cloner(m);
          const manche2 = mancheEnCours(s);
          (enChallenger ? manche2.questionsChallenger : manche2.questionsChampion)[m.pas].reponse = rep;
          setBuzzer('eteint');
          maj(dernier ? { ...s, etape: enChallenger ? 'passe-champion' : 'revelation', pas: 0 } : { ...s, pas: m.pas + 1 });
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Révélation des réponses du challenger
// ---------------------------------------------------------------------------

function EtapeRevelation({ m, maj, occupe }: PropsEtape) {
  const manche = mancheEnCours(m);
  const idChallenger = challengerDe(manche);
  const challenger = m.joueurs[idChallenger];
  const champion = m.joueurs[manche.champion];
  const liste: QuestionPerso[] = manche.questionsChallenger;
  const revelees = m.pas;
  const [suspense, setSuspense] = useState(false);
  const [contestation, setContestation] = useState<number | null>(null);
  const [refusees, setRefusees] = useState<number[]>([]);
  const scoreChallenger = scoreDefi(liste.slice(0, revelees));
  const scoreChampion = scoreDefi(manche.questionsChampion);
  const fini = revelees >= liste.length;

  const reveler = () => {
    setSuspense(true);
    sons.suspense();
    setTimeout(() => {
      setSuspense(false);
      (liste[revelees].reponse?.correct ? sons.bonne : sons.mauvaise)();
      maj({ ...m, pas: revelees + 1 });
    }, 1600);
  };

  const valider = (i: number) => {
    const s = cloner(m);
    const r = mancheEnCours(s).questionsChallenger[i].reponse!;
    r.correct = true;
    r.contestee = true;
    r.points = pointsObtenus(r.mode, true);
    setContestation(null);
    sons.bonne();
    maj(s);
  };

  const conclure = () => {
    for (const x of liste) if (x.reponse) noterDuel(idChallenger, x.question, x.reponse);
    maj(terminerRevelation(m));
  };

  const derniere = revelees > 0 ? liste[revelees - 1].reponse : undefined;
  return (
    <>
      <BandeauEtape titre="🥁 La révélation" detail={`Les réponses ${de(challenger.prenom)}, dévoilées une par une.`} />
      <Scene
        m={m}
        gauche={`${scoreChallenger} pts`}
        droite={`${scoreChampion} pts`}
        etatChallenger={
          suspense
            ? { eclaire: true, bulle: '…' }
            : derniere
              ? { buzzer: derniere.correct ? 'juste' : 'faux', bulle: `« ${derniere.saisie ?? '—'} »` }
              : {}
        }
      />
      <ul class="liste-revelation">
        {liste.map((x, i) => {
          const r = x.reponse!;
          const montre = i < revelees;
          return (
            <li key={x.question.id} class={montre ? (r.correct ? 'juste' : 'faux') : i === revelees && suspense ? 'suspense' : ''}>
              <p class="revelation-question">{x.question.question}</p>
              <p class="revelation-reponse">
                <span class={`chip mode-choisi ${r.mode ?? ''}`}>{r.mode ? NOM_MODE[r.mode] : '—'}</span>
                <span>« {r.saisie ?? 'pas de réponse'} »</span>
                <span class={`resultat ${montre ? (r.correct ? 'juste' : 'faux') : 'masque'}`}>
                  {montre ? (r.correct ? `✓ +${r.points}` : '✗') : '?'}
                </span>
              </p>
              {montre && !r.correct && (
                <p class="doux petit">
                  Bonne réponse : <strong class="or">{x.question.reponse}</strong>
                </p>
              )}
              {montre && r.mode === 'cash' && !r.correct && r.saisie && !refusees.includes(i) && (
                <button class="bouton petit secondaire" onClick={() => setContestation(i)}>
                  🙋 Contester
                </button>
              )}
              {refusees.includes(i) && <p class="doux petit">{champion.prenom} a refusé la contestation.</p>}
            </li>
          );
        })}
      </ul>
      {contestation !== null && (
        <ModalArbitrage
          arbitre={champion.prenom}
          reponse={liste[contestation].reponse?.saisie ?? ''}
          bonne={liste[contestation].question.reponse}
          onOui={() => valider(contestation)}
          onNon={() => {
            setRefusees([...refusees, contestation]);
            setContestation(null);
          }}
        />
      )}
      {!fini ? (
        <>
          <button class="bouton principal grand" disabled={suspense} onClick={reveler}>
            {suspense ? 'Suspense…' : `Révéler la réponse n°${revelees + 1}`}
          </button>
          <button class="bouton fantome" disabled={suspense} onClick={() => maj({ ...m, pas: liste.length })}>
            Tout révéler d'un coup
          </button>
        </>
      ) : (
        <>
          <p class="verdict-defi challenger">
            {challenger.prenom} {scoreChallenger} – {scoreChampion} {champion.prenom}
            {scoreChallenger === scoreChampion ? ' : égalité !' : ''}
          </p>
          <button class="bouton principal grand" disabled={occupe} onClick={conclure}>
            {scoreChallenger === scoreChampion ? 'Question de départage →' : 'Résultat de la manche →'}
          </button>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Départage (égalité)
// ---------------------------------------------------------------------------

const formaterValeur = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 3 });

function EtapeDepartage({ m, maj, occupe }: PropsEtape) {
  const manche = mancheEnCours(m);
  const d = manche.departages[manche.departages.length - 1];
  const idPremier = challengerDe(manche);
  const idSecond = manche.champion;
  const premier = m.joueurs[idPremier];
  const second = m.joueurs[idSecond];
  const unite = d.question.unite ? ` ${d.question.unite}` : '';

  if (m.pas === 0 || m.pas === 2) {
    const qui = m.pas === 0 ? premier : second;
    return (
      <>
        <BandeauEtape
          titre="⚖️ Départage"
          detail={`Égalité ! Chacun donne un nombre, sans le montrer à l'autre. Le plus proche gagne la manche. À toi, ${qui.prenom}.`}
        />
        <div class="rangee-avatars">
          <span>
            <Avatar p={qui} taille={64} />
            <small>{qui.prenom}</small>
          </span>
        </div>
        <p class="texte-question">{d.question.question}</p>
        <SaisieNombre key={m.pas} unite={d.question.unite} onValider={(n) => maj(repondreDepartage(m, m.pas === 0 ? idPremier : idSecond, n))} />
      </>
    );
  }
  if (m.pas === 1) {
    return (
      <div class="passe-telephone">
        <Avatar p={second} taille={110} />
        <h2>📱 Passe le téléphone à {second.prenom}</h2>
        <p class="doux">{premier.prenom} a donné sa réponse en secret.</p>
        <button class="bouton principal grand" onClick={() => maj({ ...m, pas: 2 })}>
          Je suis {second.prenom}, je suis prêt{e(second.feminin)} !
        </button>
      </div>
    );
  }

  const v = d.question.valeur;
  const ids: IdJoueurDuel[] = [idPremier, idSecond];
  return (
    <>
      <BandeauEtape titre="Résultat du départage" />
      <div class="correction juste">
        <p class="bonne-reponse">
          La réponse : <strong>{formaterValeur(v)}{unite}</strong>
        </p>
        <p class="anecdote">💡 {d.question.anecdote}</p>
      </div>
      <ul class="liste-departage">
        {ids.map((id) => {
          const r = d.reponses[id]!;
          const gagne = d.gagnant === id;
          return (
            <li key={id} class={gagne ? 'juste' : d.gagnant ? 'faux' : ''}>
              <Avatar p={m.joueurs[id]} taille={34} />
              <span class="defile-nom">
                {m.joueurs[id].prenom}
                <small>
                  {formaterValeur(r)}
                  {unite} · écart {formaterValeur(Math.abs(r - v))}
                </small>
              </span>
              {d.gagnant && <span class={`resultat ${gagne ? 'juste' : 'faux'}`}>{gagne ? 'Gagné' : 'Perdu'}</span>}
            </li>
          );
        })}
      </ul>
      {d.gagnant === null ? (
        <>
          <p class="encart">Exactement aussi proches ! Une autre question de départage…</p>
          <button class="bouton principal grand" disabled={occupe} onClick={() => maj(nouveauDepartage(m))}>
            Nouvelle question →
          </button>
        </>
      ) : (
        <button class="bouton principal grand" onClick={() => maj({ ...m, etape: 'bilan-manche', pas: 0 })}>
          Bilan de la manche →
        </button>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Bilan de la manche et fin du match
// ---------------------------------------------------------------------------

function EtapeBilanManche({ m, maj, occupe }: PropsEtape) {
  const manche = mancheEnCours(m);
  const r = manche.resultat!;
  const gagnant = m.joueurs[r.vainqueur];
  const s = scoreMatch(resultatsMatch(m));
  const fini = vainqueurDuMatch(m);
  const scores = scoresManche(manche);
  useEffect(() => {
    sons.victoire();
  }, []);
  const idChallenger = challengerDe(manche);
  return (
    <>
      <BandeauEtape
        titre={`🎉 ${gagnant.prenom} remporte la manche ${m.manches.length} !`}
        detail={`${m.joueurs[idChallenger].prenom} ${scores[idChallenger]} – ${scores[manche.champion]} ${m.joueurs[manche.champion].prenom}${r.auDepartage ? ' · gagnée au départage' : ''}`}
      />
      <Scene
        m={m}
        gauche={`${scores[idChallenger]} pts`}
        droite={`${scores[manche.champion]} pts`}
        etatChallenger={{ buzzer: r.vainqueur === idChallenger ? 'juste' : 'faux', eclaire: r.vainqueur === idChallenger }}
        etatChampion={{ buzzer: r.vainqueur === manche.champion ? 'juste' : 'faux', eclaire: r.vainqueur === manche.champion }}
      />
      <div class="score-match">
        <span>{m.joueurs.j1.prenom}</span>
        <strong>
          {s.j1} – {s.j2}
        </strong>
        <span>{m.joueurs.j2.prenom}</span>
      </div>
      <p class="doux centre-texte petit">
        {m.manchesGagnantes === 1 ? 'Match en une manche' : `Premier à ${m.manchesGagnantes} manches gagnantes`}
      </p>
      {fini ? (
        <button class="bouton principal grand" disabled={occupe} onClick={() => maj(terminerMatch(m))}>
          Résultat du match →
        </button>
      ) : (
        <button class="bouton principal grand" disabled={occupe} onClick={() => maj(preparerManche(m))}>
          Manche suivante : {gagnant.prenom} choisit les thèmes →
        </button>
      )}
    </>
  );
}

function EtapeFin({ m }: PropsEtape) {
  const { aller } = useAppli();
  const [histo, setHisto] = useState<HistoriqueDuo | undefined>();
  const vainqueur = m.joueurs[vainqueurDuMatch(m)!];
  const s = scoreMatch(resultatsMatch(m));
  const { j1, j2 } = m.joueurs;

  useEffect(() => {
    supprimerMatch();
    lireHistoriqueDuo(j1.prenom, j2.prenom).then(setHisto);
    sons.victoire();
  }, []);

  const revanche = async () => {
    const profil = (id: IdJoueurDuel) => ({ prenom: m.joueurs[id].prenom, feminin: m.joueurs[id].feminin, graine: m.joueurs[id].avatar.graine ?? 0 });
    await sauverMatch(nouveauMatch(m.niveau, m.manchesGagnantes, [profil('j1'), profil('j2')]));
    aller({ nom: 'duel-match' });
  };

  return (
    <div class="fin-carriere">
      <div class="fauteuil-champion">
        <p class="petit-titre">Vainqueur du match</p>
        <Avatar p={vainqueur} taille={96} couronne />
        <strong>{vainqueur.prenom}</strong>
        <span class="or">
          {j1.prenom} {s.j1} – {s.j2} {j2.prenom}
        </span>
      </div>

      <ul class="liste-signalements">
        {m.manches.map((x, i) =>
          x.resultat ? (
            <li key={i}>
              <p class="signalement-question">
                Manche {i + 1} : {m.joueurs[x.resultat.vainqueur].prenom}
                {x.resultat.auDepartage ? ' (au départage)' : ''}
              </p>
              <p class="doux petit">
                {j1.prenom} {x.resultat.scores.j1} – {x.resultat.scores.j2} {j2.prenom} · thèmes : {x.themeChallenger?.titre} / {x.themeChampion?.titre}
              </p>
            </li>
          ) : null,
        )}
      </ul>

      {histo && (
        <section class="bloc">
          <h2 class="petit-titre">Entre vous deux</h2>
          <div class="score-match">
            <span>{histo.prenoms[0]}</span>
            <strong>
              {histo.victoires[histo.prenoms[0]] ?? 0} – {histo.victoires[histo.prenoms[1]] ?? 0}
            </strong>
            <span>{histo.prenoms[1]}</span>
          </div>
          <p class="doux petit centre-texte">
            Meilleurs scores en une manche : {histo.prenoms[0]} {histo.meilleursScores[histo.prenoms[0]] ?? 0} ·{' '}
            {histo.prenoms[1]} {histo.meilleursScores[histo.prenoms[1]] ?? 0} · {histo.matchs.length} match
            {histo.matchs.length > 1 ? 's' : ''} joué{histo.matchs.length > 1 ? 's' : ''}
          </p>
        </section>
      )}

      <div class="boutons-fin">
        <button class="bouton principal grand" onClick={revanche}>
          🔁 Revanche !
        </button>
        <button class="bouton secondaire" onClick={() => aller({ nom: 'duel' })}>
          Changer les réglages
        </button>
        <button class="bouton fantome" onClick={() => aller({ nom: 'accueil' })}>
          Accueil
        </button>
      </div>
    </div>
  );
}
