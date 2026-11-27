import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
vi.mock('@/lib/upload-package-photo', () => ({ uploadPackagePhoto: vi.fn() }))
const useSession = vi.fn()
vi.mock('next-auth/react', () => ({ useSession: () => useSession() }))
const editCall = vi.fn()
vi.mock('@/lib/edit-client', () => ({
  editCall: (...args: unknown[]) => editCall(...args),
  errorText: (_d: unknown, f: string) => f,
}))

import { toast } from 'sonner'
import { PackageEditor, type EditablePackage } from '../PackageEditor'

const PKG: EditablePackage = {
  id: 'p1',
  tenantSlug: 'capi',
  name: 'Trilha',
  description: 'Linda trilha',
  price: 600,
  extraGuidePrice: 400,
  duration: 4,
  difficulty: 'EASY',
  photos: [],
  highlights: [],
  status: 'PUBLISHED',
}

function renderEditor(pkg: EditablePackage | null = PKG) {
  render(
    <PackageEditor tenantSlug="capi" pkg={pkg} open inline onClose={vi.fn()} onSaved={vi.fn()} />,
  )
}

const sentData = () => editCall.mock.calls[0][2].data

beforeEach(() => {
  useSession.mockReturnValue({ status: 'authenticated', data: { user: { role: 'ADMIN' } } })
  editCall.mockReset()
  vi.mocked(toast.success).mockClear()
  editCall.mockResolvedValue({ ok: true, data: { id: 'p1' } })
})

describe('PackageEditor — preço por grupo', () => {
  it('sem campo Capacidade; valor do grupo e acréscimo por guia extra com as dicas', () => {
    renderEditor()
    expect(screen.queryByLabelText(/Capacidade/)).toBeNull()
    expect(screen.getByLabelText(/Valor do grupo \(R\$\)/)).toHaveValue(600)
    expect(screen.getByLabelText(/Acréscimo por guia extra \(R\$\)/)).toHaveValue(400)
    expect(
      screen.getByText('Vale para 1 guia e até 8 pessoas. O valor não muda se o grupo for menor.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Cobrado a cada 8 pessoas a mais. Deixe vazio se você não atende grupos acima de 8.',
      ),
    ).toBeInTheDocument()
  })

  it('envia extraGuidePrice e não envia capacity', async () => {
    renderEditor()
    fireEvent.change(screen.getByLabelText(/Acréscimo por guia extra/), {
      target: { value: '350' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(editCall).toHaveBeenCalled())
    expect(sentData()).toMatchObject({ extraGuidePrice: 350 })
    expect(sentData()).not.toHaveProperty('capacity')
  })

  it('acréscimo vazio é enviado como null', async () => {
    renderEditor()
    fireEvent.change(screen.getByLabelText(/Acréscimo por guia extra/), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(editCall).toHaveBeenCalled())
    expect(sentData().extraGuidePrice).toBeNull()
  })
})

describe('PackageEditor — aprovação para guia', () => {
  const asGuide = () =>
    useSession.mockReturnValue({ status: 'authenticated', data: { user: { role: 'CONDUTOR' } } })
  const NOTICE =
    'Alterações em nome, descrição e valores passam pela aprovação da equipe. O roteiro continua no ar com a versão atual até lá.'

  it('guia com roteiro publicado vê o aviso; admin não', () => {
    asGuide()
    const { unmount } = render(
      <PackageEditor tenantSlug="capi" pkg={PKG} open inline onClose={vi.fn()} onSaved={vi.fn()} />,
    )
    expect(screen.getByText(NOTICE)).toBeInTheDocument()
    unmount()
    useSession.mockReturnValue({ status: 'authenticated', data: { user: { role: 'ADMIN' } } })
    renderEditor()
    expect(screen.queryByText(NOTICE)).toBeNull()
  })

  it('guia não vê o aviso em rascunho', () => {
    asGuide()
    renderEditor({ ...PKG, status: 'DRAFT' })
    expect(screen.queryByText(NOTICE)).toBeNull()
  })

  it('ao salvar com pendingRequest mostra "Enviado para aprovação da equipe"', async () => {
    asGuide()
    editCall.mockResolvedValue({
      ok: true,
      status: 200,
      data: { id: 'p1', pendingRequest: { id: 'r1', type: 'UPDATE', changes: {} } },
    })
    renderEditor()
    fireEvent.change(screen.getByLabelText(/Valor do grupo/), { target: { value: '700' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Enviado para aprovação da equipe'),
    )
  })

  it('botão de publicar do guia vira "Enviar para aprovação" e 202 mostra a mensagem', async () => {
    asGuide()
    editCall.mockResolvedValue({
      ok: true,
      status: 202,
      data: {
        requestId: 'r1',
        type: 'PUBLISH',
        status: 'PENDING',
        message: 'Enviado para aprovação da equipe',
      },
    })
    renderEditor({ ...PKG, status: 'DRAFT' })
    expect(screen.queryByRole('button', { name: 'Publicar' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar para aprovação' }))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Enviado para aprovação da equipe'),
    )
    expect(toast.success).not.toHaveBeenCalledWith('Roteiro publicado')
  })

  it('admin continua vendo "Publicar"', () => {
    renderEditor({ ...PKG, status: 'DRAFT' })
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeInTheDocument()
  })

  it('202 ao voltar para rascunho (guia) mostra a mensagem de aprovação', async () => {
    asGuide()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    editCall.mockResolvedValue({
      ok: true,
      status: 202,
      data: { requestId: 'r1', type: 'UNPUBLISH' },
    })
    renderEditor()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar para rascunho' }))
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Enviado para aprovação da equipe'),
    )
    expect(toast.success).not.toHaveBeenCalledWith('Roteiro voltou para rascunho')
  })

  it('salvar só a duração não reenvia nome, descrição nem valores', async () => {
    asGuide()
    renderEditor()
    fireEvent.change(screen.getByLabelText(/Duração/), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(editCall).toHaveBeenCalled())
    expect(sentData()).toEqual({ duration: 5 })
  })

  it('guia que volta um campo pendente ao valor atual ainda o envia (desfaz a mudança)', async () => {
    asGuide()
    editCall.mockResolvedValue({
      ok: true,
      status: 200,
      data: { id: 'p1', pendingRequest: { id: 'r1', type: 'UPDATE', changes: {} } },
    })
    renderEditor()
    fireEvent.change(screen.getByLabelText(/Valor do grupo/), { target: { value: '700' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(editCall).toHaveBeenCalledTimes(1))
    expect(sentData()).toEqual({ price: 700 })
    fireEvent.change(screen.getByLabelText(/Valor do grupo/), { target: { value: '600' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(editCall).toHaveBeenCalledTimes(2))
    expect(editCall.mock.calls[1][2].data).toEqual({ price: 600 })
  })
})
