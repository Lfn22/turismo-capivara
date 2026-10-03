'use client'

import React, { useState, useCallback } from 'react'
import { Check } from 'lucide-react'
import { Badge, Button, Input, Select, Textarea } from '@/src/components/ui/capi'
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
  heroImageUrl?: string | null
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
    heroImageUrl: initialValues.heroImageUrl ?? null,
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
  const fieldError = (field: keyof DestinationFormErrors) =>
    touched[field] ? errors[field] : undefined

  return (
    <form onSubmit={handleSubmit} noValidate className="dform">
      <style precedence="default">{`
        .dform {
          display: flex;
          flex-direction: column;
          gap: var(--space-8);
          padding-bottom: calc(var(--space-20) + var(--space-4));
          font-family: var(--font-sans);
        }
        @media (min-width: 768px) {
          .dform { padding-bottom: 0; }
        }
        .dform__section {
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
          min-width: 0;
        }
        .dform__section + .dform__section {
          padding-top: var(--space-8);
          border-top: 1px solid var(--border);
        }
        .dform__head { display: flex; flex-direction: column; gap: var(--space-1); padding: 0; }
        .dform__title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          line-height: 1.35;
          color: var(--text);
        }
        .dform__desc {
          margin: 0;
          font-size: 14px;
          line-height: 1.5;
          color: var(--text-secondary);
        }
        .dform__label {
          margin: 0 0 var(--space-2);
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
        }
        .dform__covers {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
          gap: var(--space-2);
        }
        .dform__cover {
          position: relative;
          aspect-ratio: 1 / 1;
          padding: 0;
          border: 2px solid var(--border);
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: var(--bg-muted);
          cursor: pointer;
        }
        .dform__cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .dform__cover:hover { border-color: var(--border-strong); }
        .dform__cover.is-selected {
          border-color: var(--primary);
          box-shadow: 0 0 0 1px var(--primary);
        }
        .dform__cover:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
        .dform__cover-badge {
          position: absolute;
          left: var(--space-1);
          bottom: var(--space-1);
        }
        .dform__highlights { display: grid; gap: var(--space-3); }
        @media (min-width: 640px) {
          .dform__highlights { grid-template-columns: 1fr 1fr; }
        }
        .dform__bar {
          position: fixed;
          left: 0;
          right: 0;
          bottom: calc(var(--bottombar-height) + env(safe-area-inset-bottom, 0px));
          z-index: var(--z-sticky);
          display: flex;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          background: var(--surface);
          border-top: 1px solid var(--border);
          box-shadow: var(--shadow-md);
        }
        .dform__bar .dform__submit { flex: 1; }
        @media (min-width: 768px) {
          .dform__bar {
            position: static;
            justify-content: flex-end;
            padding: var(--space-6) 0 0;
            background: transparent;
            border-top: 1px solid var(--border);
            box-shadow: none;
          }
          .dform__bar .dform__submit { flex: 0 0 auto; }
        }
      `}</style>

      <section className="dform__section">
        <div className="dform__head">
          <h2 className="dform__title">Informações do destino</h2>
          <p className="dform__desc">
          Nome, estado e uma descrição que ajude o turista a decidir pela visita.
        </p>
        </div>

        <Input
          id="dest-name"
          label="Nome do destino"
          type="text"
          value={values.name}
          onChange={handleChange('name')}
          onBlur={handleBlur('name')}
          placeholder="Ex.: Serra da Capivara"
          maxLength={100}
          required
          error={fieldError('name')}
          hint="Entre 3 e 100 caracteres."
        />

        <Select
          id="dest-state"
          label="Estado (UF)"
          value={values.state}
          onChange={handleChange('state')}
          onBlur={handleBlur('state')}
          required
          error={fieldError('state')}
          options={[
            { value: '', label: 'Selecione um estado' },
            ...BRAZIL_STATES.map((s) => ({ value: s.value, label: `${s.value} — ${s.label}` })),
          ]}
        />

        <Textarea
          id="dest-description"
          label="Descrição"
          value={values.description}
          onChange={handleChange('description')}
          onBlur={handleBlur('description')}
          placeholder="Conte o que o turista vai encontrar: paisagens, história, melhor época…"
          maxLength={1000}
          rows={5}
          required
          error={fieldError('description')}
          hint={`${values.description.length}/1000 caracteres · mínimo de 10`}
        />
      </section>

      <section className="dform__section">
        <div className="dform__head">
          <h2 className="dform__title">Fotos</h2>
          <p className="dform__desc">
          Até 5 fotos. A primeira impressão do destino vem delas: prefira imagens horizontais e bem iluminadas.
        </p>
        </div>

        <PhotoUploadArea
          photos={values.photos}
          onAdd={handleAddPhoto}
          onRemove={handleRemovePhoto}
          maxPhotos={5}
        />

        {values.photos.length > 0 && (
          <div>
            <p className="dform__label">Foto de capa</p>
            <p className="dform__desc" style={{ marginBottom: 'var(--space-3)' }}>
              Escolha qual foto aparece no topo da página do destino.
            </p>
            <div className="dform__covers">
              {values.photos.map((url, i) => {
                const selected = values.heroImageUrl === url
                return (
                  <button
                    key={url}
                    type="button"
                    className={`dform__cover${selected ? ' is-selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() =>
                      setValues((v) => ({ ...v, heroImageUrl: v.heroImageUrl === url ? null : url }))
                    }
                    aria-label={`Definir foto ${i + 1} como capa`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- URLs de upload de hosts variados */}
                    <img src={url} alt="" />
                    {selected && (
                      <span className="dform__cover-badge">
                        <Badge tone="brand" icon={Check}>Capa</Badge>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </section>

      <section className="dform__section">
        <div className="dform__head">
          <h2 className="dform__title">Pontos de interesse</h2>
          <p className="dform__desc">
          Até 4 nomes exibidos sobre as fotos. Ex.: &ldquo;Cachoeira do Salto&rdquo;.
        </p>
        </div>
        <div className="dform__highlights">
          {[0, 1, 2, 3].map((i) => (
            <Input
              key={i}
              label={`Ponto ${i + 1}`}
              optional
              type="text"
              placeholder={i === 0 ? 'Ex.: Cachoeira do Salto' : undefined}
              value={values.highlights[i] ?? ''}
              onChange={(e) => handleHighlightChange(i, e.target.value)}
              maxLength={80}
            />
          ))}
        </div>
      </section>

      <div className="dform__bar">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          className="dform__submit"
          disabled={hasErrors}
          loading={submitting}
        >
          {submitting ? 'Salvando…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
