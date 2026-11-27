import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }))
vi.mock('@/lib/upload-package-photo', () => ({ uploadPackagePhoto: vi.fn() }))
const editCall = vi.fn()
vi.mock('@/lib/edit-client', () => ({
  editCall: (...args: unknown[]) => editCall(...args),
  errorText: (_d: unknown, f: string) => f,
}))

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
  editCall.mockReset()
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
    expect(sentData()).toMatchObject({ price: 600, extraGuidePrice: 350 })
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
