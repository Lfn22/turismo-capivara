import prisma from '../../database'
import { isPlatformStaff } from './roles'

export type EditUser = { sub: string; role: string; tenantId: string }

// Equipe edita qualquer destino; ADMIN só o destino ligado ao próprio tenant; CONDUTOR nunca.
export async function canEditDestination(user: EditUser, destinationId: string): Promise<boolean> {
  if (isPlatformStaff(user.role)) return true
  if (user.role !== 'ADMIN') return false
  const tenant = await prisma.tenant.findFirst({
    where: { id: user.tenantId, destinationId },
    select: { id: true },
  })
  return tenant !== null
}

// Criar, arquivar, restaurar e excluir destino: só a equipe.
export function canManageDestinations(user: EditUser): boolean {
  return isPlatformStaff(user.role)
}

export function canEditPackage(user: EditUser, pkg: { tenantId: string; conductorId: string | null }): boolean {
  if (isPlatformStaff(user.role)) return true
  if (user.role === 'ADMIN') return pkg.tenantId === user.tenantId
  if (user.role === 'CONDUTOR') return pkg.conductorId === user.sub
  return false
}

export function canCreatePackageIn(user: EditUser, tenantId: string): boolean {
  if (isPlatformStaff(user.role)) return true
  if (user.role === 'ADMIN' || user.role === 'CONDUTOR') return tenantId === user.tenantId
  return false
}

// Guia (CONDUTOR) só põe roteiro no ar (publicar, abrir datas) depois de verificado pela equipe.
export async function isUnverifiedGuide(user: EditUser): Promise<boolean> {
  if (user.role !== 'CONDUTOR') return false
  const guide = await prisma.user.findUnique({ where: { id: user.sub }, select: { approvalStatus: true } })
  return guide?.approvalStatus !== 'APPROVED'
}
