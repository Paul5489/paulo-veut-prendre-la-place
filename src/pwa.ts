import { registerSW } from 'virtual:pwa-register';

/**
 * Mode hors ligne et mises à jour : quand une nouvelle version est publiée,
 * l'appli l'annonce (« Nouvelle version disponible ») au lieu de changer en pleine partie.
 */

type Ecouteur = () => void;
const ecouteurs = new Set<Ecouteur>();
let majDisponible = false;
let appliquer: ((recharger?: boolean) => Promise<void>) | null = null;

export function initMiseAJour(): void {
  appliquer = registerSW({
    onNeedRefresh() {
      majDisponible = true;
      ecouteurs.forEach((e) => e());
    },
    onRegisteredSW(_url, enregistrement) {
      if (!enregistrement) return;
      const verifier = () => enregistrement.update().catch(() => {});
      // L'appli installée reste souvent ouverte en arrière-plan : on vérifie à chaque retour.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') verifier();
      });
      setInterval(verifier, 60 * 60 * 1000);
    },
  });
}

export function miseAJourDisponible(): boolean {
  return majDisponible;
}

export function surMiseAJour(e: Ecouteur): () => void {
  ecouteurs.add(e);
  return () => ecouteurs.delete(e);
}

export function appliquerMiseAJour(): void {
  appliquer?.(true);
}
