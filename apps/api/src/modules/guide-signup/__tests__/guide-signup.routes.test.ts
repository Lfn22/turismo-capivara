import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { buildApp } from '../../../__tests__/helpers/build-app'

vi.mock('../../../database', () => {
  const db: any = {
    tenant: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    guideProfile: { create: vi.fn(), update: vi.fn() },
    guideAffiliation: { create: vi.fn() },
  }
  db.$transaction = vi.fn(async (fn: any) => fn(db))
  return { default: db }
})
vi.mock('bcryptjs', () => ({
  hashSync: vi.fn().mockReturnValue('hashed-password'),
  compareSync: vi.fn(),
}))
vi.mock('../credential.storage', async (orig) => ({
  ...(await orig<typeof import('../credential.storage')>()),
  putCredential: vi.fn(),
  getCredential: vi.fn(),
}))
vi.mock('../../notifications/guide-events', () => ({
  notifyGuideRegistered: vi.fn().mockResolvedValue(undefined),
  notifyAffiliationRequested: vi.fn().mockResolvedValue(undefined),
}))

import prisma from '../../../database'
import { Prisma } from '@prisma/client'
import { putCredential } from '../credential.storage'
import { notifyGuideRegistered, notifyAffiliationRequested } from '../../notifications/guide-events'
import { guideSignupRoutes } from '../guide-signup.routes'
import { authRoutes } from '../../auth/auth.routes'
import { tenantsRoutes } from '../../tenants/tenants.routes'
import { guidesRoutes } from '../../guides/guides.routes'

const db = prisma as unknown as Record<string, Record<string, Mock>> & { $transaction: Mock }

const app = buildApp(guideSignupRoutes, authRoutes, tenantsRoutes, guidesRoutes)
beforeAll(async () => { await app.ready() })
afterAll(async () => { await app.close() })

process.env.CPF_SECRET = 'test-cpf-secret'

const BOUNDARY = '----testboundary'
function multipart(fields: Record<string, string>, file?: { name?: string; type: string; data: Buffer }) {
  const chunks: Buffer[] = []
  for (const [k, v] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${BOUNDARY}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`))
  }
  if (file) {
    chunks.push(Buffer.from(
      `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="${file.name ?? 'doc'}"\r\nContent-Type: ${file.type}\r\n\r\n`,
    ))
    chunks.push(file.data, Buffer.from('\r\n'))
  }
  chunks.push(Buffer.from(`--${BOUNDARY}--\r\n`))
  return { payload: Buffer.concat(chunks), headers: { 'content-type': `multipart/form-data; boundary=${BOUNDARY}` } }
}

const validFields = {
  name: 'Rui Guia',
  email: 'Rui@Example.COM',
  password: 'senha-segura',
  cpf: '12345678901',
  kind: 'AUTONOMO',
  credentialType: 'CADASTUR',
  credentialNumber: '123.456',
}
const pdf = { type: 'application/pdf', data: Buffer.from('%PDF-1.4 fake') }

function register(fields: Record<string, string>, file: { type: string; data: Buffer } | null = pdf) {
  const { payload, headers } = multipart(fields, file ?? undefined)
  return app.inject({ method: 'POST', url: '/auth/register-guide', payload, headers })
}

beforeEach(() => {
  vi.clearAllMocks()
  db.$transaction.mockImplementation(async (fn: any) => fn(db))
  db.tenant.findFirst.mockResolvedValue({ id: 'ind', slug: 'independente' })
  db.user.create.mockResolvedValue({ id: 'u1' })
  db.guideProfile.create.mockResolvedValue({ id: 'gp1' })
  db.guideAffiliation.create.mockResolvedValue({ id: 'aff1' })
  ;(putCredential as Mock).mockResolvedValue('credentials/abc.pdf')
})

describe('POST /auth/register-guide', () => {
  it('cadastro autônomo: cria usuário no independente, perfil com comprovante e avisa a equipe', async () => {
    const res = await register(validFields)
    expect(res.statusCode).toBe(201)
    expect(res.json()).toEqual({ message: 'Cadastro enviado. Aguarde a verificação.' })
    expect(putCredential).toHaveBeenCalledWith(expect.any(Buffer), 'application/pdf')
    const userData = db.user.create.mock.calls[0][0].data
    expect(userData).toMatchObject({ tenantId: 'ind', role: 'CONDUTOR', email: 'rui@example.com' })
    expect(userData.cpf).toBeTruthy()
    expect(userData.cpf).not.toBe('12345678901')
    const profile = db.guideProfile.create.mock.calls[0][0].data
    expect(profile).toMatchObject({
      userId: 'u1',
      credentialType: 'CADASTUR',
      credentialNumber: '123.456',
      credentialDocKey: 'credentials/abc.pdf',
    })
    expect(profile.credentialSubmittedAt).toBeInstanceOf(Date)
    expect(db.guideAffiliation.create).not.toHaveBeenCalled()
    expect(notifyGuideRegistered).toHaveBeenCalledWith(expect.anything(), 'u1')
    expect(notifyAffiliationRequested).not.toHaveBeenCalled()
  })

  it('cria o tenant independente quando não existe', async () => {
    db.tenant.findFirst.mockResolvedValue(null)
    db.tenant.create.mockResolvedValue({ id: 'ind2', slug: 'independente' })
    const res = await register(validFields)
    expect(res.statusCode).toBe(201)
    expect(db.tenant.create).toHaveBeenCalledWith({
      data: { slug: 'independente', name: 'Guias Independentes', type: 'AGENCIA' },
    })
    expect(db.user.create.mock.calls[0][0].data.tenantId).toBe('ind2')
  })

  it('kind AGENCIA com tenant válido cria afiliação PENDING e avisa a agência', async () => {
    db.tenant.findUnique.mockResolvedValue({ id: 't9', slug: 'agencia-x', type: 'AGENCIA', approvalStatus: 'APPROVED' })
    const res = await register({ ...validFields, kind: 'AGENCIA', tenantId: 't9' })
    expect(res.statusCode).toBe(201)
    expect(db.guideAffiliation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { guideId: 'gp1', tenantId: 't9', status: 'PENDING' } }),
    )
    expect(notifyAffiliationRequested).toHaveBeenCalledWith(expect.anything(), 'aff1')
  })

  it('kind ASSOCIACAO com tenant do tipo AGENCIA -> 404', async () => {
    db.tenant.findUnique.mockResolvedValue({ id: 't9', slug: 'agencia-x', type: 'AGENCIA', approvalStatus: 'APPROVED' })
    const res = await register({ ...validFields, kind: 'ASSOCIACAO', tenantId: 't9' })
    expect(res.statusCode).toBe(404)
    expect(res.json().message).toBe('Agência não encontrada')
    expect(putCredential).not.toHaveBeenCalled()
  })

  it('tenant não aprovado ou independente -> 404', async () => {
    db.tenant.findUnique.mockResolvedValue({ id: 't9', slug: 'x', type: 'AGENCIA', approvalStatus: 'PENDING' })
    expect((await register({ ...validFields, kind: 'AGENCIA', tenantId: 't9' })).statusCode).toBe(404)
    db.tenant.findUnique.mockResolvedValue({ id: 'ind', slug: 'independente', type: 'AGENCIA', approvalStatus: 'APPROVED' })
    expect((await register({ ...validFields, kind: 'AGENCIA', tenantId: 'ind' })).statusCode).toBe(404)
  })

  it('kind AGENCIA sem tenantId -> 400', async () => {
    const res = await register({ ...validFields, kind: 'AGENCIA' })
    expect(res.statusCode).toBe(400)
    expect(res.json().errors[0].field).toBe('tenantId')
  })

  it('arquivo text/plain -> 400 e não grava', async () => {
    const res = await register(validFields, { type: 'text/plain', data: Buffer.from('oi') })
    expect(res.statusCode).toBe(400)
    expect(res.json().message).toBe('Envie o comprovante em JPEG, PNG, WebP ou PDF')
    expect(putCredential).not.toHaveBeenCalled()
  })

  it('assinatura não bate com o tipo declarado -> 400 e não grava', async () => {
    const fake = { type: 'application/pdf', data: Buffer.from('MZ not a pdf at all') }
    const res = await register(validFields, fake)
    expect(res.statusCode).toBe(400)
    expect(res.json().message).toBe('Envie o comprovante em JPEG, PNG, WebP ou PDF')
    expect(putCredential).not.toHaveBeenCalled()
  })

  it('assinaturas reais de JPEG, PNG e WebP passam', async () => {
    const samples = [
      { type: 'image/jpeg', data: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]) },
      { type: 'image/png', data: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]) },
      { type: 'image/webp', data: Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]) },
    ]
    for (const f of samples) expect((await register(validFields, f)).statusCode).toBe(201)
  })

  it('reenvio com assinatura divergente -> 400', async () => {
    db.user.findUnique.mockResolvedValue({ approvalStatus: 'REJECTED' })
    const { payload, headers } = multipart({ credentialType: 'ICMBIO' }, { type: 'image/png', data: Buffer.from('%PDF-1.4') })
    const res = await app.inject({
      method: 'POST', url: '/guides/me/credential', payload,
      headers: { ...headers, authorization: `Bearer ${app.jwt.sign({ sub: 'u1', tenantId: 'ind', role: 'CONDUTOR', name: 'X', approvalStatus: 'REJECTED' })}` },
    })
    expect(res.statusCode).toBe(400)
    expect(putCredential).not.toHaveBeenCalled()
  })

  it('arquivo acima de 10 MB -> 400', async () => {
    const res = await register(validFields, { type: 'application/pdf', data: Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(10 * 1024 * 1024 + 10)]) })
    expect(res.statusCode).toBe(400)
    expect(res.json().message).toBe('O comprovante deve ter até 10 MB')
    expect(putCredential).not.toHaveBeenCalled()
  })

  it('sem arquivo -> 400 Dados inválidos com field file', async () => {
    const res = await register(validFields, null)
    expect(res.statusCode).toBe(400)
    expect(res.json().message).toBe('Dados inválidos')
    expect(res.json().errors).toContainEqual(expect.objectContaining({ field: 'file' }))
  })

  it('e-mail duplicado (P2002) -> 409', async () => {
    db.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x', meta: { target: ['email'] } }),
    )
    const res = await register(validFields)
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('E-mail já cadastrado')
  })

  it('CPF duplicado (P2002) -> 409', async () => {
    db.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x', meta: { target: ['cpf'] } }),
    )
    const res = await register(validFields)
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('CPF já cadastrado')
  })
})

describe('rotas antigas', () => {
  it('POST /auth/register-independent deixou de existir', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/register-independent', payload: {} })
    expect(res.statusCode).toBe(404)
  })

  it('POST /tenants/:slug/auth/register com CONDUTOR -> 400; CLIENTE -> 201', async () => {
    db.tenant.findUnique.mockResolvedValue({ id: 't1', slug: 'capivara' })
    db.user.create.mockResolvedValue({ id: 'c1' })
    const condutor = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/auth/register',
      payload: { role: 'CONDUTOR', name: 'A', email: 'a@a.com', password: '12345678', cpf: '12345678901' },
    })
    expect(condutor.statusCode).toBe(400)
    const cliente = await app.inject({
      method: 'POST',
      url: '/tenants/capivara/auth/register',
      payload: { role: 'CLIENTE', name: 'A', email: 'a@a.com', password: '12345678' },
    })
    expect(cliente.statusCode).toBe(201)
  })
})

function token(role = 'CONDUTOR') {
  return app.jwt.sign({ sub: 'u1', tenantId: 'ind', role, name: 'Rui' })
}

describe('GET /guides/me', () => {
  it('devolve o status sem credentialDocKey e não é engolida por /guides/:id', async () => {
    db.user.findUnique.mockResolvedValue({
      approvalStatus: 'REJECTED',
      rejectionReason: 'Documento ilegível',
      tenant: { slug: 'independente' },
      guideProfile: {
        id: 'gp1',
        bio: 'b',
        photoUrl: null,
        especialidades: ['x'],
        regioes: [],
        portfolioPhotos: [],
        credentialType: 'CADASTUR',
        credentialNumber: '1',
        credentialSubmittedAt: new Date('2026-10-01'),
        credentialDocKey: 'credentials/secret.pdf',
        affiliation: { id: 'aff1', status: 'PENDING', rejectionReason: null, tenant: { name: 'Agência X', type: 'AGENCIA' } },
      },
    })
    const res = await app.inject({ method: 'GET', url: '/guides/me', headers: { authorization: `Bearer ${token()}` } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(JSON.stringify(body)).not.toContain('credentialDocKey')
    expect(JSON.stringify(body)).not.toContain('secret.pdf')
    expect(body).toMatchObject({
      approvalStatus: 'REJECTED',
      rejectionReason: 'Documento ilegível',
      credentialType: 'CADASTUR',
      tenantSlug: 'independente',
      profile: { id: 'gp1', bio: 'b', especialidades: ['x'] },
      affiliation: { id: 'aff1', tenantName: 'Agência X', tenantType: 'AGENCIA', status: 'PENDING', rejectionReason: null },
    })
  })

  it('não-condutor -> 403', async () => {
    const res = await app.inject({ method: 'GET', url: '/guides/me', headers: { authorization: `Bearer ${token('CLIENTE')}` } })
    expect(res.statusCode).toBe(403)
  })
})

describe('POST /guides/me/credential', () => {
  function resubmit() {
    const { payload, headers } = multipart({ credentialType: 'ICMBIO', credentialNumber: '99' }, pdf)
    return app.inject({
      method: 'POST',
      url: '/guides/me/credential',
      payload,
      headers: { ...headers, authorization: `Bearer ${token()}` },
    })
  }

  it('guia REJECTED reenvia: volta para PENDING e avisa a equipe', async () => {
    db.user.findUnique.mockResolvedValue({ approvalStatus: 'REJECTED' })
    const res = await resubmit()
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ message: 'Comprovante reenviado. Aguarde a verificação.' })
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({ approvalStatus: 'PENDING', rejectionReason: null }),
      }),
    )
    expect(db.guideProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1' },
        data: expect.objectContaining({
          credentialType: 'ICMBIO',
          credentialNumber: '99',
          credentialDocKey: 'credentials/abc.pdf',
          credentialSubmittedAt: expect.any(Date),
        }),
      }),
    )
    expect(notifyGuideRegistered).toHaveBeenCalledWith(expect.anything(), 'u1')
  })

  it('guia APPROVED -> 409', async () => {
    db.user.findUnique.mockResolvedValue({ approvalStatus: 'APPROVED' })
    const res = await resubmit()
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('Seu cadastro já foi aprovado')
    expect(putCredential).not.toHaveBeenCalled()
  })
})

describe('GET /tenants/search', () => {
  it('busca aprovados, exclui independente, no máximo 10', async () => {
    db.tenant.findMany.mockResolvedValue([{ id: 't1', name: 'Capivara Tur', slug: 'capivara', type: 'AGENCIA' }])
    const res = await app.inject({ method: 'GET', url: '/tenants/search?q=ca' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ tenants: [{ id: 't1', name: 'Capivara Tur', slug: 'capivara', type: 'AGENCIA' }] })
    expect(db.tenant.findMany).toHaveBeenCalledWith({
      where: { approvalStatus: 'APPROVED', slug: { notIn: ['independente', 'capi-platform'] }, name: { contains: 'ca', mode: 'insensitive' } },
      select: { id: true, name: true, slug: true, type: true },
      orderBy: { name: 'asc' },
      take: 10,
    })
  })

  it('q curto -> 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/tenants/search?q=a' })
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /tenants/search filtros extras', () => {
  it('exclui capi-platform e independente', async () => {
    db.tenant.findMany.mockResolvedValue([])
    await app.inject({ method: 'GET', url: '/tenants/search?q=ca' })
    expect(db.tenant.findMany.mock.calls[0][0].where.slug).toEqual({ notIn: ['independente', 'capi-platform'] })
  })
  it('type=ASSOCIACAO filtra por tipo', async () => {
    db.tenant.findMany.mockResolvedValue([])
    const res = await app.inject({ method: 'GET', url: '/tenants/search?q=ca&type=ASSOCIACAO' })
    expect(res.statusCode).toBe(200)
    expect(db.tenant.findMany.mock.calls[0][0].where.type).toBe('ASSOCIACAO')
  })
  it('type inválido -> 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/tenants/search?q=ca&type=XYZ' })
    expect(res.statusCode).toBe(400)
  })
})

describe('POST /tenants/signup tipo', () => {
  it('aceita type ASSOCIACAO e padrão AGENCIA', async () => {
    db.tenant.create.mockResolvedValue({ id: 'tn' })
    const base = { name: 'Assoc', slug: 'assoc', email: 'a@a.com', password: '12345678', cnpj: '12345678000199' }
    expect((await app.inject({ method: 'POST', url: '/tenants/signup', payload: { ...base, type: 'ASSOCIACAO' } })).statusCode).toBe(201)
    expect(db.tenant.create.mock.calls[0][0].data.type).toBe('ASSOCIACAO')
    await app.inject({ method: 'POST', url: '/tenants/signup', payload: base })
    expect(db.tenant.create.mock.calls[1][0].data.type).toBe('AGENCIA')
  })
})
