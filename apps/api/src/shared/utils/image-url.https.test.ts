import { describe, it, expect } from 'vitest'
import { httpsUrlSchema } from './image-url'

describe('httpsUrlSchema', () => {
  it('aceita https e recusa javascript:, data: e http:', () => {
    const s = httpsUrlSchema()
    expect(s.safeParse('https://images.unsplash.com/x.jpg').success).toBe(true)
    expect(s.safeParse('javascript:alert(1)').success).toBe(false)
    expect(s.safeParse('data:image/png;base64,AAAA').success).toBe(false)
    expect(s.safeParse('http://cdn.x/a.jpg').success).toBe(false)
  })
})
