import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { RotateCcw, Search, SearchX, Users, X } from 'lucide-react'
import { Alert, Avatar, Badge, Button, EmptyState, Input, Media, TopNav } from '@/src/components/ui/capi'
import PublicLayout from '@/src/components/layout/PublicLayout'

export const dynamic = 'force-dynamic'

const API_URL = process.env.API_URL ?? 'http://localhost:3333'

interface Guide {
  id: string
  name: string
  photoUrl: string | null
  specialties: string[]
}

async function fetchGuides(): Promise<Guide[] | null> {
  try {
    const res = await fetch(`${API_URL}/guides`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export const metadata: Metadata = {
  title: 'Explorar',
  description: 'Descubra guias e experiências únicas em destinos brasileiros preservados.',
}

// ── Filtros (apresentação): busca e especialidade vêm da URL (?q=&especialidade=) ──

const MAX_CHIPS = 10

function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
}

function topSpecialties(guides: Guide[]) {
  const counts = new Map<string, number>()
  for (const g of guides) {
    for (const s of g.specialties ?? []) counts.set(s, (counts.get(s) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
    .slice(0, MAX_CHIPS)
    .map(([label, count]) => ({ label, count }))
}

function explorarHref(params: { q?: string; especialidade?: string }) {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.especialidade) sp.set('especialidade', params.especialidade)
  const qs = sp.toString()
  return qs ? `/explorar?${qs}` : '/explorar'
}

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() || undefined
}

export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; especialidade?: string | string[] }>
}) {
  const guides = await fetchGuides()
  const params = await searchParams
  const q = first(params.q)
  const especialidade = first(params.especialidade)
  const hasFilters = Boolean(q || especialidade)

  const chips = guides ? topSpecialties(guides) : []
  // Mantém o chip selecionado visível mesmo fora do top
  if (especialidade && !chips.some((c) => c.label === especialidade)) {
    chips.unshift({ label: especialidade, count: 0 })
  }

  const filtered = (guides ?? []).filter((g) => {
    if (especialidade && !(g.specialties ?? []).includes(especialidade)) return false
    if (q) {
      const needle = normalize(q)
      const haystack = normalize([g.name, ...(g.specialties ?? [])].join(' '))
      if (!haystack.includes(needle)) return false
    }
    return true
  })

  return (
    <PublicLayout>
      <style>{`
        .explorar { min-height: 100dvh; background: var(--bg-page); }
        .explorar__nav.capi-topnav { position: relative; }
        .explorar__navlogo img { height: 36px; width: auto; display: block; }

        .explorar__header { padding-block: var(--space-8) var(--space-6); }
        @media (min-width: 768px) { .explorar__header { padding-block: var(--space-12) var(--space-8); } }
        .explorar__overline {
          margin-bottom: var(--space-2);
          font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
          color: var(--text-primary);
        }
        .explorar__title {
          margin-bottom: var(--space-2);
          font-family: var(--font-display);
          font-size: clamp(34px, 5vw, 44px); font-weight: 700; line-height: 1.1;
          color: var(--text);
        }
        .explorar__lead { max-width: 560px; font-size: 16px; line-height: 1.55; color: var(--text-secondary); }

        .explorar__bar {
          position: sticky; top: 0; z-index: var(--z-sticky);
          background: var(--glass);
          -webkit-backdrop-filter: saturate(1.6) blur(16px);
          backdrop-filter: saturate(1.6) blur(16px);
          border-bottom: 1px solid var(--border);
          padding-block: var(--space-3);
        }
        .explorar__search { display: flex; align-items: flex-end; gap: var(--space-2); }
        .explorar__search .capi-field { flex: 1; min-width: 0; }
        .explorar__chips {
          display: flex; gap: var(--space-2);
          margin: var(--space-3) calc(var(--gutter-mobile) * -1) 0;
          padding: 2px var(--gutter-mobile);
          overflow-x: auto; scroll-snap-type: x proximity; scrollbar-width: none;
        }
        .explorar__chips::-webkit-scrollbar { display: none; }
        .explorar__chips > * { scroll-snap-align: start; }
        @media (min-width: 640px) {
          .explorar__chips { margin-inline: calc(var(--gutter-tablet) * -1); padding-inline: var(--gutter-tablet); }
        }
        @media (min-width: 1024px) {
          .explorar__chips { margin-inline: 0; padding-inline: 0; flex-wrap: wrap; overflow: visible; }
        }
        .explorar__chip { min-height: var(--touch-target); text-decoration: none; }

        .explorar__body { padding-block: var(--space-6) var(--space-16); }
        .explorar__count {
          display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
          margin-bottom: var(--space-4);
          font-size: 14px; font-weight: 500; color: var(--text-secondary);
          font-variant-numeric: tabular-nums;
        }
        .explorar__count strong { color: var(--text); font-weight: 700; }

        .explorar__grid {
          display: grid;
          gap: var(--space-6) var(--space-4);
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
        }
        .explorar__card {
          display: flex; flex-direction: column; gap: var(--space-3);
          color: inherit; text-decoration: none;
          border-radius: var(--radius-lg);
        }
        .explorar__card:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 3px; }
        .explorar__card .capi-media > img { transition: transform .5s cubic-bezier(.16, 1, .3, 1); }
        .explorar__card:hover .capi-media > img { transform: scale(1.04); }
        .explorar__ph {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg-muted);
        }
        .explorar__name { font-size: 16px; font-weight: 600; line-height: 1.3; color: var(--text); }
        .explorar__tags { display: flex; flex-wrap: wrap; gap: var(--space-1); margin-top: var(--space-2); }
        @media (prefers-reduced-motion: reduce) {
          .explorar__card:hover .capi-media > img { transform: none; }
        }
      `}</style>

      <div className="explorar">
        <TopNav
          className="explorar__nav"
          links={[
            { href: '/destinos', label: 'Destinos' },
            { href: '/explorar', label: 'Explorar' },
          ]}
          logo={
            <Link
              href="/"
              aria-label="CAPI — página inicial"
              className="explorar__navlogo inline-flex items-center"
              style={{ minHeight: 'var(--touch-target)' }}
            >
              <Image src="/images/logo.png" alt="CAPI" width={40} height={36} priority />
            </Link>
          }
          actions={
            <Button href="/login" variant="secondary" size="sm">
              Entrar
            </Button>
          }
        />

        <header className="capi-container explorar__header">
          <p className="explorar__overline">Experiências</p>
          <h1 className="explorar__title">Conheça os guias</h1>
          <p className="explorar__lead">
            Guias certificados com roteiros únicos. Escolha seu destino e encontre a experiência certa.
          </p>
        </header>

        {guides !== null && guides.length > 0 ? (
          <div className="explorar__bar">
            <div className="capi-container">
              <form action="/explorar" method="get" role="search" className="explorar__search">
                <Input
                  label="Buscar guias"
                  hideLabel
                  name="q"
                  type="search"
                  defaultValue={q}
                  leadingIcon={Search}
                  placeholder="Nome ou especialidade"
                  autoComplete="off"
                />
                {especialidade ? <input type="hidden" name="especialidade" value={especialidade} /> : null}
                <Button type="submit">Buscar</Button>
              </form>

              {chips.length > 0 ? (
                <nav className="explorar__chips" aria-label="Filtrar por especialidade">
                  <Link
                    href={explorarHref({ q })}
                    className={`capi-chip explorar__chip${especialidade ? '' : ' is-selected'}`}
                    aria-current={especialidade ? undefined : 'true'}
                  >
                    Todas
                  </Link>
                  {chips.map((c) => {
                    const selected = c.label === especialidade
                    return (
                      <Link
                        key={c.label}
                        href={explorarHref({ q, especialidade: selected ? undefined : c.label })}
                        className={`capi-chip explorar__chip${selected ? ' is-selected' : ''}`}
                        aria-current={selected ? 'true' : undefined}
                      >
                        {c.label}
                        {c.count > 0 ? <span className="capi-chip__count">{c.count}</span> : null}
                      </Link>
                    )
                  })}
                </nav>
              ) : null}
            </div>
          </div>
        ) : null}

        <main className="capi-container explorar__body">
          {guides === null ? (
            <Alert
              tone="danger"
              title="Erro ao carregar experiências"
              action={
                <Button href={explorarHref({ q, especialidade })} variant="secondary" size="sm" iconLeft={RotateCcw}>
                  Tentar novamente
                </Button>
              }
            >
              Não foi possível conectar ao servidor. Tente novamente em instantes.
            </Alert>
          ) : guides.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum guia disponível ainda"
              description="Em breve novos guias serão adicionados. Enquanto isso, conheça os destinos."
              action={<Button href="/destinos">Ver destinos</Button>}
            />
          ) : (
            <section aria-labelledby="explorar-resultados">
              <div className="explorar__count">
                <h2 id="explorar-resultados" className="sr-only-capi">Guias disponíveis</h2>
                <p role="status">
                  <strong>{filtered.length}</strong> {filtered.length === 1 ? 'guia' : 'guias'}
                  {hasFilters ? ' encontrados' : ` certificado${filtered.length !== 1 ? 's' : ''}`}
                </p>
                {hasFilters ? (
                  <Button href="/explorar" variant="ghost" size="sm" iconLeft={X}>
                    Limpar filtros
                  </Button>
                ) : null}
              </div>

              {filtered.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title="Nenhum guia encontrado"
                  description="Tente outro nome ou especialidade, ou limpe os filtros para ver todos os guias."
                  action={
                    <Button href="/explorar" variant="secondary" iconLeft={RotateCcw}>
                      Limpar filtros
                    </Button>
                  }
                />
              ) : (
                <ul className="explorar__grid" role="list">
                  {filtered.map((guide) => (
                    <li key={guide.id}>
                      <Link href={`/guias/${guide.id}`} className="explorar__card">
                        {guide.photoUrl ? (
                          <Media
                            src={guide.photoUrl}
                            alt={guide.name}
                            ratio="1 / 1"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          />
                        ) : (
                          <Media alt={guide.name} ratio="1 / 1">
                            <div className="explorar__ph" aria-hidden="true">
                              <Avatar name={guide.name} size={88} />
                            </div>
                          </Media>
                        )}
                        <div>
                          <h3 className="explorar__name">{guide.name}</h3>
                          {guide.specialties?.length > 0 ? (
                            <div className="explorar__tags">
                              {guide.specialties.slice(0, 3).map((s) => (
                                <Badge key={s}>{s}</Badge>
                              ))}
                              {guide.specialties.length > 3 ? (
                                <Badge title={guide.specialties.slice(3).join(' · ')}>
                                  +{guide.specialties.length - 3}
                                </Badge>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </main>
      </div>
    </PublicLayout>
  )
}
