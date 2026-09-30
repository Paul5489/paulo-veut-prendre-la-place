import { useEffect, useState } from 'preact/hooks';
import { BanniereMiseAJour } from './composants/BanniereMiseAJour';
import { Accueil } from './ecrans/Accueil';
import { CarriereAccueil } from './ecrans/carriere/CarriereAccueil';
import { Palmares } from './ecrans/carriere/Palmares';
import { EcranPartieCarriere } from './ecrans/carriere/PartieCarriere';
import { DuelConfig } from './ecrans/duel/DuelConfig';
import { EcranMatchDuel } from './ecrans/duel/Match';
import { RapideConfig } from './ecrans/RapideConfig';
import { RapideFin } from './ecrans/RapideFin';
import { RapideJeu } from './ecrans/RapideJeu';
import { EcranReglages } from './ecrans/Reglages';
import { Contexte, type Ecran } from './navigation';
import { reglerChrono } from './chrono';
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
      reglerChrono(r.dureeChrono);
      setReglages(r);
    });
    demanderStockagePersistant();
  }, []);

  if (!reglages) return null;

  const changerReglages = (modif: Partial<Reglages>) => {
    const r = { ...reglages, ...modif };
    setReglages(r);
    activerSon(r.son);
    reglerChrono(r.dureeChrono);
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
      {ecran.nom === 'carriere' && <CarriereAccueil key={cle} />}
      {ecran.nom === 'carriere-partie' && <EcranPartieCarriere key={cle} />}
      {ecran.nom === 'palmares' && <Palmares key={cle} />}
      {ecran.nom === 'duel' && <DuelConfig key={cle} />}
      {ecran.nom === 'duel-match' && <EcranMatchDuel key={cle} />}
    </Contexte.Provider>
  );
}
