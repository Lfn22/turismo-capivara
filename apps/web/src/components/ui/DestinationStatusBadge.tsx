import { StatusBadge } from '@/src/components/ui/capi'

interface DestinationStatusBadgeProps {
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
}

const TOOLTIP: Record<DestinationStatusBadgeProps['status'], string> = {
  PENDING: 'Aguardando aprovação do administrador',
  APPROVED: 'Visível no marketplace',
  REJECTED: 'Destino não aprovado. Entre em contato com o suporte.',
}

/** Status de aprovação de um destino (wrapper do StatusBadge kind="approval"). */
export function DestinationStatusBadge({ status }: DestinationStatusBadgeProps) {
  const safe = status in TOOLTIP ? status : 'PENDING'
  return <StatusBadge kind="approval" status={safe} title={TOOLTIP[safe]} />
}
