import { describe, it, expect, beforeEach, vi } from 'vitest'
import { initMetaPixel, isPixelAllowedPath, trackPixel } from './meta-pixel'

type W = { fbq?: unknown; _fbq?: unknown }

describe('meta-pixel', () => {
  beforeEach(() => {
    delete (window as unknown as W).fbq
    delete (window as unknown as W)._fbq
    document.head.innerHTML = ''
  })

  it('trackPixel sem window.fbq não lança', () => {
    expect(() => trackPixel('Lead')).not.toThrow()
  })

  it('trackPixel chama fbq("track", evento, params)', () => {
    const fbq = vi.fn()
    ;(window as unknown as W).fbq = fbq
    trackPixel('Lead')
    expect(fbq).toHaveBeenCalledWith('track', 'Lead', undefined)
    trackPixel('Lead', { value: 1 })
    expect(fbq).toHaveBeenCalledWith('track', 'Lead', { value: 1 })
  })

  it('initMetaPixel 2x injeta um único script e inicia o pixel', () => {
    initMetaPixel('123')
    initMetaPixel('123')
    expect(document.querySelectorAll('script[src*="fbevents.js"]')).toHaveLength(1)
    const fbq = (window as unknown as { fbq: { queue: unknown[][] } }).fbq
    expect(typeof fbq).toBe('function')
    expect(fbq.queue.filter((a) => a[0] === 'init')).toHaveLength(1)
    expect(fbq.queue[0]).toEqual(['init', '123'])
  })
})

describe('isPixelAllowedPath', () => {
  it.each(['/', '/destinos', '/destinos/serra-da-capivara', '/agencia-x/roteiros/abc', '/guias/gp1', '/explorar'])(
    'permite %s',
    (p) => expect(isPixelAllowedPath(p)).toBe(true),
  )
  it.each([
    '/agencia-x/checkout',
    '/agencia-x/confirmacao',
    '/agencia-x/minha-reserva',
    '/agencia-x/reservar',
    '/reset-password',
    '/agencia-x/painel/perfil',
    '/super-admin/guias',
    '/login',
    '/agencia-x/cadastro',
    '/agencia-x/login',
  ])('nega %s', (p) => expect(isPixelAllowedPath(p)).toBe(false))
})

describe('initMetaPixel stub', () => {
  it('define disablePushState = true', () => {
    delete (window as unknown as W).fbq
    document.head.innerHTML = ''
    initMetaPixel('1')
    expect((window as unknown as { fbq: { disablePushState?: boolean } }).fbq.disablePushState).toBe(true)
  })
})
