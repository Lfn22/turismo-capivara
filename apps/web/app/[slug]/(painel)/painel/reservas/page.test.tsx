import { Suspense } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'

const session = vi.hoisted(() => ({ role: 'ADMIN' }))
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'u1', role: session.role } } }),
}))

import ReservasPage from './page'

const booking = {
  id: 'b1',
  customerName: 'Maria Turista',
  customerEmail: 'maria@example.com',
  pax: 2,
  status: 'PENDING',
  createdAt: '2026-11-10T12:00:00.000Z',
  slot: {
    startsAt: '2026-12-01T11:00:00.000Z',
    package: { name: 'Trilha do Boqueirão', price: '150' },
  },
}

function stubFetch(body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function renderPage() {
  const params = Promise.resolve({ slug: 'agencia-x' })
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <ReservasPage params={params} />
      </Suspense>,
    )
  })
}

describe('ReservasPage', () => {
  beforeEach(() => {
    session.role = 'ADMIN'
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lista as reservas da agência a partir da resposta paginada da API', async () => {
    // Formato de paginatedResponse() em apps/api/src/shared/utils/pagination.ts
    const fetchMock = stubFetch({ data: [booking], nextCursor: null, hasMore: false })

    await renderPage()

    expect(await screen.findByText(/Maria Turista/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/proxy?path=${encodeURIComponent('/tenants/agencia-x/bookings?limit=100')}`,
    )
  })

  it('lista as reservas do guia a partir de { bookings }', async () => {
    session.role = 'CONDUTOR'
    const fetchMock = stubFetch({ bookings: [booking] })

    await renderPage()

    expect(await screen.findByText(/Maria Turista/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/proxy?path=${encodeURIComponent('/tenants/agencia-x/guides/me/bookings')}`,
    )
  })

  it('mostra guias e selo Privativo da reserva por grupo', async () => {
    stubFetch({
      data: [{ ...booking, pax: 12, guides: 2, isPrivate: true, amount: 300 }],
      nextCursor: null,
      hasMore: false,
    })

    await renderPage()

    expect(await screen.findByText(/12 pessoas · 2 guias/)).toBeInTheDocument()
    expect(screen.getByText('Privativo')).toBeInTheDocument()
  })

  it('legado sem amount usa preço × pessoas', async () => {
    stubFetch({ data: [{ ...booking, amount: null }], nextCursor: null, hasMore: false })
    await renderPage()
    expect(await screen.findByText(/Maria Turista/)).toBeInTheDocument()
    expect(screen.getByText(/300,00/)).toBeInTheDocument()
  })

  it('amount como string Decimal vira moeda', async () => {
    stubFetch({
      data: [{ ...booking, pax: 12, guides: 2, amount: '450.00' }],
      nextCursor: null,
      hasMore: false,
    })
    await renderPage()
    expect(await screen.findByText(/Maria Turista/)).toBeInTheDocument()
    expect(screen.getByText(/450,00/)).toBeInTheDocument()
  })
})
