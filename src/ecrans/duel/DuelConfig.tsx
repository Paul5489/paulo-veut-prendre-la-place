import { useEffect, useState } from 'preact/hooks';
import { Avatar } from '../../composants/Avatar';
import { ReglageChrono } from '../../composants/ReglageChrono';
import {
  ecrireJoueursDuel,
  lireHistoriqueDuo,
  lireJoueursDuel,
  lireMatch,
  nouveauMatch,
  participantDuel,
  sauverMatch,
  supprimerMatch,
  type MatchDuel,
  type ProfilJoueurDuel,
} from '../../jeu/duel';
import type { HistoriqueDuo, IdJoueurDuel } from '../../logique/duel';
import { normaliser } from '../../logique/texte';
import { NIVEAUX, type Niveau } from '../../logique/types';
import { useAppli } from '../../navigation';

type Profils = [ProfilJoueurDuel, ProfilJoueurDuel];

const FORMATS: { valeur: 1 | 2 | 3; nom: string; detail: string }[] = [
  { valeur: 1, nom: '1 manche', detail: 'Partie express' },
  { valeur: 2, nom: '2 gagnantes', detail: 'Au meilleur des 3' },
  { valeur: 3, nom: '3 gagnantes', detail: 'Au meilleur des 5' },
];

export function DuelConfig() {
  const { aller } = useAppli();
  const [profils, setProfils] = useState<Profils | null>(null);
  const [enCours, setEnCours] = useState<MatchDuel | null | undefined>(undefined);
  const [niveau, setNiveau] = useState<Niveau>(2);
  const [format, setFormat] = useState<1 | 2 | 3>(2);
  const [histo, setHisto] = useState<HistoriqueDuo | undefined>();

  useEffect(() => {
    lireJoueursDuel().then(setProfils);
    lireMatch().then((m) => setEnCours(m ?? null));
  }, []);

  const p1 = profils?.[0].prenom.trim() ?? '';
  const p2 = profils?.[1].prenom.trim() ?? '';
  useEffect(() => {
    if (p1 && p2) lireHistoriqueDuo(p1, p2).then(setHisto);
    else setHisto(undefined);
  }, [p1, p2]);

  if (!profils || enCours === undefined) return null;

  const majProfil = (i: 0 | 1, modif: Partial<ProfilJoueurDuel>) => {
    const n = [...profils] as Profils;
    n[i] = { ...n[i], ...modif };
    setProfils(n);
  };
  const pret = p1 && p2 && normaliser(p1) !== normaliser(p2);

  const lancer = async () => {
    const propres: Profils = [
      { ...profils[0], prenom: p1 },
      { ...profils[1], prenom: p2 },
    ];
    await ecrireJoueursDuel(propres);
    await sauverMatch(nouveauMatch(niveau, format, propres));
    aller({ nom: 'duel-match' });
  };

  const abandonner = async () => {
    if (!confirm('Abandonner le match en cours ?')) return;
    await supprimerMatch();
    setEnCours(null);
  };

  return (
    <div class="ecran config">
      <header class="barre-titre">
        <button class="retour" onClick={() => aller({ nom: 'accueil' })} aria-label="Retour">
          ‹
        </button>
        <h1>👥 Duel à deux</h1>
      </header>

      {enCours && (
        <section class="bloc">
          <p>
            Un match est en cours : {enCours.joueurs.j1.prenom} contre {enCours.joueurs.j2.prenom}.
          </p>
          <button class="bouton principal grand" onClick={() => aller({ nom: 'duel-match' })}>
            ▶ Reprendre le match
          </button>
          <button class="bouton fantome" onClick={abandonner}>
            Abandonner ce match
          </button>
        </section>
      )}

      {!enCours && (
        <>
          <section class="duo-joueurs">
            {([0, 1] as const).map((i) => {
              const id: IdJoueurDuel = i === 0 ? 'j1' : 'j2';
              const pr = profils[i];
              return (
                <div key={id} class="carte-joueur-duel">
                  <Avatar p={participantDuel(id, pr)} taille={72} />
                  <input
                    type="text"
                    value={pr.prenom}
                    maxLength={20}
                    placeholder={i === 0 ? 'Prénom joueur 1' : 'Prénom joueur 2'}
                    autocomplete="off"
                    autocorrect="off"
                    enterkeyhint="done"
                    onInput={(e) => majProfil(i, { prenom: e.currentTarget.value })}
                  />
                  <div class="boutons-look">
                    <button class="bouton petit secondaire" onClick={() => majProfil(i, { graine: pr.graine + 1 })} aria-label="Changer de look">
                      🎲
                    </button>
                    <button class="bouton petit secondaire" onClick={() => majProfil(i, { feminin: !pr.feminin, graine: pr.graine + 1 })}>
                      {pr.feminin ? '👩' : '👨'}
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
          {p1 && p2 && !pret && <p class="erreur centre-texte">Choisissez deux prénoms différents.</p>}

          {histo && (
            <p class="encart centre-texte">
              Entre vous : {histo.prenoms[0]} {histo.victoires[histo.prenoms[0]] ?? 0} –{' '}
              {histo.victoires[histo.prenoms[1]] ?? 0} {histo.prenoms[1]}
            </p>
          )}

          <section>
            <h2 class="petit-titre">Niveau</h2>
            <div class="grille-niveaux">
              {NIVEAUX.map(({ niveau: n, nom }) => (
                <button key={n} class={`choix-niveau n${n} ${niveau === n ? 'actif' : ''}`} onClick={() => setNiveau(n)}>
                  <strong>{nom}</strong>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 class="petit-titre">Longueur du match</h2>
            <div class="grille-formats">
              {FORMATS.map((f) => (
                <button key={f.valeur} class={`choix-niveau ${format === f.valeur ? 'actif' : ''}`} onClick={() => setFormat(f.valeur)}>
                  <strong>{f.nom}</strong>
                  <small>{f.detail}</small>
                </button>
              ))}
            </div>
          </section>

          <section class="bloc">
            <ReglageChrono />
          </section>

          <p class="doux petit centre-texte">
            Chaque manche se joue comme le Défi : le gagnant du pile ou face (puis de la manche précédente) choisit
            les thèmes et joue en second.
          </p>

          <div class="bas-fixe">
            <button class="bouton principal grand" disabled={!pret} onClick={lancer}>
              🪙 Lancer le match
            </button>
          </div>
        </>
      )}
    </div>
  );
}
