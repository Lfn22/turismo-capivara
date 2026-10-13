import { Skeleton } from '../../../../../src/components/ui/capi'

export default function ReservasLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
      <Skeleton width={144} height={32} />

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <Skeleton width={160} height={36} radius={8} />
        <Skeleton width={128} height={36} radius={8} />
      </div>

      <div style={{ border: '1px solid var(--capi-border, #E8DDD0)', borderRadius: 12, overflow: 'hidden' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--capi-border, #E8DDD0)' }}>
            <Skeleton width={112} height={16} />
            <Skeleton width={96} height={16} />
            <Skeleton width={80} height={16} />
            <Skeleton width={80} height={16} />
            <Skeleton width={64} height={24} radius={12} />
          </div>
        ))}
      </div>
    </div>
  )
}
