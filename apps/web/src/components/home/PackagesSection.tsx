import { ArrowRight } from 'lucide-react';
import { Button, PackageCard } from '@/src/components/ui/capi';

interface Package {
  id: string;
  name: string;
  price: number | string; // reais (Decimal da API)
  difficulty: string;
  guideName: string;
  guideId: string;
}

const DIFFICULTIES = new Set(['EASY', 'MODERATE', 'HARD']);

/** Roteiros em destaque na home: carrossel com snap no mobile, grade a partir de 1024px. */
export default function PackagesSection({ packages }: { packages: Package[] }) {
  if (packages.length === 0) return null;

  return (
    <section className="capi-section" aria-labelledby="home-roteiros-title" style={{ background: 'var(--bg-subtle)' }}>
      <div className="capi-container">
        <div className="flex flex-wrap items-end justify-between gap-4" style={{ marginBottom: 'var(--space-6)' }}>
          <div>
            <p style={{ marginBottom: 'var(--space-2)' }} className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-primary">Roteiros</p>
            <h2 id="home-roteiros-title" className="font-[family-name:var(--font-display)] text-[clamp(28px,4vw,44px)] font-bold leading-tight text-fg">
              Sua próxima aventura começa aqui
            </h2>
          </div>
          <Button href="/destinos" variant="ghost" iconRight={ArrowRight}>Ver destinos</Button>
        </div>

        <div className="capi-scroller" role="region" aria-label="Roteiros em destaque">
          {packages.slice(0, 8).map((p) => (
            <div key={p.id}>
              <PackageCard
                href={`/guias/${p.guideId}`}
                package={{
                  name: p.name,
                  durationMinutes: 0,
                  priceFrom: Math.round(Number(p.price) * 100),
                  difficulty: DIFFICULTIES.has(p.difficulty) ? (p.difficulty as 'EASY' | 'MODERATE' | 'HARD') : null,
                  guideName: p.guideName,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
