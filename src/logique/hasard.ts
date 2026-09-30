/** Générateur de nombres aléatoires entre 0 (inclus) et 1 (exclu). Remplaçable dans les tests. */
export type Rng = () => number;

/** Générateur déterministe (mulberry32), pour des tests reproductibles. */
export function rngFixe(graine: number): Rng {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mélange de Fisher-Yates ; renvoie une nouvelle liste. */
export function melanger<T>(liste: readonly T[], rng: Rng = Math.random): T[] {
  const res = [...liste];
  for (let i = res.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [res[i], res[j]] = [res[j], res[i]];
  }
  return res;
}

export function choisir<T>(liste: readonly T[], rng: Rng = Math.random): T {
  return liste[Math.floor(rng() * liste.length)];
}
