"use client"
import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { fetchEditScope, type EditScope } from "@/lib/edit-client"

const STORAGE_KEY = "capi:edit-mode"
const EDIT_ROLES = ["SUPER_ADMIN", "PLATFORM_ADMIN", "ADMIN", "CONDUTOR"]

type EditModeValue = {
  enabled: boolean
  available: boolean
  scope: EditScope | null
  setEnabled(v: boolean): void
  registerDirty(id: string, dirty: boolean): void
  canEditDestination(slug: string): boolean
  canEditPackage(p: { tenantSlug: string; conductorId: string | null }): boolean
}

const EditModeContext = createContext<EditModeValue>({
  enabled: false,
  available: false,
  scope: null,
  setEnabled: () => {},
  registerDirty: () => {},
  canEditDestination: () => false,
  canEditPackage: () => false,
})

export function useEditMode(): EditModeValue {
  return useContext(EditModeContext)
}

function readStored(): boolean {
  if (typeof window === "undefined") return false
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

// Reage a cada navegação (inclusive só de query string): ?editar=1 liga o modo e some da URL.
function EditParamWatcher({ onEditParam }: { onEditParam: () => void }) {
  const searchParams = useSearchParams()
  const editar = searchParams.get("editar")
  useEffect(() => {
    if (editar === "1") onEditParam()
  }, [editar, onEditParam])
  return null
}

export function EditModeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const role = session?.user?.role as string | undefined
  // Sem sessão ou com papel sem edição (CLIENTE), nenhuma chamada a /edit/* é feita.
  const eligible = status === "authenticated" && !!role && EDIT_ROLES.includes(role)

  const [scope, setScope] = useState<EditScope | null>(null)
  const [flag, setFlag] = useState(readStored)
  const [dirtyCount, setDirtyCount] = useState(0)
  const dirtyRef = useRef(new Set<string>())

  useEffect(() => {
    if (!eligible) return
    let cancelled = false
    fetchEditScope()
      .then((s) => {
        if (cancelled) return
        setScope(s)
      })
      .catch(() => { if (!cancelled) setScope(null) })
    return () => { cancelled = true }
  }, [eligible])

  // Ao sair da conta o modo edição não sobrevive para o próximo login na mesma aba
  if (status === "unauthenticated" && flag) setFlag(false)
  useEffect(() => {
    if (status !== "unauthenticated") return
    try { sessionStorage.removeItem(STORAGE_KEY) } catch {}
  }, [status])

  const available = eligible && scope !== null
  const enabled = available && flag

  // Atributo no <html> deixa o CSS trocar a barra "Reservar" pela barra "Modo edição · Sair".
  useEffect(() => {
    if (!enabled) return
    document.documentElement.dataset.editMode = "1"
    return () => { delete document.documentElement.dataset.editMode }
  }, [enabled])

  const enableFromUrl = useCallback(() => {
    try { sessionStorage.setItem(STORAGE_KEY, "1") } catch {}
    setFlag(true)
    const url = new URL(window.location.href)
    url.searchParams.delete("editar")
    router.replace(url.pathname + url.search + url.hash)
  }, [router])

  const setEnabled = useCallback((v: boolean) => {
    if (!v && dirtyRef.current.size > 0 && !window.confirm("Você tem alterações não salvas. Sair mesmo assim?")) return
    if (!v) {
      dirtyRef.current.clear()
      setDirtyCount(0)
    }
    try {
      if (v) sessionStorage.setItem(STORAGE_KEY, "1")
      else sessionStorage.removeItem(STORAGE_KEY)
    } catch {}
    setFlag(v)
  }, [])

  const registerDirty = useCallback((id: string, dirty: boolean) => {
    if (dirty) dirtyRef.current.add(id)
    else dirtyRef.current.delete(id)
    setDirtyCount(dirtyRef.current.size)
  }, [])

  useEffect(() => {
    if (dirtyCount === 0) return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [dirtyCount])

  const value = useMemo<EditModeValue>(() => ({
    enabled,
    available,
    scope,
    setEnabled,
    registerDirty,
    canEditDestination: (slug) =>
      available && !!scope && (scope.destinations === "ALL" || scope.destinations.includes(slug)),
    canEditPackage: (p) => {
      if (!available || !scope) return false
      const s = scope.packages
      if (s === "ALL") return true
      if ("tenantSlug" in s) return s.tenantSlug === p.tenantSlug
      return p.conductorId !== null && s.conductorId === p.conductorId
    },
  }), [enabled, available, scope, setEnabled, registerDirty])

  return (
    <EditModeContext.Provider value={value}>
      {available && (
        // useSearchParams exige Suspense; este leaf não renderiza nada, então não afeta o resto do app.
        <Suspense fallback={null}>
          <EditParamWatcher onEditParam={enableFromUrl} />
        </Suspense>
      )}
      {children}
    </EditModeContext.Provider>
  )
}
