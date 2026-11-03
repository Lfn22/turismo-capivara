import { Skeleton } from '@/src/components/ui/capi';

/** Esqueleto da página do destino: hero, abas e bloco "Sobre". */
export default function Loading() {
  return (
    <div className="bg-page" style={{ minHeight: '100dvh' }} role="status" aria-label="Carregando destino">
      <style>{`
        .dload__hero { position: relative; height: 60dvh; min-height: 420px; background: var(--bg-muted); }
        @media (min-width: 768px) { .dload__hero { height: auto; min-height: 0; aspect-ratio: 16 / 9; max-height: 82dvh; } }
        .dload__hero-text { position: absolute; inset: auto 0 0 0; padding-bottom: var(--space-8); display: flex; flex-direction: column; gap: var(--space-3); }
        .dload__tabs { display: flex; gap: var(--space-4); height: 45px; align-items: center; border-bottom: 1px solid var(--border); }
        .dload__about { display: grid; gap: var(--space-8); padding-block: var(--space-10); }
        @media (min-width: 1024px) { .dload__about { grid-template-columns: 3fr 2fr; gap: var(--space-12); padding-block: var(--space-16); } }
      `}</style>
      <div className="dload__hero">
        <div className="dload__hero-text capi-container">
          <Skeleton width={120} height={14} />
          <Skeleton width="60%" height={48} radius={12} />
          <Skeleton width="45%" height={18} />
        </div>
      </div>
      <div className="capi-container">
        <div className="dload__tabs">
          <Skeleton width={72} height={14} />
          <Skeleton width={56} height={14} />
          <Skeleton width={56} height={14} />
          <Skeleton width={48} height={14} />
        </div>
        <div className="dload__about">
          <div className="flex flex-col gap-4">
            <Skeleton width={120} height={12} />
            <Skeleton width="80%" height={32} radius={8} />
            <Skeleton lines={5} />
          </div>
          <Skeleton height={220} radius={16} />
        </div>
      </div>
    </div>
  );
}
