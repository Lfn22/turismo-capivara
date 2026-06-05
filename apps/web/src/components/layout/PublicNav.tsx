import Link from 'next/link';
import Image from 'next/image';

interface PublicNavProps {
  tenantName: string;
  slug: string;
  backHref?: string;
}

export default function PublicNav({ tenantName, slug, backHref }: PublicNavProps) {
  return (
    <nav
      className="sticky top-0 z-[100] flex items-center justify-between px-6 h-14"
      style={{ backgroundColor: 'var(--stone-900)', color: 'var(--stone-50)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <Link href="/" aria-label="CAPI — página inicial" style={{ display: 'flex', alignItems: 'center' }}>
          <Image src="/images/logo.png" alt="CAPI" width={64} height={58} style={{ filter: 'brightness(0) invert(1)' }} priority />
        </Link>
        <span style={{ color: 'var(--stone-500)', fontSize: '0.75rem' }}>·</span>
        <span className="font-bold text-base tracking-tight">{tenantName}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {backHref && (
          <Link
            href={backHref}
            className="text-sm font-medium no-underline"
            style={{ color: 'var(--ochre)' }}
          >
            ← Voltar
          </Link>
        )}
        <Link
          href={`/${slug}/login`}
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--stone-900)',
            background: 'var(--ochre)',
            padding: '8px 16px',
            borderRadius: '2px',
            textDecoration: 'none',
          }}
        >
          Painel
        </Link>
      </div>
    </nav>
  );
}
