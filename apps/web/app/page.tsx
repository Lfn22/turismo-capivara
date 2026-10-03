import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
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
      {/* Nav — simplified, desktop only (mobile uses BottomNav) */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 md:px-10 py-8 transition-all duration-400"
        style={{
          background: 'rgba(245, 240, 232, 0.85)',
          backdropFilter: 'blur(12px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(12px) saturate(1.4)',
        }}>
        <Link href="/" className="font-[family-name:var(--font-display)] font-bold text-xl tracking-[3px] no-underline"
          style={{ color: 'var(--stone-800)' }}>
          CAPI
        </Link>
        <div className="hidden md:flex items-center gap-7">
          <Link href="/destinos" className="text-sm no-underline transition-colors" style={{ color: 'var(--stone-600)' }}>Destinos</Link>
          <Link href="/explorar" className="text-sm no-underline transition-colors" style={{ color: 'var(--stone-600)' }}>Explorar</Link>
        </div>
      </nav>

      <HeroSection />
      <RupestreSeparator />
      <DestinationsSection destinations={previewDestinations} />
      <RupestreSeparator variant="double" />
      <GuidesSection />
      <CTASection />

      {/* Footer */}
      <footer className="py-24 md:py-16 px-5 md:px-24 text-center"
        style={{ background: 'var(--stone-900)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-[1280px] mx-auto flex flex-col items-center gap-12">
          <Image src="/images/logo.png" alt="CAPI" width={110} height={99}
            style={{ filter: 'brightness(0) invert(1)', display: 'block' }} />
          <Link href="/login"
            className="btn btn-outline btn-md">
            Acessar painel
          </Link>
          <Link href="/onboarding" className="text-xs no-underline" style={{ color: 'var(--stone-500)' }}>
            Cadastre sua operadora &rarr;
          </Link>
          <p className="text-xs" style={{ color: 'var(--stone-600)' }}>
            &copy; {new Date().getFullYear()} CAPI
          </p>
        </div>
      </footer>
    </ScrollRevealProvider>
  );
}
