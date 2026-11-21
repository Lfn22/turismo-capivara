import { Search } from 'lucide-react'
import { Button, EmptyState } from '@/src/components/ui/capi'

export default function NotFound() {
  return (
    <main className="capi-container" style={{ paddingBlock: 'var(--space-16)' }}>
      <EmptyState
        icon={Search}
        title="Página não encontrada"
        description="A página que você procura não existe ou foi removida."
        action={
          <Button href="/" variant="secondary">
            Voltar ao início
          </Button>
        }
      />
    </main>
  )
}
