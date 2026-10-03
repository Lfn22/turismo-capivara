import Link from 'next/link';
import '@/src/styles/animations.css';

interface Package {
  id: string;
  name: string;
  price: number;
  difficulty: string;
  guideName: string;
  guideId: string;
}

interface Props {
  packages?: Package[];
}

const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: 'Fácil',
  MODERATE: 'Moderado',
  HARD: 'Difícil',
};

export default function CTASection({ packages = [] }: Props) {
  return (
    <section className="py-12 md:py-20 px-5 md:px-12 text-center"
      style={{ background: 'linear-gradient(180deg, var(--stone-50) 0%, var(--ochre-bg) 100%)' }}>
      <div className="mx-auto max-w-[1200px] reveal">
        <p className="text-xs font-semibold tracking-[0.25em] uppercase mb-3"
          style={{ color: 'var(--ochre)' }}>
          Comece agora
        </p>
        <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl md:text-[2.5rem] leading-tight mb-4"
          style={{ color: 'var(--stone-800)' }}>
          Sua próxima <em style={{ color: 'var(--ochre)', fontStyle: 'italic' }}>aventura</em>{' '}
          começa aqui
        </h2>
        <p className="text-base md:text-lg max-w-[480px] mx-auto"
          style={{ color: 'var(--stone-500)' }}>
          Encontre guias locais, escolha seu roteiro e reserve com segurança.
        </p>

        {packages.length > 0 && (
          <div className="relative mt-8">
            {/* Fade edges */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-8 z-10"
              style={{ background: 'linear-gradient(to right, rgba(250,245,239,0.9), transparent)' }} />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 z-10"
              style={{ background: 'linear-gradient(to left, rgba(250,245,239,0.9), transparent)' }} />

            <div
              className="flex gap-4 overflow-x-auto pb-2 px-2"
              role="region"
              aria-label="Roteiros disponíveis"
              style={{
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
              }}>
              {packages.map((pkg) => (
                <Link key={pkg.id} href={`/guias/${pkg.guideId}`}
                  className="cta-pkg-card flex-shrink-0 no-underline"
                  style={{ width: '260px', scrollSnapAlign: 'start' }}>
                  <div style={{
                    background: 'white',
                    border: '1px solid var(--stone-200)',
                    borderRadius: '10px',
                    padding: '1rem 1.1rem',
                    textAlign: 'left',
                    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                  }}>
                    <p className="text-sm" style={{
                      fontWeight: 700,
                      color: 'var(--stone-800)',
                      marginBottom: '0.35rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {pkg.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--stone-500)', marginBottom: '0.5rem' }}>
                      {pkg.guideName}
                    </p>
                    <div className="text-xs" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--ochre-dark)' }}>
                        R$ {pkg.price.toFixed(2)}
                      </span>
                      <span style={{
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--stone-500)',
                        background: 'var(--stone-100)',
                        border: '1px solid var(--stone-200)',
                        padding: '2px 8px',
                        borderRadius: '2px',
                      }}>
                        {DIFFICULTY_LABEL[pkg.difficulty] ?? pkg.difficulty}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <Link href="/destinos"
          className="btn btn-outline btn-lg mt-8">
          Reservar agora
        </Link>
      </div>
    </section>
  );
}
