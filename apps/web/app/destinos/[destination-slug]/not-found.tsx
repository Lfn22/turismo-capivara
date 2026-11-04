import { MapPin } from 'lucide-react';
import PublicLayout from '@/src/components/layout/PublicLayout';
import { Button, EmptyState } from '@/src/components/ui/capi';
import HiddenDestinationPreview from '@/src/components/edit-mode/HiddenDestinationPreview';

export default function DestinationNotFound() {
  return (
    <PublicLayout>
      <main className="capi-container" style={{ paddingBlock: 'var(--space-16)' }}>
        <EmptyState
          icon={MapPin}
          title="Destino não encontrado"
          description="Este destino não existe ou não está disponível."
          action={<Button href="/destinos" variant="secondary">Ver destinos</Button>}
        />
        <HiddenDestinationPreview />
      </main>
    </PublicLayout>
  );
}
