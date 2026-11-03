import { PageHeader } from '@/src/components/ui/capi';

interface Props {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/** Legado: mantém a API antiga e renderiza o PageHeader do CAPI v2. */
export default function PainelPageHeader({ title, description, actions }: Props) {
  return <PageHeader title={title} description={description} actions={actions} />;
}
