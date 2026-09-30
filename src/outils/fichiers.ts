/**
 * Donne un fichier JSON au joueur. Sur iPhone, ouvre le menu de partage
 * (« Enregistrer dans Fichiers », Mail, AirDrop…) ; sinon, simple téléchargement.
 */
export async function partagerJSON(nomFichier: string, donnees: unknown): Promise<void> {
  const fichier = new File([JSON.stringify(donnees, null, 2)], nomFichier, { type: 'application/json' });
  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: nomFichier });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(fichier);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  lien.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
