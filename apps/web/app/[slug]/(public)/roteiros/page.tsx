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

function countOpenSlots(slots: Slot[]) {
  return slots.filter(s => s.status === 'OPEN' && s.booked < s.capacity).length
}

function formatDuration(duration: string) {
  if (!duration) return ''
  const h = parseInt(duration)
  if (!isNaN(h)) return `${h}h`
  return duration
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
    <main
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: 'clamp(1.5rem, 5vw, 3rem) clamp(1rem, 4vw, 2rem)',
      }}
    >
      {/* Header */}
      <header style={{ marginBottom: '2rem' }}>
        <p
          style={{
            margin: '0 0 0.375rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#C4852A',
          }}
        >
          Explorar
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-display, serif)',
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 700,
            color: '#1c1917',
            margin: '0 0 0.5rem',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
          }}
        >
          Roteiros disponíveis
        </h1>
        <p style={{ margin: 0, color: '#78716c', fontSize: '0.95rem' }}>
          {packages.length === 0
            ? 'Nenhum roteiro cadastrado ainda.'
            : `${packages.length} roteiro${packages.length !== 1 ? 's' : ''} encontrado${packages.length !== 1 ? 's' : ''}`}
        </p>
      </header>

      {/* Grid */}
      {packages.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '5rem 1rem',
            color: '#a8a29e',
            border: '1px dashed #e7e5e4',
            borderRadius: '12px',
          }}
        >
          <p style={{ fontSize: '1rem', margin: 0 }}>Em breve novos roteiros.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
            gap: '1.25rem',
          }}
        >
          {packages.map((pkg) => {
            const openSlots = countOpenSlots(pkg.departureSlots ?? [])
            const diff = DIFFICULTY[pkg.difficulty] ?? {
              label: pkg.difficulty,
              bg: '#f5f5f4',
              text: '#78716c',
              border: '#e7e5e4',
            }

            return (
              <a
                key={pkg.id}
                href={`/${slug}/roteiros/${pkg.id}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  textDecoration: 'none',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e7e5e4',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s, transform 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'
                  ;(e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none'
                  ;(e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)'
                }}
              >
                {/* Card top accent */}
                <div style={{ height: '4px', backgroundColor: '#C4852A' }} />

                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Badges row */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
                        padding: '0.2rem 0.6rem',
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
                          padding: '0.2rem 0.6rem',
                        }}
                      >
                        {formatDuration(pkg.duration)}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <h2
                    style={{
                      fontFamily: 'var(--font-display, serif)',
                      margin: 0,
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      color: '#1c1917',
                      lineHeight: 1.3,
                    }}
                  >
                    {pkg.name}
                  </h2>

                  {/* Description */}
                  {pkg.description && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        color: '#78716c',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {pkg.description}
                    </p>
                  )}

                  {/* Footer */}
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid #f5f5f4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 700,
                          color: '#C4852A',
                          fontFamily: 'var(--font-display, serif)',
                        }}
                      >
                        {formatPrice(pkg.price)}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#a8a29e', marginLeft: '0.25rem' }}>
                        /pessoa
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: openSlots > 0 ? '#166534' : '#991b1b',
                        backgroundColor: openSlots > 0 ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${openSlots > 0 ? '#bbf7d0' : '#fecaca'}`,
                        borderRadius: '999px',
                        padding: '0.2rem 0.6rem',
                      }}
                    >
                      {openSlots > 0 ? `${openSlots} data${openSlots !== 1 ? 's' : ''}` : 'Sem vagas'}
                    </span>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </main>
  )
}
