'use client'

import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'

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
    <div style={{ marginTop: '1.5rem' }}>
      {seconds !== null && seconds > 0 && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          marginBottom: '1rem',
          minHeight: '48px',
        }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--stone-500)' }}>
            Tempo para confirmação do PIX
          </p>
          <span style={{
            fontVariantNumeric: 'tabular-nums',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#92400e',
          }}>
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </span>
        </div>
      )}
      {seconds === 0 && (
        <p style={{ color: '#991b1b', textAlign: 'center', fontWeight: 700 }}>PIX expirado</p>
      )}
      {qrCode && (
        <figure style={{ margin: 0, padding: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <QRCode
              value={qrCode}
              size={200}
              level="M"
              bgColor="#FAFAF7"
              fgColor="#1F0E08"
              style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
            />
          </div>
          <figcaption style={{
            fontSize: '0.8rem',
            color: 'var(--stone-500)',
            textAlign: 'center',
            marginTop: '8px',
          }}>
            Escaneie com o app do seu banco
          </figcaption>
        </figure>
      )}
    </div>
  )
}
