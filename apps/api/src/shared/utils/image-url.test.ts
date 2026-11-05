import { describe, it, expect, afterEach, vi } from 'vitest'
import { imageUrlSchema, isAllowedImageUrl } from './image-url'

afterEach(() => vi.unstubAllEnvs())

describe('isAllowedImageUrl / imageUrlSchema', () => {
  it('sem R2_PUBLIC_URL aceita qualquer https', () => {
    vi.stubEnv('R2_PUBLIC_URL', '')
    expect(isAllowedImageUrl('https://qualquer.dev/a.jpg')).toBe(true)
    expect(isAllowedImageUrl('http://qualquer.dev/a.jpg')).toBe(false)
    expect(isAllowedImageUrl('javascript:alert(1)')).toBe(false)
  })

  it('com R2_PUBLIC_URL exige o host do R2', () => {
    vi.stubEnv('R2_PUBLIC_URL', 'https://pub.r2.dev/')
    expect(isAllowedImageUrl('https://pub.r2.dev/avatars/a.jpg')).toBe(true)
    expect(isAllowedImageUrl('https://pub.r2.dev.evil.com/a.jpg')).toBe(false)
    expect(isAllowedImageUrl('https://evil.com/a.jpg')).toBe(false)
  })

  it('limite de 2048 caracteres', () => {
    vi.stubEnv('R2_PUBLIC_URL', '')
    expect(imageUrlSchema.safeParse(`https://a.dev/${'x'.repeat(2030)}`).success).toBe(true)
    expect(imageUrlSchema.safeParse(`https://a.dev/${'x'.repeat(2040)}`).success).toBe(false)
  })
})
