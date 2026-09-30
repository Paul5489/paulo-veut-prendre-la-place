import { useEffect, useState } from 'preact/hooks';
import { CarteQuestion } from '../../composants/CarteQuestion';
import { Defile, type EtatDefile, type ItemDefile } from '../../composants/Defile';
import { SceneDuel, type EtatBuzzer, type EtatPupitre } from '../../composants/Plateau';
import {
  attribuerThemes,
  NB_QUESTIONS_DEFI,
  scoreDefi,
  scorePotentiel,
  terminerDefi,
  trouver,
  type PartieCarriere,
} from '../../jeu/carriere';
import type { ThemeInfo } from '../../logique/carriere';
import { CATEGORIES_PAR_ID } from '../../logique/categories';
import { NOM_MODE, pointsObtenus } from '../../logique/scores';
import type { CategorieId } from '../../logique/types';
import { sons } from '../../son';
import { marquerVues, tauxParCategorie } from '../../stockage/db';
import { accord, BandeauEtape, cloner, de, itemDefile, noter, versEnregistree, type PropsEtape } from './commun';

/** Face-à-face du Défi : le challenger à son pupitre, le champion dans son fauteuil. */
function Duel({
  p,
  gauche,
  droite,
  challenger: ec = {},
  champion: eh = {},
}: {
  p: PartieCarriere;
  gauche: string;
  droite: string;
  challenger?: EtatPupitre;
  champion?: EtatPupitre;
}) {
  return (
    <SceneDuel
      challenger={trouver(p, p.challenger!)}
      champion={p.champion}
      etatChallenger={ec}
      etatChampion={eh}
      texteChallenger={gauche}
      texteChampion={droite}
    />
  );
}

/** Buzzer et bulle de celui qui joue, pendant le défilé de ses 6 réponses. */
function etatJoueurDefile(items: ItemDefile[], correction: boolean, etat: EtatDefile): EtatPupitre {
  if (etat.fini) return {};
  const it = items[etat.index];
  if (etat.phase === 'reflexion') return { eclaire: true, bulle: '…' };
  return {
    eclaire: true,
    bulle: `« ${it.saisie} »`,
    buzzer: correction ? (it.correct ? 'juste' : 'faux') : 'appuye',
  };
}

export function CarteTheme({ t, classe, onClick, note }: { t: ThemeInfo; classe?: string; onClick?: () => void; note?: string }) {
  const cat = CATEGORIES_PAR_ID[t.categorie];
  return (
    <button class={`theme-carte ${classe ?? ''}`} onClick={onClick} disabled={!onClick}>
      <span class="theme-emoji">{cat.emoji}</span>
      <strong>{t.titre}</strong>
      <small>{t.description}</small>
      {note && <em>{note}</em>}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Choix des thèmes
// ---------------------------------------------------------------------------

export function EtapeDefiThemes(props: PropsEtape) {
  return props.p.role === 'candidat' ? <ThemesParChampionVirtuel {...props} /> : <ThemesParJoueur {...props} />;
}

function ThemesParChampionVirtuel({ p, maj }: PropsEtape) {
  const d = p.defi!;
  const ch = p.champion;
  const [etape, setEtape] = useState(0);
  useEffect(() => {
    sons.suspense();
    const t1 = setTimeout(() => {
      setEtape(1);
      sons.clic();
    }, 2200);
    const t2 = setTimeout(() => {
      setEtape(2);
      sons.clic();
    }, 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  const classe = (t: ThemeInfo) =>
    etape >= 1 && t.id === d.themeChallenger!.id ? 'pour-challenger' : etape >= 2 && t.id === d.themeChampion!.id ? 'pour-champion' : '';
  return (
    <>
      <BandeauEtape
        titre="Le Défi"
        detail={`Quatre thèmes sont proposés. ${ch.prenom}, ${accord(ch, 'le champion', 'la championne')}, choisit d'abord le tien, puis le sien.`}
      />
      <Duel p={p} gauche="Challenger" droite={`${p.championVictoires} victoire${p.championVictoires > 1 ? 's' : ''}`} />
      <div class="grille-themes">
        {d.themes.map((t) => (
          <CarteTheme key={t.id} t={t} classe={classe(t)} />
        ))}
      </div>
      {etape === 0 && <p class="reflechit centre-texte">{ch.prenom} réfléchit…</p>}
      {etape >= 1 && (
        <p class="encart">
          {ch.prenom} te donne « <strong>{d.themeChallenger!.titre}</strong> »
          {d.strategique ? ` : ${ch.feminin ? 'elle' : 'il'} a visé ton point faible !` : '.'}
        </p>
      )}
      {etape >= 2 && (
        <>
          <p class="encart">
            Et {ch.feminin ? 'elle' : 'il'} garde pour {ch.feminin ? 'elle' : 'lui'} « <strong>{d.themeChampion!.titre}</strong> ».
          </p>
          <button class="bouton principal grand" onClick={() => maj({ ...p, etape: 'defi-challenger', pas: 0 })}>
            Tu joues en premier →
          </button>
        </>
      )}
    </>
  );
}

function ThemesParJoueur({ p, maj, occupe }: PropsEtape) {
  const d = p.defi!;
  const challenger = trouver(p, p.challenger!);
  const [pourLui, setPourLui] = useState<ThemeInfo | null>(null);
  const [pourMoi, setPourMoi] = useState<ThemeInfo | null>(null);
  const [taux, setTaux] = useState<Partial<Record<CategorieId, { bonnes: number; total: number }>>>({});
  useEffect(() => {
    tauxParCategorie().then(setTaux);
  }, []);
  const fort = Object.entries(challenger.profil.categories)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 2)
    .map(([c]) => CATEGORIES_PAR_ID[c as CategorieId].nom.toLowerCase());
  const monTaux = (c: CategorieId) => {
    const t = taux[c];
    return t && t.total >= 3 ? `Ta réussite : ${Math.round((100 * t.bonnes) / t.total)} %` : undefined;
  };
  return (
    <>
      <BandeauEtape
        titre="Le Défi"
        detail={
          !pourLui
            ? `Choisis d'abord le thème ${de(challenger.prenom)}.`
            : !pourMoi
              ? 'Choisis maintenant ton propre thème.'
              : 'Thèmes choisis !'
        }
      />
      <p class="doux petit centre-texte">
        {challenger.prenom} ({challenger.metier}) est réputé{challenger.feminin ? 'e' : ''} fort{challenger.feminin ? 'e' : ''} en {fort.join(' et en ')}.
      </p>
      <div class="grille-themes">
        {d.themes.map((t) => {
          const classe = pourLui?.id === t.id ? 'pour-challenger' : pourMoi?.id === t.id ? 'pour-champion' : '';
          const action = !pourLui ? () => setPourLui(t) : !pourMoi && t.id !== pourLui.id ? () => setPourMoi(t) : undefined;
          return <CarteTheme key={t.id} t={t} classe={classe} onClick={action} note={monTaux(t.categorie)} />;
        })}
      </div>
      {pourLui && pourMoi ? (
        <button
          class="bouton principal grand"
          disabled={occupe}
          onClick={() => maj(attribuerThemes(p, pourLui, pourMoi).then((s) => ({ ...s, etape: 'defi-challenger' as const, pas: 0 })))}
        >
          {challenger.prenom} joue en premier →
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
// Les deux séries de 6 questions
// ---------------------------------------------------------------------------

export function EtapeDefiJeu({ p, maj, chrono }: PropsEtape) {
  const d = p.defi!;
  const challenger = trouver(p, p.challenger!);
  const enChallenger = p.etape === 'defi-challenger';
  const joueur = enChallenger ? challenger.estJoueur : p.champion.estJoueur;
  const liste = enChallenger ? d.questionsChallenger : d.questionsChampion;
  const theme = enChallenger ? d.themeChallenger! : d.themeChampion!;
  const potentiel = scorePotentiel(d.questionsChallenger);
  const suivante = enChallenger ? { etape: 'defi-champion' as const, pas: 0 } : { etape: 'revelation' as const, pas: 0 };

  const droite = enChallenger
    ? 'Joue ensuite'
    : joueur
      ? `${scoreDefi(liste.slice(0, p.pas))} points`
      : 'En train de jouer';
  const [buzzer, setBuzzer] = useState<EtatBuzzer>('eteint');
  const duel = (
    <Duel
      p={p}
      gauche={`Potentiel : ${enChallenger && !joueur ? '?' : potentiel} pts`}
      droite={droite}
      challenger={enChallenger && joueur ? { eclaire: true, buzzer } : {}}
      champion={!enChallenger && joueur ? { eclaire: true, buzzer } : {}}
    />
  );

  // (quand c'est au joueur de jouer, ses réponses n'existent pas encore : pas de défilé)
  const items = joueur ? [] : liste.map((x) => itemDefile(enChallenger ? challenger : p.champion, x.reponse!, x.question));

  if (!joueur) {
    return (
      <>
        <BandeauEtape
          titre={`Défi · ${enChallenger ? challenger.prenom : p.champion.prenom} joue`}
          detail={`Thème : ${theme.titre}${enChallenger ? ' · ses réponses ne seront corrigées qu’à la fin' : ''}`}
        />
        <Defile
          key={p.etape}
          titre={enChallenger ? `Les choix ${de(challenger.prenom)}` : `Les réponses ${de(p.champion.prenom)}`}
          correction={!enChallenger}
          items={items}
          scene={(etat) => {
            const e = etatJoueurDefile(items, !enChallenger, etat);
            const vus = etat.fini ? items.length : etat.index + (etat.phase === 'reponse' ? 1 : 0);
            const cumul = items.slice(0, vus).reduce((t, it) => t + (enChallenger ? (it.mode ? pointsObtenus(it.mode, true) : 0) : it.points), 0);
            return (
              <Duel
                p={p}
                gauche={enChallenger ? `Potentiel : ${cumul} pts` : `Potentiel : ${potentiel} pts`}
                droite={enChallenger ? 'Joue ensuite' : `${cumul} pts`}
                challenger={enChallenger ? e : {}}
                champion={enChallenger ? {} : e}
              />
            );
          }}
          libelleFin={enChallenger ? `À toi de jouer (score à battre : ${potentiel} au maximum)` : 'La révélation'}
          apres={
            <p class="encart">
              {enChallenger
                ? `Score potentiel ${de(challenger.prenom)} : ${potentiel} points.`
                : `${p.champion.prenom} marque ${scoreDefi(liste)} points. Le challenger avait un potentiel de ${potentiel} points…`}
            </p>
          }
          onFin={() => {
            marquerVues(liste.map((x) => x.question));
            maj({ ...p, ...suivante });
          }}
        />
      </>
    );
  }

  const x = liste[p.pas];
  return (
    <>
      <BandeauEtape
        titre={`Défi · ${theme.titre}`}
        detail={`Question ${p.pas + 1}/${NB_QUESTIONS_DEFI}${enChallenger ? ' · corrections à la fin, seul ton score potentiel s’affiche' : ` · score à battre : ${potentiel} au maximum`}`}
      />
      {duel}
      <CarteQuestion
        key={x.question.id}
        question={x.question}
        chrono={chrono}
        differee={enChallenger}
        potentiel={potentiel}
        onCorrection={(correct) => {
          sons.buzz();
          setBuzzer(correct === null ? 'appuye' : correct ? 'juste' : 'faux');
        }}
        libelleSuivant={p.pas + 1 < NB_QUESTIONS_DEFI ? 'Question suivante' : enChallenger ? `Au tour de ${p.champion.prenom}` : 'La révélation'}
        onSuivant={(r) => {
          const rep = versEnregistree(r);
          if (!enChallenger) noter(x.question, rep);
          const s = cloner(p);
          const cible = enChallenger ? s.defi!.questionsChallenger : s.defi!.questionsChampion;
          cible[p.pas].reponse = rep;
          setBuzzer('eteint');
          maj(p.pas + 1 < NB_QUESTIONS_DEFI ? { ...s, pas: p.pas + 1 } : { ...s, ...suivante });
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Révélation des réponses du challenger, une par une
// ---------------------------------------------------------------------------

export function EtapeRevelation({ p, maj, occupe }: PropsEtape) {
  const d = p.defi!;
  const challenger = trouver(p, p.challenger!);
  const liste = d.questionsChallenger;
  const revelees = p.pas;
  const [suspense, setSuspense] = useState(false);
  const scoreChallenger = scoreDefi(liste.slice(0, revelees));
  const scoreChampion = scoreDefi(d.questionsChampion);
  const fini = revelees >= liste.length;
  const challengerGagne = fini && scoreChallenger > scoreChampion;

  const reveler = () => {
    setSuspense(true);
    sons.suspense();
    setTimeout(() => {
      setSuspense(false);
      (liste[revelees].reponse?.correct ? sons.bonne : sons.mauvaise)();
      maj({ ...p, pas: revelees + 1 });
    }, 1600);
  };

  const contester = (i: number) => {
    const s = cloner(p);
    const r = s.defi!.questionsChallenger[i].reponse!;
    r.correct = true;
    r.contestee = true;
    r.points = pointsObtenus(r.mode, true);
    sons.bonne();
    maj(s);
  };

  const conclure = () => {
    if (challenger.estJoueur) for (const x of liste) if (x.reponse) noter(x.question, x.reponse);
    maj(terminerDefi(p));
  };

  return (
    <>
      <BandeauEtape titre="🥁 La révélation" detail={challenger.estJoueur ? 'Tes réponses, dévoilées une par une.' : `Les réponses ${de(challenger.prenom)}, dévoilées une par une.`} />
      <Duel
        p={p}
        gauche={`${scoreChallenger} pts`}
        droite={`${scoreChampion} pts`}
        challenger={
          suspense
            ? { eclaire: true, bulle: '…' }
            : revelees > 0
              ? {
                  buzzer: liste[revelees - 1].reponse?.correct ? 'juste' : 'faux',
                  bulle: `« ${liste[revelees - 1].reponse?.saisie ?? '—'} »`,
                }
              : {}
        }
        champion={fini ? { buzzer: challengerGagne ? 'faux' : 'juste' } : {}}
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
              {montre && challenger.estJoueur && r.mode === 'cash' && !r.correct && r.saisie && (
                <button class="bouton petit secondaire" onClick={() => contester(i)}>
                  🙋 Contester : j'avais juste
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {!fini ? (
        <>
          <button class="bouton principal grand" disabled={suspense} onClick={reveler}>
            {suspense ? 'Suspense…' : `Révéler la réponse n°${revelees + 1}`}
          </button>
          <button class="bouton fantome" disabled={suspense} onClick={() => maj({ ...p, pas: liste.length })}>
            Tout révéler d'un coup
          </button>
        </>
      ) : (
        <>
          <p class={`verdict-defi ${challengerGagne ? 'challenger' : 'champion'}`}>
            {challengerGagne
              ? `${challenger.estJoueur ? 'Tu l’emportes' : `${challenger.prenom} l’emporte`} ${scoreChallenger} à ${scoreChampion} !`
              : scoreChallenger === scoreChampion
                ? `Égalité ${scoreChallenger} partout : ${p.champion.estJoueur ? 'tu gardes ta place' : `${p.champion.prenom} garde sa place`} !`
                : `${p.champion.estJoueur ? 'Tu gardes ta place' : `${p.champion.prenom} garde sa place`}, ${scoreChampion} à ${scoreChallenger} !`}
          </p>
          <button class="bouton principal grand" disabled={occupe} onClick={conclure}>
            Voir le résultat →
          </button>
        </>
      )}
    </>
  );
}
