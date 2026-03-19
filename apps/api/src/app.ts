import 'dotenv/config'
import Fastify from 'fastify'
import prisma from './database'

const app = Fastify({ logger: true })

app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

app.get('/tenants', async () => {
  const tenants = await prisma.tenant.findMany()
  return tenants
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
