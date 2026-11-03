'use client'
import { useCallback } from 'react'
import { Button, Modal } from '@/src/components/ui/capi'

interface CancelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  loading?: boolean
}

/** Confirmação de cancelamento: Modal do CAPI v2 (sheet no mobile), "Manter reserva" + "Sim, cancelar" (danger). */
export default function CancelDialog({ open, onOpenChange, onConfirm, loading }: CancelDialogProps) {
  const handleClose = useCallback(() => {
    if (!loading) onOpenChange(false)
  }, [loading, onOpenChange])

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Cancelar esta reserva?"
      description="A vaga neste horário será liberada e esta ação não pode ser desfeita."
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Manter reserva
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {loading ? 'Cancelando…' : 'Sim, cancelar'}
          </Button>
        </>
      }
    />
  )
}
