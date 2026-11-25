import { describe, it, expect } from 'vitest'
import { pathOnly } from './log-url'

describe('pathOnly', () => {
  it('remove a query string (que pode ter e-mail do cliente)', () => {
    expect(pathOnly('/tenants/capi/bookings/b1?email=ana%40x.com')).toBe(
      '/tenants/capi/bookings/b1',
    )
    expect(pathOnly('/health')).toBe('/health')
  })
})
