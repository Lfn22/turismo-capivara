/**
 * testimonials.test.ts
 *
 * Regressão para A-3: POST /guides/:id/testimonials exige prova de que o autor
 * realmente fez o passeio com aquele guia.
 *
 * Antes: rota pública, sem autenticação e sem vínculo com reserva. Qualquer pessoa
 * publicava avaliações ilimitadas, com `touristName` arbitrário, para qualquer guia
 * aprovado — inflando o próprio perfil ou afundando o de um concorrente.
 */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { Prisma } from '@prisma/client'

vi.mock('../../database', () => ({
  default: {
    guideProfile: { findFirst: vi.fn() },
    booking: { findUnique: vi.fn() },
    testimonial: { create: vi.fn(), findMany: vi.fn() },
  },
}))

vi.mock('../../shared/email', () => ({
  getResend: vi.fn(() => null),
  getEmailFrom: vi.fn(() => 'test@example.com'),
}))

import { buildApp } from '../../__tests__/helpers/build-app'
import { guidesRoutes } from './guides.routes'
import prisma from '../../database'

const db = prisma as any
const app = buildApp(guidesRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())

const GUIDE = { id: 'guide-profile-1', userId: 'guide-user-1' }
const PAST = new Date(Date.now() - 48 * 60 * 60 * 1000)
const FUTURE = new Date(Date.now() + 48 * 60 * 60 * 1000)

const ELIGIBLE_BOOKING = {
  id: 'booking-1',
  customerEmail: 'turista@example.com',
  customerName: 'Maria Turista',
  status: 'CONFIRMED',
  slot: {
    startsAt: PAST,
    guideId: GUIDE.id,
    package: { conductorId: GUIDE.userId },
  },
}

const VALID_BODY = {
  bookingId: 'booking-1',
  customerEmail: 'turista@example.com',
  text: 'Passeio maravilhoso, guia muito atencioso.',
  rating: 5,
}

function post(payload: unknown) {
  return app.inject({ method: 'POST', url: `/guides/${GUIDE.id}/testimonials`, payload })
}

beforeEach(() => {
  vi.clearAllMocks()
  db.guideProfile.findFirst.mockResolvedValue(GUIDE)
  db.booking.findUnique.mockResolvedValue(ELIGIBLE_BOOKING)
  db.testimonial.create.mockResolvedValue({
    id: 't-1',
    text: VALID_BODY.text,
    touristName: ELIGIBLE_BOOKING.customerName,
    rating: 5,
    createdAt: new Date(),
  })
})

describe('A-3: depoimento exige reserva comprovada', () => {
  it('recusa depoimento sem referência de reserva (o formato antigo)', async () => {
    const res = await post({
      text: 'Depoimento forjado sem reserva nenhuma.',
      touristName: 'Nome Inventado',
      rating: 5,
    })

    expect(res.statusCode).toBe(400)
    expect(db.testimonial.create).not.toHaveBeenCalled()
  })

  it('recusa quando o e-mail não confere com o da reserva', async () => {
    const res = await post({ ...VALID_BODY, customerEmail: 'invasor@example.com' })

    expect(res.statusCode).toBe(404) // mesmo 404 de "não existe", contra enumeração
    expect(db.testimonial.create).not.toHaveBeenCalled()
  })

  it('recusa reserva não paga', async () => {
    db.booking.findUnique.mockResolvedValue({ ...ELIGIBLE_BOOKING, status: 'PENDING' })

    const res = await post(VALID_BODY)

    expect(res.statusCode).toBe(403)
    expect(res.json().message).toBe('BOOKING_NOT_ELIGIBLE')
  })

  it('recusa reserva cancelada', async () => {
    db.booking.findUnique.mockResolvedValue({ ...ELIGIBLE_BOOKING, status: 'CANCELLED' })

    const res = await post(VALID_BODY)

    expect(res.statusCode).toBe(403)
  })

  it('recusa quando o passeio ainda não aconteceu', async () => {
    db.booking.findUnique.mockResolvedValue({
      ...ELIGIBLE_BOOKING,
      slot: { ...ELIGIBLE_BOOKING.slot, startsAt: FUTURE },
    })

    const res = await post(VALID_BODY)

    expect(res.statusCode).toBe(403)
    expect(res.json().message).toBe('TOUR_NOT_FINISHED')
  })

  it('recusa reserva feita com OUTRO guia', async () => {
    db.booking.findUnique.mockResolvedValue({
      ...ELIGIBLE_BOOKING,
      slot: { startsAt: PAST, guideId: 'outro-guia', package: { conductorId: 'outro-user' } },
    })

    const res = await post(VALID_BODY)

    expect(res.statusCode).toBe(403)
    expect(res.json().message).toBe('BOOKING_NOT_FOR_THIS_GUIDE')
  })

  it('aceita depoimento legítimo e usa o nome da RESERVA, não o do corpo', async () => {
    const res = await post({ ...VALID_BODY, touristName: 'Nome Falsificado' })

    expect(res.statusCode).toBe(201)
    expect(db.testimonial.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingId: 'booking-1',
          touristName: 'Maria Turista', // da reserva
        }),
      })
    )
  })

  it('aceita quando o vínculo vem do condutor do pacote, sem guia no slot', async () => {
    db.booking.findUnique.mockResolvedValue({
      ...ELIGIBLE_BOOKING,
      slot: { startsAt: PAST, guideId: null, package: { conductorId: GUIDE.userId } },
    })

    const res = await post(VALID_BODY)

    expect(res.statusCode).toBe(201)
  })

  it('recusa um segundo depoimento para a mesma reserva', async () => {
    db.testimonial.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      })
    )

    const res = await post(VALID_BODY)

    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('TESTIMONIAL_ALREADY_SUBMITTED')
  })

  it('recusa depoimento para guia não aprovado', async () => {
    db.guideProfile.findFirst.mockResolvedValue(null)

    const res = await post(VALID_BODY)

    expect(res.statusCode).toBe(404)
    expect(db.booking.findUnique).not.toHaveBeenCalled()
  })
})
