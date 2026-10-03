import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, RotateCw } from 'lucide-react';
import DestinationCard from '@/src/components/ui/DestinationCard';
import PublicLayout from '@/src/components/layout/PublicLayout';
import { Alert, Button, EmptyState, TopNav } from '@/src/components/ui/capi';

// Force SSR — build container cannot reach the API at build time
export const dynamic = 'force-dynamic';

// ── Data layer ────────────────────────────────────────────────────────────────

const API_URL = process.env.API_URL ?? 'http://localhost:3333';

interface DestinationSummary {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  state: string;
  heroImageUrl: string | null;
  heroImageBlurDataUrl: string | null;
}

async function fetchDestinations(): Promise<DestinationSummary[] | null> {
  try {
    const res = await fetch(`${API_URL}/destinations`, { cache: 'no-store' });
    if (res.ok) return res.json();
    return null; // API respondeu com erro (4xx/5xx)
  } catch {
    return null; // rede inacessível
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Destinos',
  description:
    'Explore destinos com guias certificados. Arte rupestre, patrimônio mundial e natureza preservada.',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DestinosPage() {
  const destinations = await fetchDestinations();

  return (
    <PublicLayout>
      <style>{`
        .destinos { min-height: 100dvh; background: var(--bg-page); }
        .destinos__nav.capi-topnav { position: relative; }
        .destinos__navlogo img { height: 36px; width: auto; display: block; }

        .destinos__header { padding-block: var(--space-8) var(--space-6); }
        @media (min-width: 768px) { .destinos__header { padding-block: var(--space-12) var(--space-8); } }
        .destinos__overline {
          margin-bottom: var(--space-2);
          font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
          color: var(--text-primary);
        }
        .destinos__title {
          margin-bottom: var(--space-2);
          font-family: var(--font-display);
          font-size: clamp(34px, 5vw, 48px); font-weight: 700; line-height: 1.1;
          color: var(--text);
        }
        .destinos__lead { max-width: 560px; font-size: 16px; line-height: 1.55; color: var(--text-secondary); }

        .destinos__body { padding-bottom: var(--space-16); }
        .destinos__count {
          margin-bottom: var(--space-5);
          font-size: 14px; font-weight: 500; color: var(--text-secondary);
          font-variant-numeric: tabular-nums;
        }
        .destinos__count strong { color: var(--text); font-weight: 700; }
      `}</style>

      <div className="destinos">
        <TopNav
          className="destinos__nav"
          links={[
            { href: '/destinos', label: 'Destinos' },
            { href: '/explorar', label: 'Explorar' },
          ]}
          logo={
            <Link
              href="/"
              aria-label="CAPI — página inicial"
              className="destinos__navlogo inline-flex items-center"
              style={{ minHeight: 'var(--touch-target)' }}
            >
              <Image src="/images/logo.png" alt="CAPI" width={40} height={36} priority />
            </Link>
          }
          actions={
            <Button href="/login" variant="secondary" size="sm">
              Entrar
            </Button>
          }
        />

        <header className="capi-container destinos__header">
          <p className="destinos__overline">Destinos</p>
          <h1 className="destinos__title">Onde você quer explorar?</h1>
          <p className="destinos__lead">
            Destinos com guias certificados, roteiros únicos e experiências que
            só existem aqui.
          </p>
        </header>

        <main className="capi-container destinos__body">
          {destinations === null ? (
            <Alert
              tone="danger"
              title="Erro ao carregar destinos"
              action={
                <Button href="/destinos" variant="secondary" size="sm" iconLeft={RotateCw}>
                  Tentar novamente
                </Button>
              }
            >
              Não foi possível conectar ao servidor. Tente novamente em instantes.
            </Alert>
          ) : destinations.length > 0 ? (
            <>
              <p className="destinos__count">
                <strong>{destinations.length}</strong>{' '}
                {destinations.length === 1 ? 'destino' : 'destinos'}
              </p>
              <div className="capi-grid-cards">
                {destinations.map((destination, i) => (
                  <DestinationCard
                    key={destination.id}
                    slug={destination.slug}
                    title={destination.title}
                    subtitle={destination.subtitle}
                    state={destination.state}
                    heroImageUrl={destination.heroImageUrl}
                    heroImageBlurDataUrl={destination.heroImageBlurDataUrl}
                    headingLevel="h2"
                    priority={i < 2}
                  />
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              icon={MapPin}
              title="Nenhum destino cadastrado"
              description="Novos destinos serão adicionados em breve. Enquanto isso, conheça os guias da plataforma."
              action={
                <Button href="/explorar" variant="secondary">
                  Explorar guias
                </Button>
              }
            />
          )}
        </main>
      </div>
    </PublicLayout>
  );
}
