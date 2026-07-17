'use client'

import React, { useState, useCallback } from 'react'
import { PhotoUploadArea } from './PhotoUploadArea'

const BRAZIL_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
]

export interface DestinationFormValues {
  name: string
  description: string
  state: string
  photos: string[]
  highlights: string[]
}

interface DestinationFormErrors {
  name?: string
  description?: string
  state?: string
}

interface DestinationFormProps {
  initialValues?: Partial<DestinationFormValues>
  slug: string
  onSubmit: (values: DestinationFormValues) => Promise<void>
  submitting?: boolean
  submitLabel?: string
  onCancel?: () => void
}

function validate(values: DestinationFormValues): DestinationFormErrors {
  const errors: DestinationFormErrors = {}
  if (!values.name || values.name.length < 3) {
    errors.name = 'Nome deve ter entre 3 e 100 caracteres.'
  } else if (values.name.length > 100) {
    errors.name = 'Nome deve ter no máximo 100 caracteres.'
  }
  if (!values.description || values.description.length < 10) {
    errors.description = 'Descrição deve ter entre 10 e 1000 caracteres.'
  } else if (values.description.length > 1000) {
    errors.description = 'Descrição deve ter no máximo 1000 caracteres.'
  }
  if (!values.state) {
    errors.state = 'Selecione um estado.'
  }
  return errors
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  fontSize: '16px',
  padding: '12px',
  borderRadius: '4px',
  border: '1px solid var(--stone-300, #d6d3d1)',
  background: '#fff',
  color: 'var(--stone-900, #1c1917)',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--stone-700, #44403c)',
  marginBottom: '6px',
}

const ERROR_STYLE: React.CSSProperties = {
  fontSize: '12px',
  color: '#DC2626',
  marginTop: '4px',
}

export function DestinationForm({
  initialValues = {},
  slug,
  onSubmit,
  submitting = false,
  submitLabel = 'Salvar destino',
  onCancel,
}: DestinationFormProps) {
  const [values, setValues] = useState<DestinationFormValues>({
    name: initialValues.name ?? '',
    description: initialValues.description ?? '',
    state: initialValues.state ?? '',
    photos: initialValues.photos ?? [],
    highlights: initialValues.highlights ?? [],
  })
  const [errors, setErrors] = useState<DestinationFormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const handleChange = useCallback(
    (field: keyof DestinationFormValues) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const next = { ...values, [field]: e.target.value }
        setValues(next)
        if (touched[field]) {
          setErrors(validate(next))
        }
      },
    [values, touched],
  )

  const handleBlur = useCallback(
    (field: string) => () => {
      setTouched((t) => ({ ...t, [field]: true }))
      setErrors(validate(values))
    },
    [values],
  )

  const handleAddPhoto = useCallback(
    async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/uploads/photos?folder=destinations`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erro no upload' }))
        throw new Error(err.message ?? 'Erro no upload')
      }
      const { url } = await res.json()
      setValues((v) => ({ ...v, photos: [...v.photos, url] }))
    },
    [],
  )

  const handleRemovePhoto = useCallback((url: string) => {
    setValues((v) => ({ ...v, photos: v.photos.filter((p) => p !== url) }))
  }, [])

  const handleHighlightChange = useCallback((index: number, value: string) => {
    setValues((v) => {
      const next = [...v.highlights]
      next[index] = value
      return { ...v, highlights: next }
    })
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setTouched({ name: true, description: true, state: true })
      const errs = validate(values)
      setErrors(errs)
      if (Object.keys(errs).length > 0) return
      await onSubmit(values)
    },
    [values, onSubmit],
  )

  const hasErrors = Object.keys(validate(values)).length > 0

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Name */}
      <div>
        <label htmlFor="dest-name" style={LABEL_STYLE}>
          Nome do destino <span style={{ color: '#DC2626' }}>*</span>
        </label>
        <input
          id="dest-name"
          type="text"
          value={values.name}
          onChange={handleChange('name')}
          onBlur={handleBlur('name')}
          placeholder="Ex: Serra da Capivara"
          maxLength={100}
          style={INPUT_STYLE}
          aria-invalid={!!errors.name}
        />
        {touched.name && errors.name && <p style={ERROR_STYLE}>{errors.name}</p>}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="dest-description" style={LABEL_STYLE}>
          Descrição <span style={{ color: '#DC2626' }}>*</span>
        </label>
        <textarea
          id="dest-description"
          value={values.description}
          onChange={handleChange('description')}
          onBlur={handleBlur('description')}
          placeholder="Descreva o destino para os turistas..."
          maxLength={1000}
          rows={5}
          style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: '120px' }}
          aria-invalid={!!errors.description}
        />
        <p style={{ fontSize: '11px', color: 'var(--stone-400)', marginTop: '4px', textAlign: 'right' }}>
          {values.description.length}/1000
        </p>
        {touched.description && errors.description && (
          <p style={ERROR_STYLE}>{errors.description}</p>
        )}
      </div>

      {/* State */}
      <div>
        <label htmlFor="dest-state" style={LABEL_STYLE}>
          Estado <span style={{ color: '#DC2626' }}>*</span>
        </label>
        <select
          id="dest-state"
          value={values.state}
          onChange={handleChange('state')}
          onBlur={handleBlur('state')}
          style={{ ...INPUT_STYLE, appearance: 'auto' }}
          aria-invalid={!!errors.state}
        >
          <option value="">Selecione um estado</option>
          {BRAZIL_STATES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.value} — {s.label}
            </option>
          ))}
        </select>
        {touched.state && errors.state && <p style={ERROR_STYLE}>{errors.state}</p>}
      </div>

      {/* Photos */}
      <div>
        <label style={LABEL_STYLE}>Fotos (máximo 5)</label>
        <PhotoUploadArea
          photos={values.photos}
          onAdd={handleAddPhoto}
          onRemove={handleRemovePhoto}
          maxPhotos={5}
        />
      </div>

      {/* Highlights */}
      <div>
        <label style={LABEL_STYLE}>Pontos de interesse (máximo 4)</label>
        <p style={{ fontSize: '13px', color: 'var(--stone-500, #78716c)', marginBottom: '12px', marginTop: 0 }}>
          Nomes dos pontos exibidos sobre as fotos. Ex: "Cachoeira do Salto"
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              type="text"
              placeholder={`Ponto ${i + 1}`}
              value={values.highlights[i] ?? ''}
              onChange={(e) => handleHighlightChange(i, e.target.value)}
              maxLength={80}
              style={INPUT_STYLE}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
        <button
          type="submit"
          disabled={submitting || hasErrors}
          style={{
            width: '100%',
            minHeight: '44px',
            padding: '12px',
            background: 'var(--ochre, #c2783c)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: submitting || hasErrors ? 'not-allowed' : 'pointer',
            opacity: submitting || hasErrors ? 0.65 : 1,
            letterSpacing: '0.04em',
          }}
        >
          {submitting ? 'Salvando...' : submitLabel}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              width: '100%',
              minHeight: '44px',
              padding: '12px',
              background: 'transparent',
              border: 'none',
              color: 'var(--stone-500, #78716c)',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
