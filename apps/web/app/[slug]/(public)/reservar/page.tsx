'use client';

import { useSearchParams } from 'next/navigation';
import { useParams } from 'next/navigation';
import BookingForm from '@/src/components/ui/BookingForm';

export default function ReservarPage() {
  const searchParams = useSearchParams();
  const params = useParams<{ slug: string }>();

  const slotId = searchParams.get('slotId') ?? '';
  const packageId = searchParams.get('packageId') ?? '';
  const slug = params.slug ?? '';

  if (!slotId || !packageId) {
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
          Selecione um slot antes de reservar.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '0 auto',
        padding: '2.5rem 1.5rem',
      }}
    >
      <h1
        style={{
          margin: '0 0 1.5rem',
          fontSize: '1.375rem',
          fontWeight: 700,
          color: '#1c1917',
        }}
      >
        Confirmar reserva
      </h1>
      <BookingForm slotId={slotId} packageId={packageId} slug={slug} />
    </div>
  );
}
