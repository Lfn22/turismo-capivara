import { Button } from '@/src/components/ui/capi'
import PedidosClient from './PedidosClient'
import RoteirosClient from './RoteirosClient'

export default async function SuperAdminRoteirosPage({
  searchParams,
}: {
  searchParams: Promise<{ operadora?: string; pedidos?: string }>
}) {
  const { operadora, pedidos } = await searchParams
  const showPedidos = pedidos === '1'
  return (
    <>
      <nav className="mb-4 flex gap-2" aria-label="Visões de roteiros">
        <Button
          href="/super-admin/roteiros"
          size="sm"
          variant={showPedidos ? 'ghost' : 'secondary'}
        >
          Roteiros
        </Button>
        <Button
          href="/super-admin/roteiros?pedidos=1"
          size="sm"
          variant={showPedidos ? 'secondary' : 'ghost'}
        >
          Pedidos pendentes
        </Button>
      </nav>
      {showPedidos ? <PedidosClient /> : <RoteirosClient initialSlug={operadora ?? ''} />}
    </>
  )
}
