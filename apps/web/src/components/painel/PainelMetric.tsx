interface Props {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
}

export default function PainelMetric({ label, value, trend }: Props) {
  const trendColor = trend === 'up' ? 'var(--ochre)' : trend === 'down' ? '#dc2626' : 'var(--stone-500)';

  return (
    <div className="rounded-xl p-5" style={{ background: 'white', boxShadow: 'var(--shadow-sm)' }}>
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--stone-500)' }}>
        {label}
      </p>
      <p className="font-[family-name:var(--font-display)] font-bold text-2xl"
        style={{ color: trendColor }}>
        {value}
      </p>
    </div>
  );
}
