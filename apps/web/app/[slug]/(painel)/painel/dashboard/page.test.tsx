import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next-auth/jwt', () => ({ getToken: async () => ({ apiToken: 't', role: 'ADMIN' }) }))
vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(async (path: string) => {
    // Formato de paginatedResponse() em apps/api/src/shared/utils/pagination.ts
    if (path === '/tenants/agencia-x/dashboard') {
      return {
        bookings: { pending: 0, confirmed: 0, cancelled: 0, completed: 0, expired: 0 },
        revenue: { confirmed: 0 },
        upcomingSlots: [
          {
            id: 's1',
            startsAt: '2026-12-02T11:00:00.000Z',
            booked: 0,
            capacity: 16,
            maxPax: 16,
            package: { name: 'Cachoeira Livre' },
          },
          {
            id: 's2',
            startsAt: '2026-12-03T11:00:00.000Z',
            booked: 5,
            capacity: 8,
            maxPax: 8,
            package: { name: 'Cachoeira Ocupada' },
          },
        ],
      }
    }
    if (path === '/tenants/agencia-x/bookings') {
      return {
        data: [
          {
            id: 'b1',
            customerName: 'Maria Turista',
            customerEmail: 'maria@example.com',
            pax: 12,
            amount: '600.00',
            status: 'PENDING',
            createdAt: '2026-11-10T12:00:00.000Z',
            slot: {
              startsAt: '2026-12-01T11:00:00.000Z',
              package: { name: 'Trilha do Boqueirão', price: '150' },
            },
          },
        ],
        nextCursor: null,
        hasMore: false,
      }
    }
    if (path.endsWith('/manage/packages')) return { packages: [] }
    throw new Error('HTTP 404')
  }),
}))

import DashboardPage from './page'

describe('DashboardPage', () => {
  it('mostra as reservas da agência vindas da resposta paginada da API', async () => {
    render(await DashboardPage({ params: Promise.resolve({ slug: 'agencia-x' }) }))

    expect(screen.getByText(/Maria Turista/)).toBeInTheDocument()
  })

  it('valor da reserva é o total do grupo gravado, não preço × pessoas', async () => {
    render(await DashboardPage({ params: Promise.resolve({ slug: 'agencia-x' }) }))

    expect(screen.getByText(/R\$\s600,00/)).toBeInTheDocument()
    expect(screen.queryByText(/R\$\s1\.800,00/)).toBeNull()
  })

  it('próximas saídas usam o modelo de grupo, sem "vagas"', async () => {
    render(await DashboardPage({ params: Promise.resolve({ slug: 'agencia-x' }) }))

    expect(screen.getByText('Livre · até 16 pessoas')).toBeInTheDocument()
    expect(screen.getByText('Reservado · 5 pessoas')).toBeInTheDocument()
    expect(screen.queryByText(/vagas/)).toBeNull()
  })
})
