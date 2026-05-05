import 'dotenv/config'
import Fastify from 'fastify'
import rawBody from 'fastify-raw-body'
import jwt from '@fastify/jwt'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { tenantsRoutes } from './modules/tenants/tenants.routes'
import { packagesRoutes } from './modules/packages/packages.routes'
import { bookingsRoutes } from './modules/bookings/bookings.routes'
import { authRoutes } from './modules/auth/auth.routes'
import { usersRoutes } from './modules/users/users.routes'
import { guidesRoutes } from './modules/guides/guides.routes'
import { AppError } from './shared/errors/AppError'

const app = Fastify({ logger: true })

app.register(rawBody, {
  global: false,
  encoding: false,
  runFirst: true,
})

app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
})

app.register(helmet)

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

app.register(jwt, {
  secret: process.env.JWT_SECRET,
})

app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

app.register(authRoutes)
app.register(tenantsRoutes)
app.register(packagesRoutes)
app.register(bookingsRoutes)
app.register(usersRoutes)
app.register(guidesRoutes)

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
