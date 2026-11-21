'use client'

interface PricePillProps {
  price: number
  name?: string
  selected?: boolean
  hovered?: boolean
  onClick?: () => void
}

export default function PricePill({ price, name, selected, hovered, onClick }: PricePillProps) {
  const formatted = price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  })

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={name ? `${formatted} — ${name}` : `${formatted} — ver detalhes`}
      className={[
        'map-price-pill',
        selected && 'map-price-pill--selected',
        hovered && 'map-price-pill--hovered',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {formatted}
    </button>
  )
}

export const pricePillStyles = `
  .map-price-pill {
    all: unset;
    display: inline-block;
    padding: 4px 8px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 700;
    font-family: var(--font-sans);
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    background: var(--bg-surface, #fff);
    color: var(--fg, #1a1a1a);
    border: 1px solid var(--border);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: all 150ms ease;
  }
  .map-price-pill:hover,
  .map-price-pill--hovered {
    background: var(--fg, #1a1a1a);
    color: var(--bg-surface, #fff);
    transform: scale(1.08);
    z-index: 1;
  }
  .map-price-pill--selected {
    background: var(--primary);
    color: #fff;
    border-color: var(--primary);
    transform: scale(1.08);
    z-index: 2;
  }
`
