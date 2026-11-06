"use client"
import { use, useCallback, useEffect, useState, type ReactNode } from "react"
import { Check, Copy, RotateCw, Users } from "lucide-react"
import { Alert, Avatar, Button, EmptyState, ListGroup, PageHeader, Skeleton } from "@/src/components/ui/capi"
import { RejectReasonDialog } from "@/src/components/notifications/RejectReasonDialog"
import { AlreadyDecidedError, patchViaProxy, type RejectInput } from "@/lib/notification-actions"

function CopyLinkBanner() {
  const [copied, setCopied] = useState(false)
  const link = typeof window !== "undefined"
    ? `${window.location.origin}/cadastro/guia`
    : "/cadastro/guia"

  function handleCopy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Alert
      tone="brand"
      title="Link de cadastro para guias"
      className="mb-6"
      action={
        <Button
          variant={copied ? "secondary" : "primary"}
          size="sm"
          iconLeft={copied ? Check : Copy}
          onClick={handleCopy}
          aria-live="polite"
        >
          {copied ? "Copiado!" : "Copiar link"}
        </Button>
      }
    >
      <p className="m-0 font-semibold text-fg" style={{ wordBreak: "break-all" }}>{link}</p>
    </Alert>
  )
}

/** Linha da fila de pedidos: avatar, dados e ações; ações descem para a linha de baixo no mobile. */
function QueueRow({
  lead,
  title,
  subtitle,
  meta,
  actions,
  busy,
}: {
  lead: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  busy?: boolean
}) {
  return (
    <div
      className="capi-row flex-wrap lg:flex-nowrap"
      style={{ opacity: busy ? 0.6 : 1, transition: "opacity .15s ease" }}
      aria-busy={busy || undefined}
    >
      <div className="capi-row__lead">{lead}</div>
      <div className="capi-row__main">
        <p className="capi-row__title">{title}</p>
        {subtitle ? <p className="capi-row__sub">{subtitle}</p> : null}
        {meta ? <p className="capi-row__sub">{meta}</p> : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto lg:flex-nowrap">{actions}</div>
      ) : null}
    </div>
  )
}

interface Affiliation {
  id: string
  status: string
  createdAt: string
  guide: { userId: string; name: string; email: string; approvalStatus: string }
}

export default function AdminGuiasPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const [items, setItems] = useState<Affiliation[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<Affiliation | null>(null)

  const load = useCallback(async () => {
    try {
      const path = `/tenants/${slug}/admin/affiliations?status=PENDING`
      const res = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, { cache: "no-store" })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setItems(data.affiliations ?? [])
      setLoadError(false)
    } catch {
      setLoadError(true)
    }
  }, [slug])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
    load()
  }, [load])

  // Executa a decisão; 409 vira aviso e a lista é recarregada de qualquer forma.
  async function decide(fn: () => Promise<void>) {
    setNotice(null)
    try {
      await fn()
    } catch (e) {
      if (e instanceof AlreadyDecidedError) {
        setNotice("Este pedido já foi decidido.")
      } else {
        throw e
      }
    }
    await load()
  }

  async function accept(a: Affiliation) {
    setBusyId(a.id)
    try {
      await decide(() => patchViaProxy(`/affiliations/${a.id}/accept`))
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Não foi possível concluir a ação.")
    } finally {
      setBusyId(null)
    }
  }

  async function reject(a: Affiliation, input: RejectInput) {
    await decide(() => patchViaProxy(`/affiliations/${a.id}/reject`, input))
    setRejecting(null)
  }

  return (
    <>
      <PageHeader
        eyebrow="Equipe"
        title="Pedidos de vínculo"
        description="Guias que declararam atuar com sua agência"
      />

      <CopyLinkBanner />

      {notice && (
        <Alert tone="danger" className="mb-4">
          {notice}
        </Alert>
      )}

      {loadError ? (
        <Alert
          tone="danger"
          title="Erro ao carregar dados. Tente novamente."
          action={
            <Button variant="secondary" size="sm" iconLeft={RotateCw} onClick={load}>
              Tentar novamente
            </Button>
          }
        />
      ) : !items ? (
        <ListGroup>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="capi-row" aria-hidden="true">
              <Skeleton width={48} height={48} radius={24} />
              <div className="capi-row__main flex flex-col gap-2">
                <Skeleton width="40%" height={14} />
                <Skeleton width="55%" height={12} />
              </div>
            </div>
          ))}
        </ListGroup>
      ) : items.length === 0 ? (
        <ListGroup>
          <EmptyState icon={Users} title="Nenhuma pendência" />
        </ListGroup>
      ) : (
        <ListGroup>
          {items.map((a) => {
            const isActing = busyId === a.id
            return (
              <QueueRow
                key={a.id}
                busy={isActing}
                lead={<Avatar name={a.guide.name} size={48} />}
                title={a.guide.name}
                subtitle={a.guide.email}
                meta={`Pedido em ${new Date(a.createdAt).toLocaleDateString("pt-BR")}`}
                actions={
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isActing}
                      onClick={() => setRejecting(a)}
                      aria-label={`Recusar vínculo de ${a.guide.name}`}
                    >
                      Recusar
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      iconLeft={Check}
                      loading={isActing}
                      onClick={() => accept(a)}
                      aria-label={`Confirmar vínculo de ${a.guide.name}`}
                    >
                      Confirmar vínculo
                    </Button>
                  </>
                }
              />
            )
          })}
        </ListGroup>
      )}

      {rejecting && (
        <RejectReasonDialog
          kind="free-text"
          onCancel={() => setRejecting(null)}
          onSubmit={(input) => reject(rejecting, input)}
        />
      )}
    </>
  )
}
