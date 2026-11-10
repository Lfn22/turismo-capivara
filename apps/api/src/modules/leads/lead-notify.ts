import type { FastifyBaseLogger } from 'fastify'
import type { Lead } from '@prisma/client'
import { getEmailFrom, getResend } from '../../shared/email'

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function notifyLeadCreated(
  log: FastifyBaseLogger,
  lead: Lead & { destinationTitle: string; packageName?: string },
): Promise<void> {
  try {
    const to = process.env.LEAD_NOTIFY_EMAIL
    const resend = to ? getResend() : null
    if (!to || !resend) {
      log.warn({ leadId: lead.id }, '[leads] LEAD_NOTIFY_EMAIL/RESEND não configurado — e-mail de novo lead não enviado')
      return
    }

    const rows: [string, string | null][] = [
      ['Nome', lead.name],
      ['WhatsApp', lead.whatsapp],
      ['Destino', lead.destinationTitle],
      ['Roteiro', lead.packageName ?? null],
      ['Mês da viagem', lead.travelMonth],
      ['utm_source', lead.utmSource],
      ['utm_medium', lead.utmMedium],
      ['utm_campaign', lead.utmCampaign],
      ['utm_content', lead.utmContent],
      ['utm_term', lead.utmTerm],
    ]
    const html = rows
      .filter(([, v]) => v)
      .map(([k, v]) => `<p><strong>${k}:</strong> ${esc(v as string)}</p>`)
      .join('')

    const result = await resend.emails.send({
      from: getEmailFrom(),
      to,
      subject: `Novo lead: ${lead.name} — ${lead.destinationTitle}`,
      html,
    })
    if (result?.error) {
      log.warn({ err: result.error, leadId: lead.id }, '[leads] Resend retornou erro ao notificar novo lead')
    }
  } catch (err) {
    log.warn({ err, leadId: lead.id }, 'Falha ao notificar novo lead')
  }
}
