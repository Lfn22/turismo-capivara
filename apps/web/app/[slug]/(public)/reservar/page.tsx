'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useParams } from 'next/navigation';
import BookingForm from '@/src/components/ui/BookingForm';

export default function ReservarPage() {
  const searchParams = useSearchParams();
  const params = useParams<{ slug: string }>();

  const slotId = searchParams.get('slotId') ?? '';
  const packageId = searchParams.get('packageId') ?? '';
  const slug = params.slug ?? '';

  const [tenantBlocked, setTenantBlocked] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/tenants/${slug}/status`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        // Only block if we have a confirmed non-APPROVED status.
        // Network errors → fail-open (API will reject with 403 if truly blocked).
        if (data && data.approvalStatus && data.approvalStatus !== 'APPROVED') {
          setTenantBlocked(true);
        }
      })
      .catch(() => {
        // fail-open: let the booking attempt proceed; API enforces the gate
      });
  }, [slug]);

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

  if (tenantBlocked) {
    return (
      <div
        style={{
          maxWidth: '480px',
          margin: '0 auto',
          padding: '3rem 1.5rem',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#78716c', fontSize: '1rem', marginBottom: '1rem' }}>
          Este roteiro não está disponível para reservas no momento.
        </p>
        <a
          href="/destinos"
          style={{
            fontSize: '0.875rem',
            color: '#c8961c',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Explorar outros destinos →
        </a>
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
