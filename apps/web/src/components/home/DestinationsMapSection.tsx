'use client'

import { useRef, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'
import type { DestinationPin } from './DestinationsMap'

export type { DestinationPin }

function MapSkeleton() {
  return (
    <div
      role="status"
      style={{
        position: 'relative',
        width: '100%',
        height: 280,
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        background: 'var(--bg-muted)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans)',
        fontSize: '14px',
        fontWeight: 500,
        color: 'var(--text-secondary)',
      }}
    >
      <span
        className="capi-skel"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, borderRadius: 0 }}
      />
      <MapPin size={24} strokeWidth={1.75} aria-hidden="true" style={{ position: 'relative' }} />
      <span style={{ position: 'relative' }}>Carregando mapa…</span>
    </div>
  )
}

const DestinationsMap = dynamic(() => import('./DestinationsMap'), {
  ssr: false,
  loading: () => <MapSkeleton />,
})

interface DestinationsMapSectionProps {
  destinations: DestinationPin[]
}

export default function DestinationsMapSection({ destinations }: DestinationsMapSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  if (destinations.length === 0) return null

  return (
    <section className="capi-section" aria-labelledby="home-mapa-title">
      <div className="capi-container">
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <p
            style={{ marginBottom: 'var(--space-2)' }}
            className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-primary"
          >
            Mapa
          </p>
          <h2
            id="home-mapa-title"
            className="font-[family-name:var(--font-display)] text-[clamp(28px,4vw,44px)] font-bold leading-tight text-fg"
          >
            Onde estamos
          </h2>
        </div>
        <div ref={ref}>
          {visible ? <DestinationsMap destinations={destinations} /> : <MapSkeleton />}
        </div>
      </div>
    </section>
  )
}
