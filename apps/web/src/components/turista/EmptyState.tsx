import Link from 'next/link'

type Props = {
  title: string
  description: string
  ctaLabel?: string
  ctaHref?: string
}

export default function EmptyState({ title, description, ctaLabel, ctaHref }: Props) {
  return (
    <>
      <style>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: var(--space-10, 40px) var(--space-6, 24px);
          gap: var(--space-3, 12px);
        }
        .empty-state__icon {
          font-size: 2.5rem;
          line-height: 1;
        }
        .empty-state__title {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }
        .empty-state__desc {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          margin: 0;
          max-width: 320px;
        }
        .empty-state__cta {
          margin-top: var(--space-2, 8px);
          display: inline-flex;
          align-items: center;
          padding: 10px 20px;
          border-radius: var(--radius-md);
          background: var(--primary);
          color: var(--on-primary, #fff);
          font-size: var(--text-sm);
          font-weight: 600;
          text-decoration: none;
          transition: opacity 0.15s;
        }
        .empty-state__cta:hover {
          opacity: 0.88;
        }
      `}</style>
      <div className="empty-state">
        <span className="empty-state__icon" aria-hidden="true">
          📭
        </span>
        <h3 className="empty-state__title">{title}</h3>
        <p className="empty-state__desc">{description}</p>
        {ctaLabel && ctaHref && (
          <Link href={ctaHref} className="empty-state__cta">
            {ctaLabel}
          </Link>
        )}
      </div>
    </>
  )
}
