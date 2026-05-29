import SlotPicker from '@/src/components/ui/SlotPicker'
import BackButton from '@/src/components/ui/BackButton'

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
}

interface Guide {
  id: string
  name: string
  photo?: string
  specialties?: string[]
  approvalStatus?: string
}

const DIFFICULTY: Record<string, { label: string; bg: string; text: string; border: string }> = {
  EASY:     { label: 'Fácil',     bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  MEDIUM:   { label: 'Moderado', bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  HARD:     { label: 'Difícil',  bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  FACIL:    { label: 'Fácil',     bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  MODERADO: { label: 'Moderado', bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  DIFICIL:  { label: 'Difícil',  bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
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
      <main
        style={{
          maxWidth: '600px',
          margin: '4rem auto',
          padding: '0 1.5rem',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display, serif)',
            fontSize: '1.5rem',
            color: '#1c1917',
            marginBottom: '0.75rem',
          }}
        >
          Roteiro não encontrado
        </h1>
        <p style={{ color: '#78716c', margin: '0 0 1.5rem' }}>
          Este roteiro pode ter sido removido ou o link está incorreto.
        </p>
        <a
          href={`/${slug}/roteiros`}
          style={{
            color: '#C4852A',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.95rem',
          }}
        >
          ← Ver todos os roteiros
        </a>
      </main>
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

  const diff = DIFFICULTY[pkg.difficulty] ?? {
    label: pkg.difficulty,
    bg: '#f5f5f4',
    text: '#78716c',
    border: '#e7e5e4',
  }

  const openSlots = (pkg.departureSlots ?? []).filter(
    (s) => s.status === 'OPEN' && s.booked < s.capacity
  )

  return (
    <main
      style={{
        maxWidth: '760px',
        margin: '0 auto',
        padding: 'clamp(1.5rem, 5vw, 3rem) clamp(1rem, 4vw, 2rem)',
      }}
    >
      <BackButton />
      {/* Breadcrumb */}
      <nav style={{ marginBottom: '1.5rem' }}>
        <a
          href={`/${slug}/roteiros`}
          style={{
            fontSize: '0.85rem',
            color: '#78716c',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Todos os roteiros
        </a>
      </nav>

      {/* Hero */}
      <header style={{ marginBottom: '2rem' }}>
        {/* Badges */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.875rem' }}>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              backgroundColor: diff.bg,
              color: diff.text,
              border: `1px solid ${diff.border}`,
              borderRadius: '999px',
              padding: '0.25rem 0.75rem',
            }}
          >
            {diff.label}
          </span>
          {pkg.duration && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 500,
                color: '#78716c',
                backgroundColor: '#f5f5f4',
                border: '1px solid #e7e5e4',
                borderRadius: '999px',
                padding: '0.25rem 0.75rem',
              }}
            >
              {formatDuration(pkg.duration)}
            </span>
          )}
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: 'var(--font-display, serif)',
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 700,
            color: '#1c1917',
            margin: '0 0 0.75rem',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}
        >
          {pkg.name}
        </h1>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem', marginBottom: '1rem' }}>
          <span
            style={{
              fontFamily: 'var(--font-display, serif)',
              fontSize: '2rem',
              fontWeight: 700,
              color: '#C4852A',
            }}
          >
            {formatPrice(pkg.price)}
          </span>
          <span style={{ fontSize: '0.875rem', color: '#a8a29e' }}>por pessoa</span>
        </div>

        {/* Description */}
        {pkg.description && (
          <p
            style={{
              margin: 0,
              fontSize: '1rem',
              color: '#44403c',
              lineHeight: 1.7,
            }}
          >
            {pkg.description}
          </p>
        )}
      </header>

      {/* Guide card */}
      {guide && (
        <a
          href={`/${slug}/guias/${guide.id}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem',
            padding: '0.875rem 1rem',
            backgroundColor: '#fafaf7',
            border: '1px solid #e7e5e4',
            borderRadius: '10px',
            textDecoration: 'none',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: '#e7e5e4',
              flexShrink: 0,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.125rem',
              color: '#78716c',
            }}
          >
            {guide.photo && /^https?:\/\//.test(guide.photo) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={guide.photo}
                alt={guide.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              guide.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#78716c' }}>Condutor</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#1c1917' }}>
                {guide.name}
              </p>
              {guide.approvalStatus === 'APPROVED' && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#15803d"
                  strokeWidth="2.5"
                  aria-label="Guia verificado"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </div>
          <svg
            style={{ marginLeft: 'auto', color: '#a8a29e' }}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </a>
      )}

      {/* Slot picker section */}
      <section>
        <h2
          style={{
            fontFamily: 'var(--font-display, serif)',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#1c1917',
            margin: '0 0 1rem',
          }}
        >
          Escolha uma data
        </h2>

        {openSlots.length === 0 ? (
          <div
            style={{
              padding: '1.5rem',
              backgroundColor: '#fafaf7',
              border: '1px solid #e7e5e4',
              borderRadius: '10px',
              textAlign: 'center',
              color: '#78716c',
              fontSize: '0.95rem',
            }}
          >
            Nenhuma data disponível no momento.
          </div>
        ) : (
          <SlotPicker
            slots={pkg.departureSlots ?? []}
            packageId={pkg.id}
            slug={slug}
          />
        )}
      </section>
    </main>
  )
}
