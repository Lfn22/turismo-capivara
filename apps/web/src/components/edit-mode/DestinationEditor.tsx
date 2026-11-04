"use client"
import { Plus, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { compressImage } from "@/lib/compress-image"
import { editCall, errorText } from "@/lib/edit-client"
import { Alert, Button, IconButton, Input, Select, Textarea } from "@/src/components/ui/capi"
import { PhotoUploadArea } from "@/src/components/ui/PhotoUploadArea"
import { useEditMode } from "./EditModeProvider"
import { EditSheet } from "./EditSheet"

export const BR_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]

export type EditableDestination = {
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  state: string
  tagline: string | null
  highlights: string[]
  photos: string[]
  heroImageUrl: string | null
  /** false = arquivado. Vem do GET de edição; o painel não manda. */
  active?: boolean
}

type Form = {
  title: string
  subtitle: string
  state: string
  tagline: string
  description: string
  highlights: string[]
  heroImageUrl: string | null
  photos: string[]
}

const toForm = (d: EditableDestination): Form => ({
  title: d.title,
  subtitle: d.subtitle ?? "",
  state: d.state,
  tagline: d.tagline ?? "",
  description: d.description ?? "",
  highlights: d.highlights ?? [],
  heroImageUrl: d.heroImageUrl,
  photos: d.photos ?? [],
})

const DIRTY_ID = "destination-editor"
const LEAVE_MESSAGE = "Você tem alterações não salvas. Sair mesmo assim?"

export type DestinationEditorProps = {
  slug: string
  initial: EditableDestination
  open: boolean
  onClose: () => void
  onSaved: () => void
  /** Renderiza no fluxo da página (painel), em vez de folha lateral. */
  inline?: boolean
}

/** Formulário de edição do destino numa EditSheet. `open` e `onClose` ficam com quem monta. */
export function DestinationEditor({ slug, initial, open, onClose, onSaved, inline }: DestinationEditorProps) {
  const router = useRouter()
  const { scope, registerDirty } = useEditMode()
  const isStaff = scope?.canManageDestinations === true
  // Base do "dirty": passa a ser o que foi salvo, para o formulário ficar limpo depois de salvar
  const [baseline, setBaseline] = useState<Form>(() => toForm(initial))
  const [form, setForm] = useState<Form>(baseline)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmName, setConfirmName] = useState("")
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const dirty = JSON.stringify(form) !== JSON.stringify(baseline)
  useEffect(() => {
    registerDirty(DIRTY_ID, open && dirty)
    return () => registerDirty(DIRTY_ID, false)
  }, [open, dirty, registerDirty])

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }))

  const close = useCallback(() => {
    if (dirty && !window.confirm(LEAVE_MESSAGE)) return
    setForm(baseline)
    setError(null)
    setConfirming(false)
    onClose()
  }, [dirty, baseline, onClose])

  async function upload(file: File): Promise<string> {
    const toSend = await compressImage(file)
    const data = new FormData()
    data.append("file", toSend, toSend.name)
    const res = await fetch("/api/uploads/photos?folder=destinations", { method: "POST", body: data })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Erro no upload" }))
      throw new Error(err.message ?? "Erro no upload")
    }
    const { url } = await res.json()
    return url
  }

  async function save() {
    const title = form.title.trim()
    const description = form.description.trim()
    if (title.length < 3) return setError("Informe o título (mínimo de 3 caracteres).")
    if (description.length < 10) return setError("A descrição precisa ter pelo menos 10 caracteres.")
    setSaving(true)
    setError(null)
    const subtitle = form.subtitle.trim()
    const tagline = form.tagline.trim()
    const highlights = form.highlights.map((h) => h.trim()).filter(Boolean)
    const res = await editCall("PATCH", `/api/edit/destinations/${encodeURIComponent(slug)}`, {
      title,
      subtitle: subtitle || null,
      state: form.state,
      tagline: tagline || null,
      description,
      highlights,
      heroImageUrl: form.heroImageUrl,
      photos: form.photos,
    }).catch(() => null)
    setSaving(false)
    if (!res?.ok) return setError(res ? errorText(res.data, "Não foi possível salvar.") : "Falha de conexão. Tente novamente.")
    // Mesmo formato que toForm() produz a partir do destino salvo
    const saved: Form = { ...form, title, subtitle, tagline, description, highlights }
    setBaseline(saved)
    setForm(saved)
    toast.success("Destino salvo")
    registerDirty(DIRTY_ID, false)
    onSaved()
    router.refresh()
  }

  async function archive() {
    const base = `/api/edit/destinations/${encodeURIComponent(slug)}`
    const res = await editCall("POST", `${base}?action=archive`).catch(() => null)
    if (!res?.ok) return setError(res ? errorText(res.data, "Não foi possível arquivar.") : "Falha de conexão. Tente novamente.")
    registerDirty(DIRTY_ID, false)
    toast("Destino arquivado", {
      action: {
        label: "Desfazer",
        onClick: async () => {
          const back = await editCall("POST", `${base}?action=restore`).catch(() => null)
          if (back?.ok) {
            toast.success("Destino restaurado")
            router.push(`/destinos/${slug}`)
            router.refresh()
          } else {
            toast.error("Não foi possível restaurar.")
          }
        },
      },
    })
    onClose()
    router.push("/destinos")
    router.refresh()
  }

  async function remove() {
    setDeleteError(null)
    const res = await editCall("DELETE", `/api/edit/destinations/${encodeURIComponent(slug)}`, { confirmName }).catch(() => null)
    if (!res?.ok) return setDeleteError(res ? errorText(res.data, "Não foi possível excluir.") : "Falha de conexão. Tente novamente.")
    registerDirty(DIRTY_ID, false)
    toast.success("Destino excluído")
    onClose()
    router.push("/destinos")
    router.refresh()
  }

  const setHighlight = (i: number, v: string) => set("highlights", form.highlights.map((h, idx) => (idx === i ? v : h)))

  return (
    <EditSheet
      open={open}
      title="Editar destino"
      inline={inline}
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancelar</Button>
          <Button onClick={save} loading={saving} disabled={!dirty}>Salvar</Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "var(--space-4)" }}>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Input label="Título" value={form.title} onChange={(e) => set("title", e.target.value)} />
        <Input label="Subtítulo" optional value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
        <Select label="Estado" value={form.state} onChange={(e) => set("state", e.target.value)}>
          {BR_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
        </Select>
        <Input label="Tagline" optional value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
        <Textarea
          label="Descrição"
          hint="Separe os parágrafos com uma linha em branco."
          rows={8}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />

        <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: "var(--space-2)" }}>
          <legend className="capi-field__label">Destaques ({form.highlights.length}/10)</legend>
          {form.highlights.map((h, i) => (
            <div key={i} style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-end" }}>
              <Input
                label={`Destaque ${i + 1}`}
                hideLabel
                value={h}
                onChange={(e) => setHighlight(i, e.target.value)}
                className="flex-1"
              />
              <IconButton
                icon={X}
                label={`Remover destaque ${i + 1}`}
                onClick={() => set("highlights", form.highlights.filter((_, idx) => idx !== i))}
              />
            </div>
          ))}
          {form.highlights.length < 10 ? (
            <Button variant="secondary" size="sm" iconLeft={Plus} onClick={() => set("highlights", [...form.highlights, ""])}>
              Adicionar destaque
            </Button>
          ) : null}
        </fieldset>

        <div>
          <p className="capi-field__label">Foto de capa</p>
          <PhotoUploadArea
            photos={form.heroImageUrl ? [form.heroImageUrl] : []}
            maxPhotos={1}
            onAdd={async (file) => set("heroImageUrl", await upload(file))}
            onRemove={() => set("heroImageUrl", null)}
          />
        </div>
        <div>
          <p className="capi-field__label">Fotos (até 5)</p>
          <PhotoUploadArea
            photos={form.photos}
            maxPhotos={5}
            onAdd={async (file) => {
              const url = await upload(file)
              setForm((f) => ({ ...f, photos: [...f.photos, url] }))
            }}
            onRemove={(url) => set("photos", form.photos.filter((p) => p !== url))}
          />
        </div>

        {isStaff ? (
          <div style={{ display: "grid", gap: "var(--space-3)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border)" }}>
            {/* Já arquivado: nada a arquivar (restaurar fica no aviso de destino oculto) */}
            {initial.active !== false ? <Button variant="secondary" onClick={archive}>Arquivar destino</Button> : null}
            {confirming ? (
              <>
                {deleteError ? <Alert tone="danger">{deleteError}</Alert> : null}
                <Input
                  label="Digite o nome do destino para confirmar"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                />
                <Button variant="danger" onClick={remove} disabled={!confirmName.trim()}>Excluir definitivamente</Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => setConfirming(true)}>Excluir definitivamente</Button>
            )}
          </div>
        ) : null}
      </div>
    </EditSheet>
  )
}
