import { AppError } from '../../shared/errors/AppError'

/** Reservas (e novos pagamentos) fecham 24h antes do início do passeio. */
export const BOOKING_CUTOFF_HOURS = 24

export function assertBeforeBookingCutoff(startsAt: Date): void {
  const msUntilStart = new Date(startsAt).getTime() - Date.now()
  if (!(msUntilStart >= BOOKING_CUTOFF_HOURS * 3600_000)) {
    throw new AppError(`Reservas fecham ${BOOKING_CUTOFF_HOURS}h antes do início do passeio`, 400)
  }
}
