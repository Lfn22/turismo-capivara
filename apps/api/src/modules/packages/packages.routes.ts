import { FastifyInstance } from 'fastify'
import { publicPackagesRoute } from './routes/public.route'
import { crudPackagesRoute } from './routes/crud.route'
import { slotsRoute } from './routes/slots.route'

export async function packagesRoutes(app: FastifyInstance) {
  await app.register(publicPackagesRoute)
  await app.register(crudPackagesRoute)
  await app.register(slotsRoute)
}
