import { Inbox } from 'lucide-react';
import { Button, EmptyState } from '@/src/components/ui/capi';

interface Props {
  /** Legado: path SVG. Ignorado no v2 (o ícone vem do lucide-react). */
  icon?: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

/** Legado: mantém a API antiga e renderiza o EmptyState do CAPI v2. */
export default function PainelEmptyState({ message, actionLabel, actionHref }: Props) {
  return (
    <EmptyState
      icon={Inbox}
      title={message}
      action={actionLabel && actionHref ? <Button href={actionHref}>{actionLabel}</Button> : undefined}
    />
  );
}
