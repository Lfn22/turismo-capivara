import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Button, TopNav } from '@/src/components/ui/capi';

interface PublicNavProps {
  tenantName: string;
  slug: string;
  backHref?: string;
}

/** Barra superior das páginas públicas da operadora: vidro claro, logo compacta e nome da operadora. */
export default function PublicNav({ tenantName, slug, backHref }: PublicNavProps) {
  return (
    <TopNav
      tenantName={tenantName}
      logo={
        <Link
          href="/"
          aria-label="CAPI — página inicial"
          className="inline-flex items-center"
          style={{ minHeight: 'var(--touch-target)' }}
        >
          <Image
            src="/images/logo.png"
            alt="CAPI"
            width={40}
            height={36}
            priority
            style={{ height: 36, width: 'auto', display: 'block' }}
          />
        </Link>
      }
      actions={
        <>
          {backHref ? (
            <Button href={backHref} variant="ghost" size="sm" iconLeft={ArrowLeft}>
              Voltar
            </Button>
          ) : null}
          <Button href={`/${slug}/login`} variant="secondary" size="sm" iconLeft={LayoutDashboard}>
            Painel
          </Button>
        </>
      }
    />
  );
}
