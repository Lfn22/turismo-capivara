"use client"
import { Modal as CapiModal } from "@/src/components/ui/capi"

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  /** Mantido por compatibilidade; o Modal do CAPI gera o id do título sozinho. */
  titleId?: string
  children: React.ReactNode
  maxWidth?: number
}

/**
 * Wrapper legado: mantém a API antiga e delega ao `Modal` do CAPI design system v2
 * (sheet no mobile, caixa centrada no desktop, Esc/clique fora/foco preso).
 * `maxWidth` acima de 560px vira `size="lg"`.
 */
export function Modal({ open, onClose, title, children, maxWidth = 480 }: ModalProps) {
  return (
    <CapiModal open={open} onClose={onClose} title={title} size={maxWidth > 560 ? "lg" : "md"}>
      {children}
    </CapiModal>
  )
}
