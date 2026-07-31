interface Props {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export default function PainelPageHeader({ title, description, actions }: Props) {
  return (
    <div className="flex items-start justify-between mb-6 md:mb-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl"
          style={{ color: 'var(--stone-800)' }}>
          {title}
        </h1>
        {description && (
          <p className="text-sm mt-1" style={{ color: 'var(--stone-500)' }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
