import { Map as MapIcon } from 'lucide-react'
import { EmptyState, PackageCard } from '@/src/components/ui/capi'

const API_URL = process.env.API_URL ?? 'http://localhost:3333'

interface Slot {
  id: string
  startsAt: string
  capacity: number
  booked: number
  status: string
}

interface TourPackage {
  id: string
  name: string
  description: string
  price: number
  duration: string
  difficulty: string
  conductorId: string
  departureSlots: Slot[]
  photos?: string[]
}

/** Normaliza a dificuldade vinda da API para o enum do StatusBadge (EASY | MODERATE | HARD). */
const DIFFICULTY_KEY: Record<string, 'EASY' | 'MODERATE' | 'HARD'> = {
  EASY: 'EASY',
  MEDIUM: 'MODERATE',
  MODERATE: 'MODERATE',
  HARD: 'HARD',
  FACIL: 'EASY',
  MODERADO: 'MODERATE',
  DIFICIL: 'HARD',
}

/** Preço em reais (Decimal da API) → centavos, formato esperado pelo PackageCard. */
function toCents(price: number | string) {
  return Math.round(Number(price) * 100)
}

function countOpenSlots(slots: Slot[]) {
  return slots.filter(s => s.status === 'OPEN' && s.booked < s.capacity).length
}

/** Duração cadastrada em horas no painel → minutos (PackageCard). */
function durationToMinutes(duration: string | number) {
  const h = parseInt(String(duration), 10)
  return isNaN(h) ? 0 : h * 60
}

export default async function RoteirosPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let packages: TourPackage[] = []
  try {
    const res = await fetch(`${API_URL}/tenants/${slug}/packages`, { next: { revalidate: 3600 } })
    if (res.ok) packages = await res.json()
  } catch {
    // fallback: empty list
  }

  return (
    <div className="capi-container capi-section">
      <header className="mb-8">
        <p className="m-0 mb-2 text-xs font-semibold uppercase tracking-widest text-fg-primary">
          Explorar
        </p>
        <h1 className="font-display m-0 mb-2 text-3xl md:text-4xl">Roteiros disponíveis</h1>
        <p className="m-0 text-fg-secondary">
          {packages.length === 0
            ? 'Nenhum roteiro cadastrado ainda.'
            : `${packages.length} roteiro${packages.length !== 1 ? 's' : ''} encontrado${packages.length !== 1 ? 's' : ''}`}
        </p>
      </header>

      {packages.length === 0 ? (
        <EmptyState
          icon={MapIcon}
          title="Em breve novos roteiros"
          description="Esta operadora ainda não publicou roteiros. Volte em alguns dias."
        />
      ) : (
        <div className="capi-grid-cards">
          {packages.map((pkg) => {
            const openSlots = countOpenSlots(pkg.departureSlots ?? [])
            return (
              <PackageCard
                key={pkg.id}
                href={`/${slug}/roteiros/${pkg.id}`}
                package={{
                  name: pkg.name,
                  durationMinutes: durationToMinutes(pkg.duration),
                  priceFrom: toCents(pkg.price),
                  difficulty: DIFFICULTY_KEY[pkg.difficulty] ?? null,
                  coverImageUrl: pkg.photos?.[0] ?? null,
                  tags: [
                    openSlots > 0
                      ? `${openSlots} data${openSlots !== 1 ? 's' : ''} disponíve${openSlots !== 1 ? 'is' : 'l'}`
                      : 'Sem vagas',
                  ],
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
