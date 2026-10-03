interface Props {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function PainelCard({ title, children, className = '' }: Props) {
  return (
    <div className={`rounded-xl p-5 md:p-12 ${className}`}
      style={{ background: 'white', boxShadow: 'var(--shadow-sm)' }}>
      {title && (
        <h2 className="font-[family-name:var(--font-display)] font-semibold text-lg mb-8"
          style={{ color: 'var(--stone-700)' }}>
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
