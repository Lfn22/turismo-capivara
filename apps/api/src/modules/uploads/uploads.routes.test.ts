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

// authenticate revalida o papel da equipe no banco
vi.mock('../../database', () => ({
  default: { user: { findUnique: vi.fn().mockResolvedValue({ role: 'PLATFORM_ADMIN' }) } },
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
    expect(res.json().message).toBeDefined()
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
    expect(res.json().message).toBe('Nenhum arquivo enviado')
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

  it.each([
    ['avatars', 'CLIENTE'],
    ['avatars', 'ADMIN'],
    ['logos', 'ADMIN'],
    ['logos', 'PLATFORM_ADMIN'],
  ])('folder=%s aceito para %s e repassado ao serviço', async (folder, role) => {
    const token = app.jwt.sign({ sub: 'u-x', role, tenantId: 'tenant-1', name: 'X' })
    const { body, contentType } = buildMultipart('photo.png', 'image/png')

    const res = await app.inject({
      method: 'POST',
      url: `/uploads/photos?folder=${folder}`,
      headers: { authorization: `Bearer ${token}`, 'content-type': contentType },
      payload: body,
    })

    expect(res.statusCode).toBe(200)
    expect(mockUpload).toHaveBeenLastCalledWith(expect.any(Buffer), 'photo.png', 'image/png', folder)
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
    expect(res.json().message).toContain('Formato inválido')
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
    expect(res.json().message).toContain('Arquivo muito grande')
  })
})

// ---------------------------------------------------------------------------
// R2 misconfiguration — 503
// ---------------------------------------------------------------------------

describe('POST /uploads/photos — R2 misconfiguration', () => {
  it('returns 503 when uploadPhotoToR2 throws with R2 config error message', async () => {
    mockUpload.mockRejectedValueOnce(
      new Error('Variáveis R2 ausentes: CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_API_TOKEN são obrigatórias'),
    )
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

    expect(res.statusCode).toBe(503)
    expect(res.json().message).toBe('Serviço de armazenamento indisponível. Configuração ausente.')
  })

  it('returns 503 when uploadPhotoToR2 throws with CLOUDFLARE config error message', async () => {
    mockUpload.mockRejectedValueOnce(
      new Error('CLOUDFLARE_API_TOKEN formato inválido'),
    )
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

    expect(res.statusCode).toBe(503)
    expect(res.json().message).toBe('Serviço de armazenamento indisponível. Configuração ausente.')
  })

  it('returns 500 for generic upload error (not R2 config)', async () => {
    mockUpload.mockRejectedValueOnce(new Error('Network timeout'))
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

    expect(res.statusCode).toBe(500)
    expect(res.json().message).toBe('Falha ao fazer upload. Tente novamente.')
  })
})

// ---------------------------------------------------------------------------
// Pastas por papel
// ---------------------------------------------------------------------------

describe('POST /uploads/photos — pasta por papel', () => {
  it.each([
    ['logos', 'CONDUTOR'],
    ['logos', 'CLIENTE'],
    ['guides', 'ADMIN'],
    ['guides', 'CLIENTE'],
  ])('folder=%s negado para %s → 403 sem upload', async (folder, role) => {
    const token = app.jwt.sign({ sub: 'u-x', role, tenantId: 'tenant-1', name: 'X' })
    const { body, contentType } = buildMultipart('photo.png', 'image/png')
    mockUpload.mockClear()

    const res = await app.inject({
      method: 'POST',
      url: `/uploads/photos?folder=${folder}`,
      headers: { authorization: `Bearer ${token}`, 'content-type': contentType },
      payload: body,
    })

    expect(res.statusCode).toBe(403)
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it.each([
    ['guides', 'CONDUTOR'],
    ['guides', 'PLATFORM_ADMIN'],
    ['avatars', 'CONDUTOR'],
    ['avatars', 'ADMIN'],
    ['destinations', 'CLIENTE'],
  ])('folder=%s permitido para %s', async (folder, role) => {
    const token = app.jwt.sign({ sub: 'u-x', role, tenantId: 'tenant-1', name: 'X' })
    const { body, contentType } = buildMultipart('photo.png', 'image/png')

    const res = await app.inject({
      method: 'POST',
      url: `/uploads/photos?folder=${folder}`,
      headers: { authorization: `Bearer ${token}`, 'content-type': contentType },
      payload: body,
    })

    expect(res.statusCode).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Rate limit por usuário
// ---------------------------------------------------------------------------

describe('POST /uploads/photos — rate limit por usuário', () => {
  it('21º upload no minuto do mesmo usuário → 429; outro usuário segue liberado', async () => {
    const Fastify = (await import('fastify')).default
    const jwt = (await import('@fastify/jwt')).default
    const rateLimit = (await import('@fastify/rate-limit')).default
    const rlApp = Fastify({ logger: false })
    await rlApp.register(jwt, { secret: 'test-secret-minimum-32-characters-xx' })
    await rlApp.register(rateLimit, { global: true, max: 1000, timeWindow: '1 minute' })
    await rlApp.register(uploadsRoutes)
    await rlApp.ready()

    const userA = rlApp.jwt.sign({ sub: 'user-a', role: 'CLIENTE', tenantId: 't', name: 'A' })
    const userB = rlApp.jwt.sign({ sub: 'user-b', role: 'CLIENTE', tenantId: 't', name: 'B' })
    const send = (t: string) =>
      rlApp.inject({ method: 'POST', url: '/uploads/photos?folder=avatars', headers: { authorization: `Bearer ${t}` } })

    for (let i = 0; i < 20; i++) {
      expect((await send(userA)).statusCode).toBe(400) // sem arquivo, mas conta no limite
    }
    expect((await send(userA)).statusCode).toBe(429)
    expect((await send(userB)).statusCode).toBe(400)

    await rlApp.close()
  })
})
