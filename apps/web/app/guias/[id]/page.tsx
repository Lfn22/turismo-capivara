import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock, MapPin, MessageSquareQuote, Star, UserRound } from 'lucide-react'
import { PortfolioLightbox } from './PortfolioLightbox'
import PublicLayout from '@/src/components/layout/PublicLayout'
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Media,
  Rating,
  StatusBadge,
  TopNav,
  formatPrice as formatCents,
} from '@/src/components/ui/capi'

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

  // A API devolve o preço em reais (decimal); os componentes trabalham em centavos.
  const formatPrice = (price: number) => formatCents(Math.round(price * 100))

  const formatHours = (pkg: Package) =>
    pkg.durationMinHours != null && pkg.durationMaxHours != null
      ? `${pkg.durationMinHours}–${pkg.durationMaxHours}h`
      : pkg.durationMinHours != null
        ? `${pkg.durationMinHours}h`
        : pkg.durationMaxHours != null
          ? `${pkg.durationMaxHours}h`
          : null

  const isEmptyProfile =
    !guide.bio && !guide.regions?.length && !guide.portfolioPhotos?.length && packages.length === 0

  return (
    <PublicLayout>
      <style>{`
        .guia { min-height: 100dvh; background: var(--bg-page); }
        .guia__navlogo img { height: 36px; width: auto; display: block; }

        .guia__header { padding-block: var(--space-8); }
        @media (min-width: 768px) { .guia__header { padding-block: var(--space-12) var(--space-10); } }
        .guia__identity { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-4); }
        @media (min-width: 640px) { .guia__identity { flex-direction: row; align-items: center; gap: var(--space-6); } }
        .guia__eyebrow {
          margin-bottom: var(--space-1);
          font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
          color: var(--text-primary);
        }
        .guia__name {
          font-family: var(--font-display);
          font-size: clamp(30px, 5vw, 42px); font-weight: 700; line-height: 1.1;
          color: var(--text);
        }
        .guia__tags { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-3); }

        .guia__section { padding-block: var(--space-8); border-top: 1px solid var(--border); }
        @media (min-width: 768px) { .guia__section { padding-block: var(--space-12); } }
        .guia__section-title {
          margin-bottom: var(--space-4);
          font-family: var(--font-display);
          font-size: clamp(24px, 3.5vw, 30px); font-weight: 700; line-height: 1.2;
          color: var(--text);
        }
        .guia__bio { max-width: 68ch; font-size: 16px; line-height: 1.7; color: var(--text-secondary); white-space: pre-wrap; }

        .guia__pkg { display: flex; flex-direction: column; gap: var(--space-3); }
        .guia__pkg-body { display: flex; flex-direction: column; gap: 4px; padding: 0 2px; }
        .guia__pkg-title { font-size: 17px; font-weight: 600; line-height: 1.35; color: var(--text); }
        .guia__pkg-meta { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 13px; font-weight: 500; color: var(--text-secondary); }
        .guia__pkg-meta > span { display: inline-flex; align-items: center; gap: 4px; }
        .guia__pkg-price { margin-top: 4px; font-size: 14px; color: var(--text-secondary); }
        .guia__pkg-price strong { font-size: 17px; font-weight: 700; color: var(--text); }

        .guia__testimonials { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); }
        .guia__testimonial {
          display: flex; flex-direction: column; gap: var(--space-3);
          padding: var(--space-5);
          border: 1px solid var(--border); border-radius: var(--radius-lg);
          background: var(--surface);
        }
        .guia__stars { display: inline-flex; gap: 2px; color: var(--brand); }
        .guia__stars .is-off { color: var(--border-strong); }
        .guia__testimonial-text { font-size: 15px; line-height: 1.6; color: var(--text); }
        .guia__testimonial-author { display: flex; align-items: center; gap: var(--space-2); font-size: 14px; font-weight: 600; color: var(--text-secondary); }
      `}</style>

      <div className="guia">
        <TopNav
          links={[
            { href: '/destinos', label: 'Destinos' },
            { href: '/explorar', label: 'Explorar' },
          ]}
          logo={
            <Link
              href="/"
              aria-label="CAPI — página inicial"
              className="guia__navlogo inline-flex items-center"
              style={{ minHeight: 'var(--touch-target)' }}
            >
              <Image src="/images/logo.png" alt="CAPI" width={40} height={36} priority />
            </Link>
          }
          actions={
            <Button href="/explorar" variant="ghost" size="sm" iconLeft={ArrowLeft}>
              Explorar guias
            </Button>
          }
        />

        <main>
          <header className="capi-container capi-container--content guia__header">
            <div className="guia__identity">
              <Avatar name={guide.name} src={guide.photoUrl} size={96} verified />
              <div>
                <p className="guia__eyebrow">Guia</p>
                <h1 className="guia__name">{guide.name}</h1>
                {testimonials.length > 0 && (
                  <div className="mt-2">
                    <Rating
                      value={testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length}
                      count={testimonials.length}
                    />
                  </div>
                )}
                {guide.specialties?.length > 0 && (
                  <div className="guia__tags" aria-label="Especialidades">
                    {guide.specialties.map((s) => (
                      <Badge key={s} tone="brand">{s}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>

          {guide.bio && (
            <section className="guia__section" aria-labelledby="guia-sobre">
              <div className="capi-container capi-container--content">
                <h2 id="guia-sobre" className="guia__section-title">Sobre</h2>
                <p className="guia__bio">{guide.bio}</p>
              </div>
            </section>
          )}

          {guide.regions?.length > 0 && (
            <section className="guia__section" aria-labelledby="guia-regioes">
              <div className="capi-container capi-container--content">
                <h2 id="guia-regioes" className="guia__section-title">Regiões atendidas</h2>
                <div className="guia__tags">
                  {guide.regions.map((r) => (
                    <Badge key={r} icon={MapPin}>{r}</Badge>
                  ))}
                </div>
              </div>
            </section>
          )}

          {packages.length > 0 && (
            <section className="guia__section" aria-labelledby="guia-roteiros">
              <div className="capi-container capi-container--content">
                <h2 id="guia-roteiros" className="guia__section-title">Experiências</h2>
                <div className="capi-grid-cards">
                  {packages.map((pkg) => {
                    const hours = formatHours(pkg)
                    return (
                      <article key={pkg.id} className="guia__pkg">
                        <Media alt={pkg.name}>
                          {pkg.difficulty ? (
                            <span className="capi-pkg__chip">
                              <StatusBadge kind="difficulty" status={pkg.difficulty} />
                            </span>
                          ) : null}
                        </Media>
                        <div className="guia__pkg-body">
                          <h3 className="guia__pkg-title">{pkg.name}</h3>
                          {hours ? (
                            <p className="guia__pkg-meta">
                              <span>
                                <Clock size={14} strokeWidth={1.75} aria-hidden="true" />
                                {hours}
                              </span>
                            </p>
                          ) : null}
                          <p className="guia__pkg-price">
                            <strong>{formatPrice(pkg.price)}</strong>
                          </p>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          {guide.portfolioPhotos?.length > 0 && (
            <section className="guia__section" aria-labelledby="guia-portfolio">
              <div className="capi-container capi-container--content">
                <h2 id="guia-portfolio" className="guia__section-title">Portfólio</h2>
                <PortfolioLightbox photos={guide.portfolioPhotos} guideName={guide.name} />
              </div>
            </section>
          )}

          <section className="guia__section pb-16" aria-labelledby="guia-depoimentos">
            <div className="capi-container capi-container--content">
              <h2 id="guia-depoimentos" className="guia__section-title">Depoimentos</h2>
              {testimonials.length > 0 ? (
                <div className="guia__testimonials">
                  {testimonials.map((t) => (
                    <figure key={t.id} className="guia__testimonial">
                      <div className="guia__stars" role="img" aria-label={`${t.rating} de 5 estrelas`}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            size={16}
                            strokeWidth={0}
                            fill="currentColor"
                            className={n <= t.rating ? undefined : 'is-off'}
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                      <blockquote className="guia__testimonial-text">{t.text}</blockquote>
                      <figcaption className="guia__testimonial-author">
                        <Avatar name={t.touristName} size={28} />
                        {t.touristName}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={MessageSquareQuote}
                  title="Ainda sem depoimentos"
                  description="Seja o primeiro a deixar um depoimento."
                />
              )}
            </div>
          </section>

          {isEmptyProfile && (
            <div className="capi-container capi-container--content pb-16">
              <EmptyState
                compact
                icon={UserRound}
                title="Perfil em construção"
                description="Este guia ainda não preencheu o perfil."
              />
            </div>
          )}
        </main>
      </div>
    </PublicLayout>
  )
}
