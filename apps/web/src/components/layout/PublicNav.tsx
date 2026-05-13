import Link from 'next/link';

interface PublicNavProps {
  tenantName: string;
  backHref?: string;
}

export default function PublicNav({ tenantName, backHref }: PublicNavProps) {
  return (
    <nav
      style={{
        backgroundColor: '#1c1917',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        height: '56px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.01em' }}>
        {tenantName}
      </span>
      {backHref && (
        <Link
          href={backHref}
          style={{
            color: '#d97706',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          ← Voltar
        </Link>
      )}
    </nav>
  );
}
