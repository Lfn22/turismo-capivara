import { Skeleton } from '../../../../../src/components/ui/capi'

export default function RoteirosLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Skeleton width={128} height={32} />
        <Skeleton width={144} height={36} radius={8} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ border: '1px solid var(--capi-border, #E8DDD0)', borderRadius: 12, overflow: 'hidden' }}>
            <Skeleton width="100%" height={160} radius={0} />
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Skeleton width="75%" height={20} />
              <Skeleton width="50%" height={16} />
              <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.25rem' }}>
                <Skeleton width={64} height={24} radius={12} />
                <Skeleton width={64} height={24} radius={12} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
