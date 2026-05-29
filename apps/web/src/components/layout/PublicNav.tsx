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
      <span className="font-bold text-lg tracking-tight">{tenantName}</span>
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
