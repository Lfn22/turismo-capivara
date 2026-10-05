import { StatusBadge as CapiStatusBadge } from "@/src/components/ui/capi"

/**
 * Wrapper legado: mantém `StatusBadge({ status })` para reservas e delega ao
 * `StatusBadge` do CAPI design system v2 (kind="booking").
 */
export function StatusBadge({ status }: { status: string }) {
  return <CapiStatusBadge kind="booking" status={status} />
}
