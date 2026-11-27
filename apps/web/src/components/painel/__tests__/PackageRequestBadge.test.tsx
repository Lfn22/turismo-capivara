import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

import PackageRequestBadge from '../PackageRequestBadge'

describe('PackageRequestBadge', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    refresh.mockReset()
  })

  it('não renderiza nada sem pedido', () => {
    const { container } = render(
      <PackageRequestBadge slug="capi" packageId="p1" isGuide request={null} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it.each([
    ['PUBLISH', 'Aguardando aprovação'],
    ['UPDATE', 'Alteração pendente'],
    ['UNPUBLISH', 'Despublicação pendente'],
    ['ARCHIVE', 'Arquivamento pendente'],
  ] as const)('pedido %s pendente mostra "%s"', (type, text) => {
    render(
      <PackageRequestBadge
        slug="capi"
        packageId="p1"
        isGuide
        request={{ id: 'r1', type, status: 'PENDING', rejectionReason: null }}
      />,
    )
    expect(screen.getByText(text)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar pedido' })).toBeInTheDocument()
  })

  it('cancelar confirma, chama DELETE no proxy e atualiza a página', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(
      <PackageRequestBadge
        slug="capi"
        packageId="p1"
        isGuide
        request={{ id: 'r1', type: 'UPDATE', status: 'PENDING', rejectionReason: null }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar pedido' }))
    await waitFor(() => expect(refresh).toHaveBeenCalled())
    expect(window.confirm).toHaveBeenCalledWith('Cancelar este pedido?')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(decodeURIComponent(url)).toBe('/api/proxy?path=/tenants/capi/packages/p1/request')
    expect(init.method).toBe('DELETE')
  })

  it('sem confirmação não chama a API', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(
      <PackageRequestBadge
        slug="capi"
        packageId="p1"
        isGuide
        request={{ id: 'r1', type: 'PUBLISH', status: 'PENDING', rejectionReason: null }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar pedido' }))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('pedido recusado mostra o motivo e não tem botão', () => {
    render(
      <PackageRequestBadge
        slug="capi"
        packageId="p1"
        isGuide
        request={{ id: 'r1', type: 'PUBLISH', status: 'REJECTED', rejectionReason: 'Fotos ruins' }}
      />,
    )
    expect(screen.getByText('Recusado — Fotos ruins')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('recusado sem motivo mostra só "Recusado"', () => {
    render(
      <PackageRequestBadge
        slug="capi"
        packageId="p1"
        isGuide
        request={{ id: 'r1', type: 'PUBLISH', status: 'REJECTED', rejectionReason: null }}
      />,
    )
    expect(screen.getByText('Recusado')).toBeInTheDocument()
    expect(screen.queryByText(/—/)).toBeNull()
  })

  it('quem não é guia (ADMIN) vê o selo pendente sem o botão de cancelar', () => {
    render(
      <PackageRequestBadge
        slug="capi"
        packageId="p1"
        isGuide={false}
        request={{ id: 'r1', type: 'UPDATE', status: 'PENDING', rejectionReason: null }}
      />,
    )
    expect(screen.getByText('Alteração pendente')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar pedido' })).toBeNull()
  })
})
