import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'

vi.mock('../../database', () => ({
  default: { user: { findUnique: vi.fn() } },
}))
vi.mock('bcryptjs', async (orig) => {
  const real = await orig<typeof import('bcryptjs')>()
  return { ...real, compareSync: vi.fn(() => false) }
})

import { compareSync } from 'bcryptjs'
import { buildApp } from '../../__tests__/helpers/build-app'
import { authRoutes } from './auth.routes'
import prisma from '../../database'

const db = prisma as any
const app = buildApp(authRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())
beforeEach(() => vi.clearAllMocks())

describe('auth — endurecimento', () => {
  it('login com e-mail inexistente ainda roda o bcrypt (sem atalho de tempo que revele cadastro)', async () => {
    db.user.findUnique.mockResolvedValue(null)
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'ninguem@x.com', password: 'senha-qualquer' },
    })
    expect(res.statusCode).toBe(401)
    expect(compareSync).toHaveBeenCalledTimes(1)
  })

  it('/auth/refresh sem corpo → 400 (antes: 500)', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/refresh' })
    expect(res.statusCode).toBe(400)
  })

  it('/auth/refresh com refreshToken vazio → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: '' },
    })
    expect(res.statusCode).toBe(400)
  })
})
