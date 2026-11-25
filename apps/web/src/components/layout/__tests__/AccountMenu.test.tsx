import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const useSession = vi.fn()
const signOut = vi.fn()
vi.mock('next-auth/react', () => ({
  useSession: () => useSession(),
  signOut: (o: unknown) => signOut(o),
}))
vi.mock('next/navigation', () => ({ usePathname: () => '/explorar' }))
const editMode = { available: false, enabled: false, setEnabled: vi.fn() }
vi.mock('@/src/components/edit-mode/EditModeProvider', () => ({ useEditMode: () => editMode }))
vi.mock('../NotificationBell', () => ({ NotificationBell: () => <span data-testid="bell" /> }))

import { AccountMenu } from '../AccountMenu'

function logged(role: string, extra: Record<string, unknown> = {}) {
  useSession.mockReturnValue({
    status: 'authenticated',
    data: { user: { name: 'Ana Souza', email: 'ana@x.com', role, tenantSlug: 'capi', ...extra } },
  })
}
const openMenu = () => fireEvent.click(screen.getByRole('button', { name: /menu da conta/i }))

describe('AccountMenu', () => {
  beforeEach(() => {
    useSession.mockReset()
    signOut.mockReset()
    editMode.available = false
  })

  it('sem sessão: "Entrar" voltando para a página atual, sem sino', () => {
    useSession.mockReturnValue({ status: 'unauthenticated', data: null })
    render(<AccountMenu />)
    expect(screen.getByRole('link', { name: /entrar/i }).getAttribute('href')).toBe(
      '/login?callbackUrl=%2Fexplorar',
    )
    expect(screen.queryByTestId('bell')).toBeNull()
  })

  it('carregando a sessão: não pisca "Entrar"', () => {
    useSession.mockReturnValue({ status: 'loading', data: null })
    const { container } = render(<AccountMenu />)
    expect(container.textContent).toBe('')
  })

  it.each(['CLIENTE', 'CONDUTOR', 'ADMIN', 'SUPER_ADMIN'])(
    'logado como %s: avatar com primeiro nome e "Sair", nunca "Entrar"',
    (role) => {
      logged(role)
      render(<AccountMenu />)
      expect(screen.queryByText(/^entrar$/i)).toBeNull()
      expect(screen.getByText('Ana')).toBeTruthy()
      expect(screen.getByTestId('bell')).toBeTruthy()
      openMenu()
      expect(screen.getByRole('menuitem', { name: /sair/i })).toBeTruthy()
    },
  )

  it('turista vê viagens e favoritos', () => {
    logged('CLIENTE')
    render(<AccountMenu />)
    openMenu()
    expect(screen.getByRole('menuitem', { name: 'Minhas viagens' }).getAttribute('href')).toBe(
      '/minha-conta/viagens',
    )
    expect(screen.getByRole('menuitem', { name: 'Favoritos' })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: 'Meu painel' })).toBeNull()
  })

  it('Sair encerra a sessão e volta para a home', () => {
    logged('ADMIN')
    render(<AccountMenu />)
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: /sair/i }))
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' })
  })

  it('modo edição aparece no menu só quando disponível', () => {
    logged('ADMIN')
    editMode.available = true
    render(<AccountMenu />)
    openMenu()
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: /modo edição/i }))
    expect(editMode.setEnabled).toHaveBeenCalledWith(true)
  })

  it('Esc fecha o menu', () => {
    logged('CLIENTE')
    render(<AccountMenu />)
    openMenu()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
