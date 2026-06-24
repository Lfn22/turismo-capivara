import ConfirmationCard from '@/src/components/ui/ConfirmationCard';
import ConfirmationClient from '@/src/components/ui/ConfirmationClient';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

interface BookingResponse {
  id: string;
  status: string;
  customerName: string;
  pax: number;
  qrCode: string | null;
  expiresAt: string | null;
  slot?: {
    startsAt?: string;
    package?: { name?: string };
  };
}

export default async function ConfirmacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ bookingId?: string; email?: string; status?: string }>;
}) {
  const { slug } = await params;
  const { bookingId, email } = await searchParams;

  if (!bookingId || !email) {
    return (
      <div
        style={{
          maxWidth: '480px',
          margin: '0 auto',
          padding: '3rem 1.5rem',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#78716c', fontSize: '1rem' }}>
          Dados de confirmação inválidos.
        </p>
      </div>
    );
  }

  let booking: BookingResponse | null = null;
  let loadError = false;

  try {
    const res = await fetch(
      `${API_URL}/tenants/${slug}/bookings/${bookingId}?email=${encodeURIComponent(email)}`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      booking = await res.json();
    } else {
      loadError = true;
    }
  } catch {
    loadError = true;
  }

  if (loadError || !booking) {
    return (
      <div
        style={{
          maxWidth: '480px',
          margin: '0 auto',
          padding: '3rem 1.5rem',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#78716c', fontSize: '1rem' }}>
          Reserva não encontrada.
        </p>
      </div>
    );
  }

  const cardBooking = {
    id: booking.id,
    status: booking.status,
    guestName: booking.customerName,
    pax: booking.pax,
    packageName: booking.slot?.package?.name,
    slotStartsAt: booking.slot?.startsAt,
    slug,
  };

  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '0 auto',
        padding: '2.5rem 1.5rem',
      }}
    >
      <ConfirmationCard booking={cardBooking} />
      {(booking.qrCode || booking.expiresAt) && (
        <ConfirmationClient
          qrCode={booking.qrCode}
          expiresAt={booking.expiresAt}
          slug={slug}
          status={booking.status}
        />
      )}
    </div>
  );
}
