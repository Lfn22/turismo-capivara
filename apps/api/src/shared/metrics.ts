import { metrics } from '@opentelemetry/api'

const meter = metrics.getMeter('capi-api')

export const bookingsCreatedCounter = meter.createCounter('capi.bookings.created', {
  description: 'Total bookings created',
})

export const bookingsConfirmedCounter = meter.createCounter('capi.bookings.confirmed', {
  description: 'Total bookings confirmed via webhook',
})

export const paymentsFailedCounter = meter.createCounter('capi.payments.failed', {
  description: 'Total payment failures',
})

export const bookingsCancelledCounter = meter.createCounter('bookings_cancelled_total', {
  description: 'Total bookings cancelled',
})

export const bookingsExpiredCounter = meter.createCounter('bookings_expired_total', {
  description: 'Total bookings expired',
})

export const bookingRevenueHistogram = meter.createHistogram('booking_revenue_brl', {
  description: 'Booking revenue in BRL',
  unit: 'BRL',
})

export const slotsOccupancyGauge = meter.createObservableGauge('capi.slots.occupancy', {
  description: 'Slot occupancy ratio',
})
