import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'

vi.mock('../../../database', () => ({
  default: {
    user: { findUnique: vi.fn() },
    notification: { findMany: vi.fn(), count: vi.fn(), updateMany: vi.fn() },
  },
}))

import { buildApp } from '../../../__tests__/helpers/build-app'
import { notificationsRoutes } from '../notifications.routes'
import prisma from '../../../database'

const db = prisma as any
const app = buildApp(notificationsRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())
beforeEach(() => vi.resetAllMocks())

function auth() {
  const t = app.jwt.sign({ sub: 'user-1', role: 'CLIENTE', tenantId: 'tenant-1', name: 'Teste', approvalStatus: 'APPROVED' })
  db.user.findUnique.mockResolvedValueOnce({ role: 'CLIENTE' }) // consumido pelo authenticate
  return { authorization: `Bearer ${t}` }
}

function makeNotif(id: string) {
  return {
    id, type: 'T', title: 't', body: 'b', link: null, count: 1, readAt: null,
    actionKey: null, resolvedAt: null, resolvedByName: null, updatedAt: new Date(),
  }
}

describe('GET /notifications', () => {
  it('sem token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/notifications' })
    expect(res.statusCode).toBe(401)
  })

  it('consulta com userId e take 21; 21 resultados → 20 + nextCursor', async () => {
    db.notification.findMany.mockResolvedValue(Array.from({ length: 21 }, (_, i) => makeNotif(`n${i}`)))
    const res = await app.inject({ method: 'GET', url: '/notifications', headers: auth() })
    expect(res.statusCode).toBe(200)
    expect(res.json().notifications).toHaveLength(20)
    expect(res.json().nextCursor).toBe('n19')
    expect(db.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' }, take: 21 }),
    )
  })

  it('menos de 21 resultados → nextCursor null', async () => {
    db.notification.findMany.mockResolvedValue([makeNotif('n1')])
    const res = await app.inject({ method: 'GET', url: '/notifications', headers: auth() })
    expect(res.json().nextCursor).toBeNull()
  })

  it('cursor → cursor e skip 1', async () => {
    db.notification.findMany.mockResolvedValue([])
    await app.inject({ method: 'GET', url: '/notifications?cursor=abc', headers: auth() })
    expect(db.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { id: 'abc' }, skip: 1 }),
    )
  })

  it('cursor com mais de 64 caracteres → 400', async () => {
    const res = await app.inject({ method: 'GET', url: `/notifications?cursor=${'a'.repeat(65)}`, headers: auth() })
    expect(res.statusCode).toBe(400)
    expect(res.json().message).toBe('Dados inválidos')
  })
})

describe('GET /notifications/summary', () => {
  it('retorna unread e pending', async () => {
    db.notification.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1)
    const res = await app.inject({ method: 'GET', url: '/notifications/summary', headers: auth() })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ unread: 3, pending: 1 })
    expect(db.notification.count).toHaveBeenNthCalledWith(2, {
      where: { userId: 'user-1', actionKey: { not: null }, resolvedAt: null },
    })
  })
})

describe('GET /notifications/pending', () => {
  it('lista pendentes do usuário', async () => {
    db.notification.findMany.mockResolvedValue([makeNotif('p1')])
    const res = await app.inject({ method: 'GET', url: '/notifications/pending', headers: auth() })
    expect(res.statusCode).toBe(200)
    expect(res.json().notifications).toHaveLength(1)
    expect(db.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', actionKey: { not: null }, resolvedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
    )
  })
})

describe('PATCH /notifications/:id/read', () => {
  it('marca como lida com escopo no userId → 204', async () => {
    db.notification.updateMany.mockResolvedValue({ count: 1 })
    const res = await app.inject({ method: 'PATCH', url: '/notifications/n1/read', headers: auth() })
    expect(res.statusCode).toBe(204)
    expect(db.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'n1', userId: 'user-1' },
      data: { readAt: expect.any(Date) },
    })
  })

  it('não é do usuário → 404', async () => {
    db.notification.updateMany.mockResolvedValue({ count: 0 })
    const res = await app.inject({ method: 'PATCH', url: '/notifications/n1/read', headers: auth() })
    expect(res.statusCode).toBe(404)
    expect(res.json().message).toBe('Notificação não encontrada')
  })
})

describe('POST /notifications/read-all', () => {
  it('marca não lidas do usuário → 204', async () => {
    db.notification.updateMany.mockResolvedValue({ count: 2 })
    const res = await app.inject({ method: 'POST', url: '/notifications/read-all', headers: auth() })
    expect(res.statusCode).toBe(204)
    expect(db.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', readAt: null },
      data: { readAt: expect.any(Date) },
    })
  })
})
