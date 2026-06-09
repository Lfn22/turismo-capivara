import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  CreateDestinationInput,
  UpdateDestinationInput,
  ApprovalUpdateInput,
} from './destinations.schemas'

// ---- Zod schema validation ----

describe('CreateDestinationInput', () => {
  it('accepts valid destination payload', () => {
    const result = CreateDestinationInput.safeParse({
      name: 'Parque Serra da Capivara',
      description: 'Parque Nacional com pinturas rupestres e sítios arqueológicos únicos',
      state: 'PI',
    })
    expect(result.success).toBe(true)
  })

  it('rejects name shorter than 3 characters', () => {
    const result = CreateDestinationInput.safeParse({
      name: 'AB',
      description: 'Descrição com pelo menos dez caracteres aqui',
      state: 'PI',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const nameIssue = result.error.issues.find((i) => i.path.includes('name'))
      expect(nameIssue).toBeDefined()
      expect(nameIssue?.message).toContain('Nome')
    }
  })

  it('rejects description shorter than 10 characters', () => {
    const result = CreateDestinationInput.safeParse({
      name: 'Destino Válido',
      description: 'Curto',
      state: 'PI',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('description'))
      expect(issue).toBeDefined()
    }
  })

  it('rejects invalid state enum value', () => {
    const result = CreateDestinationInput.safeParse({
      name: 'Destino Válido',
      description: 'Descrição com pelo menos dez caracteres aqui',
      state: 'XX',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all 27 BR states', () => {
    const states = [
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
      'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
      'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
    ]
    expect(states).toHaveLength(27)
    for (const state of states) {
      const result = CreateDestinationInput.safeParse({
        name: 'Destino Teste',
        description: 'Descrição com pelo menos dez caracteres',
        state,
      })
      expect(result.success, `State ${state} should be valid`).toBe(true)
    }
  })

  it('rejects photos array with more than 5 items', () => {
    const result = CreateDestinationInput.safeParse({
      name: 'Destino Teste',
      description: 'Descrição com pelo menos dez caracteres',
      state: 'PI',
      photos: [
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
        'https://example.com/3.jpg',
        'https://example.com/4.jpg',
        'https://example.com/5.jpg',
        'https://example.com/6.jpg',
      ],
    })
    expect(result.success).toBe(false)
  })

  it('strips approvalStatus — security check: guide cannot set approval status', () => {
    const result = CreateDestinationInput.safeParse({
      name: 'Destino Teste',
      description: 'Descrição com pelo menos dez caracteres',
      state: 'PI',
      approvalStatus: 'APPROVED',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      // approvalStatus should not appear in parsed output (stripped by Zod)
      expect((result.data as Record<string, unknown>).approvalStatus).toBeUndefined()
    }
  })

  it('defaults photos and highlights to empty arrays', () => {
    const result = CreateDestinationInput.safeParse({
      name: 'Destino Teste',
      description: 'Descrição com pelo menos dez caracteres',
      state: 'PI',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.photos).toEqual([])
      expect(result.data.highlights).toEqual([])
    }
  })
})

describe('UpdateDestinationInput', () => {
  it('rejects empty object (at least one field required)', () => {
    const result = UpdateDestinationInput.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Pelo menos um campo')
    }
  })

  it('accepts partial update with only name', () => {
    const result = UpdateDestinationInput.safeParse({ name: 'Novo Nome Válido' })
    expect(result.success).toBe(true)
  })

  it('accepts partial update with only state', () => {
    const result = UpdateDestinationInput.safeParse({ state: 'BA' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid state in update', () => {
    const result = UpdateDestinationInput.safeParse({ state: 'ZZ' })
    expect(result.success).toBe(false)
  })

  it('rejects name shorter than 3 chars in update', () => {
    const result = UpdateDestinationInput.safeParse({ name: 'AB' })
    expect(result.success).toBe(false)
  })
})

describe('ApprovalUpdateInput', () => {
  it('accepts APPROVED status', () => {
    const result = ApprovalUpdateInput.safeParse({ approvalStatus: 'APPROVED' })
    expect(result.success).toBe(true)
  })

  it('accepts REJECTED status', () => {
    const result = ApprovalUpdateInput.safeParse({ approvalStatus: 'REJECTED' })
    expect(result.success).toBe(true)
  })

  it('rejects PENDING status (admin cannot set back to PENDING)', () => {
    const result = ApprovalUpdateInput.safeParse({ approvalStatus: 'PENDING' })
    expect(result.success).toBe(false)
  })

  it('accepts optional rejectionReason', () => {
    const result = ApprovalUpdateInput.safeParse({
      approvalStatus: 'REJECTED',
      rejectionReason: 'Imagens de baixa qualidade',
    })
    expect(result.success).toBe(true)
  })
})

// ---- Service unit tests (mocked Prisma) ----

vi.mock('../../database', () => ({
  default: {
    destination: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
    },
  },
}))

import prisma from '../../database'
import { createDestination, updateDestination, deleteDestination } from './destinations.service'

const mockPrisma = prisma as any

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createDestination', () => {
  it('creates destination with approvalStatus PENDING and stores createdById', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', slug: 'capivara' })
    mockPrisma.destination.findMany.mockResolvedValue([]) // no slug conflicts
    const created = {
      id: 'dest-1',
      slug: 'parque-serra-da-capivara',
      title: 'Parque Serra da Capivara',
      description: 'Parque Nacional com pinturas rupestres e sítios únicos',
      state: 'PI',
      photos: [],
      highlights: [],
      approvalStatus: 'PENDING',
      createdById: 'user-1',
    }
    mockPrisma.destination.create.mockResolvedValue(created)

    const result = await createDestination('tenant-1', 'user-1', {
      name: 'Parque Serra da Capivara',
      description: 'Parque Nacional com pinturas rupestres e sítios únicos',
      state: 'PI',
      photos: [],
      highlights: [],
    })

    expect(result.approvalStatus).toBe('PENDING')
    expect(result.createdById).toBe('user-1')
    expect(mockPrisma.destination.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approvalStatus: 'PENDING',
          createdById: 'user-1',
          title: 'Parque Serra da Capivara',
        }),
      }),
    )
  })

  it('generates slug from name', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' })
    mockPrisma.destination.findMany.mockResolvedValue([])
    mockPrisma.destination.create.mockResolvedValue({ id: 'dest-1', slug: 'minha-praia-linda' })

    await createDestination('tenant-1', 'user-1', {
      name: 'Minha Praia Linda',
      description: 'Descrição da praia com pelo menos dez caracteres',
      state: 'BA',
      photos: [],
      highlights: [],
    })

    const callData = mockPrisma.destination.create.mock.calls[0][0].data
    expect(callData.slug).toBe('minha-praia-linda')
  })

  it('appends counter to slug when slug already exists', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' })
    mockPrisma.destination.findMany.mockResolvedValue([{ slug: 'minha-praia' }])
    mockPrisma.destination.create.mockResolvedValue({ id: 'dest-2', slug: 'minha-praia-2' })

    await createDestination('tenant-1', 'user-1', {
      name: 'Minha Praia',
      description: 'Descrição da praia com pelo menos dez caracteres',
      state: 'BA',
      photos: [],
      highlights: [],
    })

    const callData = mockPrisma.destination.create.mock.calls[0][0].data
    expect(callData.slug).toBe('minha-praia-2')
  })

  it('throws 404 when tenant not found', async () => {
    mockPrisma.destination.findMany.mockResolvedValue([])
    mockPrisma.tenant.findUnique.mockResolvedValue(null)

    await expect(
      createDestination('tenant-999', 'user-1', {
        name: 'Destino Teste',
        description: 'Descrição com pelo menos dez caracteres',
        state: 'PI',
        photos: [],
        highlights: [],
      }),
    ).rejects.toMatchObject({ statusCode: 404, message: 'Tenant não encontrado' })
  })
})

describe('updateDestination', () => {
  it('updates destination when owner edits PENDING destination', async () => {
    mockPrisma.destination.findUnique.mockResolvedValue({
      id: 'dest-1',
      createdById: 'user-1',
      approvalStatus: 'PENDING',
    })
    mockPrisma.destination.update.mockResolvedValue({
      id: 'dest-1',
      title: 'Novo Nome',
      approvalStatus: 'PENDING',
    })

    const result = await updateDestination('dest-1', 'user-1', { name: 'Novo Nome' })
    expect(result.title).toBe('Novo Nome')
  })

  it('throws 403 when non-owner tries to update', async () => {
    mockPrisma.destination.findUnique.mockResolvedValue({
      id: 'dest-1',
      createdById: 'user-1',
      approvalStatus: 'PENDING',
    })

    await expect(
      updateDestination('dest-1', 'user-2', { name: 'Alteração indevida' }),
    ).rejects.toMatchObject({ statusCode: 403, message: 'Não autorizado' })
  })

  it('throws 400 when owner tries to edit APPROVED destination', async () => {
    mockPrisma.destination.findUnique.mockResolvedValue({
      id: 'dest-1',
      createdById: 'user-1',
      approvalStatus: 'APPROVED',
    })

    await expect(
      updateDestination('dest-1', 'user-1', { name: 'Alteração indevida' }),
    ).rejects.toMatchObject({ statusCode: 400, message: 'Não é possível editar destino aprovado' })
  })

  it('throws 400 when owner tries to edit APPROVED destination (REJECTED allowed)', async () => {
    mockPrisma.destination.findUnique.mockResolvedValue({
      id: 'dest-1',
      createdById: 'user-1',
      approvalStatus: 'REJECTED',
    })
    mockPrisma.destination.update.mockResolvedValue({
      id: 'dest-1',
      title: 'Nome Corrigido',
      approvalStatus: 'REJECTED',
    })

    // REJECTED destinations can be edited by owner
    const result = await updateDestination('dest-1', 'user-1', { name: 'Nome Corrigido' })
    expect(result.title).toBe('Nome Corrigido')
  })

  it('throws 404 when destination not found', async () => {
    mockPrisma.destination.findUnique.mockResolvedValue(null)

    await expect(
      updateDestination('dest-999', 'user-1', { name: 'Qualquer Nome' }),
    ).rejects.toMatchObject({ statusCode: 404, message: 'Destino não encontrado' })
  })
})

describe('deleteDestination', () => {
  it('deletes destination when owner requests', async () => {
    mockPrisma.destination.findUnique.mockResolvedValue({
      id: 'dest-1',
      createdById: 'user-1',
    })
    mockPrisma.destination.delete.mockResolvedValue({ id: 'dest-1' })

    const result = await deleteDestination('dest-1', 'user-1')
    expect(result).toEqual({ success: true })
    expect(mockPrisma.destination.delete).toHaveBeenCalledWith({ where: { id: 'dest-1' } })
  })

  it('throws 403 when non-owner tries to delete', async () => {
    mockPrisma.destination.findUnique.mockResolvedValue({
      id: 'dest-1',
      createdById: 'user-1',
    })

    await expect(deleteDestination('dest-1', 'user-2')).rejects.toMatchObject({
      statusCode: 403,
      message: 'Não autorizado',
    })
    expect(mockPrisma.destination.delete).not.toHaveBeenCalled()
  })

  it('throws 404 when destination not found', async () => {
    mockPrisma.destination.findUnique.mockResolvedValue(null)

    await expect(deleteDestination('dest-999', 'user-1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Destino não encontrado',
    })
  })
})
