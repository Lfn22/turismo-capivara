import { Skeleton } from '../../src/components/ui/capi'

export default function DestinosLoading() {
  return (
    <main className="container mx-auto px-4 py-8">
      <Skeleton className="h-8 w-48 mb-6" />
      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="rounded-xl" style={{ height: '280px' }} />
        ))}
      </div>
    </main>
  )
}
