'use client'

import { MapPin, Pencil, Trash2 } from 'lucide-react'
import { Button, Media } from '@/src/components/ui/capi'
import { DestinationStatusBadge } from './DestinationStatusBadge'

export interface PainelDestination {
  id: string
  name: string
  state: string
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdById: string | null
  createdAt: string
  rejectionReason: string | null
  photos: string[]
}

interface PainelDestinationCardProps {
  destination: PainelDestination
  isOwner: boolean
  showStatus?: boolean
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function PainelDestinationCard({
  destination,
  isOwner,
  showStatus = true,
  onEdit,
  onDelete,
}: PainelDestinationCardProps) {
  const thumbnail = destination.photos[0] ?? null

  return (
    <>
      <style precedence="default">{`
        .pdcard {
          display: flex;
          flex-direction: column;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-xs);
          font-family: var(--font-sans);
        }
        .pdcard__media.capi-media { border-radius: 0; }
        .pdcard__status {
          position: absolute;
          top: var(--space-3);
          left: var(--space-3);
          z-index: 1;
        }
        .pdcard__body {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          flex: 1;
          padding: var(--space-4);
        }
        .pdcard__name {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          line-height: 1.35;
          color: var(--text);
        }
        .pdcard__state {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin: 0;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .pdcard__meta {
          margin: 0;
          font-size: 13px;
          color: var(--text-tertiary);
        }
        .pdcard__reason {
          margin: 0;
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-sm);
          background: var(--danger-subtle);
          color: var(--danger);
          font-size: 13px;
          line-height: 1.45;
        }
        .pdcard__actions {
          display: flex;
          gap: var(--space-2);
          margin-top: auto;
          padding-top: var(--space-2);
        }
        .pdcard__actions .capi-btn { min-height: var(--touch-target, 44px); }
      `}</style>
      <article className="pdcard">
        <Media
          src={thumbnail}
          alt={destination.name}
          ratio="16 / 9"
          placeholder="mountain"
          className="pdcard__media"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        >
          {showStatus && (
            <span className="pdcard__status">
              <DestinationStatusBadge status={destination.approvalStatus} />
            </span>
          )}
        </Media>

        <div className="pdcard__body">
          <h2 className="pdcard__name">{destination.name}</h2>
          <p className="pdcard__state">
            <MapPin size={14} strokeWidth={1.75} aria-hidden="true" />
            {destination.state}
          </p>

          {showStatus && (
            <>
              <p className="pdcard__meta">
                Enviado em {new Date(destination.createdAt).toLocaleDateString('pt-BR')}
              </p>
              {destination.approvalStatus === 'REJECTED' && destination.rejectionReason && (
                <p className="pdcard__reason">Motivo: {destination.rejectionReason}</p>
              )}
            </>
          )}

          {isOwner && (onEdit || onDelete) && (
            <div className="pdcard__actions">
              {onEdit && (
                <Button
                  variant="secondary"
                  size="sm"
                  iconLeft={Pencil}
                  onClick={() => onEdit(destination.id)}
                  aria-label={`Editar ${destination.name}`}
                >
                  Editar
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  iconLeft={Trash2}
                  onClick={() => onDelete(destination.id)}
                  aria-label={`Excluir ${destination.name}`}
                >
                  Excluir
                </Button>
              )}
            </div>
          )}
        </div>
      </article>
    </>
  )
}
