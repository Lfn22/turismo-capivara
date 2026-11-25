/**
 * booking-public-get.test.ts
 *
 * GET /tenants/:slug/bookings/:id?email= — público (checkout, polling e confirmação
 * do turista convidado). Autoriza por id (cuid) + e-mail; 404 opaco para ambos.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp } from './helpers/build-app'
import { bookingsRoutes } from '../modules/bookings/bookings.routes'

vi.mock('../services/payment.service', () => ({ createPixPayment: vi.fn() }))
vi.mock('../shared/email', () => ({ getResend: vi.fn(() => null) }))
vi.mock('../database', () => ({
  default: {
    tenant: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    booking: { findFirst: vi.fn(), findMany: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(),
  },
}))

import prisma from '../database'

const db = prisma as unknown as {
  tenant: { findUnique: Mock }
  user: { findUnique: Mock }
  booking: { findFirst: Mock; findMany: Mock }
}

const app = buildApp(bookingsRoutes)
const TENANT = { id: 'tenant-1', slug: 'capivara' }
const BOOKING = {
  id: 'ckbooking0000000000ab1234',
  tenantId: TENANT.id,
  status: 'PENDING',
  customerName: 'João',
  customerEmail: 'Joao@Example.com',
  customerPhone: '11999999999',
  customerCpfHash: 'hash',
  cancelToken: 'secret-cancel-token',
  pax: 2,
  qrCode: 'qr',
  paymentUrl: 'https://mp/pay',
  expiresAt: new Date(),
  slot: { startsAt: new Date(), package: { name: 'Trilha' } },
}

beforeAll(() => app.ready())
afterAll(() => app.close())
beforeEach(() => {
  vi.resetAllMocks()
  db.tenant.findUnique.mockResolvedValue(TENANT)
})

const url = (email: string) =>
  `/tenants/capivara/bookings/${BOOKING.id}?email=${encodeURIComponent(email)}`

describe('GET /tenants/:slug/bookings/:id (público)', () => {
  it('turista sem JWT recebe a reserva com e-mail correto (case-insensitive)', async () => {
    db.booking.findFirst.mockResolvedValue(BOOKING)
    const res = await app.inject({ method: 'GET', url: url('joao@example.com') })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toMatchObject({ id: BOOKING.id, status: 'PENDING', qrCode: 'qr', pax: 2 })
    expect(body.slot.package.name).toBe('Trilha')
  })

  it('não expõe CPF, telefone nem cancelToken', async () => {
    db.booking.findFirst.mockResolvedValue(BOOKING)
    const body = (await app.inject({ method: 'GET', url: url('joao@example.com') })).json()

    expect(body).not.toHaveProperty('customerCpfHash')
    expect(body).not.toHaveProperty('customerPhone')
    expect(body).not.toHaveProperty('cancelToken')
  })

  it('e-mail diferente → 404 opaco', async () => {
    db.booking.findFirst.mockResolvedValue(BOOKING)
    const res = await app.inject({ method: 'GET', url: url('outro@example.com') })
    expect(res.statusCode).toBe(404)
  })

  it('reserva inexistente → 404', async () => {
    db.booking.findFirst.mockResolvedValue(null)
    const res = await app.inject({ method: 'GET', url: url('joao@example.com') })
    expect(res.statusCode).toBe(404)
  })

  it('sem e-mail → 400', async () => {
    const res = await app.inject({ method: 'GET', url: `/tenants/capivara/bookings/${BOOKING.id}` })
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /tenants/:slug/bookings (painel)', () => {
  it('SUPER_ADMIN no painel da agência vê as reservas (antes: 403)', async () => {
    db.user.findUnique.mockResolvedValue({ role: 'SUPER_ADMIN' })
    db.booking.findMany.mockResolvedValue([])
    const token = app.jwt.sign({
      sub: 'sa',
      role: 'SUPER_ADMIN',
      tenantId: 'plataforma',
      name: 'SA',
    })
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/capivara/bookings',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
  })
})
