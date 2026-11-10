import { describe, it, expect } from 'vitest'
import {
  UpdatePackagePhotosInput,
  UpdatePackageHighlightsInput,
} from './packages.schemas'

// ---------------------------------------------------------------------------
// Schema validation — UpdatePackagePhotosInput
// ---------------------------------------------------------------------------

describe('UpdatePackagePhotosInput', () => {
  it('accepts valid photos array (3 URLs)', () => {
    const result = UpdatePackagePhotosInput.safeParse({
      photos: [
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
        'https://example.com/3.jpg',
      ],
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty photos array', () => {
    const result = UpdatePackagePhotosInput.safeParse({ photos: [] })
    expect(result.success).toBe(true)
  })

  it('rejects photos array with more than 5 items', () => {
    const result = UpdatePackagePhotosInput.safeParse({
      photos: [
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
        'https://example.com/3.jpg',
        'https://example.com/4.jpg',
        'https://example.com/5.jpg',
        'https://example.com/6.jpg',
      ],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues[0]
      expect(issue.message).toContain('Máximo 5')
    }
  })

  it('rejects non-URL strings in photos', () => {
    const result = UpdatePackagePhotosInput.safeParse({
      photos: ['not-a-url'],
    })
    expect(result.success).toBe(false)
  })

  it('defaults to empty array when photos not provided', () => {
    const result = UpdatePackagePhotosInput.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.photos).toEqual([])
    }
  })
})

// ---------------------------------------------------------------------------
// Schema validation — UpdatePackageHighlightsInput
// ---------------------------------------------------------------------------

describe('UpdatePackageHighlightsInput', () => {
  it('accepts valid highlights array', () => {
    const result = UpdatePackageHighlightsInput.safeParse({
      highlights: ['Trilha incrível', 'Vista panorâmica'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects highlights array with more than 10 items', () => {
    const result = UpdatePackageHighlightsInput.safeParse({
      highlights: Array.from({ length: 11 }, (_, i) => `Destaque ${i + 1}`),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues[0]
      expect(issue.message).toContain('Máximo 10')
    }
  })

  it('rejects highlight shorter than 5 characters', () => {
    const result = UpdatePackageHighlightsInput.safeParse({
      highlights: ['abc'],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues[0]
      expect(issue.message).toContain('5 caracteres')
    }
  })

  it('rejects highlight longer than 200 characters', () => {
    const result = UpdatePackageHighlightsInput.safeParse({
      highlights: ['a'.repeat(201)],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues[0]
      expect(issue.message).toContain('200 caracteres')
    }
  })

  it('defaults to empty array when highlights not provided', () => {
    const result = UpdatePackageHighlightsInput.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.highlights).toEqual([])
    }
  })
})
