import { FastifyInstance } from 'fastify'
import { publicDestinationsRoute } from './routes/public.route'
import { adminDestinationsRoute } from './routes/admin.route'
import { tenantDestinationsRoute } from './routes/tenant.route'

export async function destinationsRoutes(app: FastifyInstance) {
  await app.register(publicDestinationsRoute)
  await app.register(adminDestinationsRoute)
  await app.register(tenantDestinationsRoute)
}
