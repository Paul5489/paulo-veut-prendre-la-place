/**
 * Petits effets sonores originaux, fabriqués à la volée (Web Audio) : aucun fichier audio.
 */

let contexte: AudioContext | null = null;
let actif = true;

export function activerSon(oui: boolean): void {
  actif = oui;
}

function ctx(): AudioContext | null {
  if (!actif) return null;
  if (!contexte) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    contexte = new C();
  }
  if (contexte.state === 'suspended') contexte.resume().catch(() => {});
  return contexte;
}

function note(frequence: number, debut: number, duree: number, type: OscillatorType = 'sine', volume = 0.18): void {
  const c = ctx();
  if (!c) return;
  const t = c.currentTime + debut;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequence, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duree);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + duree + 0.05);
}

export const sons = {
  clic: () => note(660, 0, 0.08, 'triangle', 0.08),
  bonne: () => {
    note(523, 0, 0.15, 'triangle');
    note(659, 0.1, 0.15, 'triangle');
    note(784, 0.2, 0.35, 'triangle');
  },
  mauvaise: () => {
    note(220, 0, 0.25, 'sawtooth', 0.09);
    note(165, 0.18, 0.4, 'sawtooth', 0.09);
  },
  tictac: () => note(1200, 0, 0.05, 'square', 0.04),
  /** petit signal pour les réponses en cascade : aigu si juste, grave si faux */
  bip: (juste: boolean) => note(juste ? 880 : 220, 0, 0.12, juste ? 'triangle' : 'square', juste ? 0.1 : 0.06),
  /** coup de buzzer */
  buzz: () => {
    note(140, 0, 0.18, 'square', 0.1);
    note(147, 0, 0.18, 'sawtooth', 0.06);
  },
  /** roulement de tambour (environ une seconde) */
  roulement: () => {
    for (let i = 0; i < 14; i++) note(95 + (i % 2) * 12, i * 0.065, 0.06, 'square', 0.025 + i * 0.004);
  },
  /** montée de tension avant une révélation */
  suspense: () => {
    [196, 220, 247, 262, 294, 330].forEach((f, i) => note(f, i * 0.22, 0.2, 'triangle', 0.07));
  },
  defaite: () => {
    [392, 330, 262, 196].forEach((f, i) => note(f, i * 0.2, 0.35, 'sine', 0.1));
  },
  victoire: () => {
    [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.12, 0.3, 'triangle'));
    note(1047, 0.5, 0.6, 'sine', 0.12);
  },
};
