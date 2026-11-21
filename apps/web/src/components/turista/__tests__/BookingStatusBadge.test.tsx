import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import BookingStatusBadge from '../BookingStatusBadge'

describe('BookingStatusBadge', () => {
  it.each([
    ['PENDING', 'Pendente'],
    ['CONFIRMED', 'Confirmada'],
    ['COMPLETED', 'Concluída'],
    ['CANCELLED', 'Cancelada'],
    ['CHECKED_IN', 'Check-in'],
    ['NO_SHOW', 'Ausente'],
    ['EXPIRED', 'Expirada'],
  ])('exibe label para status %s', (status, label) => {
    render(<BookingStatusBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
