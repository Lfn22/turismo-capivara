'use client'

import React from 'react'
import { DestinationStatusBadge } from './DestinationStatusBadge'

export interface PainelDestination {
  id: string
  name: string
  state: string
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdById: string | null
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
          background: #fff;
          border: 1px solid var(--stone-200, #e7e5e4);
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .pdcard__thumb {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          background: var(--stone-800, #292524);
          overflow: hidden;
          flex-shrink: 0;
        }
        .pdcard__thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .pdcard__thumb-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--stone-800, #292524), var(--stone-700, #44403c));
          color: var(--stone-600, #57534e);
        }
        .pdcard__badge-overlay {
          position: absolute;
          top: 8px;
          left: 8px;
        }
        .pdcard__body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }
        .pdcard__state {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ochre, #c2783c);
          margin: 0;
        }
        .pdcard__name {
          font-family: var(--font-display, Georgia, serif);
          font-size: 16px;
          font-weight: 700;
          color: var(--stone-900, #1c1917);
          margin: 0;
          line-height: 1.3;
        }
        .pdcard__actions {
          display: flex;
          gap: 8px;
          margin-top: auto;
          padding-top: 8px;
        }
        .pdcard__btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          letter-spacing: 0.04em;
        }
        .pdcard__btn--edit {
          background: var(--ochre, #c2783c);
          color: white;
        }
        .pdcard__btn--delete {
          background: transparent;
          border: 1px solid var(--stone-300, #d6d3d1) !important;
          color: var(--stone-700, #44403c);
        }
        .pdcard__btn:hover {
          opacity: 0.85;
        }
      `}</style>
      <div className="pdcard">
        <div className="pdcard__thumb">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt={destination.name} />
          ) : (
            <div className="pdcard__thumb-placeholder" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
          )}
          {showStatus && (
            <div className="pdcard__badge-overlay">
              <DestinationStatusBadge status={destination.approvalStatus} />
            </div>
          )}
        </div>

        <div className="pdcard__body">
          <p className="pdcard__state">{destination.state}</p>
          <h2 className="pdcard__name">{destination.name}</h2>

          {isOwner && (onEdit || onDelete) && (
            <div className="pdcard__actions">
              {onEdit && (
                <button
                  type="button"
                  className="pdcard__btn pdcard__btn--edit"
                  onClick={() => onEdit(destination.id)}
                >
                  Editar
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  className="pdcard__btn pdcard__btn--delete"
                  onClick={() => onDelete(destination.id)}
                >
                  Excluir
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
