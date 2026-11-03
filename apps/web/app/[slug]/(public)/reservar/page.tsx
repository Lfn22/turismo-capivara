'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useParams } from 'next/navigation';
import { ArrowRight, CalendarSearch, CalendarX } from 'lucide-react';
import BookingForm from '@/src/components/ui/BookingForm';
import BackButton from '@/src/components/ui/BackButton';
import { Button, EmptyState, Stepper } from '@/src/components/ui/capi';

const STEPS = ['Data e horário', 'Seus dados', 'Pagamento'];

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
      <div className="capi-container capi-container--form py-8">
        <EmptyState
          icon={CalendarSearch}
          title="Escolha uma data primeiro"
          description="Selecione a data e o horário no roteiro antes de reservar."
          action={
            <Button href={`/${slug}/roteiros`} variant="secondary">
              Ver roteiros
            </Button>
          }
        />
      </div>
    );
  }

  if (tenantBlocked) {
    return (
      <div className="capi-container capi-container--form py-8">
        <EmptyState
          icon={CalendarX}
          title="Reservas indisponíveis"
          description="Este roteiro não está disponível para reservas no momento."
          action={
            <Button href="/destinos" variant="secondary" iconRight={ArrowRight}>
              Explorar outros destinos
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="capi-has-bottombar capi-has-bottombar--book">
      <div className="capi-container capi-container--form pt-4 md:pt-6">
        {/* Cabeçalho simples do checkout: voltar + título + etapa */}
        <BackButton fallbackHref={`/${slug}/roteiros/${packageId}`} />
        <div className="mb-4 mt-2 flex items-baseline justify-between gap-3">
          <h1 className="m-0 text-2xl">Seus dados</h1>
          <p className="m-0 text-sm text-fg-secondary">Etapa 2 de 3</p>
        </div>
        <Stepper steps={STEPS} current={1} />
      </div>
      <div className="capi-container capi-container--form py-6">
        <BookingForm slotId={slotId} packageId={packageId} slug={slug} />
      </div>
    </div>
  );
}
