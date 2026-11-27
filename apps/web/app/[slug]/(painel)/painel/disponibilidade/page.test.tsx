import { Suspense } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'u1', role: 'ADMIN' } } }),
}))

import DisponibilidadePage from './page'

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 })
}

function todayAt(h: number, m = 0) {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

type Slot = {
  id: string
  packageId: string
  startsAt: string
  maxGuides: number
  booked: number
  status: string
}

function stubApi(slots: Slot[] = [], onCreate?: (body: Record<string, unknown>) => void) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes('/manage/packages')) {
      return json({ packages: [{ id: 'p1', name: 'Trilha do Boqueirão', status: 'PUBLISHED' }] })
    }
    if (decodeURIComponent(url).includes('/packages/p1/assignable-guides')) {
      return json({ guides: [{ guideId: 'g1', name: 'Ana Guia' }] })
    }
    if (url.includes('/packages/p1/slots/manage')) return json(slots)
    if (url.endsWith('/packages/p1/slots') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body))
      onCreate?.(body)
      return json({
        slot: {
          id: 's9',
          packageId: 'p1',
          startsAt: body.startsAt,
          maxGuides: body.maxGuides,
          booked: 0,
          status: 'OPEN',
        },
      })
    }
    return new Response('{}', { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function renderPage() {
  const params = Promise.resolve({ slug: 'agencia-x' })
  let container!: HTMLElement
  await act(async () => {
    container = render(
      <Suspense fallback={null}>
        <DisponibilidadePage params={params} />
      </Suspense>,
    ).container
  })
  return container
}

// No celular a agenda abre na lista; "Adicionar horário" fica no painel do calendário
function showCalendar() {
  fireEvent.click(screen.getByText('Calendário'))
}

function pickToday(container: HTMLElement) {
  fireEvent.click(container.querySelector('.react-calendar__tile--now') as HTMLElement)
}

describe('DisponibilidadePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('oferece os guias da operadora ao abrir um novo horário', async () => {
    const fetchMock = stubApi()
    const container = await renderPage()

    // Escolhe um dia no calendário e abre o formulário de novo horário
    showCalendar()
    fireEvent.click(container.querySelector('.react-calendar__tile') as HTMLElement)
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar horário' }))

    expect(await screen.findByRole('option', { name: 'Ana Guia' })).toBeInTheDocument()
    // Painel usa a rota de gestão (lotados, rascunhos, dentro do corte), não a pública
    const urls = fetchMock.mock.calls.map((c) => c[0])
    expect(urls).toContain('/api/proxy?path=/tenants/agencia-x/packages/p1/slots/manage')
  })

  it('mostra um único botão "Adicionar horário" com o dia escolhido', async () => {
    stubApi()
    const container = await renderPage()

    showCalendar()
    fireEvent.click(container.querySelector('.react-calendar__tile') as HTMLElement)

    expect(await screen.findAllByRole('button', { name: 'Adicionar horário' })).toHaveLength(1)
  })

  it('envia maxGuides e não envia capacity/minCapacity ao salvar', async () => {
    // Congela só Date (manhã fixa) para a validação "horário no futuro" não depender da hora real
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 5, 15, 8, 0, 0))
    let body: Record<string, unknown> | undefined
    stubApi([], (b) => (body = b))
    const container = await renderPage()

    showCalendar()
    pickToday(container)
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar horário' }))
    await screen.findByRole('option', { name: 'Ana Guia' })

    expect(screen.queryByLabelText(/Vagas/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Mínimo de participantes/)).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Guia'), { target: { value: 'g1' } })
    fireEvent.change(screen.getByLabelText('Início'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '10:00' } })
    fireEvent.change(screen.getByLabelText('Guias neste horário'), { target: { value: '2' } })
    expect(
      screen.getByText('Até 16 pessoas. Indique colegas da sua agência para os guias extras.'),
    ).toBeInTheDocument()

    fireEvent.submit(
      screen.getByLabelText('Guias neste horário').closest('form') as HTMLFormElement,
    )

    await waitFor(() => expect(body).toBeDefined())
    expect(body).toMatchObject({ maxGuides: 2, guideId: 'g1' })
    expect(body).not.toHaveProperty('capacity')
    expect(body).not.toHaveProperty('minCapacity')
  })

  it('mostra "Livre · até 16 pessoas" para horário livre com 2 guias', async () => {
    stubApi([
      { id: 's1', packageId: 'p1', startsAt: todayAt(12), maxGuides: 2, booked: 0, status: 'OPEN' },
    ])
    const container = await renderPage()
    pickToday(container)
    expect((await screen.findAllByText(/Livre · até 16 pessoas/)).length).toBeGreaterThan(0)
  })

  it('mostra "Reservado · 6 pessoas · 1 guia" para horário reservado', async () => {
    stubApi([
      { id: 's1', packageId: 'p1', startsAt: todayAt(12), maxGuides: 1, booked: 6, status: 'FULL' },
    ])
    const container = await renderPage()
    pickToday(container)
    expect((await screen.findAllByText(/Reservado · 6 pessoas · 1 guia\b/)).length).toBeGreaterThan(
      0,
    )
  })

  it('não fala em "vagas" (legenda e descrição no modelo de grupo)', async () => {
    stubApi([
      { id: 's1', packageId: 'p1', startsAt: todayAt(12), maxGuides: 1, booked: 0, status: 'OPEN' },
    ])
    await renderPage()
    expect(screen.queryByText(/vagas/i)).toBeNull()
    expect(screen.getAllByText('Livre').length).toBeGreaterThan(0)
  })
})
