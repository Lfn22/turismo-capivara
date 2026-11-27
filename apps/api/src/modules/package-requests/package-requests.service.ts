import type { FastifyBaseLogger } from 'fastify'
import type {
  PackageChangeRequest,
  PackageRequestStatus,
  PackageRequestType,
  Prisma,
  TourPackage,
} from '@prisma/client'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { cancelFutureSlots } from '../bookings/cancel-future-slots'
import { notify, platformStaffIds, resolveAction } from '../notifications/notifications.service'

export const IMPORTANT_FIELDS = ['name', 'description', 'price', 'extraGuidePrice'] as const
export type ImportantField = (typeof IMPORTANT_FIELDS)[number]
type Changes = Record<string, { from: unknown; to: unknown }>

const PENDING_CONFLICT =
  'Já existe um pedido pendente para este roteiro. Cancele-o para fazer outro.'
const ALREADY_DECIDED = 'Este pedido já foi decidido.'
const REQUEST_CHANGED =
  'O pedido mudou desde que você abriu a revisão. Recarregue a lista e revise de novo.'
const NUMERIC_FIELDS: readonly string[] = ['price', 'extraGuidePrice']

function normalize(field: string, value: unknown): unknown {
  if (NUMERIC_FIELDS.includes(field) && value !== null && value !== undefined) return Number(value)
  return value ?? null
}

export function diffImportant(
  current: Pick<TourPackage, ImportantField>,
  incoming: Partial<Record<ImportantField, unknown>>,
): Record<ImportantField, { from: unknown; to: unknown }> {
  const result = {} as Record<ImportantField, { from: unknown; to: unknown }>
  for (const field of IMPORTANT_FIELDS) {
    if (!(field in incoming) || incoming[field] === undefined) continue
    const from = normalize(field, current[field])
    const to = normalize(field, incoming[field])
    if (from !== to) result[field] = { from, to }
  }
  return result
}

const TYPE_LABEL: Record<PackageRequestType, string> = {
  PUBLISH: 'publicar',
  UPDATE: 'alterar',
  UNPUBLISH: 'despublicar',
  ARCHIVE: 'arquivar',
}

export async function submitRequest(input: {
  packageId: string
  requestedById: string
  type: PackageRequestType
  changes?: Changes
}): Promise<PackageChangeRequest | null> {
  const { packageId, requestedById, type, changes } = input

  const outcome = await prisma.$transaction(async (tx) => {
    // Trava a linha do roteiro: serializa pedidos concorrentes (um PENDING por roteiro, merges sem perda).
    await tx.$queryRaw`SELECT id FROM "TourPackage" WHERE id = ${packageId} FOR UPDATE`
    const pending = await tx.packageChangeRequest.findFirst({
      where: { packageId, status: 'PENDING' },
    })

    if (pending) {
      if (pending.type !== 'UPDATE' || type !== 'UPDATE') throw new AppError(PENDING_CONFLICT, 409)

      const current = await tx.tourPackage.findUnique({
        where: { id: packageId },
        select: { name: true, description: true, price: true, extraGuidePrice: true },
      })
      const merged: Changes = { ...((pending.changes ?? {}) as Changes) }
      for (const [field, change] of Object.entries(changes ?? {})) {
        const from = merged[field] ? merged[field].from : change.from
        const currentValue = current ? (current as Record<string, unknown>)[field] : from
        if (normalize(field, currentValue) === normalize(field, change.to)) delete merged[field]
        else merged[field] = { from, to: change.to }
      }

      if (Object.keys(merged).length === 0) {
        await tx.packageChangeRequest.update({
          where: { id: pending.id },
          data: { status: 'CANCELLED' },
        })
        return { request: null, created: false, cancelledId: pending.id }
      }
      const request = await tx.packageChangeRequest.update({
        where: { id: pending.id },
        data: { changes: merged as Prisma.InputJsonValue },
      })
      return { request, created: false }
    }

    try {
      const request = await tx.packageChangeRequest.create({
        data: {
          packageId,
          requestedById,
          type,
          ...(type === 'UPDATE' && { changes: (changes ?? {}) as Prisma.InputJsonValue }),
        },
      })
      return { request, created: true }
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') throw new AppError(PENDING_CONFLICT, 409)
      throw err
    }
  })

  if ('cancelledId' in outcome && outcome.cancelledId) {
    await resolveAction(
      `package-change:${outcome.cancelledId}`,
      await userName(requestedById, 'Guia'),
    )
  }

  if (outcome.created && outcome.request) {
    const request = outcome.request
    const pkg = await prisma.tourPackage.findUnique({
      where: { id: packageId },
      select: { name: true },
    })
    await notify({
      userIds: await platformStaffIds(),
      type: 'package_request',
      title: 'Pedido de aprovação de roteiro',
      body: `Um guia pediu para ${TYPE_LABEL[type]} o roteiro "${pkg?.name ?? ''}".`,
      link: '/super-admin/roteiros?pedidos=1',
      actionKey: `package-change:${request.id}`,
    })
  }

  return outcome.request
}

export async function cancelRequest(packageId: string, userId: string): Promise<void> {
  const pending = await prisma.packageChangeRequest.findFirst({
    where: { packageId, requestedById: userId, status: 'PENDING' },
  })
  if (!pending) throw new AppError('Pedido não encontrado', 404)

  // Só cancela se ainda estiver pendente: a equipe pode ter decidido nesse meio tempo
  const { count } = await prisma.packageChangeRequest.updateMany({
    where: { id: pending.id, status: 'PENDING' },
    data: { status: 'CANCELLED' },
  })
  if (count === 0) throw new AppError(ALREADY_DECIDED, 409)
  await resolveAction(`package-change:${pending.id}`, await userName(userId, 'Guia'))
}

async function loadPending(id: string) {
  const request = await prisma.packageChangeRequest.findUnique({
    where: { id },
    include: { package: { select: { id: true, name: true, tenant: { select: { slug: true } } } } },
  })
  if (!request) throw new AppError('Pedido não encontrado', 404)
  if (request.status !== 'PENDING') throw new AppError(ALREADY_DECIDED, 409)
  return request
}

async function userName(userId: string, fallback: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
  return user?.name ?? fallback
}

const staffName = (staffId: string) => userName(staffId, 'Equipe CAPI')

export async function approveRequest(
  id: string,
  staffId: string,
  log: FastifyBaseLogger,
  expectedUpdatedAt: Date,
): Promise<PackageChangeRequest> {
  const request = await loadPending(id)
  const packageId = request.packageId
  // Só aprova a versão que a equipe revisou: um merge do guia depois disso muda o updatedAt.
  if (request.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
    throw new AppError(REQUEST_CHANGED, 409)
  }

  // Reivindica o pedido antes de qualquer efeito: decisões concorrentes não rodam estorno à toa.
  // O updatedAt na condição garante que o changes lido acima ainda é o atual.
  const claim = await prisma.packageChangeRequest.updateMany({
    where: { id, status: 'PENDING', updatedAt: expectedUpdatedAt },
    data: { status: 'APPROVED', decidedById: staffId, decidedAt: new Date() },
  })
  if (claim.count === 0) {
    const now = await prisma.packageChangeRequest.findUnique({
      where: { id },
      select: { status: true },
    })
    throw new AppError(now?.status === 'PENDING' ? REQUEST_CHANGED : ALREADY_DECIDED, 409)
  }

  try {
    if (request.type === 'UNPUBLISH' || request.type === 'ARCHIVE') {
      await cancelFutureSlots({ packageId }, log)
    }

    let data: Prisma.TourPackageUpdateInput
    if (request.type === 'PUBLISH') data = { publishedAt: new Date() }
    else if (request.type === 'UNPUBLISH') data = { publishedAt: null }
    else if (request.type === 'ARCHIVE') data = { active: false }
    else {
      data = {}
      for (const [field, change] of Object.entries((request.changes ?? {}) as Changes)) {
        ;(data as Record<string, unknown>)[field] = normalize(field, change.to)
      }
    }
    await prisma.tourPackage.update({ where: { id: packageId }, data })
  } catch (err) {
    // Falhou (estorno ou gravação): devolve o pedido para PENDING; repetir a aprovação termina o resto.
    await prisma.packageChangeRequest.updateMany({
      where: { id, status: 'APPROVED' },
      data: { status: 'PENDING', decidedById: null, decidedAt: null },
    })
    throw err
  }
  const approved = { ...request, status: 'APPROVED' as const }

  await resolveAction(`package-change:${id}`, await staffName(staffId))
  await notify({
    userIds: [request.requestedById],
    type: 'package_request_decided',
    title: 'Pedido aprovado',
    body: `Seu pedido para o roteiro ${request.package.name} foi aprovado.`,
    link: `/${request.package.tenant.slug}/painel/roteiros`,
  })
  return approved
}

export async function rejectRequest(
  id: string,
  staffId: string,
  reason: string,
): Promise<PackageChangeRequest> {
  const request = await loadPending(id)

  const { count } = await prisma.packageChangeRequest.updateMany({
    where: { id, status: 'PENDING' },
    data: {
      status: 'REJECTED',
      decidedById: staffId,
      decidedAt: new Date(),
      rejectionReason: reason,
    },
  })
  if (count === 0) throw new AppError(ALREADY_DECIDED, 409)

  await resolveAction(`package-change:${id}`, await staffName(staffId))
  await notify({
    userIds: [request.requestedById],
    type: 'package_request_decided',
    title: 'Pedido recusado',
    body: `Seu pedido para o roteiro ${request.package.name} foi recusado: ${reason}`,
    link: `/${request.package.tenant.slug}/painel/roteiros`,
  })
  return { ...request, status: 'REJECTED', rejectionReason: reason }
}

type LatestRequest = {
  id: string
  type: PackageRequestType
  status: PackageRequestStatus
  rejectionReason: string | null
  changes: unknown
}

export async function latestRequestsByPackage(
  packageIds: string[],
): Promise<Map<string, LatestRequest>> {
  const result = new Map<string, LatestRequest>()
  if (packageIds.length === 0) return result

  const requests = await prisma.packageChangeRequest.findMany({
    where: { packageId: { in: packageIds } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      packageId: true,
      type: true,
      status: true,
      rejectionReason: true,
      changes: true,
      decidedAt: true,
      package: { select: { updatedAt: true } },
    },
  })

  // Só o pedido mais novo de cada roteiro conta: PENDING aparece; REJECTED vale até algo mais novo substituí-lo
  // ou até o roteiro ser alterado depois da recusa.
  const seen = new Set<string>()
  for (const r of requests) {
    if (seen.has(r.packageId)) continue
    seen.add(r.packageId)
    if (r.status === 'REJECTED' && r.decidedAt && r.decidedAt < r.package.updatedAt) continue
    if (r.status === 'PENDING' || r.status === 'REJECTED') {
      result.set(r.packageId, {
        id: r.id,
        type: r.type,
        status: r.status,
        rejectionReason: r.rejectionReason,
        changes: r.changes,
      })
    }
  }
  return result
}
