import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../database', () => ({
  default: {
    user: { count: vi.fn() },
    guideProfile: { count: vi.fn() },
    tenant: { count: vi.fn() },
  },
}))
vi.mock('./uploads.service', () => ({ deletePhotoFromR2: vi.fn() }))

import prisma from '../../database'
import { deletePhotoFromR2 } from './uploads.service'
import { deleteReplacedPhoto, r2KeyFromUrl } from './replaced-photo'

const db = prisma as any
const mockDelete = deletePhotoFromR2 as unknown as ReturnType<typeof vi.fn>
const log = { warn: vi.fn() } as any

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('R2_PUBLIC_URL', 'https://pub.r2.dev')
  db.user.count.mockResolvedValue(0)
  db.guideProfile.count.mockResolvedValue(0)
  db.tenant.count.mockResolvedValue(0)
  mockDelete.mockResolvedValue(undefined)
})
afterEach(() => vi.unstubAllEnvs())

describe('r2KeyFromUrl', () => {
  it('extrai a chave de URL do bucket público', () => {
    expect(r2KeyFromUrl('https://pub.r2.dev/avatars/1_a.jpg')).toBe('avatars/1_a.jpg')
  })
  it('URL de outro host → null', () => {
    expect(r2KeyFromUrl('https://outro.dev/avatars/1_a.jpg')).toBeNull()
  })
  it('sem R2_PUBLIC_URL → null', () => {
    vi.stubEnv('R2_PUBLIC_URL', '')
    expect(r2KeyFromUrl('https://pub.r2.dev/avatars/1_a.jpg')).toBeNull()
  })
  it('chave com .. ou query → null', () => {
    expect(r2KeyFromUrl('https://pub.r2.dev/avatars/../packages/x.jpg')).toBeNull()
    expect(r2KeyFromUrl('https://pub.r2.dev/avatars/x.jpg?v=1')).toBeNull()
  })
})

describe('deleteReplacedPhoto', () => {
  it('apaga a foto antiga do R2 quando substituída', async () => {
    await deleteReplacedPhoto('https://pub.r2.dev/avatars/1_a.jpg', 'https://pub.r2.dev/avatars/2_b.jpg', log)
    expect(mockDelete).toHaveBeenCalledWith('avatars/1_a.jpg')
  })

  it('apaga quando a foto é removida (null)', async () => {
    await deleteReplacedPhoto('https://pub.r2.dev/logos/1_a.png', null, log)
    expect(mockDelete).toHaveBeenCalledWith('logos/1_a.png')
  })

  it('não faz nada sem foto antiga ou se não mudou', async () => {
    await deleteReplacedPhoto(null, 'https://pub.r2.dev/avatars/2_b.jpg', log)
    await deleteReplacedPhoto('https://pub.r2.dev/avatars/1_a.jpg', 'https://pub.r2.dev/avatars/1_a.jpg', log)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('não apaga URL externa ao R2', async () => {
    await deleteReplacedPhoto('https://outro.dev/avatars/1_a.jpg', null, log)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('não apaga fotos de destinos/pacotes', async () => {
    await deleteReplacedPhoto('https://pub.r2.dev/packages/1_a.jpg', null, log)
    await deleteReplacedPhoto('https://pub.r2.dev/destinations/1_a.jpg', null, log)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('não apaga se outro registro ainda referencia a URL', async () => {
    db.tenant.count.mockResolvedValue(1)
    await deleteReplacedPhoto('https://pub.r2.dev/avatars/1_a.jpg', null, log)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('erro do R2 não propaga (só log)', async () => {
    mockDelete.mockRejectedValue(new Error('R2 fora'))
    await expect(deleteReplacedPhoto('https://pub.r2.dev/avatars/1_a.jpg', null, log)).resolves.toBeUndefined()
    expect(log.warn).toHaveBeenCalled()
  })
})
