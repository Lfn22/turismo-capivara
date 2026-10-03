interface Props {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/** Card do painel (CAPI v2): superfície com borda, radius-lg, título sans 600 18px. */
export default function PainelCard({ title, children, className = '' }: Props) {
  return (
    <section
      className={`p-4 md:p-6 ${className}`}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {title && (
        <h2
          className="mb-4"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 18,
            fontWeight: 600,
            lineHeight: 1.35,
            color: 'var(--text)',
          }}
        >
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
