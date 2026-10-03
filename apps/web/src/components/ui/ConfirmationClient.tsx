'use client'

import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'
import { Clock } from 'lucide-react'
import { Alert, Badge } from '@/src/components/ui/capi'

interface ConfirmationClientProps {
  qrCode: string | null
  expiresAt: string | null
  slug: string
  status: string
}

function useCountdown(expiresAt: string | null, active: boolean) {
  const [seconds, setSeconds] = useState<number | null>(null)

  useEffect(() => {
    if (!expiresAt || !active) return
    const target = new Date(expiresAt).getTime()

    function tick() {
      const diff = Math.floor((target - Date.now()) / 1000)
      setSeconds(diff > 0 ? diff : 0)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, active])

  return seconds
}

export default function ConfirmationClient({ qrCode, expiresAt, slug: _slug, status }: ConfirmationClientProps) {
  const isPending = status === 'PENDING'
  const seconds = useCountdown(expiresAt, isPending)

  if (!isPending) return null

  return (
    <section
      aria-labelledby="pix-pending-title"
      className="mt-4 flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-5 text-center"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <h2 id="pix-pending-title" className="m-0 text-lg">Pagamento via PIX</h2>
      {seconds !== null && seconds > 0 && (
        <Badge tone="warning" icon={Clock}>
          Tempo para confirmação do PIX:{' '}
          <span className="tabular-nums">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </span>
        </Badge>
      )}
      {seconds === 0 && (
        <Alert tone="danger" title="PIX expirado" className="w-full text-left" />
      )}
      {qrCode && (
        <figure className="m-0 flex flex-col items-center gap-2">
          <div
            className="rounded-xl p-3"
            style={{ background: 'var(--sand-0)', color: 'var(--sand-900)', border: '1px solid var(--border)' }}
          >
            <QRCode
              value={qrCode}
              size={200}
              level="M"
              bgColor="transparent"
              fgColor="currentColor"
              style={{ display: 'block', height: 'auto', maxWidth: '100%', width: 'min(200px, 60vw)' }}
            />
          </div>
          <figcaption className="text-sm text-fg-secondary">
            Escaneie com o app do seu banco
          </figcaption>
        </figure>
      )}
    </section>
  )
}
