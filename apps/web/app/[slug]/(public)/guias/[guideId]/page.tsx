import SlotPicker from '@/src/components/ui/SlotPicker'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'

interface GuideData {
  id: string
  bio: string | null
  photoUrl: string | null
  especialidades: string[]
  regioes: string[]
  portfolioPhotos: string[]
  user: { id: string; name: string }
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

const difficultyLabel: Record<string, string> = {
  EASY: 'Fácil',
  MODERATE: 'Moderada',
  HARD: 'Difícil',
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
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem', textAlign: 'center' }}>
        <p style={{ color: '#78716c', fontSize: '1rem' }}>Guia não encontrado.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      {/* Guide header */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
        <div
          style={{
            width: '96px',
            height: '96px',
            borderRadius: '50%',
            backgroundColor: '#f5f5f4',
            flexShrink: 0,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {guide.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={guide.photoUrl}
              alt={guide.user.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a8a29e"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          )}
        </div>

        <div>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 700, color: '#1c1917' }}>
            {guide.user.name}
          </h1>

          {guide.especialidades.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
              {guide.especialidades.map((esp) => (
                <span
                  key={esp}
                  style={{
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                  }}
                >
                  {esp}
                </span>
              ))}
            </div>
          )}

          {guide.regioes.length > 0 && (
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#78716c' }}>
              Regiões: {guide.regioes.join(', ')}
            </p>
          )}
        </div>
      </div>

      {guide.bio && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 600, color: '#1c1917' }}>
            Sobre o guia
          </h2>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#44403c', lineHeight: 1.7 }}>{guide.bio}</p>
        </div>
      )}

      {/* Packages */}
      <div>
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.125rem', fontWeight: 700, color: '#1c1917' }}>
          Roteiros disponíveis
        </h2>

        {packages.length === 0 ? (
          <p style={{ color: '#78716c', fontSize: '0.95rem' }}>
            Nenhum roteiro disponível no momento.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {packages.map((pkg) => {
              const openSlots = (pkg.departureSlots ?? []).filter(
                (s) => s.status === 'OPEN' && s.booked < s.capacity
              )
              return (
                <div
                  key={pkg.id}
                  style={{
                    border: '1px solid #e7e5e4',
                    borderRadius: '12px',
                    padding: '1.25rem 1.5rem',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '0.5rem',
                      gap: '1rem',
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1c1917' }}>
                      {pkg.name}
                    </h3>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#d97706', flexShrink: 0 }}>
                      R$ {Number(pkg.price).toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#78716c', lineHeight: 1.6 }}>
                    {pkg.description}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      marginBottom: '1rem',
                      fontSize: '0.8rem',
                      color: '#a8a29e',
                    }}
                  >
                    <span>{pkg.duration}h de duração</span>
                    <span>Dificuldade: {difficultyLabel[pkg.difficulty] ?? pkg.difficulty}</span>
                  </div>

                  {openSlots.length > 0 ? (
                    <>
                      <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 600, color: '#44403c' }}>
                        Datas disponíveis:
                      </p>
                      <SlotPicker slots={openSlots} packageId={pkg.id} slug={slug} />
                    </>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#78716c' }}>
                      Nenhuma data disponível no momento.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
