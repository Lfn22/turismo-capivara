import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('next-auth/jwt', () => ({ getToken: async () => ({ apiToken: 't', role: 'ADMIN' }) }))
vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(async (path: string) => {
    if (path.endsWith('/dashboard')) {
      return {
        bookings: {
          pending: 30,
          confirmed: 12,
          cancelled: 0,
          completed: 0,
          expired: 0,
          today: 4,
          total: 42,
        },
        revenue: { confirmed: 0 },
        upcomingSlots: [],
      }
    }
    // Só a 1ª página (1 reserva) — os cartões não podem contar a partir dela
    if (path.endsWith('/bookings')) {
      return {
        data: [
          {
            id: 'b1',
            customerName: 'Maria',
            customerEmail: 'm@x.com',
            pax: 1,
            status: 'PENDING',
            createdAt: '2026-11-10T12:00:00.000Z',
            slot: {
              startsAt: '2026-12-01T11:00:00.000Z',
              package: { name: 'Trilha', price: '150' },
            },
          },
        ],
        nextCursor: 'b1',
        hasMore: true,
      }
    }
    if (path.endsWith('/manage/packages')) return { packages: [] }
    throw new Error('HTTP 404')
  }),
}))

import DashboardPage from './page'

function statValue(label: string) {
  const card = screen.getAllByText(label)[0].closest('.capi-stat') as HTMLElement
  return within(card).getByText(/^\d+$/).textContent
}

describe('DashboardPage — cartões com as contagens do banco', () => {
  it('usa today/pending/total do /dashboard, não a 1ª página de reservas', async () => {
    render(await DashboardPage({ params: Promise.resolve({ slug: 'agencia-x' }) }))

    expect(statValue('Reservas hoje')).toBe('4')
    expect(statValue('Pendentes de confirmação')).toBe('30')
    expect(statValue('Total de reservas')).toBe('42')
  })
})
