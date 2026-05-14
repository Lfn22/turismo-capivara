import GuideCard from '@/src/components/ui/GuideCard'

interface ApiGuide {
  id: string
  bio: string | null
  photoUrl: string | null
  especialidades: string[]
  regioes: string[]
  user: {
    id: string
    name: string
  }
}

const API_URL = process.env.API_URL ?? 'http://localhost:3001'

export default async function GuiasPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let guides: ApiGuide[] = []
  let loadError = false

  try {
    const res = await fetch(`${API_URL}/tenants/${slug}/guides`, {
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json()
      guides = Array.isArray(data) ? data : (data.guides ?? [])
    } else {
      loadError = true
    }
  } catch {
    loadError = true
  }

  return (
    <div>
      {/* Hero */}
      <div
        style={{
          backgroundColor: '#1c1917',
          padding: '4rem 1.5rem',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: '11px',
            color: '#d97706',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
          }}
        >
          Condutores credenciados
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-display, serif)',
            fontSize: 'clamp(32px, 5vw, 56px)',
            color: '#ffffff',
            margin: '0 0 1rem',
            lineHeight: 1.1,
          }}
        >
          Guias disponíveis
        </h1>
        <p
          style={{
            fontSize: '16px',
            color: '#a8a29e',
            margin: '0 auto',
            maxWidth: '480px',
          }}
        >
          Escolha um condutor e explore os roteiros disponíveis.
        </p>
      </div>

      {/* Guide grid */}
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '2.5rem 1.5rem',
        }}
      >
        {loadError ? (
          <p style={{ color: '#78716c', fontSize: '1rem', textAlign: 'center' }}>
            Erro ao carregar guias. Tente novamente.
          </p>
        ) : guides.length === 0 ? (
          <p style={{ color: '#78716c', fontSize: '1rem', textAlign: 'center' }}>
            Nenhum guia disponível neste momento.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
            }}
          >
            {guides.map((guide) => (
              <GuideCard
                key={guide.id}
                href={`/${slug}/guias/${guide.id}`}
                guide={{
                  id: guide.id,
                  name: guide.user.name,
                  photoUrl: guide.photoUrl ?? null,
                  specialties: guide.especialidades,
                  packageCount: 0,
                }}
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
