import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

const API_URL = process.env.API_URL ?? 'http://localhost:3333'

interface Destination {
  id: string
  slug: string
  title: string
  state: string
}

interface Guide {
  id: string
  name: string
  photoUrl: string | null
  specialties: string[]
}

interface DestinationWithGuides extends Destination {
  guides: Guide[]
}

async function fetchExperiences(): Promise<DestinationWithGuides[] | null> {
  try {
    const res = await fetch(`${API_URL}/destinations`, { cache: 'no-store' })
    if (!res.ok) return null
    const destinations: Destination[] = await res.json()

    const results = await Promise.all(
      destinations.map(async (d) => {
        try {
          const gr = await fetch(`${API_URL}/destinations/${d.slug}/guides`, { cache: 'no-store' })
          const guides: Guide[] = gr.ok ? await gr.json() : []
          return { ...d, guides }
        } catch {
          return { ...d, guides: [] }
        }
      })
    )

    return results.filter((d) => d.guides.length > 0)
  } catch {
    return null
  }
}

export const metadata: Metadata = {
  title: 'Explorar',
  description: 'Descubra guias e experiências únicas em destinos brasileiros preservados.',
}

export default async function ExplorarPage() {
  const destinations = await fetchExperiences()

  return (
    <>
      <style>{`
        .explorar { min-height: 100dvh; background: var(--stone-50, #fafaf9); }

        .explorar__header {
          background: var(--stone-900, #1c1917);
          color: #fff;
          padding: clamp(64px, 10vw, 96px) clamp(16px, 5vw, 64px) clamp(40px, 6vw, 56px);
        }
        .explorar__eyebrow {
          font-size: 11px; font-weight: 600; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--ochre, #c2783c); margin: 0 0 12px;
        }
        .explorar__title {
          font-family: var(--font-display, Georgia, serif);
          font-size: clamp(32px, 5vw, 52px); font-weight: 700; line-height: 1.1;
          margin: 0 0 12px; color: #fff;
        }
        .explorar__subtitle {
          font-size: 16px; color: var(--stone-400, #a8a29e); margin: 0; max-width: 480px;
        }

        .explorar__body {
          max-width: 1280px; margin: 0 auto;
          padding: clamp(32px, 5vw, 56px) clamp(16px, 5vw, 64px);
        }

        .explorar__section { margin-bottom: 48px; }
        .explorar__section-header { margin-bottom: 20px; }
        .explorar__section-title {
          font-family: var(--font-display, Georgia, serif);
          font-size: clamp(20px, 3vw, 26px); color: var(--stone-900, #1c1917); margin: 0 0 4px;
        }
        .explorar__section-sub {
          font-size: 14px; color: var(--stone-500, #78716c); margin: 0;
        }

        .explorar__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }

        .explorar__card {
          background: white; border: 1px solid var(--stone-200, #e7e5e4);
          border-radius: 8px; overflow: hidden; text-decoration: none;
          display: block; transition: box-shadow 0.15s;
        }
        .explorar__card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }

        .explorar__photo {
          width: 100%; aspect-ratio: 1 / 1; object-fit: cover;
          background: var(--stone-100, #f5f5f4);
        }
        .explorar__photo-placeholder {
          width: 100%; aspect-ratio: 1 / 1;
          background: var(--stone-100, #f5f5f4);
          display: flex; align-items: center; justify-content: center;
          font-size: 36px;
        }
        .explorar__card-body { padding: 14px 16px; }
        .explorar__guide-name {
          font-size: 15px; font-weight: 600; color: var(--stone-900, #1c1917);
          margin: 0 0 6px; line-height: 1.3;
        }
        .explorar__specialties {
          font-size: 12px; color: var(--stone-500, #78716c); margin: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .explorar__empty {
          text-align: center; padding: clamp(48px, 10vw, 96px) 16px;
          color: var(--stone-500, #78716c);
        }
        .explorar__empty-title {
          font-family: var(--font-display, Georgia, serif);
          font-size: clamp(22px, 4vw, 28px); color: var(--stone-700, #44403c); margin: 0 0 8px;
        }
        .explorar__empty-sub { font-size: 15px; margin: 0; }

        @media (max-width: 480px) {
          .explorar__grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="explorar">
        <header className="explorar__header">
          <Link href="/" style={{ display: 'inline-block', marginBottom: '1rem' }}>
            <Image
              src="/images/logo.png"
              alt="CAPI"
              width={90}
              height={81}
              style={{ filter: 'brightness(0) invert(1)', display: 'block' }}
            />
          </Link>
          <p className="explorar__eyebrow">Experiências</p>
          <h1 className="explorar__title">Conheça os guias</h1>
          <p className="explorar__subtitle">
            Guias certificados com roteiros únicos. Escolha seu destino e encontre a experiência certa.
          </p>
        </header>

        <main className="explorar__body">
          {destinations === null ? (
            <div className="explorar__empty" role="status">
              <p className="explorar__empty-title">Erro ao carregar experiências</p>
              <p className="explorar__empty-sub">
                Não foi possível conectar ao servidor. Tente novamente em instantes.
              </p>
            </div>
          ) : destinations.length === 0 ? (
            <div className="explorar__empty" role="status">
              <p className="explorar__empty-title">Nenhum guia disponível ainda</p>
              <p className="explorar__empty-sub">Em breve novos guias serão adicionados.</p>
            </div>
          ) : (
            destinations.map((dest) => (
              <section key={dest.id} className="explorar__section">
                <div className="explorar__section-header">
                  <h2 className="explorar__section-title">{dest.title}</h2>
                  <p className="explorar__section-sub">{dest.state}</p>
                </div>
                <div className="explorar__grid">
                  {dest.guides.map((guide) => (
                    <Link
                      key={guide.id}
                      href={`/destinos/${dest.slug}/guias/${guide.id}`}
                      className="explorar__card"
                    >
                      {guide.photoUrl ? (
                        <Image
                          src={guide.photoUrl}
                          alt={guide.name}
                          width={400}
                          height={400}
                          className="explorar__photo"
                        />
                      ) : (
                        <div className="explorar__photo-placeholder" aria-hidden>🧭</div>
                      )}
                      <div className="explorar__card-body">
                        <p className="explorar__guide-name">{guide.name}</p>
                        {guide.specialties?.length > 0 && (
                          <p className="explorar__specialties">
                            {guide.specialties.join(' · ')}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))
          )}
        </main>
      </div>
    </>
  )
}
