'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PackageJoinButton from '@/src/components/membership/PackageJoinButton'
import { callProxy } from '@/src/components/membership/membership-shared'

type Roteiro = {
  id: string
  name: string
  price: number
  tenantSlug: string
  destinationTitle: string
}

type Memberships = {
  conductorPackageIds: string[]
  destinations: { slug: string; title: string }[]
}

function formatPrice(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * "Meus roteiros" lista só os roteiros do guia. Esta seção mostra os roteiros publicados
 * dos destinos onde ele atua, para pedir para atuar sem sair do painel.
 */
export default function JoinableRoteiros() {
  const [roteiros, setRoteiros] = useState<Roteiro[] | null>(null)
  const [hasDestinations, setHasDestinations] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { res, data } = await callProxy('/guides/me/memberships', 'GET')
      if (!res.ok || !data) return setRoteiros([])
      const m = data as unknown as Memberships
      const own = new Set(m.conductorPackageIds ?? [])
      const destinations = m.destinations ?? []
      setHasDestinations(destinations.length > 0)
      const lists = await Promise.all(
        destinations.map(async (d) => {
          const r = await callProxy(`/destinations/${d.slug}/packages`, 'GET')
          const pkgs =
            r.res.ok && Array.isArray(r.data)
              ? (r.data as unknown as Omit<Roteiro, 'destinationTitle'>[])
              : []
          return pkgs.map((p) => ({ ...p, destinationTitle: d.title }))
        }),
      )
      if (!cancelled) setRoteiros(lists.flat().filter((p) => !own.has(p.id)))
    }
    void load().catch(() => !cancelled && setRoteiros([]))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section aria-labelledby="joinable-title" style={{ marginTop: 'var(--space-8)' }}>
      <h2
        id="joinable-title"
        style={{ margin: '0 0 var(--space-1)', fontSize: 18, fontWeight: 600 }}
      >
        Roteiros onde você pode atuar
      </h2>
      <p className="text-fg-secondary" style={{ margin: '0 0 var(--space-4)', fontSize: 14 }}>
        Roteiros publicados nos destinos em que você atua. Peça para atuar e o responsável aprova.
      </p>

      {roteiros === null ? (
        <p className="text-fg-secondary" style={{ fontSize: 14 }}>
          Carregando…
        </p>
      ) : !hasDestinations ? (
        <p className="text-fg-secondary" style={{ fontSize: 14 }}>
          Você ainda não atua em nenhum destino. <Link href="/destinos">Escolha um destino</Link>{' '}
          para ver os roteiros.
        </p>
      ) : roteiros.length === 0 ? (
        <p className="text-fg-secondary" style={{ fontSize: 14 }}>
          Nenhum outro roteiro publicado nos seus destinos.
        </p>
      ) : (
        <div className="roteiro-grid">
          {roteiros.map((p) => (
            <article key={p.id} className="roteiro-card">
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="roteiro-card__title">
                  <Link href={`/${p.tenantSlug}/roteiros/${p.id}`}>{p.name}</Link>
                </h3>
                <p className="text-fg-secondary" style={{ margin: 0, fontSize: 13 }}>
                  {p.destinationTitle}
                </p>
              </div>
              <p className="roteiro-card__price">
                {formatPrice(p.price)} <span>/grupo</span>
              </p>
              <PackageJoinButton packageId={p.id} />
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
