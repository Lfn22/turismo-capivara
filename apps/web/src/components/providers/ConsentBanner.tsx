'use client'

import { useState, useEffect, createContext, useContext } from 'react'

const CONSENT_KEY = 'capi-cookie-consent'
type ConsentValue = 'accepted' | 'rejected' | null

const ConsentContext = createContext<ConsentValue>(null)

export function useConsent(): ConsentValue {
  return useContext(ConsentContext)
}

export function ConsentBanner() {
  const [consent, setConsent] = useState<ConsentValue>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY) as ConsentValue
    if (stored === 'accepted' || stored === 'rejected') {
      setConsent(stored)
    } else {
      setVisible(true)
    }
  }, [])

  function accept() {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setVisible(false)
    window.location.reload()
  }

  function reject() {
    localStorage.setItem(CONSENT_KEY, 'rejected')
    setConsent('rejected')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Consentimento de cookies"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: '#faf8f5',
        borderTop: '1px solid #e8e0d5',
        padding: '16px 20px',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <p
          style={{
            flex: '1 1 280px',
            margin: 0,
            fontSize: 14,
            color: '#6B5D4F',
            lineHeight: 1.5,
          }}
        >
          Usamos cookies para melhorar sua experiência e analisar o uso do site.{' '}
          <a
            href="/politica-privacidade"
            style={{ color: '#C4852A', textDecoration: 'underline' }}
          >
            Política de Privacidade
          </a>
          .
        </p>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={reject}
            style={{
              padding: '8px 18px',
              borderRadius: 999,
              border: '1.5px solid #C4852A',
              background: 'transparent',
              color: '#C4852A',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Recusar
          </button>
          <button
            onClick={accept}
            style={{
              padding: '8px 18px',
              borderRadius: 999,
              border: 'none',
              background: '#C4852A',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  )
}
