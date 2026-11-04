"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/src/components/ui/capi"
import { DestinationStatusBadges } from "./DestinationEditControls"
import { DestinationEditor, type EditableDestination } from "./DestinationEditor"
import { editCall } from "@/lib/edit-client"
import { useEditMode } from "./EditModeProvider"

type Loaded = EditableDestination & { approvalStatus: string; active: boolean }

/**
 * Montado no not-found do destino. Só busca e renderiza para quem pode editar este destino com o
 * modo edição ligado; para todos os outros não faz nada (nenhuma chamada a /edit).
 */
export default function HiddenDestinationPreview() {
  const params = useParams<{ "destination-slug": string }>()
  const slug = params["destination-slug"]
  const router = useRouter()
  const { enabled, available, scope, canEditDestination } = useEditMode()
  const allowed = available && enabled && !!slug && canEditDestination(slug)
  const [data, setData] = useState<Loaded | null>(null)
  const [open, setOpen] = useState(false)
  const [version, setVersion] = useState(0)

  async function reload() {
    const res = await editCall("GET", `/api/edit/destinations/${encodeURIComponent(slug)}`).catch(() => null)
    if (res?.ok) setData(res.data)
    return res?.ok ?? false
  }

  useEffect(() => {
    if (!allowed) return
    let cancelled = false
    editCall("GET", `/api/edit/destinations/${encodeURIComponent(slug)}`)
      .then((res) => { if (!cancelled && res.ok) setData(res.data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [allowed, slug])

  if (!allowed || !data) return null

  async function restore() {
    const res = await editCall("POST", `/api/edit/destinations/${encodeURIComponent(slug)}?action=restore`).catch(() => null)
    if (!res?.ok) return toast.error("Não foi possível restaurar.")
    toast.success("Destino restaurado")
    router.refresh()
    await reload()
  }

  return (
    <section className="capi-container" style={{ paddingBlock: "var(--space-8)", display: "grid", gap: "var(--space-3)", justifyItems: "start" }}>
      <DestinationStatusBadges approvalStatus={data.approvalStatus} active={data.active} />
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700 }}>{data.title}</h2>
      <p style={{ color: "var(--text-secondary)" }}>{data.state}</p>
      <div style={{ display: "flex", gap: "var(--space-2)" }}>
        <Button onClick={() => setOpen(true)}>✏️ Editar</Button>
        {scope?.canManageDestinations && !data.active ? <Button variant="secondary" onClick={restore}>Restaurar</Button> : null}
      </div>
      <DestinationEditor
        key={version}
        slug={slug}
        initial={data}
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false)
          void reload().then(() => setVersion((v) => v + 1))
        }}
      />
    </section>
  )
}
