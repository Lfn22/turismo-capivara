import { UserRound } from 'lucide-react';
import PublicLayout from '@/src/components/layout/PublicLayout';
import { Button, EmptyState } from '@/src/components/ui/capi';

// Sem este arquivo, o notFound() da página cairia no not-found do destino ("Destino não encontrado")
export default function GuiaNotFound() {
  return (
    <PublicLayout>
      <main className="capi-container" style={{ paddingBlock: 'var(--space-16)' }}>
        <EmptyState
          icon={UserRound}
          title="Guia não encontrado"
          description="Este guia não existe ou não está disponível."
          action={<Button href="/destinos" variant="secondary">Ver destinos</Button>}
        />
      </main>
    </PublicLayout>
  );
}
