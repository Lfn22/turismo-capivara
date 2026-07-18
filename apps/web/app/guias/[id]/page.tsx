import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { PortfolioLightbox } from './PortfolioLightbox'

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

interface Package {
  id: string
  name: string
  price: number
  durationMinHours?: number
  durationMaxHours?: number
  difficulty?: string
}

interface Testimonial {
  id: string
  text: string
  touristName: string
  rating: number
  createdAt: string
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

async function fetchPackages(id: string): Promise<Package[]> {
  try {
    const res = await fetch(`${API_URL}/guides/${id}/packages`, { cache: 'no-store' })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function fetchTestimonials(id: string): Promise<Testimonial[]> {
  try {
    const res = await fetch(`${API_URL}/guides/${id}/testimonials`, { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    return data.testimonials ?? []
  } catch {
    return []
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
  const [guide, packages, testimonials] = await Promise.all([
    fetchGuide(id),
    fetchPackages(id),
    fetchTestimonials(id),
  ])
  if (!guide) notFound()

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)

  const renderStars = (rating: number) =>
    '★'.repeat(rating) + '☆'.repeat(5 - rating)

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
          width: 120px;
          height: 120px;
          border-radius: 50%;
          object-fit: cover;
          background: var(--stone-700, #44403c);
          flex-shrink: 0;
        }
        .guia__avatar-placeholder {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: var(--stone-700, #44403c);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
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

        .guia__feed-section { margin-bottom: 48px; }

        .guia__packages {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding-bottom: 8px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .guia__packages::-webkit-scrollbar { display: none; }
        .guia__package-card {
          flex-shrink: 0;
          background: #fff;
          border: 1px solid var(--stone-200, #e7e5e4);
          border-radius: 10px;
          padding: 16px 20px;
          min-width: 200px;
          max-width: 260px;
        }
        .guia__package-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--stone-900, #1c1917);
          margin: 0 0 6px;
          line-height: 1.3;
        }
        .guia__package-price {
          font-size: 18px;
          font-weight: 700;
          color: var(--ochre, #c2783c);
          margin: 0 0 4px;
        }
        .guia__package-meta {
          font-size: 12px;
          color: var(--stone-500, #78716c);
          margin: 0;
        }

        .guia__testimonials { display: flex; flex-direction: column; gap: 16px; }
        .guia__testimonial-card {
          background: #fff;
          border: 1px solid var(--stone-200, #e7e5e4);
          border-radius: 10px;
          padding: 16px 20px;
        }
        .guia__testimonial-stars {
          color: #f59e0b;
          font-size: 14px;
          margin-bottom: 6px;
        }
        .guia__testimonial-text {
          font-size: 14px;
          color: var(--stone-700, #44403c);
          line-height: 1.6;
          margin: 0 0 8px;
        }
        .guia__testimonial-author {
          font-size: 12px;
          font-weight: 600;
          color: var(--stone-500, #78716c);
          margin: 0;
        }
        .guia__testimonial-empty {
          font-size: 14px;
          color: var(--stone-400, #a8a29e);
          font-style: italic;
        }

        @media (max-width: 480px) {
          .guia__identity { flex-direction: column; align-items: flex-start; gap: 12px; }
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
                width={120}
                height={120}
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
              <PortfolioLightbox photos={guide.portfolioPhotos} guideName={guide.name} />
            </section>
          )}

          {packages.length > 0 && (
            <section className="guia__feed-section">
              <h2 className="guia__section-title">Experiências</h2>
              <div className="guia__packages">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="guia__package-card">
                    <p className="guia__package-name">{pkg.name}</p>
                    <p className="guia__package-price">{formatPrice(pkg.price)}</p>
                    {(pkg.durationMinHours != null || pkg.durationMaxHours != null) && (
                      <p className="guia__package-meta">
                        {pkg.durationMinHours != null && pkg.durationMaxHours != null
                          ? `${pkg.durationMinHours}–${pkg.durationMaxHours}h`
                          : pkg.durationMinHours != null
                          ? `${pkg.durationMinHours}h`
                          : `${pkg.durationMaxHours}h`}
                        {pkg.difficulty ? ` · ${pkg.difficulty}` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="guia__feed-section">
            <h2 className="guia__section-title">Depoimentos</h2>
            {testimonials.length > 0 ? (
              <div className="guia__testimonials">
                {testimonials.map((t) => (
                  <div key={t.id} className="guia__testimonial-card">
                    <div className="guia__testimonial-stars" aria-label={`${t.rating} de 5 estrelas`}>
                      {renderStars(t.rating)}
                    </div>
                    <p className="guia__testimonial-text">{t.text}</p>
                    <p className="guia__testimonial-author">{t.touristName}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="guia__testimonial-empty">Seja o primeiro a deixar um depoimento.</p>
            )}
          </section>

          {!guide.bio && !guide.regions?.length && !guide.portfolioPhotos?.length && packages.length === 0 && (
            <p style={{ fontSize: '15px', color: 'var(--stone-500)', textAlign: 'center', paddingTop: '40px' }}>
              Este guia ainda não preencheu o perfil.
            </p>
          )}
        </main>
      </div>
    </>
  )
}
