"use client"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PackageCard } from "@/src/components/ui/capi"
import { editCall } from "@/lib/edit-client"
import { EditableSection } from "./EditableSection"
import { useEditMode } from "./EditModeProvider"
import { NewPackageCard } from "./NewPackageCard"
import { PackageEditor, type EditablePackage } from "./PackageEditor"
import { StatusBadge } from "./StatusBadge"

type ListItem = EditablePackage & { editable: boolean }

/**
 * Lista de roteiros do destino. Com o modo edição desligado (visitante inclusive), devolve só os filhos
 * (a lista pública renderizada no servidor) e não faz nenhuma chamada. Ligado, troca pela lista de edição.
 */
export function PackageListEdit({ destinationSlug, children }: { destinationSlug: string; children: ReactNode }) {
  const { enabled, scope } = useEditMode()
  const [items, setItems] = useState<ListItem[] | null>(null)
  const [creatable, setCreatable] = useState<{ slug: string; name: string }[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const load = useCallback(async () => {
    const res = await editCall("GET", `/api/proxy?path=${encodeURIComponent(`/edit/destinations/${destinationSlug}/packages`)}`).catch(() => null)
    if (res?.ok) {
      const list: ListItem[] = res.data?.packages ?? []
      setItems(list)
      setCreatable(res.data?.creatableTenants ?? [])
      return list
    }
    return null
  }, [destinationSlug])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    editCall("GET", `/api/proxy?path=${encodeURIComponent(`/edit/destinations/${destinationSlug}/packages`)}`)
      .then((res) => { if (cancelled || !res.ok) return
        setItems(res.data?.packages ?? [])
        setCreatable(res.data?.creatableTenants ?? []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [enabled, destinationSlug])

  if (!enabled || !scope || items === null) return <>{children}</>

  const editing = items.find((p) => p.id === editingId) ?? null

  return (
    <>
      <div className="capi-grid-cards" id="roteiros">
        {creatable.length > 0 ? (
          <NewPackageCard
            tenants={creatable}
            onCreated={(id) => { void load().then(() => { setVersion((v) => v + 1); setEditingId(id) }) }}
          />
        ) : null}
        {items.map((p) => (
          <div key={p.id} style={{ position: "relative", opacity: p.status === "PUBLISHED" ? 1 : 0.55 }}>
            <PackageCard
              // Rascunho e oculto não têm página pública (404): sem link
              href={p.status === "PUBLISHED" ? `/${p.tenantSlug}/roteiros/${p.id}` : undefined}
              package={{
                name: p.name,
                durationMinutes: p.duration * 60,
                priceFrom: Math.round(Number(p.price) * 100),
                difficulty: p.difficulty,
                coverImageUrl: p.photos?.[0] ?? null,
              }}
            />
            {p.status !== "PUBLISHED" ? (
              <div style={{ position: "absolute", top: "var(--space-3)", left: "var(--space-3)" }}>
                <StatusBadge status={p.status} />
              </div>
            ) : null}
            <button
              type="button"
              className="capi-editable__btn"
              onClick={() => (p.editable ? setEditingId(p.id) : toast("Roteiro de outra agência"))}
            >
              ✏️ Editar
            </button>
          </div>
        ))}
      </div>
      {editing ? (
        <PackageEditor
          key={`${editing.id}-${version}`}
          tenantSlug={editing.tenantSlug}
          pkg={editing}
          open
          onClose={() => setEditingId(null)}
          onSaved={() => { void load().then(() => setVersion((v) => v + 1)) }}
        />
      ) : null}
    </>
  )
}

/** Bloco título/descrição/fotos/destaques da página oficial do roteiro. Sem modo edição, só os filhos. */
export function PackageEditSection({ pkg, conductorId, destinationSlug, children }: { pkg: EditablePackage; conductorId: string | null; destinationSlug?: string | null; children: ReactNode }) {
  const router = useRouter()
  const { canEditPackage } = useEditMode()
  const [open, setOpen] = useState(false)
  const editable = canEditPackage({ tenantSlug: pkg.tenantSlug, conductorId })
  return (
    <>
      <EditableSection editable={editable} deniedMessage="Roteiro de outra agência" onEdit={() => setOpen(true)}>
        {children}
      </EditableSection>
      {editable ? (
        <PackageEditor
          tenantSlug={pkg.tenantSlug}
          pkg={pkg}
          open={open}
          onClose={() => setOpen(false)}
          onSaved={() => setOpen(false)}
          // Rascunho/arquivado some desta página: leva para a lista, onde o item aparece com selo e Publicar/Restaurar.
          // Sem destino vinculado, a lista pública não mostra rascunhos: vai para a lista do painel.
          onLeavePublic={() => router.push(destinationSlug ? `/destinos/${destinationSlug}/roteiros` : `/${pkg.tenantSlug}/painel/roteiros`)}
        />
      ) : null}
    </>
  )
}
