import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

vi.mock('../../lib/api', () => {
  class ApiError extends Error {
    constructor(public status: number, public data: unknown) {
      super(`API error ${status}`)
    }
  }
  return { api: vi.fn(), ApiError }
})
vi.mock('../../lib/posthog', () => ({ posthog: { capture: vi.fn() } }))
vi.mock('../../lib/meta-pixel', () => ({ trackPixel: vi.fn() }))

import { api, ApiError } from '../../lib/api'
import { posthog } from '../../lib/posthog'
import { trackPixel } from '../../lib/meta-pixel'
import { LeadForm } from './LeadForm'

const apiMock = vi.mocked(api)

function fill(whatsapp = '(89) 99999-0000') {
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Maria' } })
  fireEvent.change(screen.getByLabelText('WhatsApp'), { target: { value: whatsapp } })
}

describe('LeadForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test'
    sessionStorage.setItem('capi-utm', JSON.stringify({ utmSource: 'meta' }))
  })

  it('envia lead válido e mostra sucesso + tracking', async () => {
    apiMock.mockResolvedValue({ id: '1' })
    render(<LeadForm destinationSlug="serra-da-capivara" />)
    fill()
    fireEvent.click(screen.getByLabelText(/autorizo/i))
    fireEvent.click(screen.getByRole('button', { name: 'Quero ir' }))
    await waitFor(() => expect(apiMock).toHaveBeenCalledTimes(1))
    const [path, opts] = apiMock.mock.calls[0] as [string, { method: string; body: Record<string, unknown> }]
    expect(path).toBe('/leads')
    expect(opts.method).toBe('POST')
    expect(opts.body).toEqual({
      name: 'Maria',
      whatsapp: '(89) 99999-0000',
      destinationSlug: 'serra-da-capivara',
      consent: true,
      utmSource: 'meta',
    })
    expect(await screen.findByText('Recebemos! A equipe CAPI vai te chamar no WhatsApp em até 24 h.')).toBeTruthy()
    expect(posthog.capture).toHaveBeenCalledWith(
      'lead_created',
      expect.objectContaining({ destinationSlug: 'serra-da-capivara', utmSource: 'meta' }),
    )
    expect(trackPixel).toHaveBeenCalledWith('Lead', expect.anything())
  })

  it('exige consentimento', async () => {
    render(<LeadForm destinationSlug="serra-da-capivara" />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: 'Quero ir' }))
    expect(screen.getByText('Marque a autorização para continuar.')).toBeTruthy()
    expect(apiMock).not.toHaveBeenCalled()
  })

  it('valida WhatsApp', async () => {
    render(<LeadForm destinationSlug="serra-da-capivara" />)
    fill('123')
    fireEvent.click(screen.getByLabelText(/autorizo/i))
    fireEvent.click(screen.getByRole('button', { name: 'Quero ir' }))
    expect(screen.getByText(/WhatsApp inválido/)).toBeTruthy()
    expect(apiMock).not.toHaveBeenCalled()
  })

  it('mostra alerta se a API rejeita e mantém dados', async () => {
    apiMock.mockRejectedValue(new Error('x'))
    render(<LeadForm destinationSlug="serra-da-capivara" />)
    fill()
    fireEvent.click(screen.getByLabelText(/autorizo/i))
    fireEvent.click(screen.getByRole('button', { name: 'Quero ir' }))
    expect(await screen.findByText('Não foi possível enviar agora. Tente de novo em instantes.')).toBeTruthy()
    expect((screen.getByLabelText('Nome') as HTMLInputElement).value).toBe('Maria')
  })

  it('404 da API mostra mensagem de destino indisponível', async () => {
    apiMock.mockRejectedValue(new ApiError(404, { message: 'Destino não encontrado' }))
    render(<LeadForm destinationSlug="serra-da-capivara" />)
    fill()
    fireEvent.click(screen.getByLabelText(/autorizo/i))
    fireEvent.click(screen.getByRole('button', { name: 'Quero ir' }))
    expect(await screen.findByText('Este destino não está recebendo pedidos no momento.')).toBeTruthy()
    expect(screen.queryByText(/Tente de novo/)).toBeNull()
  })

  it('ignora duplo clique', async () => {
    apiMock.mockImplementation(() => new Promise(() => {}))
    render(<LeadForm destinationSlug="serra-da-capivara" />)
    fill()
    fireEvent.click(screen.getByLabelText(/autorizo/i))
    const btn = screen.getByRole('button', { name: 'Quero ir' })
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(apiMock).toHaveBeenCalledTimes(1)
  })
})
