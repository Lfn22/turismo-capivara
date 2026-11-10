'use client'

import { useRef, useState, type FormEvent } from 'react'
import { api, ApiError } from '../../lib/api'
import { posthog } from '../../lib/posthog'
import { trackPixel } from '../../lib/meta-pixel'
import { loadUtm } from '../../lib/utm'
import { normalizeWhatsapp } from '../../lib/whatsapp'
import { Alert, Button, Input, Select } from '../ui/capi'

type Props = {
  destinationSlug: string
  packageId?: string
  heading?: string
  compact?: boolean
}

function monthOptions() {
  const fmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { value, label: fmt.format(d).toLowerCase() }
  })
}

export function LeadForm({ destinationSlug, packageId, heading, compact }: Props) {
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [travelMonth, setTravelMonth] = useState('')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; whatsapp?: string; consent?: string }>({})
  const [failed, setFailed] = useState<false | 'retry' | 'unavailable'>(false)
  const [done, setDone] = useState(false)
  const [sending, setSending] = useState(false)
  const inFlight = useRef(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (inFlight.current) return

    const wa = normalizeWhatsapp(whatsapp)
    const next = {
      name: name.trim() ? undefined : 'Informe seu nome.',
      whatsapp: wa.error ?? (wa.value ? undefined : 'Informe seu WhatsApp.'),
      consent: consent ? undefined : 'Marque a autorização para continuar.',
    }
    setErrors(next)
    setFailed(false)
    if (next.name || next.whatsapp || next.consent) return

    inFlight.current = true
    setSending(true)
    const utm = loadUtm()
    try {
      await api('/leads', {
        method: 'POST',
        body: {
          name: name.trim(),
          whatsapp: wa.value,
          destinationSlug,
          ...(packageId ? { packageId } : {}),
          ...(travelMonth ? { travelMonth } : {}),
          consent: true,
          ...utm,
        },
      })
      if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
        posthog.capture('lead_created', { destinationSlug, packageId, travelMonth: travelMonth || undefined, ...utm })
      }
      trackPixel('Lead', { content_name: destinationSlug })
      setDone(true)
    } catch (err) {
      setFailed(err instanceof ApiError && err.status === 404 ? 'unavailable' : 'retry')
    } finally {
      inFlight.current = false
      setSending(false)
    }
  }

  if (done) {
    return (
      <Alert tone="success">Recebemos! A equipe CAPI vai te chamar no WhatsApp em até 24 h.</Alert>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate style={{ display: 'grid', gap: 'var(--space-4)', maxWidth: compact ? undefined : 480 }}>
      {heading ? <p style={{ fontWeight: 700, color: 'var(--text)' }}>{heading}</p> : null}
      {failed ? (
        <Alert tone="danger">
          {failed === 'unavailable'
            ? 'Este destino não está recebendo pedidos no momento.'
            : 'Não foi possível enviar agora. Tente de novo em instantes.'}
        </Alert>
      ) : null}
      <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="name" />
      <Input
        label="WhatsApp"
        type="tel"
        inputMode="tel"
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value)}
        error={errors.whatsapp}
        autoComplete="tel"
      />
      <Select
        label="Quando pretende ir?"
        optional
        value={travelMonth}
        onChange={(e) => setTravelMonth(e.target.value)}
      >
        <option value="">Ainda não sei</option>
        {monthOptions().map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
      <div>
        <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', fontSize: 14 }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
          <span>
            Autorizo a CAPI a me chamar no WhatsApp sobre esta viagem.{' '}
            <a href="/politica-privacidade" target="_blank" rel="noopener" style={{ textDecoration: 'underline' }}>
              Política de privacidade
            </a>
          </span>
        </label>
        {errors.consent ? <p role="alert" style={{ marginTop: 4, fontSize: 14, color: 'var(--danger, #b91c1c)' }}>{errors.consent}</p> : null}
      </div>
      <Button type="submit" loading={sending} disabled={sending}>Quero ir</Button>
    </form>
  )
}
