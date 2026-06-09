import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  UpdatePackagePhotosInput,
  UpdatePackageHighlightsInput,
} from './packages.schemas'

// ---------------------------------------------------------------------------
// Mock prisma — use vi.hoisted so the variable is available inside vi.mock factory
// ---------------------------------------------------------------------------
const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    tourPackage: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  }
  return { mockPrisma }
})

vi.mock('../../database', () => ({ default: mockPrisma }))

import { updatePackagePhotos, updatePackageHighlights } from './packages.service'

beforeEach(() => {
  vi.clearAllMocks()
})

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

// ---------------------------------------------------------------------------
// Service — updatePackagePhotos
// ---------------------------------------------------------------------------

describe('updatePackagePhotos', () => {
  const mockPackage = {
    id: 'pkg-1',
    conductorId: 'user-1',
    photos: [],
    highlights: [],
  }

  it('updates photos for the package owner', async () => {
    const newPhotos = ['https://example.com/1.jpg', 'https://example.com/2.jpg']
    mockPrisma.tourPackage.findUnique.mockResolvedValue(mockPackage)
    mockPrisma.tourPackage.update.mockResolvedValue({ ...mockPackage, photos: newPhotos })

    const result = await updatePackagePhotos('pkg-1', 'user-1', newPhotos)

    expect(result.photos).toEqual(newPhotos)
    expect(mockPrisma.tourPackage.update).toHaveBeenCalledWith({
      where: { id: 'pkg-1' },
      data: { photos: newPhotos },
    })
  })

  it('throws 404 when package not found', async () => {
    mockPrisma.tourPackage.findUnique.mockResolvedValue(null)

    await expect(updatePackagePhotos('pkg-999', 'user-1', [])).rejects.toMatchObject({
      statusCode: 404,
      message: 'Roteiro não encontrado',
    })
    expect(mockPrisma.tourPackage.update).not.toHaveBeenCalled()
  })

  it('throws 403 when user is not the owner', async () => {
    mockPrisma.tourPackage.findUnique.mockResolvedValue(mockPackage)

    await expect(
      updatePackagePhotos('pkg-1', 'other-user', ['https://example.com/1.jpg']),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Não autorizado',
    })
    expect(mockPrisma.tourPackage.update).not.toHaveBeenCalled()
  })

  it('throws 400 when more than 5 photos are provided', async () => {
    mockPrisma.tourPackage.findUnique.mockResolvedValue(mockPackage)

    const tooManyPhotos = Array.from({ length: 6 }, (_, i) => `https://example.com/${i}.jpg`)

    await expect(updatePackagePhotos('pkg-1', 'user-1', tooManyPhotos)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Máximo 5 fotos permitidas',
    })
    expect(mockPrisma.tourPackage.update).not.toHaveBeenCalled()
  })

  it('publishes photos immediately (no approval workflow)', async () => {
    const photos = ['https://example.com/photo.jpg']
    mockPrisma.tourPackage.findUnique.mockResolvedValue(mockPackage)
    mockPrisma.tourPackage.update.mockResolvedValue({ ...mockPackage, photos })

    // Update completes without any approval step
    const result = await updatePackagePhotos('pkg-1', 'user-1', photos)
    expect(result.photos).toEqual(photos)
    expect(mockPrisma.tourPackage.update).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// Service — updatePackageHighlights
// ---------------------------------------------------------------------------

describe('updatePackageHighlights', () => {
  const mockPackage = {
    id: 'pkg-1',
    conductorId: 'user-1',
    photos: [],
    highlights: [],
  }

  it('updates highlights for the package owner', async () => {
    const newHighlights = ['Trilha incrível', 'Vista panorâmica']
    mockPrisma.tourPackage.findUnique.mockResolvedValue(mockPackage)
    mockPrisma.tourPackage.update.mockResolvedValue({ ...mockPackage, highlights: newHighlights })

    const result = await updatePackageHighlights('pkg-1', 'user-1', newHighlights)

    expect(result.highlights).toEqual(newHighlights)
    expect(mockPrisma.tourPackage.update).toHaveBeenCalledWith({
      where: { id: 'pkg-1' },
      data: { highlights: newHighlights },
    })
  })

  it('throws 404 when package not found', async () => {
    mockPrisma.tourPackage.findUnique.mockResolvedValue(null)

    await expect(updatePackageHighlights('pkg-999', 'user-1', [])).rejects.toMatchObject({
      statusCode: 404,
      message: 'Roteiro não encontrado',
    })
    expect(mockPrisma.tourPackage.update).not.toHaveBeenCalled()
  })

  it('throws 403 when user is not the owner', async () => {
    mockPrisma.tourPackage.findUnique.mockResolvedValue(mockPackage)

    await expect(
      updatePackageHighlights('pkg-1', 'other-user', ['Destaque válido']),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Não autorizado',
    })
    expect(mockPrisma.tourPackage.update).not.toHaveBeenCalled()
  })

  it('throws 400 when more than 10 highlights are provided', async () => {
    mockPrisma.tourPackage.findUnique.mockResolvedValue(mockPackage)

    const tooMany = Array.from({ length: 11 }, (_, i) => `Destaque número ${i + 1}`)

    await expect(updatePackageHighlights('pkg-1', 'user-1', tooMany)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Máximo 10 destaques permitidos',
    })
    expect(mockPrisma.tourPackage.update).not.toHaveBeenCalled()
  })

  it('throws 400 when highlight is shorter than 5 characters', async () => {
    mockPrisma.tourPackage.findUnique.mockResolvedValue(mockPackage)

    await expect(
      updatePackageHighlights('pkg-1', 'user-1', ['abc']),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Cada destaque deve ter pelo menos 5 caracteres',
    })
    expect(mockPrisma.tourPackage.update).not.toHaveBeenCalled()
  })

  it('publishes highlights immediately (no approval workflow)', async () => {
    const highlights = ['Experiência única na natureza']
    mockPrisma.tourPackage.findUnique.mockResolvedValue(mockPackage)
    mockPrisma.tourPackage.update.mockResolvedValue({ ...mockPackage, highlights })

    const result = await updatePackageHighlights('pkg-1', 'user-1', highlights)
    expect(result.highlights).toEqual(highlights)
    expect(mockPrisma.tourPackage.update).toHaveBeenCalledOnce()
  })
})
