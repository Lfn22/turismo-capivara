import Link from 'next/link';
import DestinationCard from '@/src/components/ui/DestinationCard';

interface Destination {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  state: string;
  heroImageUrl: string | null;
  heroImageBlurDataUrl: string | null;
}

interface Props {
  destinations: Destination[];
}

export default function DestinationsSection({ destinations }: Props) {
  if (destinations.length === 0) return null;

  return (
    <section className="py-16 md:py-24 px-5 md:px-12 max-w-[1280px] mx-auto">
      <div className="reveal">
        <p className="petro-decoration text-xs font-semibold tracking-[0.25em] uppercase mb-3"
          style={{ color: 'var(--ochre)' }}>
          Destinos
        </p>
        <div className="flex items-end justify-between mb-8">
          <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl md:text-[2.5rem] leading-tight"
            style={{ color: 'var(--stone-800)' }}>
            Para onde vamos?
          </h2>
          <Link href="/destinos" className="text-sm font-semibold no-underline hidden md:block"
            style={{ color: 'var(--ochre)' }}>
            Ver todos &rarr;
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7 reveal-stagger">
        {destinations.map((d) => (
          <div key={d.id} className="reveal">
            <DestinationCard
              slug={d.slug}
              title={d.title}
              subtitle={d.subtitle}
              state={d.state}
              heroImageUrl={d.heroImageUrl}
              heroImageBlurDataUrl={d.heroImageBlurDataUrl}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
