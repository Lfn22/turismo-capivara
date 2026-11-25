import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'

vi.mock('../../../database', () => {
  const db: any = {
    favorite: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    tourPackage: { findFirst: vi.fn() },
    destination: { findFirst: vi.fn() },
  }
  return { default: db }
})

import { buildApp } from '../../../__tests__/helpers/build-app'
import { meRoutes } from '../me.routes'
import prisma from '../../../database'

const db = prisma as any
const app = buildApp(meRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())
beforeEach(() => {
  vi.resetAllMocks()
  // Alvos disponíveis por padrão (roteiro publicado e ativo, destino aprovado)
  db.tourPackage.findFirst.mockResolvedValue({ id: 'pkg-1' })
  db.destination.findFirst.mockResolvedValue({ id: 'dest-1' })
})

function auth(role = 'CLIENTE') {
  const t = app.jwt.sign({
    sub: 'user-1',
    role,
    tenantId: 'tenant-a',
    name: 'Turista',
    approvalStatus: 'APPROVED',
  })
  return { authorization: `Bearer ${t}` }
}

function makeFavoritePackage(id: string, userId = 'user-1') {
  return {
    id,
    packageId: 'pkg-1',
    destinationId: null,
    createdAt: new Date('2024-01-01'),
    userId,
    package: {
      id: 'pkg-1',
      name: 'Trilha Capivara',
      photos: ['https://cdn.x/photo.jpg'],
      price: 150.0,
      duration: 4,
      difficulty: 'EASY',
      active: true,
      publishedAt: new Date('2024-01-01'),
      tenant: { slug: 'capi' },
    },
    destination: null,
  }
}

function makeFavoriteDestination(id: string, userId = 'user-1') {
  return {
    id,
    packageId: null,
    destinationId: 'dest-1',
    createdAt: new Date('2024-01-01'),
    userId,
    package: null,
    destination: {
      id: 'dest-1',
      title: 'Serra da Canastra',
      slug: 'serra-da-canastra',
      heroImageUrl: 'https://cdn.x/dest.jpg',
      state: 'MG',
      active: true,
      approvalStatus: 'APPROVED',
    },
  }
}

describe('GET /me/favorites', () => {
  it('retorna lista de favoritos do turista', async () => {
    db.favorite.findMany.mockResolvedValue([
      makeFavoritePackage('fav-1'),
      makeFavoriteDestination('fav-2'),
    ])

    const res = await app.inject({ method: 'GET', url: '/me/favorites', headers: auth() })
    expect(res.statusCode).toBe(200)

    const body = res.json()
    expect(body.data).toHaveLength(2)
    expect(body.hasMore).toBe(false)
    expect(body.nextCursor).toBeNull()

    expect(body.data[0]).toMatchObject({
      id: 'fav-1',
      type: 'package',
      packageId: 'pkg-1',
      destinationId: null,
      packageName: 'Trilha Capivara',
      packageCoverUrl: 'https://cdn.x/photo.jpg',
      packagePrice: 150,
      packageDuration: 4,
      packageDifficulty: 'EASY',
      packageTenantSlug: 'capi',
      destinationTitle: null,
    })

    expect(body.data[1]).toMatchObject({
      id: 'fav-2',
      type: 'destination',
      packageId: null,
      destinationId: 'dest-1',
      destinationTitle: 'Serra da Canastra',
      destinationSlug: 'serra-da-canastra',
      destinationImageUrl: 'https://cdn.x/dest.jpg',
      destinationState: 'MG',
      packageName: null,
    })
  })

  it('roteiro arquivado/despublicado aparece como indisponível', async () => {
    const fav = makeFavoritePackage('fav-1')
    fav.package.publishedAt = null as unknown as Date
    db.favorite.findMany.mockResolvedValue([fav, makeFavoriteDestination('fav-2')])

    const body = (await app.inject({ method: 'GET', url: '/me/favorites', headers: auth() })).json()

    expect(body.data[0].available).toBe(false)
    expect(body.data[1].available).toBe(true)
  })

  it('sem token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/me/favorites' })
    expect(res.statusCode).toBe(401)
  })

  it('CONDUTOR → 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/me/favorites', headers: auth('CONDUTOR') })
    expect(res.statusCode).toBe(403)
  })
})

describe('POST /me/favorites', () => {
  it('cria favorito de pacote', async () => {
    db.favorite.create.mockResolvedValue({ id: 'fav-new' })

    const res = await app.inject({
      method: 'POST',
      url: '/me/favorites',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { packageId: 'pkg-1' },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ id: 'fav-new' })
    expect(db.favorite.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', packageId: 'pkg-1', destinationId: undefined },
    })
  })

  it('cria favorito de destino', async () => {
    db.favorite.create.mockResolvedValue({ id: 'fav-dest' })

    const res = await app.inject({
      method: 'POST',
      url: '/me/favorites',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { destinationId: 'dest-1' },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json()).toMatchObject({ id: 'fav-dest' })
  })

  it('retorna 400 sem packageId nem destinationId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/me/favorites',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: {},
    })

    expect(res.statusCode).toBe(400)
  })

  it('roteiro inexistente, rascunho ou arquivado → 404 sem gravar (antes: 500 de FK)', async () => {
    db.tourPackage.findFirst.mockResolvedValue(null)
    const res = await app.inject({
      method: 'POST',
      url: '/me/favorites',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { packageId: 'pkg-x' },
    })
    expect(res.statusCode).toBe(404)
    expect(db.tourPackage.findFirst.mock.calls[0][0].where).toEqual({
      id: 'pkg-x',
      active: true,
      publishedAt: { not: null },
    })
    expect(db.favorite.create).not.toHaveBeenCalled()
  })

  it('destino não aprovado → 404', async () => {
    db.destination.findFirst.mockResolvedValue(null)
    const res = await app.inject({
      method: 'POST',
      url: '/me/favorites',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { destinationId: 'dest-x' },
    })
    expect(res.statusCode).toBe(404)
    expect(db.destination.findFirst.mock.calls[0][0].where).toEqual({
      id: 'dest-x',
      active: true,
      approvalStatus: 'APPROVED',
    })
  })

  it('packageId e destinationId juntos → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/me/favorites',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { packageId: 'pkg-1', destinationId: 'dest-1' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('retorna 409 quando já está nos favoritos (P2002)', async () => {
    const err = new Error('Unique constraint')
    ;(err as any).code = 'P2002'
    db.favorite.create.mockRejectedValue(err)

    const res = await app.inject({
      method: 'POST',
      url: '/me/favorites',
      headers: { ...auth(), 'content-type': 'application/json' },
      payload: { packageId: 'pkg-1' },
    })

    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('Já está nos favoritos')
  })
})

describe('DELETE /me/favorites/:id', () => {
  it('remove favorito do próprio turista', async () => {
    db.favorite.findFirst.mockResolvedValue({ id: 'fav-1', userId: 'user-1' })
    db.favorite.delete.mockResolvedValue({})

    const res = await app.inject({
      method: 'DELETE',
      url: '/me/favorites/fav-1',
      headers: auth(),
    })

    expect(res.statusCode).toBe(204)
    expect(db.favorite.delete).toHaveBeenCalledWith({ where: { id: 'fav-1' } })
  })

  it('retorna 404 se favorito não pertence ao usuário', async () => {
    db.favorite.findFirst.mockResolvedValue({ id: 'fav-1', userId: 'other-user' })

    const res = await app.inject({
      method: 'DELETE',
      url: '/me/favorites/fav-1',
      headers: auth(),
    })

    expect(res.statusCode).toBe(404)
    expect(res.json().message).toBe('Favorito não encontrado')
  })

  it('retorna 404 se favorito não existe', async () => {
    db.favorite.findFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'DELETE',
      url: '/me/favorites/fav-999',
      headers: auth(),
    })

    expect(res.statusCode).toBe(404)
  })

  it('sem token → 401', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/me/favorites/fav-1' })
    expect(res.statusCode).toBe(401)
  })
})
