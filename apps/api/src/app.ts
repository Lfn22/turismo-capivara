import 'dotenv/config'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { tenantsRoutes } from './modules/tenants/tenants.routes'
import { packagesRoutes } from './modules/packages/packages.routes'
import { bookingsRoutes } from './modules/bookings/bookings.routes'
import { authRoutes } from './modules/auth/auth.routes'
import { AppError } from './shared/errors/AppError'

const app = Fastify({ logger: true })

app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
})

app.register(helmet)

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

app.setErrorHandler((err, _request, reply) => {
  if (err instanceof AppError) {
    return reply.status(err.statusCode).send({ message: err.message })
  }
  app.log.error(err)
  reply.status(500).send({ message: 'Erro interno do servidor' })
})

const start = async () => {
  try {
    await app.listen({ port: 3333, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
