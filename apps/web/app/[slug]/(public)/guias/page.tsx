import { Users } from 'lucide-react'
import GuideCard from '@/src/components/ui/GuideCard'
import { Alert, EmptyState } from '@/src/components/ui/capi'

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

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

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
      <section className="bg-surface-brand">
        <div className="capi-container capi-section text-center">
          <p
            className="m-0 mb-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-on-brand-secondary)' }}
          >
            Condutores credenciados
          </p>
          <h1 className="font-display m-0 mb-4 text-4xl md:text-5xl" style={{ color: 'var(--text-on-brand)' }}>
            Guias disponíveis
          </h1>
          <p className="m-0 mx-auto max-w-md" style={{ color: 'var(--text-on-brand-secondary)' }}>
            Escolha um condutor e explore os roteiros disponíveis.
          </p>
        </div>
      </section>

      <div className="capi-container capi-section">
        {loadError ? (
          <Alert tone="danger" title="Não foi possível carregar os guias">
            Atualize a página em alguns instantes.
          </Alert>
        ) : guides.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum guia disponível"
            description="Esta operadora ainda não tem guias publicados neste momento."
          />
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))' }}
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
