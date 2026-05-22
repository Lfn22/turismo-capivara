import { describe, it, expect } from 'vitest'
import { bookingConfirmedSubject, bookingConfirmedEmailText } from './booking-confirmed-email'

describe('bookingConfirmedEmail', () => {
  it('NOTIF-02: subject is correct', () => {
    expect(bookingConfirmedSubject).toBe('Reserva confirmada — CAPI')
  })

  it('NOTIF-02: text includes all booking details', () => {
    const result = bookingConfirmedEmailText({
      bookingId: 'booking-456',
      customerName: 'Ana Paula',
      packageName: 'Trilha do Rio Negro',
      guideName: 'Pedro Guia',
      startsAt: new Date('2025-07-20T08:00:00-03:00'),
      meetingPoint: 'Portão principal do parque',
    })
    expect(result).toContain('Ana Paula')
    expect(result).toContain('booking-456')
    expect(result).toContain('Trilha do Rio Negro')
    expect(result).toContain('Pedro Guia')
    expect(result).toContain('Ponto de encontro: Portão principal do parque')
    expect(result).toContain('— Equipe CAPI')
  })

  it('NOTIF-02: omits meeting point line when meetingPoint is null', () => {
    const result = bookingConfirmedEmailText({
      bookingId: 'booking-789',
      customerName: 'Lucas',
      packageName: 'Passeio de Barco',
      guideName: 'Fernanda',
      startsAt: new Date('2025-08-10T09:00:00Z'),
      meetingPoint: null,
    })
    expect(result).not.toContain('Ponto de encontro')
  })

  it('NOTIF-02: includes formatted date from startsAt', () => {
    const result = bookingConfirmedEmailText({
      bookingId: 'b-3',
      customerName: 'Teste',
      packageName: 'Passeio',
      guideName: 'Guia',
      startsAt: new Date('2025-09-15T10:00:00Z'),
      meetingPoint: null,
    })
    expect(result).toContain('Data e hora:')
  })
})
