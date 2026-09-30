/** Durée du chrono (réglable), partagée par toutes les questions. */
let duree = 20;

export function reglerChrono(secondes: number): void {
  duree = secondes;
}

export function dureeChrono(): number {
  return duree;
}
