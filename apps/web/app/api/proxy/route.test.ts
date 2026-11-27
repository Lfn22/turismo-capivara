import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth/jwt', () => ({ getToken: vi.fn(async () => ({ apiToken: 'tok' })) }))
const revalidatePath = vi.fn()
vi.mock('next/cache', () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }))

import { POST } from './route'

const call = (path: string) =>
  POST(
    new NextRequest(`http://localhost/api/proxy?path=${encodeURIComponent(path)}`, {
      method: 'POST',
    }),
  )

beforeEach(() => {
  revalidatePath.mockReset()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{"id":"r1","status":"APPROVED"}', { status: 200 })),
  )
})
afterEach(() => vi.unstubAllGlobals())

describe('POST /api/proxy — pedidos de roteiro', () => {
  it('aprovar pedido revalida as páginas públicas da operadora e dos destinos', async () => {
    const res = await call('/admin/package-requests/r1/approve')
    expect(res.status).toBe(200)
    expect(revalidatePath).toHaveBeenCalledWith('/[slug]', 'layout')
    expect(revalidatePath).toHaveBeenCalledWith('/destinos/[destination-slug]', 'layout')
  })

  it('recusar pedido não revalida nada', async () => {
    const res = await call('/admin/package-requests/r1/reject')
    expect(res.status).toBe(200)
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
