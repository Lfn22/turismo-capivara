import { FastifyInstance } from 'fastify'
import { createBookingRoute } from './routes/create.route'
import { selfServiceRoute } from './routes/self-service.route'
import { cancelSelfRoute } from './routes/cancel.route'
import { repayRoute } from './routes/repay.route'
import { adminBookingsRoute } from './routes/admin.route'

/** Public shape of a booking on create — omits customerPhone and customerCpfHash. */
function bookingResponse(b: {
  id: string
  tenantId: string
  slotId: string
  customerName: string
  customerEmail: string
  pax: number
  status: string
  paymentId: string | null
  paymentUrl: string | null
  expiresAt: Date | null
  createdAt: Date
  qrCode: string | null
}) {
  return {
    id: b.id,
    tenantId: b.tenantId,
    slotId: b.slotId,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    pax: b.pax,
    status: b.status,
    paymentId: b.paymentId,
    paymentUrl: b.paymentUrl,
    expiresAt: b.expiresAt,
    createdAt: b.createdAt,
    qrCode: b.qrCode,
  }
}

export async function bookingsRoutes(app: FastifyInstance) {
  await app.register(createBookingRoute)
  await app.register(selfServiceRoute)
  await app.register(cancelSelfRoute)
  await app.register(repayRoute)
  await app.register(adminBookingsRoute)
}
