import type { Metadata } from 'next';
import { Users } from 'lucide-react';
import PublicLayout from '@/src/components/layout/PublicLayout';
import StickyDestinationNav from '@/src/components/layout/StickyDestinationNav';
import { DestinationSubheader, DestinationTabs } from '@/src/components/ui/DestinationHero';
import { Button, EmptyState } from '@/src/components/ui/capi';
import GuideCard, { GuideCardGuide } from '@/src/components/ui/GuideCard';

// ── Data layer ────────────────────────────────────────────────────────────────

const API_URL = process.env.API_URL ?? 'http://localhost:3333'

interface DestinationGuides {
  destinationTitle: string;
  guides: GuideCardGuide[];
}

async function fetchDestinationGuides(slug: string): Promise<DestinationGuides> {
  try {
    const [destRes, guidesRes] = await Promise.all([
      fetch(`${API_URL}/destinations/${slug}`, { next: { revalidate: 60 } }),
      fetch(`${API_URL}/destinations/${slug}/guides`, { next: { revalidate: 60 } }),
    ])
    const destination = destRes.ok ? await destRes.json() : null
    const guides: GuideCardGuide[] = guidesRes.ok ? await guidesRes.json() : []
    return {
      destinationTitle: destination?.title ?? slug,
      guides: Array.isArray(guides) ? guides : [],
    }
  } catch {
    return { destinationTitle: slug, guides: [] }
  }
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ 'destination-slug': string }>;
}): Promise<Metadata> {
  const { 'destination-slug': slug } = await params;
  const { destinationTitle } = await fetchDestinationGuides(slug);
  return {
    title: 'Guias',
    description: `Guias certificados disponíveis em ${destinationTitle}. Compare especialidades, avaliações e roteiros.`,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ 'destination-slug': string }>;
}

export default async function DestinationGuiasPage({ params }: Props) {
  const { 'destination-slug': slug } = await params;
  const { destinationTitle, guides } = await fetchDestinationGuides(slug);

  return (
    <PublicLayout>
      <style>{`
        .dguias { min-height: 100dvh; background: var(--bg-page); }
        .dguias__body { padding-block: var(--space-6) var(--space-16); }
        .dguias__count {
          margin-bottom: var(--space-5);
          font-size: 14px; font-weight: 500; color: var(--text-secondary);
          font-variant-numeric: tabular-nums;
        }
        .dguias__count strong { color: var(--text); font-weight: 700; }
        .dguias__grid {
          display: grid;
          gap: var(--space-4);
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
        }
      `}</style>

      <StickyDestinationNav
        destinationName={destinationTitle}
        destinationSlug={slug}
        activeTab="guias"
      />

      <div className="dguias">
        <DestinationSubheader
          backHref={`/destinos/${slug}`}
          backLabel={destinationTitle}
          overline="Guias certificados"
          title="Escolha quem vai te guiar"
          lead={`Conheça os guias disponíveis em ${destinationTitle}.`}
        />

        <DestinationTabs slug={slug} active="guias" />

        <main className="capi-container dguias__body">
          {guides.length > 0 ? (
            <>
              <p className="dguias__count">
                <strong>{guides.length}</strong>{' '}
                {guides.length === 1 ? 'guia disponível' : 'guias disponíveis'}
              </p>
              <div className="dguias__grid" id="guias">
                {guides.map((guide) => (
                  <GuideCard
                    key={guide.id}
                    guide={guide}
                    href={`/destinos/${slug}/guias/${guide.id}`}
                  />
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              icon={Users}
              title={`Nenhum guia cadastrado em ${destinationTitle} ainda`}
              description="Em breve novos condutores estarão disponíveis neste destino."
              action={
                <Button href={`/destinos/${slug}/roteiros`} variant="secondary">
                  Ver roteiros
                </Button>
              }
            />
          )}
        </main>
      </div>
    </PublicLayout>
  );
}
