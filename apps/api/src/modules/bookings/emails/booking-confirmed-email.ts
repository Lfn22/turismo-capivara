export const bookingConfirmedSubject = 'Reserva confirmada — CAPI'

interface BookingConfirmedEmailParams {
  bookingId: string
  customerName: string
  packageName: string
  guideName: string
  startsAt: Date
  meetingPoint: string | null
}

export function bookingConfirmedEmailText({
  bookingId,
  customerName,
  packageName,
  guideName,
  startsAt,
  meetingPoint,
}: BookingConfirmedEmailParams): string {
  const dateStr = startsAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  return `Olá, ${customerName}!

Seu pagamento foi confirmado. Sua reserva está garantida!

Código da reserva: ${bookingId}
Passeio: ${packageName}
Guia: ${guideName}
Data e hora: ${dateStr}
${meetingPoint ? `Ponto de encontro: ${meetingPoint}` : ''}
Qualquer dúvida, entre em contato conosco.

— Equipe CAPI`
}
