/** Divisor orgânico entre uma foto e o conteúdo; a cor acompanha o fundo da página (token). */
export default function OrganicDivider() {
  return (
    <svg
      className="organic-curve"
      viewBox="0 0 1440 60"
      preserveAspectRatio="none"
      style={{ display: 'block', width: '100%', height: 40 }}
      aria-hidden="true"
    >
      <path d="M0 45 Q360 0 720 30 Q1080 60 1440 20 L1440 60 L0 60Z" fill="var(--bg-page)" />
    </svg>
  );
}
