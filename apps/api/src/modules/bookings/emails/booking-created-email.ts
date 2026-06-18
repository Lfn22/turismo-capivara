export const bookingCreatedSubject = 'Reserva recebida — CAPI'

interface BookingCreatedEmailParams {
  bookingId: string
  customerName: string
  qrCode: string
  paymentUrl: string
  expiresAt: Date
  cancelToken: string
  tenantSlug: string
}

export function bookingCreatedEmailText({
  bookingId,
  customerName,
  qrCode,
  paymentUrl,
  expiresAt,
  cancelToken,
  tenantSlug,
}: BookingCreatedEmailParams): string {
  const deadline = expiresAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const cancelUrl = `https://${tenantSlug}.capi.com.br/minha-reserva/cancelar?token=${cancelToken}`
  return `Olá, ${customerName}!

Sua reserva foi recebida com sucesso.

Código da reserva: ${bookingId}

Para confirmar sua reserva, efetue o pagamento via PIX:
Código PIX (copia e cola): ${qrCode}

Ou acesse o link de pagamento: ${paymentUrl}

Prazo para pagamento: ${deadline}

Após o prazo, a reserva será cancelada automaticamente.

Caso precise cancelar sua reserva (até 24h antes da partida):
${cancelUrl}

— Equipe CAPI`
}
