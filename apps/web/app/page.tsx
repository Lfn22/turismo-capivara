import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard } from 'lucide-react';
import { Button } from '@/src/components/ui/capi';
import HeroSection from '@/src/components/home/HeroSection';
import DestinationsSection from '@/src/components/home/DestinationsSection';
import HowItWorksSection from '@/src/components/home/HowItWorksSection';
import GuidesSection from '@/src/components/home/GuidesSection';
import PackagesSection from '@/src/components/home/PackagesSection';
import StatsBar from '@/src/components/home/StatsBar';
import CTASection from '@/src/components/home/CTASection';
import ScrollRevealProvider from '@/src/components/home/ScrollRevealProvider';
import PublicLayout from '@/src/components/layout/PublicLayout';

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

interface GuideSummary {
  id: string;
  name: string;
  photoUrl: string | null;
  specialties: string[];
}

interface PackageSummary {
  id: string;
  name: string;
  price: number;
  difficulty: string;
  guideName: string;
  guideId: string;
}

async function fetchGuides(): Promise<GuideSummary[] | null> {
  try {
    const res = await fetch(`${API_URL}/guides`, { cache: 'no-store' });
    if (res.ok) return res.json();
    return null;
  } catch {
    return null;
  }
}

async function fetchPackages(guides: GuideSummary[]): Promise<PackageSummary[]> {
  try {
    const results = await Promise.all(
      guides.map(async (g) => {
        const res = await fetch(`${API_URL}/guides/${g.id}/packages`, { cache: 'no-store' });
        if (!res.ok) return [];
        const pkgs = await res.json();
        return pkgs.map((p: { id: string; name: string; price: number; difficulty: string }) => ({
          ...p,
          guideName: g.name,
          guideId: g.id,
        }));
      })
    );
    return results.flat();
  } catch {
    return [];
  }
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
  title: 'CAPI — caminho entre quem explora e quem opera',
  description:
    'Encontre guias certificados, compare roteiros e reserve com PIX. O marketplace de turismo que conecta viajantes e condutores locais.',
  openGraph: {
    title: 'CAPI',
    locale: 'pt_BR',
  },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const [destinations, guides] = await Promise.all([fetchDestinations(), fetchGuides()]);
  const previewDestinations = destinations?.slice(0, 6) ?? [];
  const previewGuides = guides ?? [];
  const packages = previewGuides.length > 0 ? await fetchPackages(previewGuides) : [];
  const stats = {
    destinations: destinations?.length ?? 0,
    guides: previewGuides.length,
    packages: packages.length,
  };
  const hasStats = stats.destinations + stats.guides + stats.packages > 0;
  // Foto do hero: o primeiro destino que tiver imagem. Sem foto, o hero usa surface-brand.
  const heroDestination = previewDestinations.find((d) => d.heroImageUrl);

  return (
    <PublicLayout>
      <ScrollRevealProvider>
        <main>
          <HeroSection
            imageUrl={heroDestination?.heroImageUrl}
            imageBlurDataUrl={heroDestination?.heroImageBlurDataUrl}
            quickLinks={previewDestinations.map((d) => ({ href: `/destinos/${d.slug}`, label: d.title }))}
          />

          {hasStats ? (
            <StatsBar destinations={stats.destinations} guides={stats.guides} packages={stats.packages} />
          ) : null}
          <div className="home-reveal">
            <DestinationsSection destinations={previewDestinations} />
          </div>
          <div className="home-reveal">
            <HowItWorksSection />
          </div>
          <div className="home-reveal">
            <GuidesSection guides={previewGuides} />
          </div>
          <div className="home-reveal">
            <PackagesSection packages={packages} />
          </div>
          <CTASection />
        </main>

        {/* Footer */}
        <footer
          className="bg-surface-brand"
          style={{
            color: 'var(--text-on-brand)',
            borderTop: '1px solid var(--terra-700)',
            paddingBlock: 'var(--space-12)',
          }}
        >
          <div className="capi-container flex flex-col items-center gap-6 text-center">
            <Image
              src="/images/logo.png"
              alt="CAPI"
              width={110}
              height={99}
              style={{ filter: 'brightness(0) invert(1)', display: 'block' }}
            />
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Button href="/login" variant="secondary" iconLeft={LayoutDashboard}>
                Acessar painel
              </Button>
              <Link
                href="/onboarding"
                className="inline-flex items-center text-sm font-semibold underline-offset-4 hover:underline"
                style={{ color: 'var(--text-on-brand)', minHeight: 'var(--touch-target)', paddingInline: 'var(--space-3)' }}
              >
                Cadastre sua operadora
              </Link>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-on-brand-secondary)' }}>
              &copy; {new Date().getFullYear()} CAPI
            </p>
          </div>
        </footer>
      </ScrollRevealProvider>
    </PublicLayout>
  );
}
