"use client"
import { Plus, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { compressImage } from "@/lib/compress-image"
import { Alert, Button, IconButton, Input, Select, Textarea } from "@/src/components/ui/capi"
import { PhotoUploadArea } from "@/src/components/ui/PhotoUploadArea"
import { editCall, errorText } from "@/lib/edit-client"
import { useEditMode } from "./EditModeProvider"
import { EditSheet } from "./EditSheet"

export type PackageStatus = "PUBLISHED" | "DRAFT" | "HIDDEN"

export type EditablePackage = {
  id: string
  tenantSlug: string
  name: string
  description: string
  price: number
  duration: number // horas inteiras, como a API guarda
  capacity: number
  difficulty: "EASY" | "MODERATE" | "HARD"
  photos: string[]
  highlights: string[]
  status: PackageStatus
}

type Form = {
  name: string
  description: string
  price: string
  duration: string
  capacity: string
  difficulty: string
  photos: string[]
  highlights: string[]
}

const EMPTY: Form = { name: "", description: "", price: "", duration: "", capacity: "", difficulty: "EASY", photos: [], highlights: [] }

const toForm = (p: EditablePackage | null): Form =>
  p
    ? {
        name: p.name,
        description: p.description,
        price: String(Number(p.price)),
        duration: String(p.duration),
        capacity: String(p.capacity),
        difficulty: p.difficulty,
        photos: p.photos ?? [],
        highlights: p.highlights ?? [],
      }
    : EMPTY

const LEAVE_MESSAGE = "Você tem alterações não salvas. Sair mesmo assim?"

export type PackageEditorProps = {
  tenantSlug: string
  pkg: EditablePackage | null
  open: boolean
  onClose: () => void
  onSaved: (saved: { id: string; created: boolean }) => void
  /** Chamado depois de voltar para rascunho ou arquivar: a página atual deixa de existir para o público. */
  onLeavePublic?: () => void
  /** Renderiza no fluxo da página (painel), em vez de folha lateral. */
  inline?: boolean
}

/** Formulário de criação/edição de roteiro numa EditSheet. `open` e `onClose` ficam com quem monta. */
export function PackageEditor({ tenantSlug, pkg, open, onClose, onSaved, onLeavePublic, inline }: PackageEditorProps) {
  const router = useRouter()
  const { registerDirty } = useEditMode()
  const dirtyId = `package-editor-${pkg?.id ?? "new"}`
  // Base do "dirty": começa no roteiro recebido e passa a ser o que foi salvo, para o formulário
  // ficar limpo depois de salvar (no painel o editor continua aberto) e novas edições voltarem a contar.
  const [baseline, setBaseline] = useState<Form>(() => toForm(pkg))
  const [form, setForm] = useState<Form>(baseline)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = JSON.stringify(form) !== JSON.stringify(baseline)
  useEffect(() => {
    registerDirty(dirtyId, open && dirty)
    return () => registerDirty(dirtyId, false)
  }, [dirtyId, open, dirty, registerDirty])

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }))

  const discardAndClose = useCallback(() => {
    setForm(baseline)
    setError(null)
    onClose()
  }, [baseline, onClose])

  const close = useCallback(() => {
    if (dirty && !window.confirm(LEAVE_MESSAGE)) return
    discardAndClose()
  }, [dirty, discardAndClose])

  async function upload(file: File): Promise<string> {
    const toSend = await compressImage(file)
    const data = new FormData()
    data.append("file", toSend, toSend.name)
    const res = await fetch("/api/uploads/photos?folder=packages", { method: "POST", body: data })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Erro no upload" }))
      throw new Error(err.message ?? "Erro no upload")
    }
    const { url } = await res.json()
    return url
  }

  const call = (action: string, data?: unknown, packageId = pkg?.id) =>
    editCall("POST", "/api/edit/packages", { action, tenantSlug, ...(packageId ? { packageId } : {}), ...(data ? { data } : {}) })
      .catch(() => null)

  const fail = (res: Awaited<ReturnType<typeof call>>, fallback: string) =>
    setError(res ? errorText(res.data, fallback) : "Falha de conexão. Tente novamente.")

  /** Valida e grava o formulário. Devolve o id salvo ou null (o erro já foi mostrado). */
  async function persist(): Promise<string | null> {
    const name = form.name.trim()
    const description = form.description.trim()
    const price = Number(form.price)
    const duration = Number(form.duration)
    const capacity = Number(form.capacity)
    const invalid =
      !name ? "Informe o nome."
      : !description ? "Informe a descrição."
      : !(price > 0) ? "O preço deve ser maior que zero."
      : !Number.isInteger(duration) || duration <= 0 ? "A duração deve ser um número inteiro de horas."
      : !Number.isInteger(capacity) || capacity <= 0 ? "A capacidade deve ser um número inteiro maior que zero."
      : null
    if (invalid) {
      setError(invalid)
      return null
    }
    setSaving(true)
    setError(null)
    const highlights = form.highlights.map((h) => h.trim()).filter(Boolean)
    const res = await call(pkg ? "update" : "create", {
      name,
      description,
      price,
      duration,
      capacity,
      difficulty: form.difficulty,
      photos: form.photos,
      highlights,
    })
    setSaving(false)
    if (!res?.ok) {
      fail(res, "Não foi possível salvar.")
      return null
    }
    // Mesmo formato que toForm() produz a partir do roteiro salvo
    const saved: Form = {
      ...form,
      name,
      description,
      price: String(price),
      duration: String(duration),
      capacity: String(capacity),
      highlights,
    }
    setBaseline(saved)
    setForm(saved)
    return pkg ? pkg.id : res.data.id
  }

  function done(id: string, created = false, leavesPublic = false) {
    registerDirty(dirtyId, false)
    onSaved({ id, created })
    if (leavesPublic && onLeavePublic) onLeavePublic()
    else router.refresh()
  }

  async function save() {
    const id = await persist()
    if (!id) return
    toast.success("Roteiro salvo")
    done(id, !pkg)
  }

  async function publish() {
    if (!pkg) return
    if (dirty && !(await persist())) return
    setSaving(true)
    const res = await call("publish")
    setSaving(false)
    if (!res?.ok) return fail(res, "Não foi possível publicar.")
    toast.success("Roteiro publicado")
    done(pkg.id)
  }

  async function unpublish() {
    if (!pkg) return
    if (dirty && !(await persist())) return
    setSaving(true)
    const res = await call("unpublish")
    setSaving(false)
    if (!res?.ok) return fail(res, "Não foi possível voltar para rascunho.")
    toast.success("Roteiro voltou para rascunho")
    done(pkg.id, false, true)
  }

  async function archive() {
    if (!pkg) return
    if (dirty && !window.confirm(LEAVE_MESSAGE)) return
    const id = pkg.id
    const res = await call("archive")
    if (!res?.ok) return fail(res, "Não foi possível arquivar.")
    toast("Roteiro arquivado", {
      action: {
        label: "Desfazer",
        onClick: async () => {
          const back = await call("restore", undefined, id)
          if (back?.ok) {
            toast.success("Roteiro restaurado")
            onSaved({ id, created: false })
            router.refresh()
          } else {
            toast.error("Não foi possível restaurar.")
          }
        },
      },
    })
    discardAndClose()
    done(id, false, true)
  }

  async function restore() {
    if (!pkg) return
    if (dirty && !(await persist())) return
    const res = await call("restore")
    if (!res?.ok) return fail(res, "Não foi possível restaurar.")
    toast.success("Roteiro restaurado")
    done(pkg.id)
  }

  const setHighlight = (i: number, v: string) => set("highlights", form.highlights.map((h, idx) => (idx === i ? v : h)))

  return (
    <EditSheet
      open={open}
      title={pkg ? "Editar roteiro" : "Novo roteiro"}
      inline={inline}
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancelar</Button>
          {pkg?.status === "DRAFT" ? <Button variant="secondary" onClick={publish} disabled={saving}>Publicar</Button> : null}
          {pkg?.status === "PUBLISHED" ? <Button variant="secondary" onClick={unpublish} disabled={saving}>Voltar para rascunho</Button> : null}
          <Button onClick={save} loading={saving} disabled={!dirty}>Salvar</Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "var(--space-4)" }}>
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Input label="Nome" value={form.name} onChange={(e) => set("name", e.target.value)} />
        <Textarea label="Descrição" rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} />
        <Input label="Preço (R$)" type="number" min="0" step="0.01" inputMode="decimal" value={form.price} onChange={(e) => set("price", e.target.value)} />
        <Input label="Duração (horas)" type="number" min="1" step="1" inputMode="numeric" value={form.duration} onChange={(e) => set("duration", e.target.value)} />
        <Input label="Capacidade" type="number" min="1" step="1" inputMode="numeric" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
        <Select label="Dificuldade" value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)}>
          <option value="EASY">Fácil</option>
          <option value="MODERATE">Moderado</option>
          <option value="HARD">Difícil</option>
        </Select>

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

        <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: "var(--space-2)" }}>
          <legend className="capi-field__label">Destaques ({form.highlights.length}/10)</legend>
          {form.highlights.map((h, i) => (
            <div key={i} style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-end" }}>
              <Input label={`Destaque ${i + 1}`} hideLabel value={h} onChange={(e) => setHighlight(i, e.target.value)} className="flex-1" />
              <IconButton icon={X} label={`Remover destaque ${i + 1}`} onClick={() => set("highlights", form.highlights.filter((_, idx) => idx !== i))} />
            </div>
          ))}
          {form.highlights.length < 10 ? (
            <Button variant="secondary" size="sm" iconLeft={Plus} onClick={() => set("highlights", [...form.highlights, ""])}>
              Adicionar destaque
            </Button>
          ) : null}
        </fieldset>

        {pkg ? (
          <div style={{ paddingTop: "var(--space-4)", borderTop: "1px solid var(--border)" }}>
            {pkg.status === "HIDDEN"
              ? <Button variant="secondary" onClick={restore}>Restaurar roteiro</Button>
              : <Button variant="secondary" onClick={archive}>Arquivar roteiro</Button>}
          </div>
        ) : null}
      </div>
    </EditSheet>
  )
}
