import { Resend } from 'resend'

export function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping email delivery')
    return null
  }
  return new Resend(process.env.RESEND_API_KEY)
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM ?? 'CAPI <noreply@capi.turismo>'
}
