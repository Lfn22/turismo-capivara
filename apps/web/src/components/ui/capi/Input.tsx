import { ChevronDown, CircleAlert, type LucideIcon } from "lucide-react"
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react"
import { cx } from "./utils"

type FieldBase = {
  label: ReactNode
  hint?: ReactNode
  error?: string | null
  optional?: boolean
  leadingIcon?: LucideIcon
  className?: string
  /** Esconde o rótulo visualmente (continua para leitor de tela). */
  hideLabel?: boolean
}

function Field({
  id, label, hint, error, optional, leadingIcon: Lead, className, hideLabel, isSelect, children,
}: FieldBase & { id: string; isSelect?: boolean; children: ReactNode }) {
  return (
    <div className={cx("capi-field", error && "is-invalid", Lead && "has-icon", isSelect && "is-select", className)}>
      <label htmlFor={id} className={cx("capi-field__label", hideLabel && "sr-only-capi")}>
        {label}
        {optional ? <span className="capi-field__opt"> (opcional)</span> : null}
      </label>
      <div className="capi-field__wrap">
        {Lead ? (
          <span className="capi-field__icon">
            <Lead size={18} strokeWidth={1.75} aria-hidden="true" />
          </span>
        ) : null}
        {children}
        {isSelect ? (
          <span className="capi-field__chev">
            <ChevronDown size={18} strokeWidth={1.75} aria-hidden="true" />
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-err`} className="capi-field__error" role="alert">
          <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="capi-field__hint">{hint}</p>
      ) : null}
    </div>
  )
}

function describedBy(id: string, error?: string | null, hint?: ReactNode) {
  return error ? `${id}-err` : hint ? `${id}-hint` : undefined
}

export type InputProps = FieldBase & Omit<InputHTMLAttributes<HTMLInputElement>, "className">

/** Campo de texto com rótulo, dica e erro. 48px de altura, fonte 16px. */
export function Input({ label, hint, error, optional, leadingIcon, className, hideLabel, id, type = "text", ...rest }: InputProps) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Field id={fid} label={label} hint={hint} error={error} optional={optional} leadingIcon={leadingIcon} className={className} hideLabel={hideLabel}>
      <input
        id={fid}
        type={type}
        className="capi-field__control"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, error, hint)}
        {...rest}
      />
    </Field>
  )
}

export type SelectProps = FieldBase &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> & {
    options?: Array<string | { value: string; label: string; disabled?: boolean }>
  }

export function Select({ label, hint, error, optional, leadingIcon, className, hideLabel, id, options, children, ...rest }: SelectProps) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Field id={fid} label={label} hint={hint} error={error} optional={optional} leadingIcon={leadingIcon} className={className} hideLabel={hideLabel} isSelect>
      <select
        id={fid}
        className="capi-field__control"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, error, hint)}
        {...rest}
      >
        {options
          ? options.map((o) => {
              const opt = typeof o === "string" ? { value: o, label: o } : o
              return (
                <option key={opt.value} value={opt.value} disabled={"disabled" in opt ? opt.disabled : undefined}>
                  {opt.label}
                </option>
              )
            })
          : children}
      </select>
    </Field>
  )
}

export type TextareaProps = FieldBase & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">

export function Textarea({ label, hint, error, optional, className, hideLabel, id, rows = 4, ...rest }: TextareaProps) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Field id={fid} label={label} hint={hint} error={error} optional={optional} className={className} hideLabel={hideLabel}>
      <textarea
        id={fid}
        rows={rows}
        className="capi-field__control"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, error, hint)}
        {...rest}
      />
    </Field>
  )
}
