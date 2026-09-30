interface Props {
  libelle: string;
  detail?: string;
  actif: boolean;
  onChange: (actif: boolean) => void;
}

export function Interrupteur({ libelle, detail, actif, onChange }: Props) {
  return (
    <button class="ligne-reglage" role="switch" aria-checked={actif} onClick={() => onChange(!actif)}>
      <span class="ligne-texte">
        <span>{libelle}</span>
        {detail && <small>{detail}</small>}
      </span>
      <span class={`interrupteur ${actif ? 'actif' : ''}`} aria-hidden="true">
        <span />
      </span>
    </button>
  );
}
