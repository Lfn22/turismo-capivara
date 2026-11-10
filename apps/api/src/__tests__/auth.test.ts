import { buildApp } from './helpers/build-app'
import { authRoutes } from '../modules/auth/auth.routes'

const app = buildApp(authRoutes)

describe('POST /auth/login', () => {
  it('retorna 400 quando campos obrigatórios estão ausentes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
  })

  it('retorna 400 quando email é inválido', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'nao-e-um-email', password: 'senha123', tenantSlug: 'demo' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /auth/me', () => {
  it('retorna 401 sem token JWT', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
    })
    expect(res.statusCode).toBe(401)
  })
})
