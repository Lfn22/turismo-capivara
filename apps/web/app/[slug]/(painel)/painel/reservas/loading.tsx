import { Skeleton } from '../../../../../src/components/ui/capi'

export default function ReservasLoading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-36" />

      {/* Filters row */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-40 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        {/* Header */}
        <div className="flex gap-4 p-4 bg-muted/40 border-b">
          {[120, 100, 80, 80, 60].map((w, i) => (
            <Skeleton key={i} className="h-4 rounded" style={{ width: w }} />
          ))}
        </div>
        {/* Rows */}
        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
