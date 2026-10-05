import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard } from 'lucide-react';
import { Button } from '@/src/components/ui/capi';
import HeroSection from '@/src/components/home/HeroSection';
import type { HeroSlide } from '@/src/components/home/HeroSlideshow';
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
  photos?: string[];
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
  photos?: string[];
}

/** Máximo de fotos no hero: acima disso o visitante raramente vê e só gasta dados. */
const HERO_MAX_SLIDES = 12;

/** Junta capa + galeria de cada destino e as fotos dos roteiros, sem repetir URL. */
function buildHeroSlides(destinations: DestinationSummary[], packages: PackageSummary[]): HeroSlide[] {
  const seen = new Set<string>();
  const destSlides: HeroSlide[] = [];
  const pkgSlides: HeroSlide[] = [];
  const push = (list: HeroSlide[], slide: HeroSlide) => {
    if (!slide.src || seen.has(slide.src)) return;
    seen.add(slide.src);
    list.push(slide);
  };

  for (const d of destinations) {
    const base = { label: d.state ? `${d.title}, ${d.state}` : d.title, kind: 'Destino', href: `/destinos/${d.slug}` };
    if (d.heroImageUrl) push(destSlides, { ...base, src: d.heroImageUrl, blurDataUrl: d.heroImageBlurDataUrl });
    for (const src of d.photos ?? []) push(destSlides, { ...base, src });
  }
  for (const p of packages) {
    for (const src of p.photos ?? []) push(pkgSlides, { src, label: p.name, kind: 'Roteiro', href: `/guias/${p.guideId}` });
  }

  // Intercala destino e roteiro para o hero não mostrar 5 fotos do mesmo lugar seguidas.
  const mixed: HeroSlide[] = [];
  for (let i = 0; mixed.length < HERO_MAX_SLIDES && (i < destSlides.length || i < pkgSlides.length); i++) {
    if (destSlides[i]) mixed.push(destSlides[i]);
    if (pkgSlides[i] && mixed.length < HERO_MAX_SLIDES) mixed.push(pkgSlides[i]);
  }
  return mixed;
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
        return pkgs.map((p: { id: string; name: string; price: number; difficulty: string; photos?: string[] }) => ({
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
  // Fotos do hero: todos os destinos (capa + galeria) e roteiros. Sem fotos, o hero usa surface-brand.
  const heroSlides = buildHeroSlides(destinations ?? [], packages);

  return (
    <PublicLayout>
      <ScrollRevealProvider>
        <main>
          <HeroSection
            slides={heroSlides}
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
