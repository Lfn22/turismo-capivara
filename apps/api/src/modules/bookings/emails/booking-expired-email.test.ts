import { describe, it, expect } from 'vitest'
import { bookingExpiredSubject, bookingExpiredEmailText } from './booking-expired-email'

describe('bookingExpiredEmail', () => {
  it('NOTIF-04: subject is correct', () => {
    expect(bookingExpiredSubject).toBe('Sua reserva expirou — CAPI')
  })

  it('NOTIF-04: text includes bookingId, customerName, packageName and rebooking URL', () => {
    const result = bookingExpiredEmailText({
      bookingId: 'expired-001',
      customerName: 'Cláudia',
      packageName: 'Passeio nas Cataratas',
      slug: 'foz-tours',
    })
    expect(result).toContain('Cláudia')
    expect(result).toContain('expired-001')
    expect(result).toContain('Passeio nas Cataratas')
    expect(result).toContain('https://capi.turismo/foz-tours')
    expect(result).toContain('— Equipe CAPI')
  })

  it('NOTIF-04: text explains payment was not made in time', () => {
    const result = bookingExpiredEmailText({
      bookingId: 'e-2',
      customerName: 'Bruno',
      packageName: 'Tour Urbano',
      slug: 'city-tour',
    })
    expect(result).toContain('expirou')
    expect(result).toContain('pagamento')
  })
})
