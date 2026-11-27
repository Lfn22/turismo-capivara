import Image from 'next/image'
import { ArrowLeft, CalendarX, Check, Clock, SearchX, Users } from 'lucide-react'
import PackageMembershipButton from '@/src/components/membership/PackageMembershipButton'
import GuideCard, { type GuideCardGuide } from '@/src/components/ui/GuideCard'
import { TrackView } from '@/src/components/tracking/TrackView'
import { PackageEditSection } from '@/src/components/edit-mode/PackageEditControls'
import SlotPicker from '@/src/components/ui/SlotPicker'
import { LeadForm } from '@/src/components/leads/LeadForm'
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
  available: boolean
  maxPax: number
}

interface TourPackage {
  id: string
  name: string
  description: string
  price: number
  extraGuidePrice?: number | null
  duration: string
  difficulty: string
  conductorId: string
  capacity: number
  departureSlots: Slot[]
  photos?: string[]
  highlights?: string[]
}

interface ApiGuide {
  guideId: string
  userId: string
  name: string
  photoUrl: string | null
  especialidades: string[]
}

async function fetchPackageGuides(id: string): Promise<ApiGuide[]> {
  try {
    const res = await fetch(`${API_URL}/packages/${id}/guides`, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const raw: ApiGuide[] = await res.json()
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function toGuideCard(g: ApiGuide): GuideCardGuide {
  return {
    id: g.guideId,
    name: g.name,
    photoUrl: g.photoUrl ?? null,
    specialties: g.especialidades ?? [],
    packageCount: 0,
    rating: null,
    reviewCount: null,
  }
}

async function fetchDestinationSlug(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/tenants/${slug}/destination`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    const data = await res.json()
    return typeof data?.slug === 'string' ? data.slug : null
  } catch {
    return null
  }
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

  const difficulty = DIFFICULTY_KEY[pkg.difficulty]

  const [packageGuides, destinationSlug] = await Promise.all([
    fetchPackageGuides(packageId),
    fetchDestinationSlug(slug),
  ])
  const guides = packageGuides.map(toGuideCard)

  // Condutor = guia aceito cujo User.id é o conductorId (a lista só tem guias aprovados).
  // Antes buscava /guides/{User.id}, rota que espera o GuideProfile.id → sempre 404.
  const conductor = pkg.conductorId
    ? packageGuides.find((g) => g.userId === pkg.conductorId)
    : undefined
  const guide: Guide | null = conductor
    ? {
        id: conductor.guideId,
        name: conductor.name,
        photo: conductor.photoUrl ?? undefined,
        approvalStatus: 'APPROVED',
      }
    : null

  const openSlots = (pkg.departureSlots ?? []).filter((s) => s.available)
  const hasSlots = openSlots.length > 0

  return (
    <div className={hasSlots ? 'capi-has-bottombar capi-has-bottombar--book' : undefined}>
      <TrackView event="package_viewed" properties={{ packageId, destinationSlug }} />
      <div className="capi-container py-6 md:py-10">
        <Button
          href={`/${slug}/roteiros`}
          variant="ghost"
          size="sm"
          iconLeft={ArrowLeft}
          className="mb-4"
        >
          Todos os roteiros
        </Button>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          {/* Conteúdo */}
          <div className="min-w-0">
            <PackageEditSection
              conductorId={pkg.conductorId ?? null}
              destinationSlug={destinationSlug}
              pkg={{
                id: pkg.id,
                tenantSlug: slug,
                name: pkg.name,
                description: pkg.description,
                price: Number(pkg.price),
                extraGuidePrice: pkg.extraGuidePrice ?? null,
                duration: parseInt(pkg.duration) || 1,
                difficulty: difficulty ?? 'EASY',
                photos: pkg.photos ?? [],
                highlights: pkg.highlights ?? [],
                status: 'PUBLISHED',
              }}
            >
              <div className="min-w-0">
                {/* Galeria: carrossel no mobile, grade no desktop */}
                {pkg.photos && pkg.photos.length > 0 && (
                  <div className="capi-scroller mb-8" aria-label="Fotos do roteiro">
                    {pkg.photos.map((photoUrl, idx) => (
                      <div
                        key={idx}
                        className="relative overflow-hidden bg-muted"
                        style={{ aspectRatio: '4 / 3', borderRadius: 'var(--radius-lg)' }}
                      >
                        <Image
                          src={photoUrl}
                          alt={`Foto ${idx + 1} do roteiro ${pkg.name}`}
                          fill
                          className="object-cover"
                          sizes="(min-width: 768px) 50vw, 100vw"
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
                    {pkg.duration && <Badge icon={Clock}>{formatDuration(pkg.duration)}</Badge>}
                  </div>

                  <h1 className="font-display m-0 mb-3 text-3xl md:text-4xl">{pkg.name}</h1>

                  <div className="mb-4">
                    <PackageMembershipButton packageId={pkg.id} />
                  </div>

                  <p className="m-0 mb-4 lg:hidden">
                    <span className="text-sm text-fg-secondary">a partir de </span>
                    <strong className="text-2xl text-fg">{formatPrice(pkg.price)}</strong>
                    <span className="text-sm text-fg-secondary">
                      {' '}
                      por grupo · até 8 pessoas por guia
                    </span>
                    {pkg.extraGuidePrice != null && (
                      <span className="block text-sm text-fg-secondary">
                        + {formatPrice(pkg.extraGuidePrice)} por guia extra (grupos acima de 8)
                      </span>
                    )}
                  </p>

                  {pkg.description && (
                    <p className="m-0 leading-relaxed text-fg-secondary">{pkg.description}</p>
                  )}
                </header>

                {/* Guia */}
                {guide && (
                  <section className="mb-8">
                    <h2 className="m-0 mb-3 text-lg">Seu guia</h2>
                    <ListGroup>
                      <ListRow
                        href={`/${slug}/guias/${guide.id}`}
                        leading={
                          <Avatar
                            name={guide.name}
                            src={
                              guide.photo && /^https?:\/\//.test(guide.photo) ? guide.photo : null
                            }
                            size={48}
                            verified={guide.approvalStatus === 'APPROVED'}
                          />
                        }
                        title={guide.name}
                        subtitle={guide.approvalStatus === 'APPROVED' ? 'Guia verificado' : 'Guia'}
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
            </PackageEditSection>

            {/* Guias do roteiro */}
            <section id="guias" className="mb-8 scroll-mt-24" aria-labelledby="guias-heading">
              <h2 id="guias-heading" className="m-0 mb-3 text-lg">
                Guias deste roteiro
              </h2>
              {guides.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {guides.map((g) => (
                    <GuideCard
                      key={g.id}
                      guide={g}
                      href={
                        destinationSlug ? `/destinos/${destinationSlug}/guias/${g.id}` : '#guias'
                      }
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={Users}
                  title="Nenhum guia vinculado a este roteiro ainda"
                  description="Em breve guias estarão disponíveis para este roteiro."
                />
              )}
            </section>
          </div>

          {/* Reserva: abaixo do conteúdo no mobile, coluna sticky no desktop */}
          <section
            id="datas"
            aria-label="Datas e reserva"
            className="scroll-mt-24 lg:sticky lg:top-24"
          >
            <BookingSummary
              title={pkg.name}
              subtitle={
                <>
                  a partir de <strong className="text-fg">{formatPrice(pkg.price)}</strong> por
                  grupo
                  {pkg.extraGuidePrice != null && (
                    <> · + {formatPrice(pkg.extraGuidePrice)} por guia extra (grupos acima de 8)</>
                  )}
                </>
              }
              details={[
                ...(pkg.duration
                  ? [{ label: 'Duração', value: formatDuration(pkg.duration) }]
                  : []),
                { label: 'Datas abertas', value: String(openSlots.length) },
              ]}
              action={
                hasSlots ? (
                  <SlotPicker slots={pkg.departureSlots ?? []} packageId={pkg.id} slug={slug} />
                ) : destinationSlug ? (
                  <LeadForm
                    destinationSlug={destinationSlug}
                    packageId={pkg.id}
                    compact
                    heading="Me avise quando abrir data"
                  />
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

      {hasSlots && <BookingBar price={formatPrice(pkg.price)} href="#datas" ctaLabel="Ver datas" />}
    </div>
  )
}
