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
    <section className="py-12 md:py-20 px-5 md:px-12">
      <div className="mx-auto max-w-[1200px]">
        <div className="reveal">
          <div className="flex items-end justify-between mb-8">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl md:text-[2.5rem] leading-tight"
              style={{ color: 'var(--stone-800)' }}>
              Destinos
            </h2>
            <Link href="/destinos" className="text-base md:text-lg font-semibold no-underline"
              style={{ color: 'var(--ochre)' }}>
              Ver todos <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>

        <div
          className="flex gap-5 overflow-x-auto pb-4 reveal-stagger"
          role="region"
          aria-label="Carrossel de destinos"
          style={{
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
          }}>
          {destinations.slice(0, 3).map((d) => (
            <div key={d.id} className="flex-shrink-0 reveal"
              style={{ minWidth: '300px', flex: '1', maxWidth: '400px', scrollSnapAlign: 'start' }}>
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
      </div>
    </section>
  );
}
