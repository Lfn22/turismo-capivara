'use server'

import { Resend } from 'resend'

export async function submitWaitlist(email: string): Promise<{ ok: boolean; error?: string }> {
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'Email inválido' }
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn('[waitlist] RESEND_API_KEY not set — skipping email delivery')
    return { ok: true }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    await Promise.all([
      resend.emails.send({
        from: 'CAPI <noreply@capi.com.br>',
        to: email,
        subject: 'Você está na lista de espera do CAPI',
        html: '<p>Obrigado! Vamos te avisar quando o CAPI estiver disponível para você.</p>',
      }),
      ...(process.env.WAITLIST_NOTIFY_EMAIL
        ? [
            resend.emails.send({
              from: 'CAPI <noreply@capi.com.br>',
              to: process.env.WAITLIST_NOTIFY_EMAIL,
              subject: `Nova entrada na waitlist: ${email}`,
              html: `<p>Email: ${email}</p><p>Data: ${new Date().toISOString()}</p>`,
            }),
          ]
        : []),
    ])

    return { ok: true }
  } catch (err) {
    console.error('[waitlist] Email send failed:', err)
    return { ok: false, error: 'Não conseguimos registrar seu email. Tente novamente.' }
  }
}
