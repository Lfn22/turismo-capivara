"use client"
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { Badge } from "@/src/components/ui/capi"
import { DestinationEditor, type EditableDestination } from "./DestinationEditor"
import { editCall } from "@/lib/edit-client"
import { EditableSection } from "./EditableSection"
import { useEditMode } from "./EditModeProvider"

type Loaded = EditableDestination & { approvalStatus: string; active: boolean }

export function DestinationStatusBadges({ approvalStatus, active }: { approvalStatus: string; active: boolean }) {
  return (
    <div style={{ display: "flex", gap: "var(--space-2)" }}>
      {approvalStatus !== "APPROVED" ? <Badge tone="warning">Aguardando aprovação</Badge> : null}
      {!active ? <Badge tone="neutral">Oculto</Badge> : null}
    </div>
  )
}

const Ctx = createContext<{ slug: string; open: () => void } | null>(null)

/**
 * Envolve o conteúdo do destino. Com o modo edição desligado ou sem permissão, não faz nenhuma
 * chamada e devolve só os filhos. Os blocos usam `DestinationEditSection`.
 */
export function DestinationEditControls({ slug, children }: { slug: string; children: ReactNode }) {
  const { enabled, canEditDestination } = useEditMode()
  const canEdit = enabled && canEditDestination(slug)
  const [data, setData] = useState<Loaded | null>(null)
  const [open, setOpen] = useState(false)
  const [version, setVersion] = useState(0)

  const load = useCallback(async () => {
    const res = await editCall("GET", `/api/edit/destinations/${encodeURIComponent(slug)}`).catch(() => null)
    if (res?.ok) {
      setData(res.data)
      return res.data as Loaded
    }
    return null
  }, [slug])

  useEffect(() => {
    if (!canEdit) return
    let cancelled = false
    editCall("GET", `/api/edit/destinations/${encodeURIComponent(slug)}`)
      .then((res) => { if (!cancelled && res.ok) setData(res.data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [canEdit, slug])

  const openEditor = useCallback(async () => {
    const d = data ?? (await load())
    if (d) setOpen(true)
    else toast.error("Não foi possível carregar o destino.")
  }, [data, load])

  const ctx = { slug, open: openEditor }
  const pending = data && data.approvalStatus !== "APPROVED"
  const hidden = data && !data.active

  return (
    <Ctx.Provider value={ctx}>
      {canEdit && (pending || hidden) ? (
        <div className="capi-container" style={{ paddingBlock: "var(--space-3)" }}>
          <DestinationStatusBadges approvalStatus={data.approvalStatus} active={data.active} />
        </div>
      ) : null}
      {children}
      {canEdit && data ? (
        <DestinationEditor
          key={version}
          slug={slug}
          initial={data}
          open={open}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            void load().then(() => setVersion((v) => v + 1))
          }}
        />
      ) : null}
    </Ctx.Provider>
  )
}

/** Bloco da página do destino; precisa estar dentro de `DestinationEditControls`. */
export function DestinationEditSection({ children }: { children: ReactNode }) {
  const ctx = useContext(Ctx)
  const { canEditDestination } = useEditMode()
  return (
    <EditableSection
      editable={!!ctx && canEditDestination(ctx.slug)}
      deniedMessage="Destino de outra agência"
      onEdit={() => ctx?.open()}
    >
      {children}
    </EditableSection>
  )
}
