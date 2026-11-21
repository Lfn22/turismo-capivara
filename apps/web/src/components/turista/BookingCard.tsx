import Link from 'next/link'
import Image from 'next/image'
import BookingStatusBadge from './BookingStatusBadge'

export type BookingCardData = {
  id: string
  code: string
  status: string
  pax: number
  startsAt: string
  packageName: string
  coverImageUrl?: string | null
  durationHours?: number | null
  difficulty?: string | null
  tenantName: string
}

type Props = { booking: BookingCardData }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function BookingCard({ booking }: Props) {
  const { id, status, pax, startsAt, packageName, coverImageUrl, tenantName } = booking
  return (
    <>
      <style>{`
        .bcard {
          display: flex;
          gap: var(--space-4, 16px);
          align-items: flex-start;
          padding: var(--space-4, 16px);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          background: var(--surface);
          text-decoration: none;
          color: inherit;
          transition: box-shadow 0.15s;
        }
        .bcard:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }
        .bcard__thumb {
          width: 72px;
          height: 72px;
          border-radius: var(--radius-md);
          object-fit: cover;
          flex-shrink: 0;
          background: var(--bg-muted);
        }
        .bcard__thumb-placeholder {
          width: 72px;
          height: 72px;
          border-radius: var(--radius-md);
          background: var(--bg-muted);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }
        .bcard__body {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .bcard__name {
          font-size: var(--text-base);
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bcard__meta {
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }
        .bcard__footer {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 4px;
        }
        .bcard__tenant {
          font-size: var(--text-xs);
          color: var(--text-secondary);
        }
      `}</style>
      <Link href={`/minha-conta/viagens/${id}`} className="bcard">
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt={packageName}
            width={72}
            height={72}
            className="bcard__thumb"
          />
        ) : (
          <span className="bcard__thumb-placeholder" aria-hidden="true">
            🗺️
          </span>
        )}
        <div className="bcard__body">
          <span className="bcard__name">{packageName}</span>
          <span className="bcard__meta">
            {formatDate(startsAt)} · {pax} {pax === 1 ? 'pessoa' : 'pessoas'}
          </span>
          <div className="bcard__footer">
            <BookingStatusBadge status={status} />
            <span className="bcard__tenant">{tenantName}</span>
          </div>
        </div>
      </Link>
    </>
  )
}
