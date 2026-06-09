import React from 'react'

interface DestinationStatusBadgeProps {
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pendente',
    backgroundColor: '#FEF3C7',
    color: '#B45309',
    borderColor: '#FDE68A',
    tooltip: 'Aguardando aprovação do administrador',
  },
  APPROVED: {
    label: 'Aprovado',
    backgroundColor: '#F0FDF4',
    color: '#15803D',
    borderColor: '#BBF7D0',
    tooltip: 'Visível no marketplace',
  },
  REJECTED: {
    label: 'Rejeitado',
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    borderColor: '#FECACA',
    tooltip: 'Destino não aprovado. Entre em contato com o suporte.',
  },
}

export function DestinationStatusBadge({ status }: DestinationStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '11px',
        fontWeight: 500,
        padding: '4px 8px',
        borderRadius: '12px',
        backgroundColor: config.backgroundColor,
        color: config.color,
        border: `1px solid ${config.borderColor}`,
        cursor: 'help',
        whiteSpace: 'nowrap',
      }}
      title={config.tooltip}
    >
      {config.label}
    </span>
  )
}
