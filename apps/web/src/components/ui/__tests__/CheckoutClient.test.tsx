import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('react-qr-code', () => ({ default: () => null }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

import CheckoutClient from '../CheckoutClient'

afterEach(() => vi.unstubAllGlobals())

describe('CheckoutClient', () => {
  it('mostra o mesmo código de 6 caracteres que "Minha reserva" aceita', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              id: 'ckabcdefgh0000000000xy9z12',
              status: 'CONFIRMED',
              pax: 2,
              expiresAt: null,
              qrCode: null,
              paymentUrl: null,
              slot: { startsAt: '2027-01-04T11:00:00.000Z', package: { name: 'Trilha' } },
            }),
            { status: 200 },
          ),
      ),
    )

    render(<CheckoutClient slug="capi" bookingId="ckabcdefgh0000000000xy9z12" email="a@b.com" />)

    expect(await screen.findByText('XY9Z12')).toBeInTheDocument()
    expect(screen.queryByText('CKABCDEF')).toBeNull()
  })

  it('mostra a quantidade de guias da reserva', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              id: 'ckabcdefgh0000000000xy9z12',
              status: 'CONFIRMED',
              pax: 12,
              guides: 2,
              isPrivate: false,
              amount: 300,
              expiresAt: null,
              qrCode: null,
              paymentUrl: null,
              slot: { startsAt: '2027-01-04T11:00:00.000Z', package: { name: 'Trilha' } },
            }),
            { status: 200 },
          ),
      ),
    )

    render(<CheckoutClient slug="capi" bookingId="ckabcdefgh0000000000xy9z12" email="a@b.com" />)

    expect(await screen.findByText(/12 pessoas · 2 guias/)).toBeInTheDocument()
  })
})
