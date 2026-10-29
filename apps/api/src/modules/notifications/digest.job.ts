import { FastifyInstance } from 'fastify'
import prisma from '../../database'
import { getResend, getEmailFrom } from '../../shared/email'
import { digestEmailText, digestSubject } from './emails/digest-email'

const NOTIFICATION_DIGEST_LOCK_ID = 1_234_567_891

export function createNotificationDigestJob(app: FastifyInstance) {
  return {
    cronTime: '0 8 * * *',
    timeZone: 'America/Sao_Paulo',
    onTick: async () => {
      const [lockResult] = await prisma.$queryRaw<Array<{ pg_try_advisory_lock: boolean }>>`
        SELECT pg_try_advisory_lock(${NOTIFICATION_DIGEST_LOCK_ID})`

      if (!lockResult.pg_try_advisory_lock) {
        app.log.info('[cron:digest] Lock not obtained — another instance running, skipping')
        return
      }

      try {
        const rows = await prisma.notification.findMany({
          where: {
            readAt: null,
            digestedAt: null,
            user: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'PLATFORM_ADMIN'] } },
          },
          select: {
            id: true,
            title: true,
            body: true,
            count: true,
            user: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        })

        const byUser = new Map<string, { user: (typeof rows)[number]['user']; items: typeof rows }>()
        for (const row of rows) {
          const entry = byUser.get(row.user.id) ?? { user: row.user, items: [] }
          entry.items.push(row)
          byUser.set(row.user.id, entry)
        }

        app.log.info(`[cron:digest] ${byUser.size} user(s) with pending notifications`)

        const resend = getResend()
        if (!resend) {
          app.log.warn('[cron:digest] RESEND_API_KEY not configured — skipping digest')
          return
        }

        const baseUrl = process.env.WEB_URL ?? process.env.APP_URL ?? 'http://localhost:3000'

        for (const { user, items } of byUser.values()) {
          const isStaff = user.role === 'SUPER_ADMIN' || user.role === 'PLATFORM_ADMIN'
          try {
            const result = await resend.emails.send({
              from: getEmailFrom(),
              to: [user.email],
              subject: digestSubject(items.length),
              text: digestEmailText({
                name: user.name,
                items: items.map((i) => ({ title: i.title, body: i.body, count: i.count })),
                link: isStaff ? `${baseUrl}/pendencias` : `${baseUrl}/`,
                ...(isStaff ? {} : { linkLabel: 'Veja tudo no sininho em' }),
              }),
            })
            if (result?.error) {
              app.log.warn({ err: result.error, userId: user.id }, '[cron:digest] Resend returned an error')
              continue
            }
          } catch (err) {
            app.log.error({ err, userId: user.id }, '[cron:digest] Failed to send digest')
            continue
          }

          try {
            await prisma.notification.updateMany({
              where: { id: { in: items.map((i) => i.id) } },
              data: { digestedAt: new Date() },
            })
          } catch (err) {
            app.log.error({ err, userId: user.id }, '[cron:digest] Failed to mark digest as sent')
          }
        }
      } finally {
        try {
          await prisma.$queryRaw`SELECT pg_advisory_unlock(${NOTIFICATION_DIGEST_LOCK_ID})`
        } catch (unlockErr) {
          app.log.error({ err: unlockErr }, '[cron:digest] Failed to release advisory lock')
        }
      }
    },
    start: true,
  }
}
