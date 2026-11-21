'use client'

import { Map, List } from 'lucide-react'

interface MapToggleFabProps {
  showMap: boolean
  onToggle: () => void
}

export default function MapToggleFab({ showMap, onToggle }: MapToggleFabProps) {
  const Icon = showMap ? List : Map
  const label = showMap ? 'Lista' : 'Mapa'

  return (
    <>
      <style>{mapToggleFabStyles}</style>
      <button
        type="button"
        className="map-toggle-fab"
        onClick={onToggle}
        aria-label={showMap ? 'Mostrar lista' : 'Mostrar mapa'}
      >
        <Icon size={18} strokeWidth={2} aria-hidden="true" />
        {label}
      </button>
    </>
  )
}

const mapToggleFabStyles = `
  .map-toggle-fab {
    all: unset;
    position: fixed;
    bottom: calc(64px + env(safe-area-inset-bottom) + 12px);
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-fab, 50);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    border-radius: 999px;
    background: var(--fg, #1a1a1a);
    color: #fff;
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    transition: transform 150ms ease, box-shadow 150ms ease;
    -webkit-tap-highlight-color: transparent;
  }
  .map-toggle-fab:hover {
    transform: translateX(-50%) scale(1.04);
    box-shadow: 0 6px 16px rgba(0,0,0,0.3);
  }
  .map-toggle-fab:active {
    transform: translateX(-50%) scale(0.97);
  }
  @media (min-width: 1024px) {
    .map-toggle-fab { display: none; }
  }
`
