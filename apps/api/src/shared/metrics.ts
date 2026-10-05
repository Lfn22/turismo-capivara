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

export const slotsOccupancyGauge = meter.createObservableGauge('capi.slots.occupancy', {
  description: 'Slot occupancy ratio',
})
