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
    tenant: { findUnique: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
    guideDestination: { count: vi.fn() },
    tenantDestination: { count: vi.fn() },
    tourPackage: { count: vi.fn() },
    user: { findUnique: vi.fn() },
    destination: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  },
}))

vi.mock('./destinations.service', () => ({
  geocode: vi.fn(),
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
    // O tenant do ADMIN não está vinculado a "serra-do-cipo"
    db.destination.findUnique.mockResolvedValue({ id: 'dest-cipo' })
    db.tenant.findFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'PATCH',
      url: '/destinations/serra-do-cipo',
      headers: auth('ADMIN'),
      payload: { title: 'Vitrine sequestrada' },
    })

    expect(res.statusCode).toBe(403)
    expect(db.destination.update).not.toHaveBeenCalled()
  })

  it('bloqueia CONDUTOR em qualquer destino (guia não edita destino)', async () => {
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
    db.destination.findUnique.mockResolvedValue({ id: 'dest-1' })
    db.tenant.findFirst.mockResolvedValue({ id: OWN_TENANT.id })
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
    expect(db.tenant.findFirst).not.toHaveBeenCalled()
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
  const url = `/tenants/${OWN_TENANT.slug}/destinations/dest-1`
  const ownProposal = { id: 'dest-1', approvalStatus: 'PENDING', createdBy: { tenantId: OWN_TENANT.id } }

  beforeEach(() => db.tenant.findUnique.mockResolvedValue(OWN_TENANT))

  function noLinks() {
    db.tenant.count.mockResolvedValue(0)
    db.guideDestination.count.mockResolvedValue(0)
    db.tenantDestination.count.mockResolvedValue(0)
    db.tourPackage.count.mockResolvedValue(0)
  }

  it('PATCH: 404 quando o destino não existe', async () => {
    db.destination.findUnique.mockResolvedValue(null)

    const res = await app.inject({ method: 'PATCH', url, headers: auth('ADMIN'), payload: { name: 'X' } })

    expect(res.statusCode).toBe(404)
    expect(service.updateDestination).not.toHaveBeenCalled()
  })

  it('PATCH: ADMIN em destino APPROVED ligado a outra agência recebe 403', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'dest-1', approvalStatus: 'APPROVED', createdBy: { tenantId: OWN_TENANT.id } })
    db.tenant.findFirst.mockResolvedValue(null)

    const res = await app.inject({ method: 'PATCH', url, headers: auth('ADMIN'), payload: { name: 'Alteração indevida' } })

    expect(res.statusCode).toBe(403)
    expect(service.updateDestination).not.toHaveBeenCalled()
  })

  it('PATCH: ADMIN edita a própria proposta PENDING', async () => {
    db.destination.findUnique.mockResolvedValue(ownProposal)
    db.tenant.findFirst.mockResolvedValue(null)
    ;(service.updateDestination as any).mockResolvedValue({ id: 'dest-1', title: 'ok' })

    const res = await app.inject({ method: 'PATCH', url, headers: auth('ADMIN'), payload: { name: 'Nome novo' } })

    expect(res.statusCode).toBe(200)
    expect(service.updateDestination).toHaveBeenCalledWith('dest-1', 'user-1', { name: 'Nome novo' }, 'ADMIN')
  })

  it('PATCH: ADMIN não edita proposta PENDING criada por outro tenant', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'dest-1', approvalStatus: 'PENDING', createdBy: { tenantId: 'tenant-outro' } })
    db.tenant.findFirst.mockResolvedValue(null)

    const res = await app.inject({ method: 'PATCH', url, headers: auth('ADMIN'), payload: { name: 'X' } })

    expect(res.statusCode).toBe(403)
  })

  it('PATCH: ADMIN edita destino APPROVED ligado ao próprio tenant', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'dest-1', approvalStatus: 'APPROVED', createdBy: { tenantId: 'tenant-outro' } })
    db.tenant.findFirst.mockResolvedValue({ id: OWN_TENANT.id })
    ;(service.updateDestination as any).mockResolvedValue({ id: 'dest-1' })

    const res = await app.inject({ method: 'PATCH', url, headers: auth('ADMIN'), payload: { name: 'Nome novo' } })

    expect(res.statusCode).toBe(200)
  })

  it('PATCH: equipe edita qualquer destino (mesmo APPROVED de outro tenant)', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'dest-1', approvalStatus: 'APPROVED', createdBy: { tenantId: 'tenant-outro' } })
    ;(service.updateDestination as any).mockResolvedValue({ id: 'dest-1' })

    const res = await app.inject({ method: 'PATCH', url, headers: auth('PLATFORM_ADMIN', 'tenant-staff'), payload: { name: 'Nome novo' } })

    expect(res.statusCode).toBe(200)
    expect(service.updateDestination).toHaveBeenCalledWith('dest-1', 'user-1', { name: 'Nome novo' }, 'PLATFORM_ADMIN')
  })

  it('DELETE: 404 quando o destino não existe', async () => {
    db.destination.findUnique.mockResolvedValue(null)

    const res = await app.inject({ method: 'DELETE', url, headers: auth('ADMIN') })

    expect(res.statusCode).toBe(404)
    expect(service.deleteDestination).not.toHaveBeenCalled()
  })

  it('DELETE: ADMIN em destino APPROVED recebe 403', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'dest-1', approvalStatus: 'APPROVED', createdBy: { tenantId: OWN_TENANT.id } })

    const res = await app.inject({ method: 'DELETE', url, headers: auth('ADMIN') })

    expect(res.statusCode).toBe(403)
    expect(service.deleteDestination).not.toHaveBeenCalled()
  })

  it('DELETE: ADMIN exclui a própria proposta PENDING sem vínculos', async () => {
    db.destination.findUnique.mockResolvedValue(ownProposal)
    noLinks()
    ;(service.deleteDestination as any).mockResolvedValue({ success: true })

    const res = await app.inject({ method: 'DELETE', url, headers: auth('ADMIN') })

    expect(res.statusCode).toBe(204)
    expect(service.deleteDestination).toHaveBeenCalled()
  })

  it('DELETE: proposta PENDING com vínculos responde 409', async () => {
    db.destination.findUnique.mockResolvedValue(ownProposal)
    noLinks()
    db.tourPackage.count.mockResolvedValue(2)

    const res = await app.inject({ method: 'DELETE', url, headers: auth('ADMIN') })

    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('Este destino tem agências ou roteiros ligados. Arquive em vez de excluir.')
    expect(service.deleteDestination).not.toHaveBeenCalled()
  })

  it('DELETE: equipe exclui sem vínculos e recebe 409 com vínculos', async () => {
    db.destination.findUnique.mockResolvedValue({ id: 'dest-1', approvalStatus: 'APPROVED', createdBy: { tenantId: 'tenant-outro' } })
    noLinks()
    ;(service.deleteDestination as any).mockResolvedValue({ success: true })

    const ok = await app.inject({ method: 'DELETE', url, headers: auth('SUPER_ADMIN') })
    expect(ok.statusCode).toBe(204)

    db.tenantDestination.count.mockResolvedValue(1)
    const blocked = await app.inject({ method: 'DELETE', url, headers: auth('SUPER_ADMIN') })
    expect(blocked.statusCode).toBe(409)
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
    expect(db.tenant.findFirst).not.toHaveBeenCalled()
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
