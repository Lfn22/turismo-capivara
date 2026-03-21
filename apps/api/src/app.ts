import 'dotenv/config'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { tenantsRoutes } from './modules/tenants/tenants.routes'
import { packagesRoutes } from './modules/packages/packages.routes'
import { bookingsRoutes } from './modules/bookings/bookings.routes'
import { authRoutes } from './modules/auth/auth.routes'

const app = Fastify({ logger: true })

app.register(jwt, {
  secret: process.env.JWT_SECRET ?? 'desenvolvimento-secret-trocar-em-producao',
})

app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

app.register(authRoutes)
app.register(tenantsRoutes)
app.register(packagesRoutes)
app.register(bookingsRoutes)

const start = async () => {
  try {
    await app.listen({ port: 3333, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()