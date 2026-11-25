import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'b1' }),
  useRouter: () => ({ push: vi.fn() }),
}))
// Renderiza o valor do QR como texto para conferir o que foi codificado
vi.mock('react-qr-code', () => ({
  default: ({ value }: { value: string }) => <span>qr:{value}</span>,
}))
vi.mock('@/src/components/turista/ReviewForm', () => ({ default: () => null }))
const apiClient = vi.fn()
vi.mock('@/src/lib/api-client', () => ({ apiClient: (...a: unknown[]) => apiClient(...a) }))

import ViagemDetailPage from './page'

const base = {
  id: 'b1',
  code: 'ab1234',
  pax: 2,
  startsAt: '2027-01-04T11:00:00.000Z',
  hasReview: false,
  packageName: 'Trilha',
  tenantName: 'Agência',
  qrCode: 'pix-copia-e-cola',
  paymentUrl: 'https://mp/pay',
  expiresAt: new Date(Date.now() + 20 * 60_000).toISOString(),
  conductor: { name: 'Ana Guia', photoUrl: null },
}

beforeEach(() => apiClient.mockReset())

describe('Detalhe da viagem (turista)', () => {
  it('mostra o guia vindo de `conductor` (formato da API)', async () => {
    apiClient.mockResolvedValue({ ok: true, data: { ...base, status: 'CONFIRMED' } })
    render(<ViagemDetailPage />)
    expect(await screen.findByText('Ana Guia')).toBeInTheDocument()
  })

  it('CONFIRMED: QR de check-in codifica o código da reserva, não o PIX', async () => {
    apiClient.mockResolvedValue({ ok: true, data: { ...base, status: 'CONFIRMED' } })
    render(<ViagemDetailPage />)
    expect(await screen.findByText('qr:ab1234')).toBeInTheDocument()
    expect(screen.queryByText('qr:pix-copia-e-cola')).toBeNull()
  })

  it('PENDING com PIX válido: mostra o PIX para pagar', async () => {
    apiClient.mockResolvedValue({ ok: true, data: { ...base, status: 'PENDING' } })
    render(<ViagemDetailPage />)
    expect(await screen.findByText('qr:pix-copia-e-cola')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /pagar/i })).toHaveAttribute('href', 'https://mp/pay')
  })
})
