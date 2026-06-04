'use client'
import * as Dialog from '@radix-ui/react-dialog'

interface CancelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  loading?: boolean
}

export default function CancelDialog({ open, onOpenChange, onConfirm, loading }: CancelDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 50,
          }}
        />
        <Dialog.Content
          className="cancel-dialog-content"
          style={{
            position: 'fixed',
            zIndex: 51,
            background: 'white',
            borderRadius: '8px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Drag handle — visível apenas em mobile via CSS */}
          <div
            className="cancel-dialog-drag-handle"
            aria-hidden="true"
            style={{
              width: '40px',
              height: '4px',
              borderRadius: '2px',
              background: 'var(--stone-300)',
              margin: '0 auto 16px',
            }}
          />
          <Dialog.Title
            style={{
              fontSize: '24px',
              fontWeight: 600,
              color: 'var(--stone-900)',
              marginBottom: '8px',
              lineHeight: 1.2,
            }}
          >
            Cancelar esta reserva?
          </Dialog.Title>
          <Dialog.Description
            style={{
              fontSize: '14px',
              fontWeight: 400,
              color: 'var(--stone-500)',
              marginBottom: '24px',
            }}
          >
            Esta ação não pode ser desfeita.
          </Dialog.Description>
          {/* Sim, cancelar — ação destrutiva — primeiro */}
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '4px',
              border: 'none',
              background: '#DC2626',
              color: 'white',
              fontSize: '16px',
              fontWeight: 600,
              minHeight: '44px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Cancelando...' : 'Sim, cancelar'}
          </button>
          {/* Manter reserva — fecha dialog sem ação */}
          <Dialog.Close asChild>
            <button
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '4px',
                border: 'none',
                background: 'var(--stone-100)',
                color: 'var(--stone-700)',
                fontSize: '16px',
                fontWeight: 600,
                minHeight: '44px',
                marginTop: '8px',
                cursor: 'pointer',
              }}
            >
              Manter reserva
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
