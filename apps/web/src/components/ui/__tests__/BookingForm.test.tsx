import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/src/lib/posthog', () => ({ posthog: { capture: vi.fn() } }))

import BookingForm from '../BookingForm'

afterEach(() => vi.unstubAllGlobals())

const SLOT = 'slot1'

function stubApi(
  slot: { maxPax: number; available?: boolean; maxGuides?: number },
  slotId: string = SLOT,
) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      return new Response(JSON.stringify({ id: 'ckabcdefgh0000000000xy9z12' }), { status: 201 })
    }
    return new Response(
      JSON.stringify({
        price: 600,
        extraGuidePrice: 400,
        // forma real de GET /tenants/:slug/packages/:id (public.route.ts)
        departureSlots: [
          { id: slotId, booked: 0, status: 'OPEN', maxGuides: 2, available: true, ...slot },
        ],
      }),
      { status: 200 },
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function renderForm() {
  render(<BookingForm slotId={SLOT} packageId="pkg1" slug="capi" />)
  await screen.findByText(/Valor do grupo/)
}

const plus = () => screen.getByRole('button', { name: 'Adicionar uma pessoa' })

describe('BookingForm — preço por grupo', () => {
  it('2 guias com 12 pessoas e total R$ 1.000,00; + desabilita no máximo do horário', async () => {
    stubApi({ maxPax: 16 })
    await renderForm()
    for (let i = 0; i < 11; i++) fireEvent.click(plus())
    expect(screen.getByText(/12 pessoas · 2 guias/)).toBeInTheDocument()
    expect(screen.getByText('Guia extra × 1')).toBeInTheDocument()
    expect(screen.getByText(/R\$\s1\.000,00/)).toBeInTheDocument()
    for (let i = 0; i < 6; i++) fireEvent.click(plus())
    expect(plus()).toBeDisabled()
    expect(screen.getByText('16', { selector: 'output' })).toBeInTheDocument()
  })

  it('com maxPax 8 o + desabilita em 8', async () => {
    stubApi({ maxPax: 8 })
    await renderForm()
    for (let i = 0; i < 7; i++) fireEvent.click(plus())
    expect(plus()).toBeDisabled()
  })

  it('horário já reservado mostra alerta e desabilita o botão', async () => {
    stubApi({ maxPax: 8, available: false })
    await renderForm()
    expect(
      screen.getByText('Este horário já foi reservado. Escolha outro horário.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ir para pagamento/ })).toBeDisabled()
  })

  it('horário fora da lista do roteiro (já reservado) mostra alerta', async () => {
    stubApi({ maxPax: 8 }, 'outro-slot')
    await renderForm()
    expect(
      screen.getByText('Este horário já foi reservado. Escolha outro horário.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ir para pagamento/ })).toBeDisabled()
  })

  it('não mostra o alerta enquanto o roteiro carrega', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )
    render(<BookingForm slotId={SLOT} packageId="pkg1" slug="capi" />)
    expect(screen.queryByText(/já foi reservado/)).toBeNull()
    expect(screen.getByRole('button', { name: /Ir para pagamento/ })).toBeDisabled()
  })

  it('grupo privativo é enviado como isPrivate', async () => {
    const fetchMock = stubApi({ maxPax: 8 })
    await renderForm()
    fireEvent.click(screen.getByLabelText(/Grupo privativo/))
    fireEvent.change(screen.getByLabelText(/Nome completo/), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText(/E-mail/), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText(/Telefone/), { target: { value: '11999999999' } })
    fireEvent.change(screen.getByLabelText(/CPF/), { target: { value: '52998224725' } })
    fireEvent.click(screen.getByRole('button', { name: /Ir para pagamento/ }))
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'POST')).toBe(true),
    )
    const post = fetchMock.mock.calls.find(([, i]) => i?.method === 'POST')!
    expect(JSON.parse(post[1]!.body as string)).toMatchObject({
      slotId: SLOT,
      pax: 1,
      isPrivate: true,
    })
  })
})
