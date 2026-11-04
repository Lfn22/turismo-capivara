"use client"
import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import BackButton from "@/src/components/ui/BackButton"
import { ExternalLink } from "lucide-react"
import { Alert, Button, PageHeader, Skeleton } from "@/src/components/ui/capi"
import { DestinationEditor, type EditableDestination } from "@/src/components/edit-mode/DestinationEditor"

export default function DestinoPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { data: session } = useSession()
  // Guia não edita o destino da agência (a API responde 403): só vê o aviso e o link para o site
  const isConductor = session?.user?.role === "CONDUTOR"
  const [slug, setSlug] = useState("")
  const [destination, setDestination] = useState<EditableDestination | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    Promise.resolve(params).then(({ slug: s }) => setSlug(s))
  }, [params])

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/tenants/${slug}/destination`, { cache: "no-store" })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setDestination(await r.json())
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    if (!slug) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial; load() só altera estado após o await
    void load()
  }, [slug, load])

  return (
    <div className="capi-container capi-container--text" style={{ paddingInline: 0 }}>
      <BackButton fallbackHref={slug ? `/${slug}/painel` : "/"} />

      <PageHeader
        eyebrow="Painel do guia"
        title="Meu destino"
        description="Textos e imagens da página pública do seu destino."
        actions={
          destination ? (
            <Button href={`/destinos/${destination.slug}?editar=1`} variant="secondary" iconLeft={ExternalLink}>
              Ver e editar no site
            </Button>
          ) : undefined
        }
      />

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }} aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <Skeleton width={120} height={14} />
              <Skeleton height={48} radius={12} />
            </div>
          ))}
          <Skeleton height={140} radius={12} />
        </div>
      ) : loadError || !destination ? (
        <Alert tone="danger" title="Não foi possível carregar seu destino">
          Recarregue a página para tentar de novo.
        </Alert>
      ) : isConductor ? (
        <Alert tone="info" title="Somente a administração da agência edita o destino">
          Você pode ver a página pública pelo botão acima.
        </Alert>
      ) : (
        <DestinationEditor
          slug={destination.slug}
          initial={destination}
          open
          inline
          onClose={() => {}}
          onSaved={() => { void load() }}
        />
      )}
    </div>
  )
}
