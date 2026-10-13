import { FastifyInstance } from 'fastify'
import { createBookingRoute } from './routes/create.route'
import { selfServiceRoute } from './routes/self-service.route'
import { cancelSelfRoute } from './routes/cancel.route'
import { repayRoute } from './routes/repay.route'
import { adminBookingsRoute } from './routes/admin.route'

export async function bookingsRoutes(app: FastifyInstance) {
  await app.register(createBookingRoute)
  await app.register(selfServiceRoute)
  await app.register(cancelSelfRoute)
  await app.register(repayRoute)
  await app.register(adminBookingsRoute)
}
