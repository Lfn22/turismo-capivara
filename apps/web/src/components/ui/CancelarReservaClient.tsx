'use client'

import { useState } from 'react'
import { XCircle } from 'lucide-react'
import { Alert, Button } from '@/src/components/ui/capi'

type State = 'IDLE' | 'LOADING' | 'DONE' | 'ERROR'

/** Cancelamento pelo link do e-mail de reserva (?token=). */
export default function CancelarReservaClient({ slug, token }: { slug: string; token: string }) {
  const [state, setState] = useState<State>('IDLE')
  const [errorMsg, setErrorMsg] = useState('')
  const minhaReservaHref = `/${slug}/minha-reserva`

  if (!token) {
    return (
      <Alert tone="warning" title="Link de cancelamento inválido">
        Consulte sua reserva com o e-mail e o código em <a href={minhaReservaHref}>Minha reserva</a>
        .
      </Alert>
    )
  }

  async function handleCancel() {
    setState('LOADING')
    try {
      const res = await fetch(`/api/${slug}/bookings/cancel-self`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrorMsg(
          res.status === 429
            ? 'Muitas tentativas. Tente novamente em alguns minutos.'
            : (data.message ?? data.error ?? 'Não foi possível cancelar a reserva.'),
        )
        setState('ERROR')
        return
      }
      setState('DONE')
    } catch {
      setErrorMsg('Ocorreu um erro. Tente novamente ou entre em contato com a operadora.')
      setState('ERROR')
    }
  }

  if (state === 'DONE') {
    return (
      <Alert tone="success" title="Reserva cancelada">
        Você receberá a confirmação por e-mail.
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Cancelar reserva</h1>
      <p>Tem certeza de que deseja cancelar sua reserva? Esta ação não pode ser desfeita.</p>
      {state === 'ERROR' && <Alert tone="danger" title={errorMsg} />}
      <Button
        size="lg"
        fullWidth
        variant="danger"
        iconLeft={XCircle}
        onClick={handleCancel}
        disabled={state === 'LOADING'}
      >
        Confirmar cancelamento
      </Button>
      <Button href={minhaReservaHref} variant="secondary" fullWidth>
        Voltar para Minha reserva
      </Button>
    </div>
  )
}
