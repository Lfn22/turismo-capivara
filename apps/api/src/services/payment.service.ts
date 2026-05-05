import { MercadoPagoConfig, Payment } from 'mercadopago'
import { AppError } from '../shared/errors/AppError'

if (!process.env.MP_ACCESS_TOKEN) {
  throw new Error('MP_ACCESS_TOKEN environment variable is required')
}

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
})

export interface PixPaymentResult {
  paymentId: string
  paymentUrl: string
  qrCode: string
  expiresAt: Date
}

interface CreatePixPaymentInput {
  bookingId: string
  transactionAmount: number
  description: string
  customerEmail: string
  customerCpf: string
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function attemptCreatePayment(
  input: CreatePixPaymentInput
): Promise<PixPaymentResult> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const response = await new Payment(client).create({
    body: {
      transaction_amount: input.transactionAmount,
      description: input.description,
      payment_method_id: 'pix',
      payment_type_id: 'bank_transfer',
      date_of_expiration: expiresAt.toISOString(),
      payer: {
        email: input.customerEmail,
        identification: {
          type: 'CPF',
          number: input.customerCpf.replace(/\D/g, ''),
        },
      },
      external_reference: input.bookingId,
    },
  })

  const ticketUrl = response.point_of_interaction?.transaction_data?.ticket_url
  const qrCode = response.point_of_interaction?.transaction_data?.qr_code

  if (!ticketUrl || !qrCode || !response.id) {
    throw new Error('Resposta do Mercado Pago incompleta')
  }

  return {
    paymentId: String(response.id),
    paymentUrl: ticketUrl,
    qrCode,
    expiresAt,
  }
}

export async function createPixPayment(
  input: CreatePixPaymentInput
): Promise<PixPaymentResult> {
  const maxAttempts = 3
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await attemptCreatePayment(input)
    } catch (err) {
      lastError = err
      if (attempt < maxAttempts) {
        const delayMs = Math.pow(2, attempt - 1) * 500 // 500ms, 1000ms
        await sleep(delayMs)
      }
    }
  }

  console.error('[PaymentService] createPixPayment failed after 3 attempts:', lastError)
  throw new AppError('Serviço de pagamento indisponível', 502)
}
