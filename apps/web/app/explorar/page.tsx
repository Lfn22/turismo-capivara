import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Button, TopNav } from '@/src/components/ui/capi'
import PublicLayout from '@/src/components/layout/PublicLayout'
import ExplorarClient from './ExplorarClient'
import type { SearchPackage } from './components/PackageListPanel'

export const dynamic = 'force-dynamic'

const API_URL = process.env.API_URL ?? 'http://localhost:3333'

export const metadata: Metadata = {
  title: 'Explorar roteiros — CAPI',
  description:
    'Encontre roteiros de turismo com guias certificados. Busque no mapa, filtre por preço e dificuldade.',
}

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() || undefined
}

async function fetchInitialPackages(params: {
  q?: string
  minPrice?: string
  maxPrice?: string
  difficulty?: string
}): Promise<SearchPackage[]> {
  try {
    const qp = new URLSearchParams()
    if (params.q) qp.set('search', params.q)
    if (params.minPrice) qp.set('min_price', String(Number(params.minPrice) * 100))
    if (params.maxPrice) qp.set('max_price', String(Number(params.maxPrice) * 100))
    if (params.difficulty) qp.set('difficulty', params.difficulty)
    qp.set('limit', '20')

    const url = `${API_URL}/packages/search?${qp.toString()}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return []

    const data = await res.json()
    return Array.isArray(data) ? data : (data.packages ?? [])
  } catch {
    return []
  }
}

export default async function ExplorarPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[]
    minPrice?: string | string[]
    maxPrice?: string | string[]
    difficulty?: string | string[]
  }>
}) {
  const params = await searchParams
  const q = first(params.q)
  const minPrice = first(params.minPrice)
  const maxPrice = first(params.maxPrice)
  const difficulty = first(params.difficulty)

  const initialPackages = await fetchInitialPackages({ q, minPrice, maxPrice, difficulty })

  return (
    <PublicLayout>
      <style>{`
        .explorar-page { height: 100dvh; display: flex; flex-direction: column; overflow: hidden; background: var(--bg-page); }
        .explorar-page__nav.capi-topnav { position: relative; flex-shrink: 0; }
        .explorar-page__navlogo img { height: 36px; width: auto; display: block; }
      `}</style>

      <div className="explorar-page">
        <TopNav
          className="explorar-page__nav"
          links={[
            { href: '/destinos', label: 'Destinos' },
            { href: '/explorar', label: 'Explorar' },
          ]}
          logo={
            <Link
              href="/"
              aria-label="CAPI — página inicial"
              className="explorar-page__navlogo inline-flex items-center"
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

        <ExplorarClient
          initialPackages={initialPackages}
          initialParams={{
            q,
            minPrice,
            maxPrice,
            difficulty: difficulty ? difficulty.split(',') : [],
          }}
        />
      </div>
    </PublicLayout>
  )
}
