import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseUtm, saveUtm, loadUtm } from './utm'

describe('parseUtm', () => {
  it('mapeia utm_* para camelCase e ignora o resto', () => {
    expect(parseUtm('?utm_source=meta&utm_campaign=validacao-capivara&x=1')).toEqual({
      utmSource: 'meta',
      utmCampaign: 'validacao-capivara',
    })
  })

  it('mapeia os cinco parâmetros', () => {
    expect(
      parseUtm('utm_source=a&utm_medium=b&utm_campaign=c&utm_content=d&utm_term=e'),
    ).toEqual({ utmSource: 'a', utmMedium: 'b', utmCampaign: 'c', utmContent: 'd', utmTerm: 'e' })
  })

  it('retorna {} para string vazia e ignora valores vazios', () => {
    expect(parseUtm('')).toEqual({})
    expect(parseUtm('?utm_source=')).toEqual({})
  })

  it('corta valores em 100 caracteres', () => {
    expect(parseUtm(`?utm_source=${'a'.repeat(150)}`).utmSource).toHaveLength(100)
  })
})

describe('saveUtm / loadUtm', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('retorna {} quando não há nada salvo', () => {
    expect(loadUtm()).toEqual({})
  })

  it('persiste UTM com utmSource', () => {
    saveUtm({ utmSource: 'meta', utmTerm: 'A' })
    expect(loadUtm()).toEqual({ utmSource: 'meta', utmTerm: 'A' })
  })

  it('navegação sem UTM não apaga a origem', () => {
    saveUtm({ utmSource: 'meta' })
    saveUtm({})
    expect(loadUtm()).toEqual({ utmSource: 'meta' })
  })

  it('a última origem com UTM vence', () => {
    saveUtm({ utmSource: 'meta' })
    saveUtm({ utmSource: 'google' })
    expect(loadUtm()).toEqual({ utmSource: 'google' })
  })

  it('loadUtm retorna {} se o storage lançar', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(loadUtm()).toEqual({})
  })

  it('saveUtm não lança se o storage lançar', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => saveUtm({ utmSource: 'meta' })).not.toThrow()
  })
})
