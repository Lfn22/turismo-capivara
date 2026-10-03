import type { Metadata } from 'next';
import HeroSection from '@/src/components/home/HeroSection';
import StatsBar from '@/src/components/home/StatsBar';
import DestinationsSection from '@/src/components/home/DestinationsSection';
import HowItWorksSection from '@/src/components/home/HowItWorksSection';
import GuidesSection from '@/src/components/home/GuidesSection';
import CTASection from '@/src/components/home/CTASection';
import RupestreSeparator from '@/src/components/home/RupestreSeparator';
import ScrollRevealProvider from '@/src/components/home/ScrollRevealProvider';

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

async function fetchDestinations(): Promise<DestinationSummary[] | null> {
  try {
    const res = await fetch(`${API_URL}/destinations`, { cache: 'no-store' });
    if (res.ok) return res.json();
    return null;
  } catch {
    return null;
  }
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
  const [destinations, guides] = await Promise.all([
    fetchDestinations(),
    fetchGuides(),
  ]);
  const previewDestinations = destinations?.slice(0, 6) ?? [];
  const previewGuides = guides ?? [];
  const packages = previewGuides.length > 0 ? await fetchPackages(previewGuides) : [];

  const stats = {
    destinations: destinations?.length ?? 0,
    guides: previewGuides.length,
    packages: packages.length,
  };

  return (
    <ScrollRevealProvider>
      <HeroSection />
      <StatsBar
        destinations={stats.destinations}
        guides={stats.guides}
        packages={stats.packages}
      />
      <RupestreSeparator />
      <DestinationsSection destinations={previewDestinations} />
      <HowItWorksSection />
      <GuidesSection guides={previewGuides} />
      <CTASection packages={packages} />
    </ScrollRevealProvider>
  );
}
