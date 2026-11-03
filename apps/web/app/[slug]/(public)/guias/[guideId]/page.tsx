import { ArrowLeft, BadgeCheck, Clock, Map as MapIcon, MapPin, UserX } from 'lucide-react'
import SlotPicker from '@/src/components/ui/SlotPicker'
import { Avatar, Badge, Button, EmptyState, StatusBadge } from '@/src/components/ui/capi'

const API_URL = process.env.API_URL ?? 'http://localhost:3333'

interface GuideData {
  id: string
  bio: string | null
  photoUrl: string | null
  especialidades: string[]
  regioes: string[]
  portfolioPhotos: string[]
  user: { id: string; name: string; approvalStatus: string }
}

interface DepartureSlot {
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
  duration: number
  price: number | string
  difficulty: string
  departureSlots: DepartureSlot[]
}

/** Normaliza a dificuldade vinda da API para o enum do StatusBadge. */
const DIFFICULTY_KEY: Record<string, 'EASY' | 'MODERATE' | 'HARD'> = {
  EASY: 'EASY',
  MEDIUM: 'MODERATE',
  MODERATE: 'MODERATE',
  HARD: 'HARD',
}

function formatPriceBRL(price: number | string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(price))
}

export default async function GuideProfilePage({
  params,
}: {
  params: Promise<{ slug: string; guideId: string }>
}) {
  const { slug, guideId } = await params

  let guide: GuideData | null = null
  let packages: TourPackage[] = []
  let loadError = false

  try {
    const [guideRes, pkgRes] = await Promise.all([
      fetch(`${API_URL}/tenants/${slug}/guides/${guideId}`, { cache: 'no-store' }),
      fetch(`${API_URL}/tenants/${slug}/packages?conductorId=${guideId}`, { cache: 'no-store' }),
    ])

    if (guideRes.ok) {
      const data = await guideRes.json()
      guide = data.guide ?? data
    } else {
      loadError = true
    }

    if (pkgRes.ok) {
      const data = await pkgRes.json()
      packages = Array.isArray(data) ? data : (data.packages ?? [])
    }
  } catch {
    loadError = true
  }

  if (loadError || !guide) {
    return (
      <div className="capi-container capi-container--text capi-section">
        <EmptyState
          icon={UserX}
          title="Guia não encontrado"
          description="Este perfil pode ter sido removido ou o link está incorreto."
          action={
            <Button href={`/${slug}/guias`} variant="secondary" iconLeft={ArrowLeft}>
              Ver todos os guias
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="capi-container capi-container--content py-8 md:py-12">
      {/* Cabeçalho do guia */}
      <header className="mb-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <Avatar
          name={guide.user.name}
          src={guide.photoUrl}
          size={96}
          verified={guide.user.approvalStatus === 'APPROVED'}
        />
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="font-display m-0 text-3xl">{guide.user.name}</h1>
            {guide.user.approvalStatus === 'APPROVED' && (
              <Badge tone="success" icon={BadgeCheck}>
                Verificado
              </Badge>
            )}
          </div>

          {guide.especialidades.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {guide.especialidades.map((esp) => (
                <Badge key={esp} tone="brand">
                  {esp}
                </Badge>
              ))}
            </div>
          )}

          {guide.regioes.length > 0 && (
            <p className="m-0 inline-flex items-center gap-1.5 text-sm text-fg-secondary">
              <MapPin size={16} strokeWidth={1.75} aria-hidden="true" />
              Regiões: {guide.regioes.join(', ')}
            </p>
          )}
        </div>
      </header>

      {guide.bio && (
        <section className="mb-10">
          <h2 className="m-0 mb-3 text-lg">Sobre o guia</h2>
          <p className="m-0 leading-relaxed text-fg-secondary">{guide.bio}</p>
        </section>
      )}

      {/* Roteiros */}
      <section>
        <h2 className="font-display m-0 mb-6 text-2xl">Roteiros disponíveis</h2>

        {packages.length === 0 ? (
          <EmptyState
            compact
            icon={MapIcon}
            title="Nenhum roteiro disponível no momento"
            description="Volte em breve para ver as próximas saídas deste guia."
          />
        ) : (
          <div className="flex flex-col gap-6">
            {packages.map((pkg) => {
              const openSlots = (pkg.departureSlots ?? []).filter(
                (s) => s.status === 'OPEN' && s.booked < s.capacity
              )
              const difficulty = DIFFICULTY_KEY[pkg.difficulty]
              return (
                <article
                  key={pkg.id}
                  className="rounded-2xl border border-line bg-surface p-5 md:p-6"
                  style={{ boxShadow: 'var(--shadow-xs)' }}
                >
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <h3 className="m-0 text-lg">
                      <a href={`/${slug}/roteiros/${pkg.id}`} className="text-fg no-underline hover:underline">
                        {pkg.name}
                      </a>
                    </h3>
                    <p className="m-0 shrink-0 text-right">
                      <strong className="text-lg text-fg">{formatPriceBRL(pkg.price)}</strong>
                      <span className="text-xs text-fg-secondary"> /pessoa</span>
                    </p>
                  </div>

                  <p className="m-0 mb-3 text-sm leading-relaxed text-fg-secondary">{pkg.description}</p>

                  <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-fg-secondary">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={16} strokeWidth={1.75} aria-hidden="true" />
                      {pkg.duration}h de duração
                    </span>
                    {difficulty ? (
                      <StatusBadge kind="difficulty" status={difficulty} />
                    ) : (
                      <Badge>{pkg.difficulty}</Badge>
                    )}
                  </div>

                  {openSlots.length > 0 ? (
                    <SlotPicker slots={openSlots} packageId={pkg.id} slug={slug} />
                  ) : (
                    <p className="m-0 text-sm text-fg-secondary">Nenhuma data disponível no momento.</p>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
