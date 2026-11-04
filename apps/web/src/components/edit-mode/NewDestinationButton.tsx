"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Alert, Badge, Button, Input, Select, Textarea } from "@/src/components/ui/capi"
import DestinationCard from "@/src/components/ui/DestinationCard"
import { BR_STATES } from "./DestinationEditor"
import { editCall, errorText } from "@/lib/edit-client"
import { useEditMode } from "./EditModeProvider"
import { EditSheet } from "./EditSheet"

type EditListItem = {
  slug: string
  title: string
  state: string
  heroImageUrl: string | null
  approvalStatus: string
  active: boolean
}

const DIRTY_ID = "destination-new"
const LEAVE_MESSAGE = "Você tem alterações não salvas. Sair mesmo assim?"

/**
 * Extras da lista /destinos no modo edição (só para quem gerencia destinos): o cartão
 * "＋ Novo destino" e os destinos fora da lista pública, acinzentados. Sem modo edição, não renderiza nada.
 * `standalone` embrulha em uma grade própria (lista pública vazia).
 */
export function NewDestinationButton({ publicSlugs, standalone }: { publicSlugs: string[]; standalone?: boolean }) {
  const { enabled, scope, registerDirty } = useEditMode()
  const router = useRouter()
  const active = enabled && scope?.canManageDestinations === true
  const [hiddenItems, setHiddenItems] = useState<EditListItem[]>([])
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [state, setState] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    editCall("GET", "/api/edit/destinations")
      .then((res) => { if (!cancelled && res.ok) setHiddenItems(res.data?.destinations ?? []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [active])

  const dirty = open && (title !== "" || state !== "" || description !== "")
  useEffect(() => {
    registerDirty(DIRTY_ID, dirty)
    return () => registerDirty(DIRTY_ID, false)
  }, [dirty, registerDirty])

  if (!active) return null

  function close() {
    if (dirty && !window.confirm(LEAVE_MESSAGE)) return
    setOpen(false)
    setTitle("")
    setState("")
    setDescription("")
    setError(null)
  }

  async function create() {
    if (title.trim().length < 3) return setError("Informe o título (mínimo de 3 caracteres).")
    if (!state) return setError("Escolha o estado.")
    if (description.trim().length < 10) return setError("A descrição precisa ter pelo menos 10 caracteres.")
    setSaving(true)
    setError(null)
    const res = await editCall("POST", "/api/edit/destinations", {
      title: title.trim(),
      state,
      description: description.trim(),
    }).catch(() => null)
    setSaving(false)
    if (!res?.ok) return setError(res ? errorText(res.data, "Não foi possível criar.") : "Falha de conexão. Tente novamente.")
    registerDirty(DIRTY_ID, false)
    toast.success("Destino criado")
    setOpen(false)
    router.push(`/destinos/${res.data.slug}?editar=1`)
  }

  const extra = hiddenItems.filter((d) => !publicSlugs.includes(d.slug))

  const content = (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="capi-dest"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)",
          minHeight: 200, border: "2px dashed var(--ochre)", background: "transparent",
          color: "var(--text)", font: "inherit", fontWeight: 600, cursor: "pointer",
        }}
      >
        ＋ Novo destino
      </button>
      {extra.map((d) => (
        <div key={d.slug} style={{ position: "relative", opacity: 0.55 }}>
          <DestinationCard
            slug={d.slug}
            title={d.title}
            subtitle={null}
            state={d.state}
            heroImageUrl={d.heroImageUrl}
            heroImageBlurDataUrl={null}
            headingLevel="h2"
          />
          <div style={{ position: "absolute", top: "var(--space-3)", left: "var(--space-3)", display: "flex", gap: "var(--space-1)" }}>
            {d.approvalStatus !== "APPROVED" ? <Badge tone="warning">Aguardando aprovação</Badge> : null}
            {!d.active ? <Badge tone="neutral">Oculto</Badge> : null}
          </div>
        </div>
      ))}
      <EditSheet
        open={open}
        title="Novo destino"
        onClose={close}
        footer={
          <>
            <Button variant="secondary" onClick={close}>Cancelar</Button>
            <Button onClick={create} loading={saving}>Criar destino</Button>
          </>
        }
      >
        <div style={{ display: "grid", gap: "var(--space-4)" }}>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select label="Estado" value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">Selecione</option>
            {BR_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </Select>
          <Textarea
            label="Descrição"
            hint="Separe os parágrafos com uma linha em branco."
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </EditSheet>
    </>
  )

  return standalone ? <div className="capi-grid-cards">{content}</div> : content
}
