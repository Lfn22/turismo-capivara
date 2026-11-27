'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Minus, Plus } from 'lucide-react'
import { Alert, Button, IconButton, Input } from '@/src/components/ui/capi'
import '@/src/styles/animations.css'
import { posthog } from '@/src/lib/posthog'
import { errorText } from '@/lib/edit-client'
import { formatCurrency } from '@/src/lib/format'
import { guidesFor, groupTotalCents } from '@/src/lib/group-price'

const PAX_MIN = 1
const PAX_FALLBACK_MAX = 8

function isValidCPF(cpf: string): boolean {
  if (/^(\d)\1{10}$/.test(cpf)) return false
  const digits = cpf.split('').map(Number)
  let sum = 0
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i)
  let remainder = sum % 11
  const digit1 = remainder < 2 ? 0 : 11 - remainder
  if (digits[9] !== digit1) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i)
  remainder = sum % 11
  const digit2 = remainder < 2 ? 0 : 11 - remainder
  return digits[10] === digit2
}

interface BookingFormProps {
  slotId: string
  packageId: string
  slug: string
}

interface PackageSlot {
  id: string
  maxGuides: number
  maxPax: number
  available: boolean
}

interface PackageInfo {
  price: number
  extraGuidePrice: number | null
  departureSlots: PackageSlot[]
}

const toCents = (reais: number) => Math.round(reais * 100)

interface FormState {
  guestName: string
  email: string
  phone: string
  cpf: string
  pax: number
}

export default function BookingForm({ slotId, packageId, slug }: BookingFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    guestName: '',
    email: '',
    phone: '',
    cpf: '',
    pax: 1,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cpfError, setCpfError] = useState<string | null>(null)
  const [pkg, setPkg] = useState<PackageInfo | null>(null)
  const [pkgLoading, setPkgLoading] = useState(true)
  const [isPrivate, setIsPrivate] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/tenants/${slug}/packages/${packageId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setPkg(data)
      })
      .catch(() => {
        // sem dados do roteiro: a API valida a reserva
      })
      .finally(() => {
        if (!cancelled) setPkgLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug, packageId])

  const slot = pkg?.departureSlots?.find((s) => s.id === slotId) ?? null
  const paxMax = slot?.maxPax ?? PAX_FALLBACK_MAX
  // o detalhe público só lista horários OPEN futuros: fora da lista = já reservado
  const unavailable = pkg != null && (slot == null || !slot.available)
  const guides = guidesFor(form.pax)
  const totalCents = pkg
    ? groupTotalCents(
        toCents(pkg.price),
        pkg.extraGuidePrice == null ? null : toCents(pkg.extraGuidePrice),
        form.pax,
      )
    : null

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) || 1 : value,
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const rawCpf = form.cpf.replace(/\D/g, '')
    if (rawCpf.length !== 11 || !isValidCPF(rawCpf)) {
      setCpfError(rawCpf.length !== 11 ? 'CPF deve ter 11 dígitos' : 'CPF inválido')
      setLoading(false)
      return
    }
    setCpfError(null)

    posthog.capture('booking_started', { packageId, pax: form.pax })

    try {
      const res = await fetch(`/api/${slug}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId,
          customerName: form.guestName,
          customerEmail: form.email,
          customerPhone: form.phone,
          customerCpf: form.cpf.replace(/\D/g, ''),
          pax: form.pax,
          isPrivate,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(errorText(data, 'Erro ao realizar reserva. Tente novamente.'))
      }

      const data = await res.json()
      const bookingId: string = data?.id ?? data?.data?.id ?? ''
      // CR-01: validate bookingId is a non-empty alphanumeric ID (cuid, uuid, cuid2, nanoid)
      const ID_RE = /^[a-zA-Z0-9_-]{10,}$/
      if (!ID_RE.test(bookingId)) {
        throw new Error('Resposta inválida do servidor. Tente novamente.')
      }
      router.push(
        `/${slug}/checkout?bookingId=${bookingId}&email=${encodeURIComponent(form.email)}`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
      setLoading(false)
    }
  }

  function changePax(delta: number) {
    setForm((prev) => ({
      ...prev,
      pax: Math.min(paxMax, Math.max(PAX_MIN, prev.pax + delta)),
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Pessoas */}
      <section
        aria-labelledby="pax-label"
        className="rounded-2xl border border-line bg-surface p-4"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p id="pax-label" className="m-0 font-semibold text-fg">
              Número de pessoas
            </p>
            <p className="m-0 text-sm text-fg-secondary">Até {paxMax} por reserva</p>
          </div>
          <div className="flex items-center gap-2" role="group" aria-labelledby="pax-label">
            <IconButton
              icon={Minus}
              label="Remover uma pessoa"
              variant="secondary"
              onClick={() => changePax(-1)}
              disabled={loading || form.pax <= PAX_MIN}
            />
            <output
              htmlFor="pax"
              aria-live="polite"
              className="min-w-8 text-center text-lg font-bold tabular-nums text-fg"
            >
              {form.pax}
            </output>
            <IconButton
              icon={Plus}
              label="Adicionar uma pessoa"
              variant="secondary"
              onClick={() => changePax(1)}
              disabled={loading || pkgLoading || form.pax >= paxMax}
            />
            <input id="pax" name="pax" type="hidden" value={form.pax} />
          </div>
        </div>
        {pkg && totalCents != null && (
          <dl className="m-0 mt-4 flex flex-col gap-1 border-t border-line pt-3 text-sm">
            <p className="m-0 font-semibold text-fg">
              {form.pax} {form.pax === 1 ? 'pessoa' : 'pessoas'} · {guides}{' '}
              {guides === 1 ? 'guia' : 'guias'}
            </p>
            <div className="flex justify-between">
              <dt>Valor do grupo (até 8 pessoas)</dt>
              <dd className="m-0">{formatCurrency(toCents(pkg.price), 'BRL')}</dd>
            </div>
            {guides > 1 && pkg.extraGuidePrice != null && (
              <div className="flex justify-between">
                <dt>Guia extra × {guides - 1}</dt>
                <dd className="m-0">
                  {formatCurrency(toCents(pkg.extraGuidePrice) * (guides - 1), 'BRL')}
                </dd>
              </div>
            )}
            <div className="flex justify-between font-bold text-fg">
              <dt>Total</dt>
              <dd className="m-0">{formatCurrency(totalCents, 'BRL')}</dd>
            </div>
          </dl>
        )}
      </section>

      <label className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-sm text-fg">
        <input
          type="checkbox"
          name="isPrivate"
          className="mt-1"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
          disabled={loading}
        />
        <span>Grupo privativo — somos um grupo fechado e não queremos dividir o passeio</span>
      </label>

      {unavailable && (
        <Alert tone="warning">Este horário já foi reservado. Escolha outro horário.</Alert>
      )}

      {/* Dados do responsável */}
      <section aria-labelledby="guest-title" className="flex flex-col gap-4">
        <h2 id="guest-title" className="m-0 text-lg">
          Quem vai na reserva
        </h2>
        <Input
          id="guestName"
          name="guestName"
          type="text"
          label="Nome completo"
          required
          autoComplete="name"
          value={form.guestName}
          onChange={handleChange}
          placeholder="Seu nome"
          disabled={loading}
        />
        <Input
          id="email"
          name="email"
          type="email"
          label="E-mail"
          hint="Enviamos o código da reserva para este e-mail."
          required
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
          placeholder="seu@email.com"
          disabled={loading}
        />
        <Input
          id="phone"
          name="phone"
          type="tel"
          label="Telefone / WhatsApp"
          required
          autoComplete="tel"
          value={form.phone}
          onChange={handleChange}
          placeholder="(11) 99999-9999"
          disabled={loading}
        />
        <Input
          id="cpf"
          name="cpf"
          type="text"
          label="CPF"
          required
          inputMode="numeric"
          maxLength={14}
          value={form.cpf}
          onChange={handleChange}
          onBlur={(e) => {
            const val = e.target.value.replace(/\D/g, '')
            if (val.length === 0) {
              setCpfError(null)
            } else if (val.length !== 11) {
              setCpfError('CPF deve ter 11 dígitos')
            } else if (!isValidCPF(val)) {
              setCpfError('CPF inválido')
            } else {
              setCpfError(null)
            }
          }}
          error={cpfError}
          placeholder="000.000.000-00"
          disabled={loading}
        />
      </section>

      {error && (
        <Alert tone="danger" title="Não foi possível concluir a reserva">
          {error}
        </Alert>
      )}

      {/* CTA: fixo no rodapé no mobile, no fluxo do formulário a partir de 1024px */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto" style={{ maxWidth: 'var(--container-form)' }}>
          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={loading}
            disabled={pkgLoading || unavailable}
            iconRight={loading ? undefined : ArrowRight}
          >
            {loading ? 'Processando…' : 'Ir para pagamento'}
          </Button>
        </div>
      </div>
    </form>
  )
}
