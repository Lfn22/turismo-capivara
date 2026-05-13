interface Booking {
  id: string;
  status: string;
  packageName?: string;
  slotStartsAt?: string;
  guestName: string;
  pax: number;
}

interface ConfirmationCardProps {
  booking: Booking;
}

function formatDateTime(isoString?: string): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Aguardando pagamento',
    CONFIRMED: 'Confirmada',
    CANCELLED: 'Cancelada',
    COMPLETED: 'Concluída',
  };
  return map[status] ?? status;
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    CONFIRMED: '#16a34a',
    PENDING: '#d97706',
    CANCELLED: '#dc2626',
    COMPLETED: '#2563eb',
  };
  return map[status] ?? '#44403c';
}

export default function ConfirmationCard({ booking }: ConfirmationCardProps) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e7e5e4',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '480px',
        margin: '0 auto',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#f0fdf4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem',
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#16a34a"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1c1917' }}>
          Reserva recebida
        </h2>
        <p
          style={{
            margin: '0.3rem 0 0',
            fontSize: '0.85rem',
            color: statusColor(booking.status),
            fontWeight: 600,
          }}
        >
          {statusLabel(booking.status)}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <Row label="Reserva" value={`#${booking.id.slice(0, 8).toUpperCase()}`} />
        <Row label="Hóspede" value={booking.guestName} />
        {booking.packageName && <Row label="Roteiro" value={booking.packageName} />}
        {booking.slotStartsAt && (
          <Row label="Data" value={formatDateTime(booking.slotStartsAt)} />
        )}
        <Row
          label="Pessoas"
          value={`${booking.pax} ${booking.pax === 1 ? 'pessoa' : 'pessoas'}`}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottom: '1px solid #f5f5f4',
        paddingBottom: '0.625rem',
        gap: '1rem',
      }}
    >
      <span style={{ fontSize: '0.85rem', color: '#78716c', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1c1917', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}
