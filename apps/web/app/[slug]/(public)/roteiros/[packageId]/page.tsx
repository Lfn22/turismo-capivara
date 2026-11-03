import { ArrowLeft, CalendarX, Check, Clock, SearchX } from 'lucide-react'
import SlotPicker from '@/src/components/ui/SlotPicker'
import {
  Avatar,
  Badge,
  BookingBar,
  BookingSummary,
  Button,
  EmptyState,
  ListGroup,
  ListRow,
  StatusBadge,
} from '@/src/components/ui/capi'

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
  highlights?: string[]
}

interface Guide {
  id: string
  name: string
  photo?: string
  specialties?: string[]
  approvalStatus?: string
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

function formatPrice(price: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)
}

function formatDuration(duration: string) {
  if (!duration) return ''
  const h = parseInt(duration)
  if (!isNaN(h)) return `${h} hora${h !== 1 ? 's' : ''}`
  return duration
}

export default async function RoteirDetalhe({
  params,
}: {
  params: Promise<{ slug: string; packageId: string }>
}) {
  const { slug, packageId } = await params

  let pkg: TourPackage | null = null
  let guide: Guide | null = null

  try {
    const res = await fetch(`${API_URL}/tenants/${slug}/packages/${packageId}`, {
      next: { revalidate: 300 },
    })
    if (res.ok) pkg = await res.json()
  } catch {
    // not found
  }

  if (!pkg) {
    return (
      <div className="capi-container capi-container--text capi-section">
        <EmptyState
          icon={SearchX}
          title="Roteiro não encontrado"
          description="Este roteiro pode ter sido removido ou o link está incorreto."
          action={
            <Button href={`/${slug}/roteiros`} variant="secondary" iconLeft={ArrowLeft}>
              Ver todos os roteiros
            </Button>
          }
        />
      </div>
    )
  }

  // Try to fetch guide info
  if (pkg.conductorId) {
    try {
      const res = await fetch(
        `${API_URL}/tenants/${slug}/guides/${pkg.conductorId}`,
        { next: { revalidate: 300 } }
      )
      if (res.ok) guide = await res.json()
    } catch {
      // guide info optional
    }
  }

  const difficulty = DIFFICULTY_KEY[pkg.difficulty]

  const openSlots = (pkg.departureSlots ?? []).filter(
    (s) => s.status === 'OPEN' && s.booked < s.capacity
  )
  const hasSlots = openSlots.length > 0

  return (
    <div className={hasSlots ? 'capi-has-bottombar capi-has-bottombar--book' : undefined}>
      <div className="capi-container py-6 md:py-10">
        <Button href={`/${slug}/roteiros`} variant="ghost" size="sm" iconLeft={ArrowLeft} className="mb-4">
          Todos os roteiros
        </Button>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          {/* Conteúdo */}
          <div className="min-w-0">
            {/* Galeria: carrossel no mobile, grade no desktop */}
            {pkg.photos && pkg.photos.length > 0 && (
              <div className="capi-scroller mb-8" aria-label="Fotos do roteiro">
                {pkg.photos.map((photoUrl, idx) => (
                  <div
                    key={idx}
                    className="overflow-hidden bg-muted"
                    style={{ aspectRatio: '4 / 3', borderRadius: 'var(--radius-lg)' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrl}
                      alt={`Foto ${idx + 1} do roteiro ${pkg.name}`}
                      className="block h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            <header className="mb-8">
              <div className="mb-3 flex flex-wrap gap-2">
                {difficulty ? (
                  <StatusBadge kind="difficulty" status={difficulty} />
                ) : (
                  <Badge>{pkg.difficulty}</Badge>
                )}
                {pkg.duration && (
                  <Badge icon={Clock}>{formatDuration(pkg.duration)}</Badge>
                )}
              </div>

              <h1 className="font-display m-0 mb-3 text-3xl md:text-4xl">{pkg.name}</h1>

              <p className="m-0 mb-4 lg:hidden">
                <span className="text-sm text-fg-secondary">a partir de </span>
                <strong className="text-2xl text-fg">{formatPrice(pkg.price)}</strong>
                <span className="text-sm text-fg-secondary"> /pessoa</span>
              </p>

              {pkg.description && (
                <p className="m-0 leading-relaxed text-fg-secondary">{pkg.description}</p>
              )}
            </header>

            {/* Guia */}
            {guide && (
              <section className="mb-8">
                <h2 className="m-0 mb-3 text-lg">Seu condutor</h2>
                <ListGroup>
                  <ListRow
                    href={`/${slug}/guias/${guide.id}`}
                    leading={
                      <Avatar
                        name={guide.name}
                        src={guide.photo && /^https?:\/\//.test(guide.photo) ? guide.photo : null}
                        size={48}
                        verified={guide.approvalStatus === 'APPROVED'}
                      />
                    }
                    title={guide.name}
                    subtitle={guide.approvalStatus === 'APPROVED' ? 'Condutor verificado' : 'Condutor'}
                  />
                </ListGroup>
              </section>
            )}

            {/* Experiências incluídas */}
            {pkg.highlights && pkg.highlights.length > 0 && (
              <section className="mb-8">
                <h2 className="font-display m-0 mb-4 text-2xl">Experiências incluídas</h2>
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {pkg.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-fg">
                      <span className="mt-0.5 inline-flex shrink-0 text-success">
                        <Check size={18} strokeWidth={2} aria-hidden="true" />
                      </span>
                      <span className="leading-relaxed">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Reserva: abaixo do conteúdo no mobile, coluna sticky no desktop */}
          <section id="datas" aria-label="Datas e reserva" className="scroll-mt-24 lg:sticky lg:top-24">
            <BookingSummary
              title={pkg.name}
              subtitle={
                <>
                  a partir de <strong className="text-fg">{formatPrice(pkg.price)}</strong> /pessoa
                </>
              }
              details={[
                ...(pkg.duration ? [{ label: 'Duração', value: formatDuration(pkg.duration) }] : []),
                { label: 'Datas abertas', value: String(openSlots.length) },
              ]}
              action={
                hasSlots ? (
                  <SlotPicker slots={pkg.departureSlots ?? []} packageId={pkg.id} slug={slug} />
                ) : (
                  <EmptyState
                    compact
                    icon={CalendarX}
                    title="Nenhuma data disponível"
                    description="Novas saídas aparecem aqui assim que forem abertas."
                  />
                )
              }
              note={hasSlots ? 'Pagamento seguro via PIX' : undefined}
            />
          </section>
        </div>
      </div>

      {hasSlots && (
        <BookingBar price={formatPrice(pkg.price)} href="#datas" ctaLabel="Ver datas" />
      )}
    </div>
  )
}
