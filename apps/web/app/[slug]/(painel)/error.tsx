'use client'

import { AlertTriangle } from 'lucide-react'
import { Button, EmptyState } from '@/src/components/ui/capi'

export default function PainelError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="capi-container" style={{ paddingBlock: 'var(--space-16)' }}>
      <EmptyState
        icon={AlertTriangle}
        title="Erro inesperado"
        description="Algo deu errado ao carregar esta página."
        action={
          <Button onClick={reset} variant="secondary">
            Tentar novamente
          </Button>
        }
      />
    </main>
  )
}
