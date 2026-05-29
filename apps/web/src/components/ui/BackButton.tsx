'use client'

import { useRouter } from 'next/navigation'

export default function BackButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.back()}
      aria-label="Voltar para página anterior"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        color: 'var(--stone-600)',
        fontFamily: 'var(--font-body)',
        fontSize: '0.875rem',
        fontWeight: 500,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0.75rem 0',
        minHeight: '44px',
        minWidth: '44px',
        textDecoration: 'none',
      }}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--stone-800)'
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--stone-600)'
      }}
    >
      ← Voltar
    </button>
  )
}
