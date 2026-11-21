type Props = { status: string }

type BadgeConfig = { label: string; bg: string; color: string; modifier: string }

const STATUS_MAP: Record<string, BadgeConfig> = {
  PENDING: { label: 'Pendente', bg: '#fef3c7', color: '#92400e', modifier: 'warning' },
  CONFIRMED: { label: 'Confirmada', bg: '#dcfce7', color: '#166534', modifier: 'success' },
  CHECKED_IN: { label: 'Check-in', bg: '#dbeafe', color: '#1e40af', modifier: 'info' },
  COMPLETED: { label: 'Concluída', bg: '#f3f4f6', color: '#6b7280', modifier: 'neutral' },
  CANCELLED: { label: 'Cancelada', bg: '#fee2e2', color: '#991b1b', modifier: 'danger' },
  NO_SHOW: { label: 'Ausente', bg: '#e5e7eb', color: '#374151', modifier: 'dark' },
  EXPIRED: { label: 'Expirada', bg: '#e5e7eb', color: '#374151', modifier: 'dark' },
}

export default function BookingStatusBadge({ status }: Props) {
  const cfg = STATUS_MAP[status] ?? {
    label: status,
    bg: '#e5e7eb',
    color: '#374151',
    modifier: 'dark',
  }
  return (
    <>
      <style>{`
        .bsb {
          display: inline-flex;
          align-items: center;
          padding: 2px 10px;
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          font-weight: 600;
          line-height: 1.6;
          white-space: nowrap;
        }
      `}</style>
      <span className={`bsb bsb--${cfg.modifier}`} style={{ background: cfg.bg, color: cfg.color }}>
        {cfg.label}
      </span>
    </>
  )
}
