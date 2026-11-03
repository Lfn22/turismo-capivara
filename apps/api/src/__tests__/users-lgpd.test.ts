import { buildApp } from './helpers/build-app'
import { usersRoutes } from '../modules/users/users.routes'

const app = buildApp(usersRoutes)

describe('LGPD — users routes (sem auth)', () => {
  it('GET /tenants/:slug/users/me/export sem auth → 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/test-slug/users/me/export',
    })
    expect(res.statusCode).toBe(401)
  })

  it('DELETE /tenants/:slug/users/me sem auth → 401', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/tenants/test-slug/users/me',
    })
    expect(res.statusCode).toBe(401)
  })
})
