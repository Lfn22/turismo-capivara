import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, formatPhone } from './format'

describe('formatCurrency', () => {
  it('formata centavos em BRL', () => {
    expect(formatCurrency(150000, 'BRL')).toBe('R$\u00a01.500,00')
  })

  it('formata zero', () => {
    expect(formatCurrency(0, 'BRL')).toBe('R$\u00a00,00')
  })

  it('formata valor sem centavos', () => {
    expect(formatCurrency(100, 'BRL')).toBe('R$\u00a01,00')
  })
})

describe('formatDate', () => {
  it('formata data em pt-BR por extenso', () => {
    expect(formatDate(new Date('2026-09-22'))).toBe('22 de setembro de 2026')
  })

  it('formata outro mês', () => {
    expect(formatDate(new Date('2026-01-01'))).toBe('1 de janeiro de 2026')
  })
})

describe('formatPhone', () => {
  it('formata celular com 11 dígitos', () => {
    expect(formatPhone('86999887766')).toBe('(86) 99988-7766')
  })

  it('formata fixo com 10 dígitos', () => {
    expect(formatPhone('8633221100')).toBe('(86) 3322-1100')
  })

  it('ignora caracteres não numéricos no input', () => {
    expect(formatPhone('+55 (86) 99988-7766')).toBe('(86) 99988-7766')
  })
})
