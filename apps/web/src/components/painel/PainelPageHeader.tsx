interface Props {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export default function PainelPageHeader({ title, description, actions }: Props) {
  return (
    <div className="flex items-start justify-between mb-12 md:mb-16">
      <div>
        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl"
          style={{ color: 'var(--stone-800)' }}>
          {title}
        </h1>
        {description && (
          <p className="text-sm mt-2" style={{ color: 'var(--stone-500)' }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-6">{actions}</div>}
    </div>
  );
}
