import { Skeleton } from '@/src/components/ui/capi';

/** Esqueleto do detalhe do roteiro: galeria, título, fatos rápidos, guias e coluna de reserva. */
export default function Loading() {
  return (
    <div className="bg-page" style={{ minHeight: '100dvh' }} role="status" aria-label="Carregando roteiro">
      <style>{`
        .rdload__top { padding-top: calc(56px + var(--space-3)); display: flex; flex-direction: column; gap: var(--space-3); }
        @media (min-width: 768px) { .rdload__top { padding-top: calc(var(--topbar-height) + var(--space-6)); } }
        .rdload__media { width: 100%; aspect-ratio: 4 / 3; border-radius: var(--radius-lg); }
        @media (min-width: 768px) { .rdload__media { aspect-ratio: 21 / 9; } }
        .rdload__layout { display: grid; gap: var(--space-10); padding-block: var(--space-6) var(--space-16); }
        @media (min-width: 1024px) { .rdload__layout { grid-template-columns: minmax(0, 1fr) 360px; gap: var(--space-12); padding-top: var(--space-8); } }
        .rdload__facts { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr)); margin-top: var(--space-6); }
        .rdload__aside { display: none; }
        @media (min-width: 1024px) { .rdload__aside { display: block; } }
      `}</style>
      <div className="capi-container rdload__top">
        <Skeleton width={90} height={14} />
        <span className="capi-skel rdload__media" aria-hidden="true" />
      </div>
      <div className="capi-container">
        <div className="rdload__layout">
          <div className="flex flex-col gap-3">
            <Skeleton width={70} height={12} />
            <Skeleton width="70%" height={32} radius={8} />
            <Skeleton width={80} height={24} radius={999} />
            <div className="rdload__facts">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} height={74} radius={16} />
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3">
              <Skeleton width={90} height={20} />
              <Skeleton lines={4} />
            </div>
            <div className="mt-8 flex flex-col gap-3">
              <Skeleton width={160} height={20} />
              <Skeleton height={96} radius={16} />
            </div>
          </div>
          <div className="rdload__aside">
            <Skeleton height={300} radius={16} />
          </div>
        </div>
      </div>
    </div>
  );
}
