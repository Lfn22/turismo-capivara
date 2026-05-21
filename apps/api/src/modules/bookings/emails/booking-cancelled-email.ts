interface BookingCancelledEmailParams {
  customerName: string
  packageName: string
  startsAt: Date
}

export function bookingCancelledEmailText({
  customerName,
  packageName,
  startsAt,
}: BookingCancelledEmailParams): string {
  const dateStr = startsAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  return `Olá, ${customerName}!

Seu cancelamento foi confirmado com sucesso.

Passeio: ${packageName}
Data e hora: ${dateStr}

Se tiver dúvidas ou quiser reagendar, entre em contato conosco.

— Equipe CAPI`
}
