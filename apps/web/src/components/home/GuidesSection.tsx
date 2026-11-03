import { ArrowRight, BadgeCheck, Footprints, Mountain, type LucideIcon } from 'lucide-react';
import { Button } from '@/src/components/ui/capi';
import GuideCard from '@/src/components/ui/GuideCard';

const highlights: Array<{ icon: LucideIcon; text: string }> = [
  { icon: Mountain, text: 'Nascidos e criados na região' },
  { icon: BadgeCheck, text: 'Guias certificados e verificados' },
  { icon: Footprints, text: 'Cada trilha tem uma história' },
];

interface Guide {
  id: string;
  name: string;
  photoUrl: string | null;
  specialties: string[];
}

interface Props {
  guides?: Guide[];
}

/**
 * Guias locais em destaque. Com dados da API: carrossel de GuideCard (snap no mobile, grade no desktop).
 * Sem dados: bloco editorial que leva ao Explorar.
 */
export default function GuidesSection({ guides = [] }: Props) {
  return (
    <section className="capi-section" aria-labelledby="home-guias-title">
      <div className="capi-container">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center md:gap-12">
          <div>
            <p style={{ marginBottom: 'var(--space-2)' }} className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-primary">Guias locais</p>
            <h2
              id="home-guias-title"
              style={{ marginBottom: 'var(--space-4)' }}
              className="font-[family-name:var(--font-display)] text-[clamp(28px,4vw,44px)] font-bold leading-tight text-fg"
            >
              Quem conhece de verdade
            </h2>
            <p style={{ marginBottom: 'var(--space-6)', maxWidth: 560 }} className="text-base leading-relaxed text-fg-secondary md:text-lg">
              Guias nascidos e criados na região. Cada trilha tem uma história, cada pedra tem um nome.
            </p>
            <Button href="/explorar" variant="secondary" iconRight={ArrowRight}>
              {guides.length > 0 ? 'Ver todos os guias' : 'Conhecer os guias'}
            </Button>
          </div>

          <ul className="grid list-none gap-3">
            {highlights.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-surface"
                style={{ padding: 'var(--space-4)' }}
              >
                <span
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle text-fg-primary"
                  aria-hidden="true"
                >
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <span className="text-[15px] font-medium text-fg">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {guides.length > 0 ? (
          <div className="capi-scroller" style={{ marginTop: 'var(--space-10)' }} role="region" aria-label="Guias em destaque">
            {guides.slice(0, 8).map((g) => (
              <div key={g.id}>
                <GuideCard
                  guide={{ id: g.id, name: g.name, photoUrl: g.photoUrl, specialties: g.specialties, packageCount: 0 }}
                  href={`/guias/${g.id}`}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
