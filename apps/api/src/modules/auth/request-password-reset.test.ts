import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'

vi.mock('../../database', () => ({
  default: {
    user: { findUnique: vi.fn() },
    passwordResetToken: { deleteMany: vi.fn(), create: vi.fn() },
  },
}))

vi.mock('../../shared/email', () => ({
  getResend: vi.fn(() => null),
  getEmailFrom: vi.fn(),
}))

import { buildApp } from '../../__tests__/helpers/build-app'
import { requestPasswordResetRoute } from './routes/request-password-reset'
import prisma from '../../database'

const db = prisma as any
const app = buildApp(requestPasswordResetRoute)

beforeAll(() => app.ready())
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

const GENERIC = { message: 'Se este email estiver cadastrado, você receberá um link para redefinir sua senha.' }

function request(body: Record<string, unknown>) {
  return app.inject({ method: 'POST', url: '/auth/request-password-reset', payload: body })
}

describe('POST /auth/request-password-reset (sem tenantSlug)', () => {
  it('usuário existente: { email } → resposta genérica e token criado', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'user-1', name: 'Ana' })
    const res = await request({ email: 'Ana@Capi.com' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual(GENERIC)
    expect(db.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'ana@capi.com' } }),
    )
    expect(db.passwordResetToken.create).toHaveBeenCalledTimes(1)
  })

  it('usuário inexistente: mesma resposta genérica, sem token', async () => {
    db.user.findUnique.mockResolvedValue(null)
    const res = await request({ email: 'ninguem@capi.com' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual(GENERIC)
    expect(db.passwordResetToken.create).not.toHaveBeenCalled()
  })
})
