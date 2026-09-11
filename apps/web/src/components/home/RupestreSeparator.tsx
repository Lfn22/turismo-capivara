interface Props {
  variant?: 'single' | 'double';
}

export default function RupestreSeparator({ variant = 'single' }: Props) {
  return (
    <div className="reveal flex items-center justify-center py-3">
      <svg width="240" height="40" viewBox="0 0 240 40" aria-hidden="true">
        <line x1="0" y1="20" x2={variant === 'double' ? 70 : 90} y2="20"
          stroke="var(--stone-300)" strokeWidth="0.8" />

        <g opacity="0.15" fill="var(--ochre)" transform="translate(95, 0) scale(0.28)">
          <circle cx="50" cy="10" r="8" />
          <path d="M30 45 L43 28 L50 22 M50 22 L57 28 L70 45 M50 22 L50 70 M50 70 L35 105 M50 70 L65 105"
            stroke="var(--ochre)" strokeWidth="3" fill="none" />
        </g>

        {variant === 'double' && (
          <g opacity="0.15" fill="var(--ochre)" transform="translate(125, 0) scale(0.28)">
            <circle cx="50" cy="10" r="8" />
            <path d="M30 45 L43 28 L50 22 M50 22 L57 28 L70 45 M50 22 L50 70 M50 70 L35 105 M50 70 L65 105"
              stroke="var(--ochre)" strokeWidth="3" fill="none" />
          </g>
        )}

        <line x1={variant === 'double' ? 170 : 150} y1="20" x2="240" y2="20"
          stroke="var(--stone-300)" strokeWidth="0.8" />
      </svg>
    </div>
  );
}
