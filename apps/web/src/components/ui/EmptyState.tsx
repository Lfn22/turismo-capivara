import Link from 'next/link'

interface EmptyStateProps {
  title: string
  description?: string
  ctaLabel?: string
  ctaHref?: string
  onCtaClick?: () => void
}

export default function EmptyState({
  title,
  description,
  ctaLabel,
  ctaHref,
  onCtaClick,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'clamp(2rem, 8vw, 4rem) 1rem',
        gap: '1rem',
        minHeight: '200px',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
          fontWeight: 600,
          color: 'var(--stone-800)',
          margin: 0,
        }}
      >
        {title}
      </p>

      {description && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(0.875rem, 2vw, 1rem)',
            color: 'var(--stone-500)',
            margin: 0,
            maxWidth: '360px',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}

      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.75rem 1.5rem',
            minHeight: '44px',
            background: 'var(--brand)',
            color: '#fff',
            fontFamily: 'var(--font-body)',
            fontSize: '0.9375rem',
            fontWeight: 600,
            borderRadius: '0.5rem',
            textDecoration: 'none',
            marginTop: '0.5rem',
          }}
        >
          {ctaLabel}
        </Link>
      )}

      {ctaLabel && onCtaClick && !ctaHref && (
        <button
          onClick={onCtaClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.75rem 1.5rem',
            minHeight: '44px',
            background: 'var(--brand)',
            color: '#fff',
            fontFamily: 'var(--font-body)',
            fontSize: '0.9375rem',
            fontWeight: 600,
            borderRadius: '0.5rem',
            border: 'none',
            cursor: 'pointer',
            marginTop: '0.5rem',
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  )
}
