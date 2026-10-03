import { TicketX } from 'lucide-react';
import { Button, EmptyState } from '@/src/components/ui/capi';
import ConfirmationCard from '@/src/components/ui/ConfirmationCard';
import ConfirmationClient from '@/src/components/ui/ConfirmationClient';

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

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
      <div className="capi-container capi-container--form py-8">
        <EmptyState
          icon={TicketX}
          title="Dados de confirmação inválidos"
          description="Consulte sua reserva com o e-mail e o código que enviamos."
          action={
            <Button href={`/${slug}/minha-reserva`} variant="secondary">
              Consultar minha reserva
            </Button>
          }
        />
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
      <div className="capi-container capi-container--form py-8">
        <EmptyState
          icon={TicketX}
          title="Reserva não encontrada"
          description="Confira o link ou consulte sua reserva com o e-mail e o código."
          action={
            <Button href={`/${slug}/minha-reserva`} variant="secondary">
              Consultar minha reserva
            </Button>
          }
        />
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
    <div className="capi-container capi-container--form py-6 md:py-10">
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
