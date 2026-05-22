import { describe, it, expect } from 'vitest'
import { bookingCreatedSubject, bookingCreatedEmailText } from './booking-created-email'

describe('bookingCreatedEmail', () => {
  it('NOTIF-01: subject is correct', () => {
    expect(bookingCreatedSubject).toBe('Reserva recebida — CAPI')
  })

  it('NOTIF-01: text includes bookingId, customerName, qrCode, paymentUrl', () => {
    const result = bookingCreatedEmailText({
      bookingId: 'booking-123',
      customerName: 'João Silva',
      qrCode: 'pix-qr-code-abc',
      paymentUrl: 'https://pagamento.capi.turismo/abc',
      expiresAt: new Date('2025-01-15T12:00:00-03:00'),
    })
    expect(result).toContain('João Silva')
    expect(result).toContain('booking-123')
    expect(result).toContain('pix-qr-code-abc')
    expect(result).toContain('https://pagamento.capi.turismo/abc')
  })

  it('NOTIF-01: text includes payment deadline from expiresAt', () => {
    const expiresAt = new Date('2025-06-01T18:00:00Z')
    const result = bookingCreatedEmailText({
      bookingId: 'b-1',
      customerName: 'Maria',
      qrCode: 'qr',
      paymentUrl: 'http://pay.example',
      expiresAt,
    })
    // Must mention a deadline (formatted date string present)
    expect(result).toContain('Prazo para pagamento')
    expect(result).toContain('— Equipe CAPI')
  })

  it('NOTIF-01: text warns booking will be cancelled after deadline', () => {
    const result = bookingCreatedEmailText({
      bookingId: 'b-2',
      customerName: 'Carlos',
      qrCode: 'qr2',
      paymentUrl: 'http://pay2.example',
      expiresAt: new Date(),
    })
    expect(result).toContain('cancelada automaticamente')
  })
})
