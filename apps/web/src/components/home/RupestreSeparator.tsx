interface Props {
  variant?: 'single' | 'double';
}

/** Divisor orgânico com figura rupestre. Só na home e nas páginas de destino, bem sutil. */
export default function RupestreSeparator({ variant = 'single' }: Props) {
  return (
    <div className="flex items-center justify-center" style={{ paddingBlock: 'var(--space-8)' }} aria-hidden="true">
      <svg width="300" height="50" viewBox="0 0 300 50" className="max-w-full">
        <line x1="0" y1="25" x2={variant === 'double' ? 95 : 115} y2="25"
          stroke="var(--border-strong)" strokeWidth="0.8" />

        {/* First figure */}
        <g opacity="0.2" fill="var(--brand)" transform="translate(125, 0) scale(0.35)">
          <circle cx="50" cy="10" r="8" />
          <path d="M30 45 L43 28 L50 22 M50 22 L57 28 L70 45 M50 22 L50 70 M50 70 L35 105 M50 70 L65 105"
            stroke="var(--brand)" strokeWidth="3" fill="none" />
        </g>

        {variant === 'double' && (
          <g opacity="0.2" fill="var(--brand)" transform="translate(160, 0) scale(0.35)">
            <circle cx="50" cy="10" r="8" />
            <path d="M30 45 L43 28 L50 22 M50 22 L57 28 L70 45 M50 22 L50 70 M50 70 L35 105 M50 70 L65 105"
              stroke="var(--brand)" strokeWidth="3" fill="none" />
          </g>
        )}

        <line x1={variant === 'double' ? 210 : 185} y1="25" x2="300" y2="25"
          stroke="var(--border-strong)" strokeWidth="0.8" />
      </svg>
    </div>
  );
}
