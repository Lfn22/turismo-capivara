import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../database', () => ({
  default: { tenant: { findFirst: vi.fn() } },
}))

import prisma from '../../../database'
import {
  canEditDestination,
  canManageDestinations,
  canEditPackage,
  canCreatePackageIn,
} from '../edit-permissions'

const db = prisma as any
beforeEach(() => vi.clearAllMocks())

const u = (role: string, sub = 'user-1', tenantId = 'tenant-a') => ({ sub, role, tenantId })

describe('canEditDestination', () => {
  it('PLATFORM_ADMIN edita qualquer destino sem consulta', async () => {
    expect(await canEditDestination(u('PLATFORM_ADMIN'), 'dest-1')).toBe(true)
    expect(await canEditDestination(u('SUPER_ADMIN'), 'dest-1')).toBe(true)
    expect(db.tenant.findFirst).not.toHaveBeenCalled()
  })

  it('ADMIN com tenant ligado ao destino edita', async () => {
    db.tenant.findFirst.mockResolvedValue({ id: 'tenant-a' })
    expect(await canEditDestination(u('ADMIN'), 'dest-1')).toBe(true)
    expect(db.tenant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'tenant-a', destinationId: 'dest-1' } }),
    )
  })

  it('ADMIN com tenant não ligado não edita', async () => {
    db.tenant.findFirst.mockResolvedValue(null)
    expect(await canEditDestination(u('ADMIN'), 'dest-1')).toBe(false)
  })

  it('CONDUTOR e CLIENTE não editam destino', async () => {
    expect(await canEditDestination(u('CONDUTOR'), 'dest-1')).toBe(false)
    expect(await canEditDestination(u('CLIENTE'), 'dest-1')).toBe(false)
    expect(db.tenant.findFirst).not.toHaveBeenCalled()
  })
})

describe('canManageDestinations', () => {
  it('só a equipe', () => {
    expect(canManageDestinations(u('SUPER_ADMIN'))).toBe(true)
    expect(canManageDestinations(u('PLATFORM_ADMIN'))).toBe(true)
    expect(canManageDestinations(u('ADMIN'))).toBe(false)
    expect(canManageDestinations(u('CONDUTOR'))).toBe(false)
  })
})

describe('canEditPackage', () => {
  const pkg = { tenantId: 'tenant-a', conductorId: 'user-1' }
  it('equipe edita qualquer roteiro', () => {
    expect(canEditPackage(u('PLATFORM_ADMIN', 'x', 'outro'), pkg)).toBe(true)
  })
  it('ADMIN edita só os do próprio tenant', () => {
    expect(canEditPackage(u('ADMIN'), pkg)).toBe(true)
    expect(canEditPackage(u('ADMIN', 'user-1', 'tenant-b'), pkg)).toBe(false)
  })
  it('CONDUTOR edita só os que conduz', () => {
    expect(canEditPackage(u('CONDUTOR'), pkg)).toBe(true)
    expect(canEditPackage(u('CONDUTOR', 'user-2'), pkg)).toBe(false)
    expect(canEditPackage(u('CONDUTOR'), { ...pkg, conductorId: null })).toBe(false)
  })
  it('CLIENTE não edita', () => {
    expect(canEditPackage(u('CLIENTE'), pkg)).toBe(false)
  })
})

describe('canCreatePackageIn', () => {
  it('equipe cria em qualquer tenant', () => {
    expect(canCreatePackageIn(u('SUPER_ADMIN'), 'tenant-b')).toBe(true)
  })
  it('ADMIN e CONDUTOR só no próprio tenant', () => {
    expect(canCreatePackageIn(u('ADMIN'), 'tenant-a')).toBe(true)
    expect(canCreatePackageIn(u('ADMIN'), 'tenant-b')).toBe(false)
    expect(canCreatePackageIn(u('CONDUTOR'), 'tenant-a')).toBe(true)
    expect(canCreatePackageIn(u('CONDUTOR'), 'tenant-b')).toBe(false)
  })
  it('CLIENTE não cria', () => {
    expect(canCreatePackageIn(u('CLIENTE'), 'tenant-a')).toBe(false)
  })
})
