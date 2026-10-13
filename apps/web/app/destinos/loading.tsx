import { Skeleton } from '../../src/components/ui/capi'

export default function DestinosLoading() {
  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      <Skeleton width={192} height={32} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginTop: '1.5rem',
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={280} radius={12} />
        ))}
      </div>
    </main>
  )
}
