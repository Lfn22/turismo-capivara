/**
 * uploads.routes.test.ts
 *
 * Integration tests for POST /uploads/photos.
 *
 * Strategy:
 *  - Auth/query tests: inject without payload (file checks happen after validation)
 *  - File flow tests: construct a real multipart body so @fastify/multipart
 *    parses it correctly — no need to mock the plugin itself
 *  - uploads.service is mocked so no real R2 calls happen
 *
 * Helper buildMultipart() constructs a valid multipart/form-data body.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'

// ---------------------------------------------------------------------------
// Mock uploads.service — no real R2 calls
// ---------------------------------------------------------------------------
vi.mock('./uploads.service', () => ({
  validatePhotoFile: vi.fn(() => ({ valid: true })),
  uploadPhotoToR2: vi.fn().mockResolvedValue({
    url: 'https://bucket.acc.r2.dev/destinations/123_photo.jpg',
    key: 'destinations/123_photo.jpg',
  }),
  deletePhotoFromR2: vi.fn(),
}))

import { buildApp } from '../../__tests__/helpers/build-app'
import { uploadsRoutes } from './uploads.routes'
import { validatePhotoFile, uploadPhotoToR2 } from './uploads.service'

const mockValidate = validatePhotoFile as Mock
const mockUpload = uploadPhotoToR2 as Mock

// ---------------------------------------------------------------------------
// Multipart body builder
// ---------------------------------------------------------------------------
const BOUNDARY = '----ViTestBoundary7a3f'

function buildMultipart(
  filename: string,
  mimeType: string,
  content: Buffer = Buffer.from('fake image content'),
): { body: Buffer; contentType: string } {
  const body = Buffer.concat([
    Buffer.from(
      `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
    ),
    content,
    Buffer.from(`\r\n--${BOUNDARY}--\r\n`),
  ])
  return { body, contentType: `multipart/form-data; boundary=${BOUNDARY}` }
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
const app = buildApp(uploadsRoutes)

let conductorToken: string
let adminToken: string

beforeAll(async () => {
  await app.ready()
  conductorToken = app.jwt.sign({ sub: 'user-1', role: 'CONDUTOR', tenantId: 'tenant-1', name: 'Guide' })
  adminToken = app.jwt.sign({ sub: 'admin-1', role: 'ADMIN', tenantId: 'tenant-1', name: 'Admin' })
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  mockValidate.mockReturnValue({ valid: true })
  mockUpload.mockResolvedValue({
    url: 'https://bucket.acc.r2.dev/destinations/123_photo.jpg',
    key: 'destinations/123_photo.jpg',
  })
})

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

describe('POST /uploads/photos — auth', () => {
  it('returns 401 when no token provided', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/uploads/photos?folder=destinations',
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 for invalid token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/uploads/photos?folder=destinations',
      headers: { authorization: 'Bearer bad.token.value' },
    })
    expect(res.statusCode).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// Query param validation (folder)
// ---------------------------------------------------------------------------

describe('POST /uploads/photos — query validation', () => {
  it('returns 400 when folder param is missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/uploads/photos',
      headers: { authorization: `Bearer ${conductorToken}` },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when folder value is invalid', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/uploads/photos?folder=xyz',
      headers: { authorization: `Bearer ${conductorToken}` },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// No file uploaded
// ---------------------------------------------------------------------------

describe('POST /uploads/photos — no file', () => {
  it('returns 400 with "Nenhum arquivo enviado" when request has no file part', async () => {
    // Send a request without multipart body — request.file() returns undefined
    const res = await app.inject({
      method: 'POST',
      url: '/uploads/photos?folder=destinations',
      headers: { authorization: `Bearer ${conductorToken}` },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('Nenhum arquivo enviado')
  })
})

// ---------------------------------------------------------------------------
// Valid upload
// ---------------------------------------------------------------------------

describe('POST /uploads/photos — success', () => {
  it('returns 200 with url and key on valid JPEG upload', async () => {
    const { body, contentType } = buildMultipart('photo.jpg', 'image/jpeg')

    const res = await app.inject({
      method: 'POST',
      url: '/uploads/photos?folder=destinations',
      headers: {
        authorization: `Bearer ${conductorToken}`,
        'content-type': contentType,
      },
      payload: body,
    })

    expect(res.statusCode).toBe(200)
    const result = res.json()
    expect(result).toHaveProperty('url')
    expect(result).toHaveProperty('key')
  })

  it('ADMIN can upload to packages folder', async () => {
    const { body, contentType } = buildMultipart('photo.png', 'image/png')

    const res = await app.inject({
      method: 'POST',
      url: '/uploads/photos?folder=packages',
      headers: {
        authorization: `Bearer ${adminToken}`,
        'content-type': contentType,
      },
      payload: body,
    })

    expect(res.statusCode).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// File validation errors (mocked via validatePhotoFile)
// ---------------------------------------------------------------------------

describe('POST /uploads/photos — file validation errors', () => {
  it('returns 400 for invalid file format (BMP)', async () => {
    mockValidate.mockReturnValue({ valid: false, error: 'Formato inválido. Use JPEG, PNG ou WebP.' })
    const { body, contentType } = buildMultipart('photo.bmp', 'image/bmp')

    const res = await app.inject({
      method: 'POST',
      url: '/uploads/photos?folder=destinations',
      headers: {
        authorization: `Bearer ${conductorToken}`,
        'content-type': contentType,
      },
      payload: body,
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toContain('Formato inválido')
  })

  it('returns 400 when file exceeds 5MB', async () => {
    mockValidate.mockReturnValue({
      valid: false,
      error: 'Arquivo muito grande. O tamanho máximo é 5MB.',
    })
    const { body, contentType } = buildMultipart('large.jpg', 'image/jpeg', Buffer.alloc(100))

    const res = await app.inject({
      method: 'POST',
      url: '/uploads/photos?folder=destinations',
      headers: {
        authorization: `Bearer ${conductorToken}`,
        'content-type': contentType,
      },
      payload: body,
    })

    expect(res.statusCode).toBe(400)
    expect(res.json().error).toContain('Arquivo muito grande')
  })
})
