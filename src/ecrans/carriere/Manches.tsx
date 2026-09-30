import { useEffect, useState } from 'preact/hooks';
import { Avatar } from '../../composants/Avatar';
import { CarteQuestion } from '../../composants/CarteQuestion';
import { Defile } from '../../composants/Defile';
import { SaisieNombre } from '../../composants/SaisieNombre';
import { TableauScores, type StatutLigne } from '../../composants/TableauScores';
import {
  preparerCompet,
  preparerDefi,
  preparerSuperCash,
  resoudreDepartage,
  scoresCompet,
  scoresQualifs,
  terminerCompet,
  terminerElimination,
  terminerQualifs,
  trouver,
} from '../../jeu/carriere';
import { ID_JOUEUR } from '../../logique/adversaires';
import { NOM_MODE } from '../../logique/scores';
import { NIVEAUX } from '../../logique/types';
import { sons } from '../../son';
import { marquerVues } from '../../stockage/db';
import { accord, BandeauEtape, cloner, itemDefile, noter, versEnregistree, type PropsEtape } from './commun';

const MAX_QUALIFS = 19;
const MAX_COMPET = 27;

// ---------------------------------------------------------------------------
// Qualifs : 3 questions collectives, puis 2 tours de questions individuelles
// ---------------------------------------------------------------------------

export function EtapeQualifs({ p, maj, chrono }: PropsEtape) {
  const q = p.qualifs!;
  const unite = Math.floor(p.pas / 2);
  const tourJoueur = p.pas % 2 === 0;
  const autres = p.candidats.filter((c) => !c.estJoueur);
  const dernier = p.pas === 9;
  const suite = () => maj(dernier ? terminerQualifs({ ...p, pas: 10 }) : { ...p, pas: p.pas + 1 });
  const apres = () => {
    const scores = scoresQualifs({ ...p, pas: p.pas + 1 });
    return (
      <TableauScores
        titre="Tableau des Qualifs"
        max={MAX_QUALIFS}
        lignes={p.candidats.map((c) => ({ participant: c, score: scores[c.id] ?? 0 }))}
      />
    );
  };

  if (unite < 3) {
    const c = q.collectives[unite];
    if (tourJoueur) {
      return (
        <>
          <BandeauEtape titre={`Question collective ${unite + 1}/3`} detail={`Tout le monde répond à la même question · ${NOM_MODE[c.mode]} imposé`} />
          <CarteQuestion
            key={c.question.id}
            question={c.question}
            chrono={chrono}
            modeImpose={c.mode}
            libelleSuivant="Voir les autres candidats"
            onSuivant={(r) => {
              const rep = versEnregistree(r);
              noter(c.question, rep);
              const s = cloner(p);
              s.qualifs!.collectives[unite].reponses[ID_JOUEUR] = rep;
              s.pas++;
              maj(s);
            }}
          />
        </>
      );
    }
    return (
      <Defile
        key={p.pas}
        titre={`Les autres candidats · ${NOM_MODE[c.mode]}`}
        questionCommune={c.question}
        correction
        items={autres.map((a) => itemDefile(a, c.reponses[a.id]))}
        libelleFin={unite === 2 ? 'Questions individuelles' : 'Question suivante'}
        apres={apres()}
        onFin={suite}
      />
    );
  }

  const tour = unite - 3;
  const liste = q.individuelles[tour];
  if (tourJoueur) {
    const x = liste.find((y) => y.candidat === ID_JOUEUR)!;
    return (
      <>
        <BandeauEtape titre={`Questions individuelles · tour ${tour + 1}/2`} detail="À toi ! Choisis ton mode de réponse." />
        <CarteQuestion
          key={x.question.id}
          question={x.question}
          chrono={chrono}
          libelleSuivant="Voir les autres candidats"
          onSuivant={(r) => {
            const rep = versEnregistree(r);
            noter(x.question, rep);
            const s = cloner(p);
            s.qualifs!.individuelles[tour].find((y) => y.candidat === ID_JOUEUR)!.reponse = rep;
            s.pas++;
            maj(s);
          }}
        />
      </>
    );
  }
  const leurs = liste.filter((y) => y.candidat !== ID_JOUEUR);
  return (
    <Defile
      key={p.pas}
      titre={`Les autres candidats · tour ${tour + 1}/2`}
      correction
      items={leurs.map((y) => itemDefile(trouver(p, y.candidat), y.reponse!, y.question))}
      libelleFin={dernier ? 'Résultats des Qualifs' : 'Tour suivant'}
      apres={apres()}
      onFin={() => {
        marquerVues(leurs.map((y) => y.question));
        suite();
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Départage (égalité à la limite de qualification)
// ---------------------------------------------------------------------------

const formaterValeur = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 3 });

export function EtapeDepartage({ p, maj, occupe }: PropsEtape) {
  const d = p.departage!;
  const concerne = d.candidats.includes(ID_JOUEUR);
  const unite = d.question.unite ? ` ${d.question.unite}` : '';

  if (!d.gagnants) {
    return (
      <>
        <BandeauEtape
          titre="⚖️ Départage !"
          detail={`${d.candidats.length} candidats à égalité pour ${d.places} place${d.places > 1 ? 's' : ''} en Compet'. Le plus proche de la bonne réponse l'emporte.`}
        />
        <div class="rangee-avatars">
          {d.candidats.map((id) => {
            const c = trouver(p, id);
            return (
              <span key={id}>
                <Avatar p={c} taille={44} />
                <small>{c.estJoueur ? 'Toi' : c.prenom}</small>
              </span>
            );
          })}
        </div>
        <p class="texte-question">{d.question.question}</p>
        {concerne ? (
          <SaisieNombre unite={d.question.unite} onValider={(n) => maj(resoudreDepartage(p, n))} />
        ) : (
          <button class="bouton principal grand" disabled={occupe} onClick={() => maj(resoudreDepartage(p))}>
            Voir le départage
          </button>
        )}
      </>
    );
  }

  const v = d.question.valeur;
  const tries = [...d.candidats].sort((a, b) => Math.abs(d.reponses[a] - v) - Math.abs(d.reponses[b] - v));
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
        {tries.map((id) => {
          const c = trouver(p, id);
          const gagne = d.gagnants!.includes(id);
          return (
            <li key={id} class={gagne ? 'juste' : 'faux'}>
              <Avatar p={c} taille={34} />
              <span class="defile-nom">
                {c.estJoueur ? `${c.prenom} (toi)` : c.prenom}
                <small>
                  {formaterValeur(d.reponses[id])}
                  {unite} · écart {formaterValeur(Math.abs(d.reponses[id] - v))}
                </small>
              </span>
              <span class={`resultat ${gagne ? 'juste' : 'faux'}`}>{gagne ? 'Qualifié' : 'Éliminé'}</span>
            </li>
          );
        })}
      </ul>
      <button class="bouton principal grand" onClick={() => maj({ ...p, etape: 'qualifs-bilan' })}>
        Tableau final des Qualifs →
      </button>
    </>
  );
}

export function EtapeBilanQualifs({ p, maj, occupe }: PropsEtape) {
  const scores = scoresQualifs(p);
  const qualifie = p.qualifies.includes(ID_JOUEUR);
  useEffect(() => {
    (qualifie ? sons.victoire : sons.defaite)();
  }, []);
  return (
    <>
      <BandeauEtape
        titre="Fin des Qualifs"
        detail={qualifie ? 'Bravo, tu es qualifié pour la Compet’ !' : 'Tu es éliminé aux Qualifs… La suite se jouera sans toi.'}
      />
      <TableauScores
        max={MAX_QUALIFS}
        lignes={p.candidats.map((c) => ({
          participant: c,
          score: scores[c.id] ?? 0,
          statut: (p.qualifies.includes(c.id) ? 'qualifie' : 'elimine') as StatutLigne,
        }))}
      />
      <button
        class="bouton principal grand"
        disabled={occupe}
        onClick={() => maj(qualifie ? preparerCompet(p) : terminerElimination(p, 'elimine-qualifs'))}
      >
        {qualifie ? 'Place à la Compet’ →' : 'Voir la fin de l’émission →'}
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Compet' : 8 questions sur un thème (3 duo, 3 carré, 2 cash), puis la super cash
// ---------------------------------------------------------------------------

export function EtapeCompet({ p, maj, chrono }: PropsEtape) {
  const c = p.compet!;
  const unite = Math.floor(p.pas / 2);
  const tourJoueur = p.pas % 2 === 0;
  const qp = c.questions[unite];
  const qualifies = p.qualifies.map((id) => trouver(p, id));
  const dernier = p.pas === 15;
  const scores = scoresCompet({ ...p, pas: p.pas + 1 });

  if (tourJoueur) {
    return (
      <>
        <BandeauEtape titre={`Compet’ · ${c.theme.titre}`} detail={`Question ${unite + 1}/8 · ${NOM_MODE[qp.mode]} imposé`}>
          {unite === 0 && <p class="annonce-theme">🎯 Le thème : {c.theme.description}</p>}
        </BandeauEtape>
        <CarteQuestion
          key={qp.question.id}
          question={qp.question}
          chrono={chrono}
          modeImpose={qp.mode}
          libelleSuivant="Voir les autres candidats"
          onSuivant={(r) => {
            const rep = versEnregistree(r);
            noter(qp.question, rep);
            const s = cloner(p);
            s.compet!.questions[unite].reponses[ID_JOUEUR] = rep;
            s.pas++;
            maj(s);
          }}
        />
      </>
    );
  }
  return (
    <Defile
      key={p.pas}
      titre={`Les autres candidats · ${NOM_MODE[qp.mode]}`}
      questionCommune={qp.question}
      correction
      items={qualifies.filter((x) => !x.estJoueur).map((x) => itemDefile(x, qp.reponses[x.id]))}
      libelleFin={dernier ? 'La super cash' : 'Question suivante'}
      apres={
        <TableauScores
          titre="Tableau de la Compet’"
          max={MAX_COMPET}
          lignes={qualifies.map((x) => ({ participant: x, score: scores[x.id] ?? 0 }))}
        />
      }
      onFin={() => maj(dernier ? preparerSuperCash(p) : { ...p, pas: p.pas + 1 })}
    />
  );
}

export function EtapeSuperCash({ p, maj, chrono }: PropsEtape) {
  const c = p.compet!;
  const champion = p.champion;

  if (p.pas === 0) {
    return (
      <>
        <BandeauEtape
          titre="💥 La super cash"
          detail={`${champion.prenom}, ${accord(champion, 'le champion', 'la championne')}, attribue à chacun une question cash sur le thème : +5 si elle est juste, −5 si elle est fausse. Les plus difficiles vont aux candidats qu'${champion.feminin ? 'elle' : 'il'} juge les plus dangereux.`}
        />
        <ul class="liste-attribution">
          {c.superCash.map((x) => {
            const cand = trouver(p, x.candidat);
            return (
              <li key={x.candidat}>
                <Avatar p={cand} taille={34} />
                <span class="defile-nom">{cand.estJoueur ? `${cand.prenom} (toi)` : cand.prenom}</span>
                <span class={`chip niveau n${x.question.niveau}`}>{NIVEAUX[x.question.niveau - 1].nom}</span>
              </li>
            );
          })}
        </ul>
        <button class="bouton principal grand" onClick={() => maj({ ...p, pas: 1 })}>
          À toi de jouer →
        </button>
      </>
    );
  }

  if (p.pas === 1) {
    const x = c.superCash.find((y) => y.candidat === ID_JOUEUR)!;
    return (
      <>
        <BandeauEtape titre="Ta super cash" detail="+5 si c'est juste, −5 si c'est faux." />
        <CarteQuestion
          key={x.question.id}
          question={x.question}
          chrono={chrono}
          modeImpose="cash"
          superCash
          libelleSuivant="Voir les autres candidats"
          onSuivant={(r) => {
            const rep = versEnregistree(r);
            noter(x.question, rep);
            const s = cloner(p);
            s.compet!.superCash.find((y) => y.candidat === ID_JOUEUR)!.reponse = rep;
            s.pas = 2;
            maj(s);
          }}
        />
      </>
    );
  }

  const leurs = c.superCash.filter((y) => y.candidat !== ID_JOUEUR);
  const scores = scoresCompet({ ...p, pas: 3 });
  return (
    <Defile
      titre="Les super cash des autres candidats"
      correction
      items={leurs.map((y) => itemDefile(trouver(p, y.candidat), y.reponse!, y.question))}
      libelleFin="Résultats de la Compet’"
      apres={
        <TableauScores
          titre="Tableau de la Compet’"
          max={MAX_COMPET}
          lignes={p.qualifies.map((id) => ({ participant: trouver(p, id), score: scores[id] ?? 0 }))}
        />
      }
      onFin={() => {
        marquerVues(leurs.map((y) => y.question));
        maj(terminerCompet({ ...p, pas: 3 }));
      }}
    />
  );
}

export function EtapeBilanCompet({ p, maj, occupe }: PropsEtape) {
  const scores = scoresCompet(p);
  const challenger = trouver(p, p.challenger!);
  const champion = p.champion;
  const gagne = challenger.estJoueur;
  useEffect(() => {
    (gagne ? sons.victoire : sons.defaite)();
  }, []);
  return (
    <>
      <BandeauEtape
        titre="Fin de la Compet’"
        detail={
          gagne
            ? `Tu remportes la Compet’ ! Tu vas défier ${champion.prenom} pour lui prendre sa place.`
            : `${challenger.prenom} remporte la Compet’ et va défier ${champion.prenom}. Fin de l'aventure pour toi aujourd'hui.`
        }
      />
      {(p.egaliteCompet?.length ?? 0) > 1 && (
        <p class="encart">
          ⚖️ Égalité en tête ! {champion.prenom} choisit son challenger : {champion.feminin ? 'elle' : 'il'} prend celui qu'{champion.feminin ? 'elle' : 'il'} juge le moins dangereux, {challenger.estJoueur ? 'toi' : challenger.prenom}.
        </p>
      )}
      <TableauScores
        max={MAX_COMPET}
        lignes={p.qualifies.map((id) => ({
          participant: trouver(p, id),
          score: scores[id] ?? 0,
          statut: id === p.challenger ? ('challenger' as StatutLigne) : undefined,
        }))}
      />
      <button
        class="bouton principal grand"
        disabled={occupe}
        onClick={() => maj(gagne ? preparerDefi(p) : terminerElimination(p, 'elimine-compet'))}
      >
        {gagne ? 'Le Défi →' : 'Voir la fin de l’émission →'}
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Rôle champion : les préliminaires se sont joués sans toi
// ---------------------------------------------------------------------------

export function EtapePreliminaires({ p, maj, occupe }: PropsEtape) {
  const pr = p.preliminaires!;
  const instantanes = [
    ...pr.qualifs.map((s) => ({ ...s, phase: 'Qualifs', ids: p.candidats.map((c) => c.id), max: MAX_QUALIFS })),
    ...pr.compet.map((s) => ({ ...s, phase: `Compet’ · ${pr.theme.titre}`, ids: pr.qualifies, max: MAX_COMPET })),
  ];
  const [replay, setReplay] = useState<number | null>(null);

  useEffect(() => {
    if (replay === null || replay >= instantanes.length - 1) return;
    const t = setTimeout(() => setReplay(replay + 1), 1100);
    return () => clearTimeout(t);
  }, [replay]);

  const finQualifs = pr.qualifs[pr.qualifs.length - 1].scores;
  const finCompet = pr.compet[pr.compet.length - 1].scores;
  const choixAFaire = !p.challenger && (p.egaliteCompet?.length ?? 0) > 1;

  return (
    <>
      <BandeauEtape
        titre="Pendant ce temps…"
        detail="Six candidats se sont affrontés aux Qualifs puis à la Compet’ pour gagner le droit de te défier."
      />
      <button class="bouton secondaire" onClick={() => setReplay(0)}>
        {replay === null ? '▶ Regarder en accéléré' : '↺ Revoir'}
      </button>

      {replay !== null ? (
        <TableauScores
          titre={`${instantanes[replay].phase} · ${instantanes[replay].libelle}`}
          max={instantanes[replay].max}
          lignes={instantanes[replay].ids.map((id) => ({ participant: trouver(p, id), score: instantanes[replay].scores[id] ?? 0 }))}
        />
      ) : (
        <>
          <TableauScores
            titre="Qualifs"
            max={MAX_QUALIFS}
            lignes={p.candidats.map((c) => ({
              participant: c,
              score: finQualifs[c.id] ?? 0,
              statut: (pr.qualifies.includes(c.id) ? 'qualifie' : 'elimine') as StatutLigne,
            }))}
          />
          {pr.departageQualifs && <p class="doux petit">⚖️ Égalité à la limite : un départage a désigné les derniers qualifiés.</p>}
          <TableauScores
            titre={`Compet’ · ${pr.theme.titre}`}
            max={MAX_COMPET}
            lignes={pr.qualifies.map((id) => ({
              participant: trouver(p, id),
              score: finCompet[id] ?? 0,
              statut: id === p.challenger ? ('challenger' as StatutLigne) : undefined,
            }))}
          />
        </>
      )}

      {choixAFaire ? (
        <div class="bloc">
          <p>
            <strong>⚖️ Égalité en tête !</strong> C'est à toi, champion, de choisir ton challenger. Conseil : prends celui qui
            te paraît le moins dangereux.
          </p>
          <div class="grille-candidats">
            {p.egaliteCompet!.map((id) => {
              const c = trouver(p, id);
              return (
                <button key={id} class="carte-candidat" onClick={() => maj({ ...p, challenger: id })}>
                  <Avatar p={c} taille={48} />
                  <strong>{c.prenom}</strong>
                  <small>{c.metier}</small>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <p class="encart">
            Ton challenger du jour : <strong>{trouver(p, p.challenger!).prenom}</strong>
          </p>
          <button class="bouton principal grand" disabled={occupe} onClick={() => maj(preparerDefi(p))}>
            Choisir les thèmes du Défi →
          </button>
        </>
      )}
    </>
  );
}
