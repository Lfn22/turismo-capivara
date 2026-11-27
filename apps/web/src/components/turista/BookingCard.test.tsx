import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BookingCard from './BookingCard'

describe('BookingCard', () => {
  it('mostra guias e selo Privativo', () => {
    render(
      <BookingCard
        booking={{
          id: 'b1',
          code: 'ABC123',
          status: 'CONFIRMED',
          pax: 12,
          guides: 2,
          isPrivate: true,
          startsAt: '2027-01-04T11:00:00.000Z',
          packageName: 'Trilha',
          tenantName: 'CAPI',
        }}
      />,
    )
    expect(screen.getByText(/2 guias/)).toBeInTheDocument()
    expect(screen.getByText(/Privativo/)).toBeInTheDocument()
  })
})
