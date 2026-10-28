/**
 * destinations.authz.test.ts
 *
 * Regressão para A-1 e A-2: autorização em NÍVEL DE ROTA para destinos.
 *
 * O arquivo destinations.routes.test.ts existente cobre apenas as funções do service —
 * nenhum teste exercitava os preHandlers nem o escopo de tenant das rotas. Foi exatamente
 * por isso que estes dois defeitos passaram despercebidos:
 *
 *   A-1: Destination não tem coluna tenantId (é entidade global do marketplace). O ADMIN de
 *        qualquer operadora conseguia editar a vitrine de qualquer concorrente — o isolamento
 *        estava delegado ao frontend ("isolamento garantido pela UI").
 *   A-2: Moderação de destino (aprovar/rejeitar/listar fila) aceitava ADMIN, permitindo que
 *        uma operadora aprovasse o próprio destino e rejeitasse o do concorrente.
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'

vi.mock('../../database', () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    destination: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('./destinations.service', () => ({
  createDestination: vi.fn(),
  updateDestination: vi.fn(),
  deleteDestination: vi.fn(),
  approveDestination: vi.fn(),
  rejectDestination: vi.fn(),
  listDestinations: vi.fn(),
  getDestinationBySlug: vi.fn(),
}))

import { buildApp } from '../../__tests__/helpers/build-app'
import { destinationsRoutes } from './destinations.routes'
import prisma from '../../database'
import * as service from './destinations.service'

const db = prisma as any
const app = buildApp(destinationsRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())
beforeEach(() => vi.clearAllMocks())

const OWN_TENANT = { id: 'tenant-own', slug: 'operadora-a' }

function token(role: string, tenantId = OWN_TENANT.id) {
  return app.jwt.sign({ sub: 'user-1', role, tenantId, name: 'Teste', approvalStatus: 'APPROVED' })
}

function auth(role: string, tenantId?: string) {
  db.user.findUnique.mockResolvedValue({ role })
  return { authorization: `Bearer ${token(role, tenantId)}` }
}

// ---------------------------------------------------------------------------
// A-1 — PATCH /destinations/:destinationSlug
// ---------------------------------------------------------------------------
describe('A-1: PATCH /destinations/:destinationSlug — escopo de tenant', () => {
  it('bloqueia ADMIN que tenta editar o destino de outra operadora', async () => {
    // O tenant do ADMIN está vinculado a "chapada", mas ele mira "serra-do-cipo"
    db.tenant.findUnique.mockResolvedValue({ destination: { slug: 'chapada' } })

    const res = await app.inject({
      method: 'PATCH',
      url: '/destinations/serra-do-cipo',
      headers: auth('ADMIN'),
      payload: { title: 'Vitrine sequestrada' },
    })

    expect(res.statusCode).toBe(403)
    expect(db.destination.update).not.toHaveBeenCalled()
  })

  it('bloqueia CONDUTOR de outra operadora (comportamento que já existia)', async () => {
    db.tenant.findUnique.mockResolvedValue({ destination: { slug: 'chapada' } })

    const res = await app.inject({
      method: 'PATCH',
      url: '/destinations/serra-do-cipo',
      headers: auth('CONDUTOR'),
      payload: { title: 'Vitrine sequestrada' },
    })

    expect(res.statusCode).toBe(403)
    expect(db.destination.update).not.toHaveBeenCalled()
  })

  it('permite ADMIN editar o destino vinculado ao próprio tenant', async () => {
    db.tenant.findUnique.mockResolvedValue({ destination: { slug: 'chapada' } })
    db.destination.findUnique.mockResolvedValue({ id: 'dest-1' })
    db.destination.update.mockResolvedValue({ slug: 'chapada', heroImageUrl: null, photos: [] })

    const res = await app.inject({
      method: 'PATCH',
      url: '/destinations/chapada',
      headers: auth('ADMIN'),
      payload: { title: 'Chapada dos Veadeiros' },
    })

    expect(res.statusCode).toBe(200)
    expect(db.destination.update).toHaveBeenCalled()
  })

  it('permite SUPER_ADMIN editar qualquer destino', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'dest-1' })
    db.destination.update.mockResolvedValue({ slug: 'serra-do-cipo', heroImageUrl: null, photos: [] })

    const res = await app.inject({
      method: 'PATCH',
      url: '/destinations/serra-do-cipo',
      headers: auth('SUPER_ADMIN'),
      payload: { title: 'Serra do Cipó' },
    })

    expect(res.statusCode).toBe(200)
    // SUPER_ADMIN nem consulta o vínculo de tenant
    expect(db.tenant.findUnique).not.toHaveBeenCalled()
  })

  it('exige autenticação', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/destinations/chapada',
      payload: { title: 'Anônimo' },
    })

    expect(res.statusCode).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// A-1 — PATCH/DELETE /tenants/:slug/destinations/:id
// ---------------------------------------------------------------------------
describe('A-1: /tenants/:slug/destinations/:id — escopo verificado no servidor', () => {
  it('ADMIN recebe 404 para destino criado fora da sua operadora', async () => {
    db.tenant.findUnique.mockResolvedValue(OWN_TENANT)
    // A consulta agora é sempre filtrada por createdBy.tenant.slug — nada encontrado
    db.destination.findFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'PATCH',
      url: `/tenants/${OWN_TENANT.slug}/destinations/dest-de-outro-tenant`,
      headers: auth('ADMIN'),
      payload: { name: 'Alteração indevida' },
    })

    expect(res.statusCode).toBe(404)
    expect(service.updateDestination).not.toHaveBeenCalled()
  })

  it('a consulta de escopo filtra por createdBy.tenant.slug para ADMIN', async () => {
    db.tenant.findUnique.mockResolvedValue(OWN_TENANT)
    db.destination.findFirst.mockResolvedValue({ id: 'dest-1' })
    ;(service.updateDestination as any).mockResolvedValue({ id: 'dest-1', title: 'ok' })

    await app.inject({
      method: 'PATCH',
      url: `/tenants/${OWN_TENANT.slug}/destinations/dest-1`,
      headers: auth('ADMIN'),
      payload: { name: 'Nome novo' },
    })

    // Antes o ADMIN buscava por { id } puro — sem escopo nenhum
    expect(db.destination.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dest-1', createdBy: { tenant: { slug: OWN_TENANT.slug } } },
      })
    )
  })

  it('DELETE também aplica o escopo de tenant para ADMIN', async () => {
    db.tenant.findUnique.mockResolvedValue(OWN_TENANT)
    db.destination.findFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'DELETE',
      url: `/tenants/${OWN_TENANT.slug}/destinations/dest-de-outro-tenant`,
      headers: auth('ADMIN'),
    })

    expect(res.statusCode).toBe(404)
    expect(service.deleteDestination).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// A-2 — moderação é ação de plataforma
// ---------------------------------------------------------------------------
describe('A-2: moderação de destino restrita a SUPER_ADMIN', () => {
  it('ADMIN não aprova destino', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/destinations/dest-1/approve',
      headers: auth('ADMIN'),
      payload: { approvalStatus: 'APPROVED' },
    })

    expect(res.statusCode).toBe(403)
    expect(service.approveDestination).not.toHaveBeenCalled()
  })

  it('ADMIN não rejeita destino de concorrente', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/destinations/dest-1/approve',
      headers: auth('ADMIN'),
      payload: { approvalStatus: 'REJECTED', rejectionReason: 'sabotagem' },
    })

    expect(res.statusCode).toBe(403)
    expect(service.rejectDestination).not.toHaveBeenCalled()
  })

  it('SUPER_ADMIN aprova normalmente', async () => {
    ;(service.approveDestination as any).mockResolvedValue({ id: 'dest-1', approvalStatus: 'APPROVED' })

    const res = await app.inject({
      method: 'PATCH',
      url: '/destinations/dest-1/approve',
      headers: auth('SUPER_ADMIN'),
      payload: { approvalStatus: 'APPROVED' },
    })

    expect(res.statusCode).toBe(200)
    expect(service.approveDestination).toHaveBeenCalledWith('dest-1')
  })

  it('PLATFORM_ADMIN aprova normalmente', async () => {
    ;(service.approveDestination as any).mockResolvedValue({ id: 'dest-1', approvalStatus: 'APPROVED' })

    const res = await app.inject({
      method: 'PATCH',
      url: '/destinations/dest-1/approve',
      headers: auth('PLATFORM_ADMIN'),
      payload: { approvalStatus: 'APPROVED' },
    })

    expect(res.statusCode).toBe(200)
    expect(service.approveDestination).toHaveBeenCalledWith('dest-1')
  })

  it('PLATFORM_ADMIN edita destino de outra agência (como SUPER_ADMIN)', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'dest-1' })
    db.destination.update.mockResolvedValue({ slug: 'serra-do-cipo', heroImageUrl: null, photos: [] })

    const res = await app.inject({
      method: 'PATCH',
      url: '/destinations/serra-do-cipo',
      headers: auth('PLATFORM_ADMIN', 'tenant-outra'),
      payload: { title: 'Serra do Cipó' },
    })

    expect(res.statusCode).toBe(200)
    expect(db.tenant.findUnique).not.toHaveBeenCalled()
  })

  it('PLATFORM_ADMIN de outra agência não recebe "Acesso negado a este tenant" em rota com :slug', async () => {
    db.tenant.findUnique.mockResolvedValue(OWN_TENANT)

    const res = await app.inject({
      method: 'GET',
      url: `/tenants/${OWN_TENANT.slug}/destinations`,
      headers: auth('PLATFORM_ADMIN', 'tenant-outra'),
    })

    expect(res.json().message).not.toBe('Acesso negado a este tenant')
  })

  it('ADMIN não enxerga a fila de curadoria da plataforma', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/destinations/pending',
      headers: auth('ADMIN'),
    })

    expect(res.statusCode).toBe(403)
  })

  it('ADMIN não lista todos os destinos da plataforma', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/admin/destinations',
      headers: auth('ADMIN'),
    })

    expect(res.statusCode).toBe(403)
  })
})
