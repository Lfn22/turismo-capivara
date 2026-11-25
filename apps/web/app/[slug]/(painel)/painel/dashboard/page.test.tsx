import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next-auth/jwt', () => ({ getToken: async () => ({ apiToken: 't', role: 'ADMIN' }) }))
vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(async (path: string) => {
    // Formato de paginatedResponse() em apps/api/src/shared/utils/pagination.ts
    if (path === '/tenants/agencia-x/bookings') {
      return {
        data: [
          {
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
})
