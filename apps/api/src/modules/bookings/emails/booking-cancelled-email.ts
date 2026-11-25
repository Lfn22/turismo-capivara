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

interface BookingCancelledByOperatorParams extends BookingCancelledEmailParams {
  refunded: boolean
}

/** Cancelamento feito pela operadora (roteiro arquivado/despublicado, guia saiu). */
export function bookingCancelledByOperatorEmailText({
  customerName,
  packageName,
  startsAt,
  refunded,
}: BookingCancelledByOperatorParams): string {
  const dateStr = startsAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const money = refunded
    ? 'O valor pago foi estornado integralmente para a sua forma de pagamento.'
    : 'Nenhuma cobrança foi feita — o PIX pendente foi cancelado.'
  return `Olá, ${customerName}!

Infelizmente a operadora cancelou o passeio abaixo e sua reserva foi cancelada.

Passeio: ${packageName}
Data e hora: ${dateStr}

${money}

Se quiser reagendar, entre em contato com a operadora.

— Equipe CAPI`
}
