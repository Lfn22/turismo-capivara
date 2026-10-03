import { Skeleton } from '@/src/components/ui/capi'

/** Esqueleto do checkout: cabeçalho com etapas, card do PIX e resumo lateral. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Carregando pagamento">
      <div className="capi-container capi-container--content pt-4 md:pt-6">
        <Skeleton width={96} height={36} radius={8} />
        <div className="mb-4 mt-2 flex items-center justify-between gap-3">
          <Skeleton width={160} height={28} />
          <Skeleton width={80} height={14} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Skeleton height={6} radius={3} />
          <Skeleton height={6} radius={3} />
          <Skeleton height={6} radius={3} />
        </div>
      </div>
      <div className="capi-container capi-container--content py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-6">
            <Skeleton width={140} height={24} radius={999} />
            <Skeleton width={160} height={36} />
            <Skeleton width={200} height={200} radius={12} />
            <Skeleton height={64} radius={12} />
            <Skeleton height={52} radius={12} />
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
            <Skeleton width="70%" height={18} />
            <Skeleton lines={4} />
          </div>
        </div>
      </div>
    </div>
  )
}
