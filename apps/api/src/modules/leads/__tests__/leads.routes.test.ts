import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp } from '../../../__tests__/helpers/build-app'

vi.mock('../../../database', () => {
  const db: any = {
    destination: { findUnique: vi.fn(), findFirst: vi.fn() },
    tourPackage: { findFirst: vi.fn() },
    lead: { create: vi.fn() },
  }
  return { default: db }
})
vi.mock('../lead-notify', () => ({
  notifyLeadCreated: vi.fn().mockResolvedValue(undefined),
}))

import prisma from '../../../database'
import { notifyLeadCreated } from '../lead-notify'
import { leadsRoutes } from '../leads.routes'

const db = prisma as unknown as Record<string, Record<string, Mock>>

const app = buildApp(leadsRoutes)
beforeAll(async () => { await app.ready() })
afterAll(async () => { await app.close() })

const validBody = {
  name: 'Maria Turista',
  whatsapp: '(89) 99999-0000',
  destinationSlug: 'serra-da-capivara',
  consent: true,
  utmSource: 'meta',
}

function post(body: unknown) {
  return app.inject({ method: 'POST', url: '/leads', payload: body as any })
}

beforeEach(() => {
  vi.clearAllMocks()
  db.destination.findFirst.mockResolvedValue({ id: 'd1', title: 'Serra da Capivara' })
  db.lead.create.mockImplementation(async ({ data }: any) => ({ id: 'l1', createdAt: new Date(), ...data }))
  ;(notifyLeadCreated as Mock).mockResolvedValue(undefined)
})

describe('POST /leads', () => {
  it('cria lead válido → 201 com id', async () => {
    const res = await post(validBody)
    expect(res.statusCode).toBe(201)
    expect(res.json()).toEqual({ id: 'l1' })
    expect(db.destination.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'serra-da-capivara', active: true, approvalStatus: 'APPROVED' } }),
    )
    expect(db.lead.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Maria Turista',
        whatsapp: '(89) 99999-0000',
        destinationSlug: 'serra-da-capivara',
        utmSource: 'meta',
        consent: true,
      }),
    })
    expect(notifyLeadCreated).toHaveBeenCalledTimes(1)
  })

  it('consent false → 400', async () => {
    const res = await post({ ...validBody, consent: false })
    expect(res.statusCode).toBe(400)
    expect(db.lead.create).not.toHaveBeenCalled()
  })

  it('whatsapp inválido → 400', async () => {
    const res = await post({ ...validBody, whatsapp: '123' })
    expect(res.statusCode).toBe(400)
  })

  it('travelMonth 2026-13 → 400; 2026-12 aceito', async () => {
    expect((await post({ ...validBody, travelMonth: '2026-13' })).statusCode).toBe(400)
    expect((await post({ ...validBody, travelMonth: '2026-12' })).statusCode).toBe(201)
  })

  it('destino inexistente → 404', async () => {
    db.destination.findFirst.mockResolvedValue(null)
    const res = await post(validBody)
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ message: 'Destino não encontrado' })
    expect(db.lead.create).not.toHaveBeenCalled()
  })

  it('nome com caractere de controle → 400', async () => {
    const res = await post({ ...validBody, name: 'Ana\nSilva' })
    expect(res.statusCode).toBe(400)
    expect(db.lead.create).not.toHaveBeenCalled()
  })

  it('packageId existente → nome do roteiro vai para a notificação', async () => {
    db.tourPackage.findFirst.mockResolvedValue({ name: 'Trilha do Boqueirão' })
    const res = await post({ ...validBody, packageId: 'p1' })
    expect(res.statusCode).toBe(201)
    expect(db.tourPackage.findFirst).toHaveBeenCalledWith({ where: { id: 'p1' }, select: { name: true } })
    expect(notifyLeadCreated).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ packageName: 'Trilha do Boqueirão' }),
    )
  })

  it('packageId inexistente → 404 e não cria lead', async () => {
    db.tourPackage.findFirst.mockResolvedValue(null)
    const res = await post({ ...validBody, packageId: 'nope' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ message: 'Roteiro não encontrado' })
    expect(db.lead.create).not.toHaveBeenCalled()
  })

  it('utmSource com 101 caracteres → 400', async () => {
    const res = await post({ ...validBody, utmSource: 'a'.repeat(101) })
    expect(res.statusCode).toBe(400)
  })

  it('notifyLeadCreated rejeita → ainda 201', async () => {
    ;(notifyLeadCreated as Mock).mockRejectedValue(new Error('boom'))
    const res = await post(validBody)
    expect(res.statusCode).toBe(201)
  })
})
