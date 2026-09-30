import { useEffect, useState } from 'preact/hooks';
import { BanniereMiseAJour } from './composants/BanniereMiseAJour';
import { Accueil } from './ecrans/Accueil';
import { RapideConfig } from './ecrans/RapideConfig';
import { RapideFin } from './ecrans/RapideFin';
import { RapideJeu } from './ecrans/RapideJeu';
import { EcranReglages } from './ecrans/Reglages';
import { Contexte, type Ecran } from './navigation';
import { activerSon } from './son';
import { demanderStockagePersistant, ecrireReglages, lireReglages, type Reglages } from './stockage/db';

export function App() {
  const [reglages, setReglages] = useState<Reglages | null>(null);
  const [ecran, setEcran] = useState<Ecran>({ nom: 'accueil' });
  // change à chaque navigation : un écran rejoué repart de zéro
  const [cle, setCle] = useState(0);

  useEffect(() => {
    lireReglages().then((r) => {
      activerSon(r.son);
      setReglages(r);
    });
    demanderStockagePersistant();
  }, []);

  if (!reglages) return null;

  const changerReglages = (modif: Partial<Reglages>) => {
    const r = { ...reglages, ...modif };
    setReglages(r);
    activerSon(r.son);
    ecrireReglages(r);
  };

  const aller = (e: Ecran) => {
    setEcran(e);
    setCle((c) => c + 1);
    window.scrollTo(0, 0);
  };

  return (
    <Contexte.Provider value={{ reglages, changerReglages, aller }}>
      <BanniereMiseAJour />
      {ecran.nom === 'accueil' && <Accueil key={cle} />}
      {ecran.nom === 'rapide-config' && <RapideConfig key={cle} />}
      {ecran.nom === 'rapide-jeu' && <RapideJeu key={cle} niveau={ecran.niveau} categorie={ecran.categorie} />}
      {ecran.nom === 'rapide-fin' && <RapideFin key={cle} {...ecran} />}
      {ecran.nom === 'reglages' && <EcranReglages key={cle} />}
    </Contexte.Provider>
  );
}
