import type { Metadata } from 'next';
import { Route } from 'lucide-react';
import PublicLayout from '@/src/components/layout/PublicLayout';
import { DestinationSubheader, DestinationTabs } from '@/src/components/ui/DestinationHero';
import { Button, EmptyState } from '@/src/components/ui/capi';
import PackageCard, {
  PackageCardPackage,
} from '@/src/components/ui/PackageCard';

// ── Data layer ────────────────────────────────────────────────────────────────

const API_URL = process.env.API_URL ?? 'http://localhost:3333';

interface ApiPackage {
  id: string;
  name: string;
  description: string;
  duration: number; // horas (cadastro do painel)
  price: number;    // decimal, e.g. 120.00
  difficulty: 'EASY' | 'MODERATE' | 'HARD';
  durationMinHours: number | null;
  durationMaxHours: number | null;
  tenantSlug: string;
}

interface DestinationPackages {
  destinationTitle: string;
  packages: PackageCardPackage[];
}

async function fetchDestinationPackages(slug: string): Promise<DestinationPackages> {
  try {
    const [destRes, packagesRes] = await Promise.all([
      fetch(`${API_URL}/destinations/${slug}`, { next: { revalidate: 60 } }),
      fetch(`${API_URL}/destinations/${slug}/packages`, { next: { revalidate: 60 } }),
    ]);
    const destination = destRes.ok ? await destRes.json() : null;
    const raw: ApiPackage[] = packagesRes.ok ? await packagesRes.json() : [];
    const packages = Array.isArray(raw)
      ? raw.map((p): PackageCardPackage => ({
          id: p.id,
          name: p.name,
          durationMinutes: (p.duration ?? 0) * 60, // horas → minutos
          priceFrom: Math.round(p.price * 100), // decimal → cents
          difficulty: p.difficulty,
          coverImageUrl: null,   // API does not return photos yet
          coverImageBlurDataUrl: null,
          tags: [],
        }))
      : [];
    return {
      destinationTitle: destination?.title ?? slug,
      packages,
    };
  } catch {
    return { destinationTitle: slug, packages: [] };
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ 'destination-slug': string }>;
}): Promise<Metadata> {
  const { 'destination-slug': slug } = await params;
  const { destinationTitle } = await fetchDestinationPackages(slug);
  return {
    title: 'Roteiros',
    description: `Roteiros disponíveis em ${destinationTitle}. Compare duração, dificuldade e preços.`,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ 'destination-slug': string }>;
}

export default async function DestinationRoteirosPage({ params }: Props) {
  const { 'destination-slug': slug } = await params;
  const { destinationTitle, packages } = await fetchDestinationPackages(slug);

  return (
    <PublicLayout>
      <style>{`
        .droteiros { min-height: 100dvh; background: var(--bg-page); }
        .droteiros__body { padding-block: var(--space-6) var(--space-16); }
        .droteiros__count {
          margin-bottom: var(--space-5);
          font-size: 14px; font-weight: 500; color: var(--text-secondary);
          font-variant-numeric: tabular-nums;
        }
        .droteiros__count strong { color: var(--text); font-weight: 700; }
      `}</style>

      <div className="droteiros">
        <DestinationSubheader
          backHref={`/destinos/${slug}`}
          backLabel={destinationTitle}
          overline="Roteiros disponíveis"
          title="Escolha sua aventura"
          lead={`Roteiros com guias certificados em ${destinationTitle}.`}
        />

        <DestinationTabs slug={slug} active="roteiros" />

        <main className="capi-container droteiros__body">
          {packages.length > 0 ? (
            <>
              <p className="droteiros__count">
                <strong>{packages.length}</strong>{' '}
                {packages.length === 1 ? 'roteiro disponível' : 'roteiros disponíveis'}
              </p>
              <div className="capi-grid-cards" id="roteiros">
                {packages.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    package={pkg}
                    href={`/destinos/${slug}/roteiros/${pkg.id}`}
                  />
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              icon={Route}
              title={`Nenhum roteiro cadastrado em ${destinationTitle} ainda`}
              description="Em breve novos roteiros estarão disponíveis neste destino. Enquanto isso, conheça os guias da região."
              action={
                <Button href={`/destinos/${slug}/guias`} variant="secondary">
                  Conhecer os guias
                </Button>
              }
            />
          )}
        </main>
      </div>
    </PublicLayout>
  );
}
