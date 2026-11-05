import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { Button, TopNav } from '@/src/components/ui/capi';
import PublicNavLogin from './PublicNavLogin';

interface PublicNavProps {
  tenantName: string;
  tenantLogoUrl?: string | null;
  slug: string;
  backHref?: string;
}

/** Barra superior das páginas públicas da operadora: vidro claro, logo compacta e nome da operadora. */
export default function PublicNav({ tenantName, tenantLogoUrl, backHref }: PublicNavProps) {
  return (
    <TopNav
      tenantName={tenantName}
      logo={
        <>
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
          {tenantLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logos vêm do storage de uploads
            <img
              src={tenantLogoUrl}
              alt=""
              width={32}
              height={32}
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flex: 'none' }}
            />
          ) : null}
        </>
      }
      actions={
        <>
          {backHref ? (
            <Button href={backHref} variant="ghost" size="sm" iconLeft={ArrowLeft}>
              Voltar
            </Button>
          ) : null}
          <PublicNavLogin />
        </>
      }
    />
  );
}
