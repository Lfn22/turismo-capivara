import { Suspense } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'u1', role: 'ADMIN' } } }),
}))

import DisponibilidadePage from './page'

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 })
}

describe('DisponibilidadePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('oferece os guias da operadora ao abrir um novo horário', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/manage/packages')) {
          return json({
            packages: [{ id: 'p1', name: 'Trilha do Boqueirão', status: 'PUBLISHED' }],
          })
        }
        if (url.includes('/packages/p1/slots')) return json([])
        // Formato de paginatedResponse() em apps/api/src/shared/utils/pagination.ts
        if (decodeURIComponent(url).endsWith('/tenants/agencia-x/guides?limit=100')) {
          return json({
            data: [
              {
                id: 'g1',
                bio: null,
                photoUrl: null,
                especialidades: [],
                regioes: [],
                user: { id: 'u1', name: 'Ana Guia' },
              },
            ],
            nextCursor: null,
            hasMore: false,
          })
        }
        return new Response('{}', { status: 404 })
      }),
    )

    const params = Promise.resolve({ slug: 'agencia-x' })
    let container!: HTMLElement
    await act(async () => {
      container = render(
        <Suspense fallback={null}>
          <DisponibilidadePage params={params} />
        </Suspense>,
      ).container
    })

    // Escolhe um dia no calendário e abre o formulário de novo horário
    fireEvent.click(container.querySelector('.react-calendar__tile') as HTMLElement)
    fireEvent.click(screen.getAllByRole('button', { name: 'Adicionar horário' })[0])

    expect(await screen.findByRole('option', { name: 'Ana Guia' })).toBeInTheDocument()
    // Painel usa a rota de gestão (lotados, rascunhos, dentro do corte), não a pública
    const urls = (fetch as unknown as { mock: { calls: string[][] } }).mock.calls.map((c) => c[0])
    expect(urls).toContain('/api/proxy?path=/tenants/agencia-x/packages/p1/slots/manage')
  })
})
