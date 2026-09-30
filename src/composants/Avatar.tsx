import type { JSX } from 'preact';
import { useId } from 'preact/hooks';
import type { Participant } from '../logique/adversaires';
import { rngFixe, type Rng } from '../logique/hasard';

/**
 * Avatars dessinés : un petit personnage original (visage, coiffure, lunettes…),
 * toujours le même pour un candidat donné, fabriqué à partir de son identifiant.
 */

const PEAUX = ['#f9d9c0', '#f1c09a', '#e3a877', '#c68a5c', '#9d6843', '#704a31'];
const CHEVEUX = ['#1f1611', '#3b2618', '#6b3f22', '#a8692f', '#d9ad62', '#ecd9a6', '#9a9a9a', '#b8432a'];
const COUPES_HOMME = ['court', 'herisse', 'raie', 'chauve', 'boucles', 'court'] as const;
const COUPES_FEMME = ['long', 'carre', 'chignon', 'queue', 'boucles', 'long'] as const;
type Coupe = (typeof COUPES_HOMME)[number] | (typeof COUPES_FEMME)[number];

export interface TraitsAvatar {
  peau: string;
  cheveux: string;
  coupe: Coupe;
  yeux: 'points' | 'ovales' | 'rieurs';
  bouche: 'sourire' | 'grand' | 'o' | 'malicieux';
  lunettes: 0 | 1 | 2;
  pilosite: 0 | 1 | 2;
  boucles: boolean;
  joues: boolean;
}

function hacher(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const piocher = <T,>(rng: Rng, liste: readonly T[]): T => liste[Math.floor(rng() * liste.length)];

export function traitsAvatar(p: Participant): TraitsAvatar {
  const rng = rngFixe(hacher(`${p.id}#${p.avatar.graine ?? 0}`));
  const feminin = p.feminin;
  return {
    peau: piocher(rng, PEAUX),
    cheveux: rng() < 0.12 ? '#9a9a9a' : piocher(rng, CHEVEUX),
    coupe: piocher(rng, feminin ? COUPES_FEMME : COUPES_HOMME),
    yeux: piocher(rng, ['points', 'ovales', 'rieurs'] as const),
    bouche: piocher(rng, ['sourire', 'grand', 'o', 'malicieux', 'sourire'] as const),
    lunettes: rng() < 0.28 ? (rng() < 0.5 ? 1 : 2) : 0,
    pilosite: !feminin && rng() < 0.3 ? (rng() < 0.5 ? 1 : 2) : 0,
    boucles: feminin && rng() < 0.45,
    joues: rng() < 0.5,
  };
}

function assombrir(hex: string, facteur = 0.82): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (d: number) => Math.round(((n >> d) & 255) * facteur);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

function cheveuxArriere(t: TraitsAvatar): JSX.Element | null {
  if (t.coupe === 'long') return <path d="M24 44 Q18 90 30 98 L70 98 Q82 90 76 44 Z" fill={t.cheveux} />;
  if (t.coupe === 'carre') return <path d="M25 42 Q22 70 30 72 L70 72 Q78 70 75 42 Z" fill={t.cheveux} />;
  if (t.coupe === 'queue') return <path d="M70 34 Q88 44 82 70 Q78 58 70 48 Z" fill={t.cheveux} />;
  return null;
}

function cheveuxDessus(t: TraitsAvatar): JSX.Element | null {
  const c = t.cheveux;
  switch (t.coupe) {
    case 'court':
      return <path d="M27 44 Q26 17 50 17 Q74 17 73 44 Q68 29 50 29 Q32 29 27 44 Z" fill={c} />;
    case 'herisse':
      return (
        <path
          d="M27 42 L28 25 L35 30 L38 17 L45 27 L50 14 L55 27 L62 17 L65 30 L72 25 L73 42 Q66 30 50 30 Q34 30 27 42 Z"
          fill={c}
        />
      );
    case 'raie':
      return <path d="M26 46 Q25 18 52 17 Q75 18 74 44 Q71 31 60 27 Q48 34 29 33 Z" fill={c} />;
    case 'chauve':
      return (
        <g fill={c}>
          <path d="M27 50 Q26 38 31 33 Q30 42 32 50 Z" />
          <path d="M73 50 Q74 38 69 33 Q70 42 68 50 Z" />
        </g>
      );
    case 'boucles':
      return (
        <g fill={c}>
          {[
            [30, 36], [35, 26], [44, 20], [53, 18], [62, 21], [69, 28], [72, 38], [27, 45], [73, 46],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="8" />
          ))}
        </g>
      );
    case 'long':
      return <path d="M26 50 Q23 17 50 17 Q77 17 74 50 Q70 30 55 27 Q44 35 28 36 Z" fill={c} />;
    case 'carre':
      return <path d="M27 42 Q28 17 50 17 Q72 17 73 42 L73 40 Q50 31 27 40 Z" fill={c} />;
    case 'chignon':
      return (
        <g fill={c}>
          <circle cx="50" cy="13" r="9" />
          <path d="M27 42 Q27 18 50 18 Q73 18 73 42 Q66 29 50 29 Q34 29 27 42 Z" />
        </g>
      );
    case 'queue':
      return <path d="M27 42 Q27 17 50 17 Q73 17 73 42 Q66 28 50 28 Q34 28 27 42 Z" fill={c} />;
  }
}

function yeux(t: TraitsAvatar): JSX.Element {
  if (t.yeux === 'rieurs') {
    return (
      <g fill="none" stroke="#2a1a14" stroke-width="2.4" stroke-linecap="round">
        <path d="M37 48 Q41 44 45 48" />
        <path d="M55 48 Q59 44 63 48" />
      </g>
    );
  }
  if (t.yeux === 'ovales') {
    return (
      <g>
        <ellipse cx="41" cy="47" rx="2.6" ry="3.6" fill="#2a1a14" />
        <ellipse cx="59" cy="47" rx="2.6" ry="3.6" fill="#2a1a14" />
        <circle cx="42" cy="45.8" r="0.9" fill="#fff" />
        <circle cx="60" cy="45.8" r="0.9" fill="#fff" />
      </g>
    );
  }
  return (
    <g fill="#2a1a14">
      <circle cx="41" cy="47" r="2.7" />
      <circle cx="59" cy="47" r="2.7" />
    </g>
  );
}

function bouche(t: TraitsAvatar): JSX.Element {
  switch (t.bouche) {
    case 'grand':
      return (
        <g>
          <path d="M41 58 Q50 70 59 58 Z" fill="#7a2f2a" />
          <path d="M43 58.5 L57 58.5 L56 61 L44 61 Z" fill="#fff" />
        </g>
      );
    case 'o':
      return <ellipse cx="50" cy="61" rx="3.2" ry="3.8" fill="#7a2f2a" />;
    case 'malicieux':
      return <path d="M43 60 Q51 64 58 57" fill="none" stroke="#7a2f2a" stroke-width="2.4" stroke-linecap="round" />;
    default:
      return <path d="M43 59 Q50 65 57 59" fill="none" stroke="#7a2f2a" stroke-width="2.4" stroke-linecap="round" />;
  }
}

interface Props {
  p: Participant;
  taille?: number;
  couronne?: boolean;
}

export function Avatar({ p, taille = 40, couronne = false }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const t = traitsAvatar(p);
  const ombre = assombrir(t.peau);
  const sourcils = assombrir(t.cheveux === '#ecd9a6' ? '#a8692f' : t.cheveux, 0.9);
  return (
    <span class={`avatar ${p.estJoueur ? 'joueur' : ''}`} style={{ width: `${taille}px`, height: `${taille}px` }}>
      <svg viewBox="0 0 100 100" width={taille} height={taille} aria-hidden="true">
        <defs>
          <clipPath id={`rond-${id}`}>
            <circle cx="50" cy="50" r="50" />
          </clipPath>
        </defs>
        <g clip-path={`url(#rond-${id})`}>
          <rect width="100" height="100" fill="#1f1147" />
          <rect width="100" height="100" fill={p.avatar.couleur} opacity="0.35" />
          {cheveuxArriere(t)}
          <path d="M10 104 Q12 78 50 76 Q88 78 90 104 Z" fill={p.avatar.couleur} />
          <path d="M40 77 Q50 86 60 77" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="3" />
          <rect x="42" y="60" width="16" height="19" rx="7" fill={ombre} />
          <circle cx="28" cy="48" r="6" fill={t.peau} />
          <circle cx="72" cy="48" r="6" fill={t.peau} />
          <ellipse cx="50" cy="45" rx="22" ry="24" fill={t.peau} />
          {cheveuxDessus(t)}
          <g fill="none" stroke={sourcils} stroke-width="2.2" stroke-linecap="round">
            <path d="M36 40 Q41 37.5 45 39.5" />
            <path d="M55 39.5 Q59 37.5 64 40" />
          </g>
          {yeux(t)}
          <path d="M50 49 Q47 55 50.5 56" fill="none" stroke={ombre} stroke-width="2" stroke-linecap="round" />
          {t.joues && (
            <g fill="#ff7a8a" opacity="0.35">
              <circle cx="36" cy="55" r="4" />
              <circle cx="64" cy="55" r="4" />
            </g>
          )}
          {bouche(t)}
          {t.pilosite === 1 && <path d="M42 57 Q50 53 58 57 Q50 60 42 57 Z" fill={t.cheveux} />}
          {t.pilosite === 2 && (
            <path d="M29 50 Q31 74 50 76 Q69 74 71 50 Q67 66 58 64 Q50 60 42 64 Q33 66 29 50 Z" fill={t.cheveux} />
          )}
          {t.lunettes > 0 && (
            <g fill="rgba(255,255,255,0.15)" stroke="#1a1a1a" stroke-width="2">
              {t.lunettes === 1 ? (
                <>
                  <circle cx="41" cy="47" r="6.5" />
                  <circle cx="59" cy="47" r="6.5" />
                </>
              ) : (
                <>
                  <rect x="33.5" y="41.5" width="15" height="11" rx="3" />
                  <rect x="51.5" y="41.5" width="15" height="11" rx="3" />
                </>
              )}
              <path d="M47.5 47 L52.5 47" fill="none" />
            </g>
          )}
          {t.boucles && (
            <g fill="#ffc83d">
              <circle cx="28" cy="56" r="2.2" />
              <circle cx="72" cy="56" r="2.2" />
            </g>
          )}
        </g>
      </svg>
      {couronne && <span class="couronne">👑</span>}
    </span>
  );
}

/** « Fleuriste à Brest » */
export function presentation(p: Participant): string {
  if (p.estJoueur) return '';
  return `${p.metier.charAt(0).toUpperCase()}${p.metier.slice(1)} à ${p.ville}`;
}
