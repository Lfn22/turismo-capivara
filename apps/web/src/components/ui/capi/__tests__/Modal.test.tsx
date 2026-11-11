import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Modal } from '../Modal'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} onClose={vi.fn()} title="Test" />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders dialog when open', () => {
    render(<Modal open={true} onClose={vi.fn()} title="Confirmar reserva" />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Confirmar reserva')).toBeInTheDocument()
  })

  it('has aria-modal and aria-labelledby', () => {
    render(<Modal open={true} onClose={vi.fn()} title="Cancelar" />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby')
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<Modal open={true} onClose={onClose} title="Test" />)
    fireEvent.click(screen.getByLabelText('Fechar'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn()
    render(<Modal open={true} onClose={onClose} title="Test" />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders children in body', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Test">
        <p>Conteúdo do modal</p>
      </Modal>,
    )
    expect(screen.getByText('Conteúdo do modal')).toBeInTheDocument()
  })

  it('renders footer when provided', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Test" footer={<button>Confirmar</button>}>
        Body
      </Modal>,
    )
    expect(screen.getByText('Confirmar')).toBeInTheDocument()
  })

  it('shows description when provided', () => {
    render(<Modal open={true} onClose={vi.fn()} title="Cancelar" description="Tem certeza?" />)
    expect(screen.getByText('Tem certeza?')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby')
  })
})
