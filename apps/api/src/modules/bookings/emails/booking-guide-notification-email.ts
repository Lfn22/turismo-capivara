export const bookingGuideNotificationSubject = 'Nova reserva recebida — CAPI'

interface BookingGuideNotificationParams {
  bookingId: string
  customerName: string
  pax: number
  packageName: string
  slotDate: Date
}

export function bookingGuideNotificationEmailText({
  bookingId,
  customerName,
  pax,
  packageName,
  slotDate,
}: BookingGuideNotificationParams): string {
  const date = slotDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  return `Nova reserva recebida!

Roteiro: ${packageName}
Data: ${date}
Cliente: ${customerName}
Participantes: ${pax}
Código da reserva: ${bookingId}

O cliente já recebeu as instruções de pagamento via PIX.

— Equipe CAPI`
}
