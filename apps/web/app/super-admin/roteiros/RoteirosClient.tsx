'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Plus, Route, RotateCw } from 'lucide-react'
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  ListGroup,
  Media,
  PageHeader,
  Select,
  Skeleton,
} from '@/src/components/ui/capi'
import { useOperadoras } from './useOperadoras'

interface Package {
  id: string
  name: string
  price: number
  capacity: number
  photos?: string[]
  status: 'PUBLISHED' | 'DRAFT' | 'HIDDEN'
}

const STATUS = {
  PUBLISHED: { tone: 'success', label: 'Publicado' },
  DRAFT: { tone: 'warning', label: 'Rascunho' },
  HIDDEN: { tone: 'neutral', label: 'Oculto' },
} as const

const proxy = (path: string) => `/api/proxy?path=${encodeURIComponent(path)}`

function formatPrice(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function RoteirosClient({ initialSlug }: { initialSlug: string }) {
  const router = useRouter()
  const { operadoras, loading: opsLoading, error: opsError } = useOperadoras()
  const [slug, setSlug] = useState(initialSlug)
  const [packages, setPackages] = useState<Package[]>([])
  const [destinationSlug, setDestinationSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(initialSlug))
  const [loadError, setLoadError] = useState(false)

  // Só atualiza estado nos callbacks da promise; quem muda `slug` já liga o loading
  const fetchPackages = useCallback((slug: string) => {
    Promise.all([
      fetch(proxy(`/tenants/${slug}/manage/packages`)).then((r) => {
        if (!r.ok) throw new Error()
        return r.json() as Promise<{ packages?: Package[] }>
      }),
      // Rascunho só é editável pela lista de roteiros do destino, no modo edição do site
      fetch(proxy(`/tenants/${slug}/destination`))
        .then((r) => (r.ok ? (r.json() as Promise<{ slug?: string }>) : null))
        .catch(() => null),
    ])
      .then(([data, dest]) => {
        setPackages(data.packages ?? [])
        setDestinationSlug(dest?.slug ?? null)
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (slug) fetchPackages(slug)
  }, [slug, fetchPackages])

  function selectOperadora(next: string) {
    setSlug(next)
    setPackages([])
    setLoadError(false)
    setLoading(Boolean(next))
    router.replace(next ? `/super-admin/roteiros?operadora=${next}` : '/super-admin/roteiros')
  }

  function retry() {
    setLoadError(false)
    setLoading(true)
    fetchPackages(slug)
  }

  function editHref(pkg: Package): string | null {
    if (pkg.status === 'PUBLISHED') return `/${slug}/roteiros/${pkg.id}?editar=1`
    if (pkg.status === 'DRAFT' && destinationSlug)
      return `/destinos/${destinationSlug}/roteiros?editar=1`
    return null
  }

  const novoHref = slug
    ? `/super-admin/roteiros/novo?operadora=${slug}`
    : '/super-admin/roteiros/novo'

  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Roteiros"
        description="Cadastre roteiros em nome de uma operadora. Fotos e experiências você completa no site, no modo edição."
        actions={
          <Button href={novoHref} iconLeft={Plus}>
            Novo roteiro
          </Button>
        }
      />

      <div className="mb-6" style={{ maxWidth: 420 }}>
        <Select
          label="Operadora"
          value={slug}
          onChange={(e) => selectOperadora(e.target.value)}
          disabled={opsLoading}
          error={opsError ? 'Não foi possível carregar as operadoras.' : undefined}
          options={[
            { value: '', label: opsLoading ? 'Carregando...' : 'Escolha uma operadora' },
            ...operadoras.map((o) => ({ value: o.slug, label: o.name })),
          ]}
        />
      </div>

      {!slug ? (
        <ListGroup>
          <EmptyState
            icon={Route}
            title="Escolha uma operadora"
            description="Os roteiros dela aparecem aqui, inclusive rascunhos e ocultos."
          />
        </ListGroup>
      ) : loading ? (
        <ListGroup>
          {[1, 2, 3].map((i) => (
            <div key={i} className="capi-row" aria-hidden="true">
              <Skeleton width={56} height={56} radius={12} />
              <div className="capi-row__main flex flex-col gap-2">
                <Skeleton width="50%" height={14} />
                <Skeleton width="30%" height={12} />
              </div>
            </div>
          ))}
        </ListGroup>
      ) : loadError ? (
        <Alert
          tone="danger"
          title="Erro ao carregar roteiros."
          action={
            <Button variant="secondary" size="sm" iconLeft={RotateCw} onClick={retry}>
              Tentar novamente
            </Button>
          }
        >
          Verifique sua conexão e tente de novo.
        </Alert>
      ) : packages.length === 0 ? (
        <ListGroup>
          <EmptyState
            icon={Route}
            title="Nenhum roteiro nesta operadora"
            description="Crie o primeiro roteiro em nome dela."
            action={
              <Button href={novoHref} iconLeft={Plus}>
                Novo roteiro
              </Button>
            }
          />
        </ListGroup>
      ) : (
        <ListGroup>
          {packages.map((pkg) => {
            const href = editHref(pkg)
            const status = STATUS[pkg.status]
            return (
              <div key={pkg.id} className="capi-row flex-wrap lg:flex-nowrap">
                <div className="capi-row__lead" style={{ width: 56, flex: 'none' }}>
                  <Media
                    src={pkg.photos?.[0]}
                    alt=""
                    ratio="1 / 1"
                    sizes="56px"
                    placeholder="mountain"
                  />
                </div>
                <div className="capi-row__main">
                  <p className="capi-row__title">{pkg.name}</p>
                  <p className="capi-row__sub">
                    {formatPrice(pkg.price)} /grupo · até {pkg.capacity} pessoas
                  </p>
                </div>
                <div className="flex w-full flex-wrap items-center justify-between gap-2 lg:w-auto lg:flex-nowrap lg:justify-end">
                  <Badge tone={status.tone} dot>
                    {status.label}
                  </Badge>
                  {href ? (
                    <Button href={href} variant="ghost" size="sm" iconLeft={ExternalLink}>
                      Ver e editar no site
                    </Button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </ListGroup>
      )}
    </>
  )
}
