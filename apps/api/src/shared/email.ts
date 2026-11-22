import { Resend } from 'resend'

let resendInstance: Resend | null | undefined

export function getResend(): Resend | null {
  if (resendInstance !== undefined) return resendInstance

  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping email delivery')
    resendInstance = null
    return null
  }

  resendInstance = new Resend(process.env.RESEND_API_KEY)
  return resendInstance
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM ?? 'CAPI <noreply@capi.turismo>'
}
