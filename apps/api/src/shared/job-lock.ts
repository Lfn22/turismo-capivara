import prisma from '../database'

/**
 * Executa `work` só se esta instância obtiver o advisory lock `lockId`.
 *
 * `pg_try_advisory_lock` é de SESSÃO: com o pool do Prisma, o unlock pode cair em
 * outra conexão e o lock fica preso para sempre (o job passa a ser pulado em todas
 * as instâncias). Aqui o lock é de TRANSAÇÃO, preso a uma única conexão que a
 * transação segura enquanto `work` roda, e é liberado automaticamente no fim dela —
 * inclusive se o processo cair. `work` usa o `prisma` normal (outras conexões).
 */
export async function withAdvisoryXactLock(
  lockId: number,
  work: () => Promise<void>,
): Promise<boolean> {
  return prisma.$transaction(
    async (tx) => {
      const [row] = await tx.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_try_advisory_xact_lock(${lockId}) AS locked`
      if (!row?.locked) return false
      await work()
      return true
    },
    { maxWait: 10_000, timeout: 10 * 60_000 },
  )
}
