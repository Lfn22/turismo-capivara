"use client"
import { useEditMode } from "./EditModeProvider"

export function EditModeBanner() {
  const { enabled, scope, setEnabled } = useEditMode()
  if (!enabled) return null
  return (
    <>
      <div className="capi-editbanner" role="status">
        <span className="capi-editbanner__label">{scope?.label}</span>
        <button type="button" className="capi-editbanner__exit" onClick={() => setEnabled(false)}>
          Sair do modo edição
        </button>
      </div>
      <div className="capi-editbar">
        <span>Modo edição</span>
        <span aria-hidden="true">·</span>
        <button type="button" className="capi-editbanner__exit" onClick={() => setEnabled(false)}>
          Sair
        </button>
      </div>
    </>
  )
}
