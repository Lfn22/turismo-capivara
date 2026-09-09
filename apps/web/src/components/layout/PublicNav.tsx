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
      className="sticky top-0 z-[100] flex items-center justify-between px-5 md:px-6 h-14"
      style={{
        backgroundColor: 'rgba(31, 14, 8, 0.92)',
        backdropFilter: 'blur(12px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(12px) saturate(1.4)',
        color: 'var(--stone-50)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <Link href="/" aria-label="CAPI — página inicial" className="flex items-center">
          <Image src="/images/logo.png" alt="CAPI" width={64} height={58} style={{ filter: 'brightness(0) invert(1)' }} priority />
        </Link>
        <span style={{ color: 'var(--stone-500)', fontSize: '0.75rem' }}>·</span>
        <span className="font-bold text-base tracking-tight">{tenantName}</span>
      </div>
      <div className="flex items-center gap-3">
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
          className="text-sm font-semibold no-underline rounded-full transition-all"
          style={{
            color: 'var(--stone-900)',
            background: 'var(--ochre)',
            padding: '7px 18px',
          }}
        >
          Painel
        </Link>
      </div>
    </nav>
  );
}
