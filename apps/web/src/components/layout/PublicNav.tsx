import Link from 'next/link';

interface PublicNavProps {
  tenantName: string;
  backHref?: string;
}

export default function PublicNav({ tenantName, backHref }: PublicNavProps) {
  return (
    <nav
      className="sticky top-0 z-[100] flex items-center justify-between px-6 h-14"
      style={{ backgroundColor: 'var(--stone-900)', color: 'var(--stone-50)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <Link href="/" className="font-bold text-sm tracking-widest no-underline" style={{ color: 'var(--ochre)' }}>
          CAPI
        </Link>
        <span style={{ color: 'var(--stone-500)', fontSize: '0.75rem' }}>·</span>
        <span className="font-bold text-base tracking-tight">{tenantName}</span>
      </div>
      {backHref && (
        <Link
          href={backHref}
          className="text-sm font-medium no-underline"
          style={{ color: 'var(--ochre)' }}
        >
          ← Voltar
        </Link>
      )}
    </nav>
  );
}
