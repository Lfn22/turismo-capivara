"use client"
import type { MouseEvent, ReactNode } from "react"
import { toast } from "sonner"
import { useEditMode } from "./EditModeProvider"

export type EditableSectionProps = {
  editable: boolean
  deniedMessage: string
  onEdit: () => void
  children: ReactNode
}

/** Com o modo edição desligado, renderiza só os filhos, sem marcação extra. */
export function EditableSection({ editable, deniedMessage, onEdit, children }: EditableSectionProps) {
  const { enabled } = useEditMode()
  if (!enabled) return <>{children}</>
  if (!editable) {
    // Cliques em controles próprios (ex.: "Quero atuar") seguem o fluxo normal, sem aviso.
    const warn = (e: MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("a, button, input, select, textarea, [role=button]")) return
      toast(deniedMessage)
    }
    return <div onClick={warn}>{children}</div>
  }
  return (
    <div className="capi-editable">
      {children}
      <button type="button" className="capi-editable__btn" onClick={onEdit}>
        ✏️ Editar
      </button>
    </div>
  )
}
