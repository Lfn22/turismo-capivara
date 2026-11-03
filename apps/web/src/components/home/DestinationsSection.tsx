import { ArrowRight } from 'lucide-react';
import { Button, DestinationCard } from '@/src/components/ui/capi';

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
    <section className="capi-section" aria-labelledby="home-destinos-title">
      <div className="capi-container">
        <div className="flex items-end justify-between gap-4" style={{ marginBottom: 'var(--space-6)' }}>
          <div>
            <p style={{ marginBottom: 'var(--space-2)' }} className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-primary">Destinos</p>
            <h2
              id="home-destinos-title"
              className="font-[family-name:var(--font-display)] text-[clamp(28px,4vw,44px)] font-bold leading-tight text-fg"
            >
              Para onde vamos?
            </h2>
          </div>
          <Button href="/destinos" variant="ghost" size="sm" iconRight={ArrowRight}>
            Ver todos
          </Button>
        </div>

        <div className="capi-scroller">
          {destinations.map((d, i) => (
            <DestinationCard
              key={d.id}
              href={`/destinos/${d.slug}`}
              title={d.title}
              state={d.state}
              imageUrl={d.heroImageUrl}
              imageBlurDataUrl={d.heroImageBlurDataUrl}
              priority={i < 2}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
