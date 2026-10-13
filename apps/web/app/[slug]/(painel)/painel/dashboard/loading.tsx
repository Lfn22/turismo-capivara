import { Skeleton } from '../../../../../src/components/ui/capi'

export default function DashboardLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem' }}>
      <Skeleton width={160} height={32} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ border: '1px solid var(--capi-border, #E8DDD0)', borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Skeleton width={96} height={16} />
            <Skeleton width={64} height={32} />
          </div>
        ))}
      </div>

      <div style={{ border: '1px solid var(--capi-border, #E8DDD0)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--capi-border, #E8DDD0)' }}>
          <Skeleton width={128} height={20} />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--capi-border, #E8DDD0)' }}>
            <Skeleton width="25%" height={16} />
            <Skeleton width="25%" height={16} />
            <Skeleton width="16%" height={16} />
            <Skeleton width="16%" height={16} />
          </div>
        ))}
      </div>
    </div>
  )
}
