import { MercadoPagoConfig, Payment } from 'mercadopago'
import { AppError } from '../shared/errors/AppError'

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
  const token = process.env.MP_ACCESS_TOKEN
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  // 1. Bypass para ambiente de desenvolvimento (Mock)
  if (!token) {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('Serviço de pagamento temporariamente indisponível', 503)
    }
    console.warn('[PaymentService] MP_ACCESS_TOKEN ausente. Retornando pagamento Pix simulado (MOCK).')
    return {
      paymentId: `mock_${Date.now()}`,
      paymentUrl: 'https://mercadopago.com.br/mock-checkout',
      qrCode: '00020126580014br.gov.bcb.pix0136mock-pix-code-para-testes-locais',
      expiresAt,
    }
  }

  // 2. Execução Real com a API do Mercado Pago
  const client = new MercadoPagoConfig({ accessToken: token, options: { timeout: 8000 } })
  const response = await new Payment(client).create({
    body: {
      transaction_amount: input.transactionAmount,
      description: input.description,
      payment_method_id: 'pix',
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

  console.error('[PaymentService] createPixPayment falhou após 3 tentativas:', lastError)
  throw new AppError('Serviço de pagamento indisponível', 502)
}

// CR-003: Cancel an MP payment to avoid orphaned charges on DB rollback
export async function cancelPixPayment(paymentId: string): Promise<void> {
  const token = process.env.MP_ACCESS_TOKEN
  if (!token) return // dev mock — nothing to cancel
  await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'cancelled' }),
  })
}
