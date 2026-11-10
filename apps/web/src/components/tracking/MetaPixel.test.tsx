import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render } from '@testing-library/react'

const pathnameMock = vi.hoisted(() => vi.fn(() => '/x/roteiros/abc'))
vi.mock('next/navigation', () => ({ usePathname: pathnameMock }))

import { MetaPixel } from './MetaPixel'

describe('MetaPixel', () => {
  beforeEach(() => {
    localStorage.clear()
    pathnameMock.mockReturnValue('/x/roteiros/abc')
    delete (window as unknown as { fbq?: unknown }).fbq
    document.head.innerHTML = ''
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '999')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('com consentimento rejected não injeta script', () => {
    localStorage.setItem('capi-cookie-consent', 'rejected')
    render(<MetaPixel />)
    expect(document.querySelector('script[src*="fbevents.js"]')).toBeNull()
  })

  it('sem consentimento não injeta script', () => {
    render(<MetaPixel />)
    expect(document.querySelector('script[src*="fbevents.js"]')).toBeNull()
  })

  it('com consentimento accepted injeta script e dispara PageView', () => {
    localStorage.setItem('capi-cookie-consent', 'accepted')
    render(<MetaPixel />)
    expect(document.querySelectorAll('script[src*="fbevents.js"]')).toHaveLength(1)
    const q = (window as unknown as { fbq: { queue: unknown[][] } }).fbq.queue
    expect(q).toContainEqual(['init', '999'])
    expect(q).toContainEqual(['track', 'PageView', undefined])
  })

  it('sem pixel id não injeta script', () => {
    vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '')
    localStorage.setItem('capi-cookie-consent', 'accepted')
    render(<MetaPixel />)
    expect(document.querySelector('script[src*="fbevents.js"]')).toBeNull()
  })

  it('em página negada (checkout) com consentimento não injeta script nem PageView', () => {
    pathnameMock.mockReturnValue('/x/checkout')
    localStorage.setItem('capi-cookie-consent', 'accepted')
    render(<MetaPixel />)
    expect(document.querySelector('script[src*="fbevents.js"]')).toBeNull()
    expect((window as unknown as { fbq?: unknown }).fbq).toBeUndefined()
  })

  it('stub tem disablePushState === true', () => {
    localStorage.setItem('capi-cookie-consent', 'accepted')
    render(<MetaPixel />)
    expect((window as unknown as { fbq: { disablePushState?: boolean } }).fbq.disablePushState).toBe(true)
  })
})
