import { ArrowRight } from 'lucide-react'
import { Button, PackageCard } from '@/src/components/ui/capi'
import PackageJoinButton from '@/src/components/membership/PackageJoinButton'

interface Package {
  id: string
  name: string
  priceFrom: number | string // reais (Decimal da API)
  difficulty: string
  durationMinutes: number
  coverImageUrl: string | null
  tenantSlug: string | null
}

const DIFFICULTIES = new Set(['EASY', 'MODERATE', 'HARD'])

/** Todos os roteiros publicados na home: carrossel com snap no mobile, grade a partir de 1024px. */
export default function PackagesSection({ packages }: { packages: Package[] }) {
  if (packages.length === 0) return null

  return (
    <section
      className="capi-section"
      aria-labelledby="home-roteiros-title"
      style={{ background: 'var(--bg-subtle)' }}
    >
      <div className="capi-container">
        <div
          className="flex flex-wrap items-end justify-between gap-4"
          style={{ marginBottom: 'var(--space-6)' }}
        >
          <div>
            <p
              style={{ marginBottom: 'var(--space-2)' }}
              className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-primary"
            >
              Roteiros
            </p>
            <h2
              id="home-roteiros-title"
              className="font-[family-name:var(--font-display)] text-[clamp(28px,4vw,44px)] font-bold leading-tight text-fg"
            >
              Sua próxima aventura começa aqui
            </h2>
          </div>
          <Button href="/destinos" variant="ghost" iconRight={ArrowRight}>
            Ver destinos
          </Button>
        </div>

        <div className="capi-scroller" role="region" aria-label="Roteiros disponíveis">
          {packages.map((p) => (
            <div key={p.id}>
              <PackageCard
                href={p.tenantSlug ? `/${p.tenantSlug}/roteiros/${p.id}` : '/explorar'}
                package={{
                  name: p.name,
                  durationMinutes: p.durationMinutes,
                  priceFrom: Math.round(Number(p.priceFrom) * 100),
                  difficulty: DIFFICULTIES.has(p.difficulty)
                    ? (p.difficulty as 'EASY' | 'MODERATE' | 'HARD')
                    : null,
                  coverImageUrl: p.coverImageUrl,
                }}
              />
              <PackageJoinButton packageId={p.id} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
