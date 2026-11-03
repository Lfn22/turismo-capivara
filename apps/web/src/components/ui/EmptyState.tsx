import { Button, EmptyState as CapiEmptyState } from '@/src/components/ui/capi'

interface EmptyStateProps {
  title: string
  description?: string
  ctaLabel?: string
  ctaHref?: string
  onCtaClick?: () => void
}

/**
 * Legado: mantém a API antiga (ctaLabel/ctaHref/onCtaClick) e renderiza o EmptyState do CAPI v2.
 * Para telas novas, importe `EmptyState` de `@/src/components/ui/capi`.
 */
export default function EmptyState({
  title,
  description,
  ctaLabel,
  ctaHref,
  onCtaClick,
}: EmptyStateProps) {
  let action: React.ReactNode = null
  if (ctaLabel && ctaHref) {
    action = <Button href={ctaHref}>{ctaLabel}</Button>
  } else if (ctaLabel && onCtaClick) {
    action = <Button onClick={onCtaClick}>{ctaLabel}</Button>
  }

  return <CapiEmptyState title={title} description={description} action={action} />
}
