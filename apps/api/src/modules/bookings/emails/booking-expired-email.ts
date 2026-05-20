export const bookingExpiredSubject = 'Sua reserva expirou — CAPI'

interface BookingExpiredEmailParams {
  bookingId: string
  customerName: string
  packageName: string
  slug: string
}

export function bookingExpiredEmailText({
  bookingId,
  customerName,
  packageName,
  slug,
}: BookingExpiredEmailParams): string {
  return `Olá, ${customerName}!

Infelizmente sua reserva expirou pois o pagamento não foi efetuado no prazo.

Código da reserva: ${bookingId}
Passeio: ${packageName}

Para fazer uma nova reserva, acesse: https://capi.turismo/${slug}

— Equipe CAPI`
}
