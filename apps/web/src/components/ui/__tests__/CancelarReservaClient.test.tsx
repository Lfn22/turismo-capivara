import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CancelarReservaClient from '../CancelarReservaClient'

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body } as Response
}

describe('CancelarReservaClient (link do e-mail)', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('só cancela depois da confirmação e envia o token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Reserva cancelada com sucesso' }))
    render(<CancelarReservaClient slug="capivara" token="tok123" />)

    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /confirmar cancelamento/i }))

    expect(await screen.findByText(/reserva cancelada/i)).toBeInTheDocument()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/capivara/bookings/cancel-self')
    expect(JSON.parse(init.body)).toEqual({ token: 'tok123' })
  })

  it('mostra a mensagem da API quando o cancelamento é recusado', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'Cancelamento não permitido — menos de 24h até a partida' }, 422),
    )
    render(<CancelarReservaClient slug="capivara" token="tok123" />)
    fireEvent.click(screen.getByRole('button', { name: /confirmar cancelamento/i }))

    expect(await screen.findByText(/menos de 24h/i)).toBeInTheDocument()
  })

  it('sem token, orienta a usar e-mail e código', () => {
    render(<CancelarReservaClient slug="capivara" token="" />)
    expect(screen.queryByRole('button', { name: /confirmar cancelamento/i })).toBeNull()
    expect(screen.getByRole('link', { name: /minha reserva/i })).toHaveAttribute(
      'href',
      '/capivara/minha-reserva',
    )
  })
})
