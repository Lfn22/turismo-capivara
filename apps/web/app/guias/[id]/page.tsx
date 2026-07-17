import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

const API_URL = process.env.API_URL ?? 'http://localhost:3333'

interface GuideProfile {
  id: string
  name: string
  bio: string | null
  photoUrl: string | null
  specialties: string[]
  regions: string[]
  portfolioPhotos: string[]
}

async function fetchGuide(id: string): Promise<GuideProfile | null> {
  try {
    const res = await fetch(`${API_URL}/guides/${id}`, { cache: 'no-store' })
    if (res.status === 404) return null
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const guide = await fetchGuide(id)
  if (!guide) return { title: 'Guia não encontrado' }
  return {
    title: guide.name,
    description: guide.bio ?? `Conheça o guia ${guide.name} na plataforma CAPI.`,
  }
}

export default async function GuiaProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guide = await fetchGuide(id)
  if (!guide) notFound()

  return (
    <>
      <style>{`
        .guia { min-height: 100dvh; background: var(--stone-50, #fafaf9); }

        .guia__header {
          background: var(--stone-900, #1c1917);
          color: #fff;
          padding: clamp(48px, 8vw, 80px) clamp(16px, 5vw, 64px) clamp(32px, 5vw, 48px);
        }
        .guia__back {
          display: inline-block;
          font-size: 13px;
          font-weight: 600;
          color: var(--stone-400, #a8a29e);
          text-decoration: none;
          margin-bottom: 24px;
          letter-spacing: 0.04em;
        }
        .guia__back:hover { color: #fff; }

        .guia__identity {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .guia__avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          background: var(--stone-700, #44403c);
          flex-shrink: 0;
        }
        .guia__avatar-placeholder {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--stone-700, #44403c);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          flex-shrink: 0;
        }
        .guia__name {
          font-family: var(--font-display, Georgia, serif);
          font-size: clamp(26px, 4vw, 36px);
          font-weight: 400;
          margin: 0 0 6px;
          color: #fff;
        }
        .guia__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }
        .guia__tag {
          font-size: 12px;
          font-weight: 600;
          color: var(--ochre, #c2783c);
          background: rgba(194,120,60,0.12);
          border-radius: 4px;
          padding: 3px 8px;
          letter-spacing: 0.04em;
        }

        .guia__body {
          max-width: 860px;
          margin: 0 auto;
          padding: clamp(32px, 5vw, 56px) clamp(16px, 5vw, 64px);
        }

        .guia__section { margin-bottom: 40px; }
        .guia__section-title {
          font-family: var(--font-display, Georgia, serif);
          font-size: 18px;
          color: var(--stone-900, #1c1917);
          margin: 0 0 12px;
        }
        .guia__bio {
          font-size: 15px;
          color: var(--stone-600, #57534e);
          line-height: 1.7;
          margin: 0;
          white-space: pre-wrap;
        }
        .guia__regions {
          font-size: 14px;
          color: var(--stone-500, #78716c);
          margin: 0;
        }

        .guia__portfolio {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px;
        }
        .guia__portfolio-img {
          width: 100%;
          aspect-ratio: 1 / 1;
          object-fit: cover;
          border-radius: 6px;
          background: var(--stone-100, #f5f5f4);
        }

        @media (max-width: 480px) {
          .guia__identity { flex-direction: column; align-items: flex-start; gap: 12px; }
          .guia__portfolio { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="guia">
        <header className="guia__header">
          <Link href="/explorar" className="guia__back">← Explorar guias</Link>
          <div className="guia__identity">
            {guide.photoUrl ? (
              <Image
                src={guide.photoUrl}
                alt={guide.name}
                width={80}
                height={80}
                className="guia__avatar"
              />
            ) : (
              <div className="guia__avatar-placeholder" aria-hidden>🧭</div>
            )}
            <div>
              <h1 className="guia__name">{guide.name}</h1>
              {guide.specialties?.length > 0 && (
                <div className="guia__tags">
                  {guide.specialties.map((s) => (
                    <span key={s} className="guia__tag">{s}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="guia__body">
          {guide.bio && (
            <section className="guia__section">
              <h2 className="guia__section-title">Sobre</h2>
              <p className="guia__bio">{guide.bio}</p>
            </section>
          )}

          {guide.regions?.length > 0 && (
            <section className="guia__section">
              <h2 className="guia__section-title">Regiões atendidas</h2>
              <p className="guia__regions">{guide.regions.join(' · ')}</p>
            </section>
          )}

          {guide.portfolioPhotos?.length > 0 && (
            <section className="guia__section">
              <h2 className="guia__section-title">Portfólio</h2>
              <div className="guia__portfolio">
                {guide.portfolioPhotos.map((url, i) => (
                  <Image
                    key={url}
                    src={url}
                    alt={`Foto ${i + 1} do portfólio de ${guide.name}`}
                    width={400}
                    height={400}
                    className="guia__portfolio-img"
                  />
                ))}
              </div>
            </section>
          )}

          {!guide.bio && !guide.regions?.length && !guide.portfolioPhotos?.length && (
            <p style={{ fontSize: '15px', color: 'var(--stone-500)', textAlign: 'center', paddingTop: '40px' }}>
              Este guia ainda não preencheu o perfil.
            </p>
          )}
        </main>
      </div>
    </>
  )
}
