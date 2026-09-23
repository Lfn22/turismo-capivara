import type { Metadata } from 'next';
import HeroSection from '@/src/components/home/HeroSection';
import DestinationsSection from '@/src/components/home/DestinationsSection';
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
  const destinations = await fetchDestinations();
  const previewDestinations = destinations?.slice(0, 6) ?? [];

  return (
    <ScrollRevealProvider>
      <HeroSection />
      <RupestreSeparator />
      <DestinationsSection destinations={previewDestinations} />
      <RupestreSeparator variant="double" />
      <GuidesSection />
      <CTASection />
    </ScrollRevealProvider>
  );
}
