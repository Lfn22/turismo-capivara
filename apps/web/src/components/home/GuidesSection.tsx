import Link from 'next/link';
import GuideCard from '@/src/components/ui/GuideCard';
import AutoScrollCarousel from './AutoScrollCarousel';

interface Guide {
  id: string;
  name: string;
  photoUrl: string | null;
  specialties: string[];
}

interface Props {
  guides: Guide[];
}

export default function GuidesSection({ guides }: Props) {
  if (guides.length === 0) return null;

  return (
    <>
    <section className="py-12 md:py-20 px-5 md:px-12 relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, var(--stone-800) 0%, var(--stone-900) 100%)',
      }}>
      <div className="mx-auto max-w-[1200px] relative z-10">
        <div className="reveal mb-8">
          <div className="flex items-end justify-between">
            <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl md:text-[2.5rem] leading-tight"
              style={{ color: 'var(--stone-100)' }}>
              Quem conhece <em style={{ color: 'var(--ochre-light)', fontStyle: 'italic' }}>de verdade</em>
            </h2>
            <Link href="/explorar" className="text-base md:text-lg font-semibold no-underline whitespace-nowrap"
              style={{ color: 'var(--ochre-light)' }}>
              Ver todos <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>

        <div className="relative">
          {/* Fade edges */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 z-10"
            style={{ background: 'linear-gradient(to right, var(--stone-800), transparent)' }} />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 z-10"
            style={{ background: 'linear-gradient(to left, var(--stone-900), transparent)' }} />

          <AutoScrollCarousel cardWidth={220} gap={16} ariaLabel="Carrossel de guias">
            {guides.map((g) => (
              <div key={g.id} className="flex-shrink-0" style={{ width: '220px', scrollSnapAlign: 'start' }}>
                <GuideCard
                  guide={{
                    id: g.id,
                    name: g.name,
                    photoUrl: g.photoUrl,
                    specialties: g.specialties,
                    packageCount: 0,
                  }}
                  href={`/guias/${g.id}`}
                />
              </div>
            ))}
          </AutoScrollCarousel>
        </div>
      </div>
    </section>
    </>
  );
}
