import type { Prisma } from '@prisma/client'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import type { EditUser } from '../../shared/auth/edit-permissions'

/**
 * Fuso dos passeios. O Brasil não tem horário de verão desde 2019, então o offset é
 * fixo. Datas "do dia" (lote, bloqueio, calendário) são sempre de São Paulo — nunca do
 * fuso do servidor (UTC no Railway, que transformava "08:00" em 05:00).
 */
export const TOUR_TIME_ZONE = 'America/Sao_Paulo'
const TOUR_UTC_OFFSET = '-03:00'

/** "2027-01-04" + "08:00" → instante das 08:00 em São Paulo. */
export function tourDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${TOUR_UTC_OFFSET}`)
}

/** Início e fim do dia `date` em São Paulo. */
export function tourDayRange(date: string): { start: Date; end: Date } {
  return {
    start: new Date(`${date}T00:00:00.000${TOUR_UTC_OFFSET}`),
    end: new Date(`${date}T23:59:59.999${TOUR_UTC_OFFSET}`),
  }
}

/** Data (YYYY-MM-DD) de um instante, vista em São Paulo. */
export function tourDateKey(instant: Date): string {
  return instant.toLocaleDateString('en-CA', { timeZone: TOUR_TIME_ZONE })
}

/** Dia da semana (0=domingo) de uma data de calendário — independe de fuso. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay()
}

/** Datas de calendário de `start` a `end` (inclusive). */
export function eachDate(start: string, end: string): string[] {
  const out: string[] = []
  for (let d = new Date(`${start}T12:00:00Z`); d <= new Date(`${end}T12:00:00Z`);) {
    out.push(d.toISOString().slice(0, 10))
    d = new Date(d.getTime() + 24 * 3600_000)
  }
  return out
}

type PackageTiming = {
  durationMaxHours: number | null
  duration: number
  bufferMinutes: number | null
}

/**
 * Fim da ocupação do guia: duração + buffer do roteiro. Nenhum fluxo grava
 * `durationMaxHours`, então a `duration` (horas, preenchida no editor) é o padrão —
 * antes o conflito considerava só o buffer e passeios sobrepostos passavam.
 */
export function occupiedUntil(start: Date, pkg: PackageTiming): number {
  const hours = pkg.durationMaxHours ?? pkg.duration
  return start.getTime() + (hours * 60 + (pkg.bufferMinutes ?? 0)) * 60_000
}

export class ScheduleConflictError extends Error {
  readonly code = 'GUIDE_SCHEDULE_CONFLICT'
  readonly statusCode = 409
  constructor(message: string) {
    super(message)
    this.name = 'ScheduleConflictError'
  }
}

const fmt = (d: Date) =>
  d.toLocaleString('pt-BR', {
    timeZone: TOUR_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  })

/**
 * Garante que o guia está livre em todas as janelas pedidas — contra os slots já
 * existentes (OPEN/FULL) e entre as próprias janelas (lote). Única regra de conflito
 * para criação unitária, em lote e edição de horário.
 */
export async function assertGuideFree(
  tx: Prisma.TransactionClient,
  guideId: string,
  pkg: PackageTiming,
  starts: Date[],
  excludeSlotId?: string,
): Promise<void> {
  const windows = starts
    .map((s) => ({ start: s.getTime(), end: occupiedUntil(s, pkg) }))
    .sort((a, b) => a.start - b.start)

  for (let i = 1; i < windows.length; i++) {
    if (windows[i].start < windows[i - 1].end) {
      throw new ScheduleConflictError(
        `As datas ${fmt(new Date(windows[i - 1].start))} e ${fmt(new Date(windows[i].start))} se sobrepõem para o mesmo guia`,
      )
    }
  }

  const latestEnd = Math.max(...windows.map((w) => w.end))
  const existing = await tx.departureSlot.findMany({
    where: {
      guideId,
      status: { in: ['OPEN', 'FULL'] },
      startsAt: { lt: new Date(latestEnd) },
      ...(excludeSlotId ? { id: { not: excludeSlotId } } : {}),
    },
    select: {
      startsAt: true,
      package: {
        select: { durationMaxHours: true, duration: true, bufferMinutes: true, name: true },
      },
      guide: { select: { user: { select: { name: true } } } },
    },
  })

  for (const ex of existing) {
    const exStart = ex.startsAt.getTime()
    const exEnd = occupiedUntil(ex.startsAt, ex.package)
    if (windows.some((w) => w.start < exEnd && w.end > exStart)) {
      const who = ex.guide ? `Guia ${ex.guide.user.name}` : 'O guia'
      throw new ScheduleConflictError(
        `${who} já tem compromisso com roteiro '${ex.package.name}' das ${fmt(ex.startsAt)} até ${fmt(new Date(exEnd))}`,
      )
    }
  }
}

/**
 * Quem pode receber uma data deste roteiro: guia aprovado que faz parte do roteiro
 * (condutor ou membro ACCEPTED), de qualquer tenant — um guia atua em vários circuitos.
 * O isolamento vem do aceite no roteiro, decidido pelo dono ou pela equipe.
 * CONDUTOR só agenda a si mesmo.
 */
export async function assertGuideAssignable(
  user: EditUser,
  guideId: string,
  pkg: { id: string; conductorId: string | null },
): Promise<void> {
  const guide = await prisma.guideProfile.findUnique({
    where: { id: guideId },
    select: { userId: true, user: { select: { approvalStatus: true } } },
  })
  if (!guide) throw new AppError('Guia não encontrado', 404)
  if (user.role === 'CONDUTOR' && guide.userId !== user.sub) {
    throw new AppError('Guia só pode abrir datas na própria agenda', 403)
  }
  if (guide.user.approvalStatus !== 'APPROVED') {
    throw new AppError('Guia ainda não aprovado', 422)
  }
  if (pkg.conductorId === guide.userId) return
  const membership = await prisma.packageGuide.findFirst({
    where: { packageId: pkg.id, guideId, status: 'ACCEPTED' },
    select: { id: true },
  })
  if (!membership) {
    throw new AppError('Guia não faz parte deste roteiro', 422)
  }
}
