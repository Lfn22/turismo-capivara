/**
 * uploads.service.test.ts
 *
 * Tests for file validation and R2 upload logic.
 * R2 client is mocked — no real credentials required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted ensures the variable is available inside vi.mock factories
// (which are hoisted to the top of the file by Vitest).
const { mockSend } = vi.hoisted(() => {
  const mockSend = vi.fn().mockResolvedValue({})
  return { mockSend }
})

// ---------------------------------------------------------------------------
// Mock @aws-sdk/client-s3
// PutObjectCommand and DeleteObjectCommand are called with `new`, so mocks
// MUST use `function` (not arrow fn) to be valid constructors.
// ---------------------------------------------------------------------------
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PutObjectCommand: vi.fn(function (this: any, args: unknown) {
    this._args = args
    this.type = 'put'
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DeleteObjectCommand: vi.fn(function (this: any, args: unknown) {
    this._args = args
    this.type = 'delete'
  }),
}))

// Mock r2 config — getR2Client() returns a fake client backed by mockSend
vi.mock('../../shared/config/r2', () => ({
  getR2Client: () => ({ send: mockSend }),
  getR2Bucket: () => 'test-bucket',
  getR2PublicUrl: () => 'https://test-bucket.account123.r2.dev',
}))

import {
  validatePhotoFile,
  sanitizeFileName,
  uploadPhotoToR2,
  deletePhotoFromR2,
} from './uploads.service'

beforeEach(() => {
  mockSend.mockReset()
  mockSend.mockResolvedValue({})
})

// ---------------------------------------------------------------------------
// validatePhotoFile
// ---------------------------------------------------------------------------

describe('validatePhotoFile', () => {
  const MB = 1024 * 1024

  it('accepts JPEG file under 5MB', () => {
    expect(validatePhotoFile(2 * MB, 'image/jpeg')).toEqual({ valid: true })
  })

  it('accepts PNG file', () => {
    expect(validatePhotoFile(1 * MB, 'image/png')).toEqual({ valid: true })
  })

  it('accepts WebP file', () => {
    expect(validatePhotoFile(1 * MB, 'image/webp')).toEqual({ valid: true })
  })

  it('rejects BMP — not in whitelist', () => {
    const result = validatePhotoFile(1 * MB, 'image/bmp')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Formato inválido')
  })

  it('rejects text/plain', () => {
    const result = validatePhotoFile(1 * MB, 'text/plain')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Formato inválido')
  })

  it('rejects JPEG file > 5MB', () => {
    const result = validatePhotoFile(6 * MB, 'image/jpeg')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Arquivo muito grande')
  })

  it('accepts JPEG at exactly 5MB', () => {
    expect(validatePhotoFile(5 * MB, 'image/jpeg')).toEqual({ valid: true })
  })
})

// ---------------------------------------------------------------------------
// sanitizeFileName
// ---------------------------------------------------------------------------

describe('sanitizeFileName', () => {
  it('replaces spaces with underscores', () => {
    expect(sanitizeFileName('my photo.jpg')).toBe('my_photo.jpg')
  })

  it('keeps alphanumeric, dashes, dots, and underscores', () => {
    expect(sanitizeFileName('foto-valida_123.jpg')).toBe('foto-valida_123.jpg')
  })

  it('strips special symbols', () => {
    const result = sanitizeFileName('foto@destino!.jpg')
    expect(result).not.toContain('@')
    expect(result).not.toContain('!')
  })
})

// ---------------------------------------------------------------------------
// uploadPhotoToR2
// ---------------------------------------------------------------------------

describe('uploadPhotoToR2', () => {
  it('calls send with PutObjectCommand', async () => {
    const buffer = Buffer.from('fake image data')
    await uploadPhotoToR2(buffer, 'photo.jpg', 'image/jpeg', 'destinations')
    expect(mockSend).toHaveBeenCalledOnce()
    expect(mockSend.mock.calls[0][0].type).toBe('put')
  })

  it('returned URL matches R2 public URL pattern', async () => {
    const buffer = Buffer.from('fake image data')
    const { url } = await uploadPhotoToR2(buffer, 'photo.jpg', 'image/jpeg', 'destinations')
    expect(url).toMatch(/^https:\/\/test-bucket\.account123\.r2\.dev\/destinations\//)
  })

  it('key includes folder prefix', async () => {
    const buffer = Buffer.from('fake image data')
    const { key } = await uploadPhotoToR2(buffer, 'photo.jpg', 'image/jpeg', 'packages')
    expect(key).toMatch(/^packages\//)
  })

  it('key sanitizes special characters in filename', async () => {
    const buffer = Buffer.from('fake image data')
    const { key } = await uploadPhotoToR2(buffer, 'my photo @2x.jpg', 'image/jpeg', 'destinations')
    expect(key).not.toContain(' ')
    expect(key).not.toContain('@')
  })

  it('throws AppError when send fails', async () => {
    mockSend.mockRejectedValue(new Error('network error'))
    await expect(
      uploadPhotoToR2(Buffer.from('data'), 'photo.jpg', 'image/jpeg', 'destinations'),
    ).rejects.toMatchObject({ message: 'Falha ao enviar arquivo. Tente novamente.' })
  })
})

// ---------------------------------------------------------------------------
// deletePhotoFromR2
// ---------------------------------------------------------------------------

describe('deletePhotoFromR2', () => {
  it('calls send with DeleteObjectCommand', async () => {
    await deletePhotoFromR2('destinations/12345_photo.jpg')
    expect(mockSend).toHaveBeenCalledOnce()
    expect(mockSend.mock.calls[0][0].type).toBe('delete')
  })
})
