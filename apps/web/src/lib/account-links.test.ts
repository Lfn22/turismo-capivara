import { describe, it, expect } from 'vitest'
import { accountHome, accountLinks } from './account-links'

const labels = (role: string, slug: string | null = 'capi') =>
  accountLinks(role, slug).map((l) => l.label)

describe('accountLinks (menu da conta por perfil)', () => {
  it('turista: viagens, favoritos e conta — sem painel', () => {
    expect(accountLinks('CLIENTE', null)).toEqual([
      { label: 'Minhas viagens', href: '/minha-conta/viagens' },
      { label: 'Favoritos', href: '/minha-conta/favoritos' },
      { label: 'Minha conta', href: '/minha-conta/perfil' },
    ])
  })

  it('guia: painel da operadora e conta', () => {
    expect(accountLinks('CONDUTOR', 'capi')).toEqual([
      { label: 'Meu painel', href: '/capi/painel/dashboard' },
      { label: 'Minha conta', href: '/conta' },
    ])
  })

  it('admin da operadora: painel (guias), pendências e conta', () => {
    expect(labels('ADMIN')).toEqual(['Meu painel', 'Pendências', 'Minha conta'])
    expect(accountLinks('ADMIN', 'capi')[0].href).toBe('/capi/admin/guias')
  })

  it('equipe da plataforma: super-admin, pendências e conta', () => {
    for (const role of ['SUPER_ADMIN', 'PLATFORM_ADMIN']) {
      expect(accountLinks(role, null)).toEqual([
        { label: 'Meu painel', href: '/super-admin/operadoras' },
        { label: 'Pendências', href: '/pendencias' },
        { label: 'Minha conta', href: '/conta' },
      ])
    }
  })

  it('guia sem operadora: só a conta', () => {
    expect(labels('CONDUTOR', null)).toEqual(['Minha conta'])
  })
})

describe('accountHome (aba "Perfil" da barra inferior)', () => {
  it('deslogado → login; turista → minha conta; equipe → painel', () => {
    expect(accountHome(undefined, null)).toBe('/login')
    expect(accountHome('CLIENTE', null)).toBe('/minha-conta')
    expect(accountHome('CONDUTOR', 'capi')).toBe('/capi/painel/dashboard')
    expect(accountHome('SUPER_ADMIN', null)).toBe('/super-admin/operadoras')
    expect(accountHome('CONDUTOR', null)).toBe('/conta')
  })
})
