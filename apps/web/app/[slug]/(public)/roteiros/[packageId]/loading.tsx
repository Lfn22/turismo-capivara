import { Skeleton } from '@/src/components/ui/capi'

/** Esqueleto da página de roteiro: galeria, título, descrição e coluna de reserva. */
export default function Loading() {
  return (
    <div className="capi-container py-6 md:py-10" aria-busy="true" aria-label="Carregando roteiro">
      <div className="mb-4">
        <Skeleton width={160} height={36} radius={8} />
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="min-w-0">
          <span
            className="capi-skel mb-8"
            aria-hidden="true"
            style={{ aspectRatio: '16 / 9', borderRadius: 'var(--radius-lg)' }}
          />
          <div className="mb-3 flex gap-2">
            <Skeleton width={72} height={24} radius={999} />
            <Skeleton width={88} height={24} radius={999} />
          </div>
          <div className="mb-4">
            <Skeleton width="70%" height={36} />
          </div>
          <Skeleton lines={4} />
        </div>
        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
          <Skeleton width="60%" height={20} />
          <Skeleton width="40%" height={14} />
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width={64} height={72} radius={12} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height={56} radius={12} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
