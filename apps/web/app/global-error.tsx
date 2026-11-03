'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 'clamp(2rem, 8vw, 4rem) 1rem',
            gap: '1rem',
            minHeight: '100dvh',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <p
            style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
              fontWeight: 600,
              color: '#6B5D4F',
              margin: 0,
            }}
          >
            Algo deu errado
          </p>
          <p
            style={{
              fontSize: 'clamp(0.875rem, 2vw, 1rem)',
              color: '#6B5D4F',
              opacity: 0.7,
              margin: 0,
              maxWidth: '360px',
              lineHeight: 1.5,
            }}
          >
            Ocorreu um erro inesperado. Tente novamente.
          </p>
          <button
            onClick={reset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.75rem 1.5rem',
              minHeight: '44px',
              background: '#C4852A',
              color: '#fff',
              fontSize: '0.9375rem',
              fontWeight: 600,
              borderRadius: '9999px',
              border: 'none',
              cursor: 'pointer',
              marginTop: '0.5rem',
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}
