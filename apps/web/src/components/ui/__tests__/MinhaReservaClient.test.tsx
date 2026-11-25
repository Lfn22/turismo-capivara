import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MinhaReservaClient from '../MinhaReservaClient'

const expiredBooking = {
  id: 'b1',
  status: 'EXPIRED',
  customerName: 'João',
  pax: 1,
  qrCode: null,
  paymentUrl: null,
  expiresAt: null,
  tenantWhatsapp: null,
  slot: { startsAt: '2027-01-04T11:00:00.000Z', packageName: 'Trilha' },
}

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body } as Response
}

async function openExpiredBooking() {
  render(<MinhaReservaClient slug="capivara" />)
  fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'joao@example.com' } })
  fireEvent.change(screen.getByLabelText(/código da reserva/i), { target: { value: 'AB1234' } })
  fireEvent.submit(screen.getByLabelText(/e-mail/i).closest('form')!)
  await screen.findByText(/prazo expirado/i)
}

describe('MinhaReservaClient — novo pagamento', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValueOnce(jsonResponse(expiredBooking))
  })

  it('envia o CPF (só dígitos) junto com e-mail e código', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ qrCode: 'qr', paymentUrl: 'u', expiresAt: null }),
    )
    await openExpiredBooking()

    fireEvent.change(screen.getByLabelText(/cpf/i), { target: { value: '529.982.247-25' } })
    fireEvent.click(screen.getByRole('button', { name: /gerar novo pagamento/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe('/api/capivara/bookings/repay')
    expect(JSON.parse(init.body)).toEqual({
      email: 'joao@example.com',
      code: 'ab1234',
      cpf: '52998224725',
    })
  })

  it('não chama a API com CPF incompleto', async () => {
    await openExpiredBooking()

    fireEvent.change(screen.getByLabelText(/cpf/i), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: /gerar novo pagamento/i }))

    expect(await screen.findByText(/cpf deve ter 11 dígitos/i)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
