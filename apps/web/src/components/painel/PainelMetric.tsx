import { StatCard } from '@/src/components/ui/capi';

interface Props {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
}

/** Legado: mantém a API antiga e renderiza o StatCard do CAPI v2. */
export default function PainelMetric({ label, value, trend }: Props) {
  const tone = trend === 'up' ? 'var(--text-primary)' : trend === 'down' ? 'var(--danger)' : undefined;
  return <StatCard label={label} value={tone ? <span style={{ color: tone }}>{value}</span> : value} />;
}
