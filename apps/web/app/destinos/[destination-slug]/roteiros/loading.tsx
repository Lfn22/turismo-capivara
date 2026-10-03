import { Skeleton } from '@/src/components/ui/capi';

/** Esqueleto da lista de roteiros: cabeçalho, abas e grade de PackageCard (foto 4:3 + texto). */
export default function Loading() {
  return (
    <div className="bg-page" style={{ minHeight: '100dvh' }} role="status" aria-label="Carregando roteiros">
      <style>{`
        .rload__head { padding-top: calc(56px + var(--space-6)); padding-bottom: var(--space-6); display: flex; flex-direction: column; gap: var(--space-3); }
        @media (min-width: 768px) { .rload__head { padding-top: calc(var(--topbar-height) + var(--space-10)); padding-bottom: var(--space-8); } }
        .rload__tabs { display: flex; gap: var(--space-4); height: 45px; align-items: center; border-bottom: 1px solid var(--border); margin-bottom: var(--space-6); }
        .rload__card { display: flex; flex-direction: column; gap: var(--space-3); }
      `}</style>
      <div className="capi-container">
        <div className="rload__head">
          <Skeleton width={110} height={14} />
          <Skeleton width={140} height={12} />
          <Skeleton width="55%" height={40} radius={10} />
          <Skeleton width="40%" height={16} />
        </div>
        <div className="rload__tabs">
          <Skeleton width={72} height={14} />
          <Skeleton width={56} height={14} />
          <Skeleton width={56} height={14} />
        </div>
        <div className="mb-4"><Skeleton width={140} height={14} /></div>
        <div className="capi-grid-cards pb-16">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rload__card">
              <span
                className="capi-skel"
                aria-hidden="true"
                style={{ width: '100%', aspectRatio: '4 / 3', borderRadius: 'var(--radius-lg)' }}
              />
              <Skeleton width="80%" height={18} />
              <Skeleton width="50%" height={14} />
              <Skeleton width="40%" height={16} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
