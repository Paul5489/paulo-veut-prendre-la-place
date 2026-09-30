interface Props {
  arbitre: string;
  reponse: string;
  bonne: string;
  onOui: () => void;
  onNon: () => void;
}

/** En duel, une réponse cash contestée est validée (ou non) par l'autre joueur. */
export function ModalArbitrage({ arbitre, reponse, bonne, onOui, onNon }: Props) {
  return (
    <div class="voile">
      <div class="modal" role="dialog" aria-label="Contestation">
        <h2>🙋 Contestation</h2>
        <p>
          <strong>{arbitre}</strong>, c'est toi qui tranches : acceptes-tu la réponse « <strong>{reponse}</strong> » ?
        </p>
        <p class="doux">
          Réponse attendue : <strong class="or">{bonne}</strong>
        </p>
        <button class="bouton principal" onClick={onOui}>
          ✅ Oui, je valide
        </button>
        <button class="bouton secondaire" onClick={onNon}>
          ❌ Non, c'est faux
        </button>
      </div>
    </div>
  );
}
