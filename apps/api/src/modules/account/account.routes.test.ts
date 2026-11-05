import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'

vi.mock('../../database', () => {
  const db: any = {
    user: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    guideProfile: { update: vi.fn() },
    refreshToken: { updateMany: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  }
  db.$transaction = vi.fn(async (fn: any) => fn(db))
  return { default: db }
})

const sendEmail = vi.hoisted(() => vi.fn())
vi.mock('../../shared/email', () => ({
  getResend: () => ({ emails: { send: sendEmail } }),
  getEmailFrom: () => 'CAPI <noreply@test>',
}))

vi.mock('../uploads/replaced-photo', () => ({ deleteReplacedPhoto: vi.fn().mockResolvedValue(undefined) }))

vi.mock('bcryptjs', () => ({
  compareSync: vi.fn(),
  hashSync: vi.fn().mockReturnValue('novo-hash'),
}))

import { createHash } from 'crypto'
import { Prisma } from '@prisma/client'
import { compareSync, hashSync } from 'bcryptjs'
import { buildApp } from '../../__tests__/helpers/build-app'
import { accountRoutes } from './account.routes'
import { deleteReplacedPhoto } from '../uploads/replaced-photo'
import prisma from '../../database'

const db = prisma as any
const mockCompare = compareSync as unknown as ReturnType<typeof vi.fn>
const app = buildApp(accountRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())
beforeEach(() => {
  vi.clearAllMocks()
  db.$transaction.mockImplementation(async (fn: any) => fn(db))
  db.auditLog.create.mockResolvedValue({})
  sendEmail.mockResolvedValue({})
})

const tenant = { id: 'tenant-a', slug: 'agencia-a', name: 'Agência A', logoUrl: null, type: 'AGENCIA' }

function auth(role: string) {
  const t = app.jwt.sign({ sub: 'user-1', role, tenantId: 'tenant-a', name: 'Teste', approvalStatus: 'APPROVED' })
  return { authorization: `Bearer ${t}` }
}

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    name: 'Maria',
    email: 'maria@x.com',
    role: 'ADMIN',
    photoUrl: 'https://cdn.x/avatars/u.jpg',
    guideProfile: null,
    tenant,
    ...overrides,
  }
}

describe('GET /account/me', () => {
  it('sem token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/account/me' })
    expect(res.statusCode).toBe(401)
  })

  it('ADMIN → User.photoUrl e dados do tenant', async () => {
    db.user.findUnique.mockResolvedValue(userRow())
    const res = await app.inject({ method: 'GET', url: '/account/me', headers: auth('ADMIN') })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({
      id: 'user-1',
      name: 'Maria',
      email: 'maria@x.com',
      role: 'ADMIN',
      photoUrl: 'https://cdn.x/avatars/u.jpg',
      tenant,
    })
  })

  it('CONDUTOR com perfil → foto do GuideProfile', async () => {
    db.user.findUnique.mockResolvedValue(
      userRow({ role: 'CONDUTOR', photoUrl: null, guideProfile: { photoUrl: 'https://cdn.x/guides/g.jpg' } }),
    )
    const res = await app.inject({ method: 'GET', url: '/account/me', headers: auth('CONDUTOR') })
    expect(res.json().photoUrl).toBe('https://cdn.x/guides/g.jpg')
  })
})

describe('PATCH /account/me', () => {
  it('nome curto → 400 sem update', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/account/me', headers: auth('ADMIN'), payload: { name: ' a ' } })
    expect(res.statusCode).toBe(400)
    expect(db.user.update).not.toHaveBeenCalled()
  })

  it('photoUrl inválida → 400', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/account/me', headers: auth('ADMIN'), payload: { photoUrl: 'nao-url' } })
    expect(res.statusCode).toBe(400)
  })

  it('photoUrl http (não https) → 400', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/account/me',
      headers: auth('ADMIN'),
      payload: { photoUrl: 'http://cdn.x/avatars/u.jpg' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('photoUrl com mais de 2048 caracteres → 400', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/account/me',
      headers: auth('ADMIN'),
      payload: { photoUrl: `https://cdn.x/${'a'.repeat(2048)}` },
    })
    expect(res.statusCode).toBe(400)
  })

  describe('com R2_PUBLIC_URL configurada', () => {
    beforeEach(() => vi.stubEnv('R2_PUBLIC_URL', 'https://pub.r2.dev'))
    afterEach(() => vi.unstubAllEnvs())

    it('host diferente do R2 → 400', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/account/me',
        headers: auth('ADMIN'),
        payload: { photoUrl: 'https://evil.example/avatars/u.jpg' },
      })
      expect(res.statusCode).toBe(400)
      expect(db.user.update).not.toHaveBeenCalled()
    })

    it('host do R2 → 200', async () => {
      db.user.findUnique.mockResolvedValue(userRow())
      const res = await app.inject({
        method: 'PATCH',
        url: '/account/me',
        headers: auth('ADMIN'),
        payload: { photoUrl: 'https://pub.r2.dev/avatars/novo.jpg' },
      })
      expect(res.statusCode).toBe(200)
    })
  })

  it('ADMIN → grava nome (trim) e foto no User', async () => {
    db.user.findUnique.mockResolvedValue(userRow())
    const res = await app.inject({
      method: 'PATCH',
      url: '/account/me',
      headers: auth('ADMIN'),
      payload: { name: '  Maria Silva ', photoUrl: null },
    })
    expect(res.statusCode).toBe(200)
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' }, data: { name: 'Maria Silva', photoUrl: null } }),
    )
    expect(db.guideProfile.update).not.toHaveBeenCalled()
    expect(res.json()).toHaveProperty('tenant')
    // foto removida → tenta apagar a anterior
    expect(deleteReplacedPhoto).toHaveBeenCalledWith('https://cdn.x/avatars/u.jpg', null, expect.anything())
  })

  it('troca de foto → tenta apagar a anterior (best-effort)', async () => {
    db.user.findUnique.mockResolvedValue(userRow())
    await app.inject({
      method: 'PATCH',
      url: '/account/me',
      headers: auth('ADMIN'),
      payload: { photoUrl: 'https://cdn.x/avatars/novo.jpg' },
    })
    expect(deleteReplacedPhoto).toHaveBeenCalledWith(
      'https://cdn.x/avatars/u.jpg',
      'https://cdn.x/avatars/novo.jpg',
      expect.anything(),
    )
  })

  it('só nome → não mexe em fotos', async () => {
    db.user.findUnique.mockResolvedValue(userRow())
    await app.inject({ method: 'PATCH', url: '/account/me', headers: auth('ADMIN'), payload: { name: 'Maria Silva' } })
    expect(deleteReplacedPhoto).not.toHaveBeenCalled()
  })

  it('CONDUTOR com perfil → foto vai para o GuideProfile, não para o User', async () => {
    db.user.findUnique.mockResolvedValue(
      userRow({ role: 'CONDUTOR', guideProfile: { photoUrl: 'https://cdn.x/guides/antiga.jpg' } }),
    )
    const res = await app.inject({
      method: 'PATCH',
      url: '/account/me',
      headers: auth('CONDUTOR'),
      payload: { photoUrl: 'https://cdn.x/guides/novo.jpg' },
    })
    expect(res.statusCode).toBe(200)
    expect(db.guideProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' }, data: { photoUrl: 'https://cdn.x/guides/novo.jpg' } }),
    )
    expect(db.user.update).not.toHaveBeenCalled()
    expect(deleteReplacedPhoto).toHaveBeenCalledWith(
      'https://cdn.x/guides/antiga.jpg',
      'https://cdn.x/guides/novo.jpg',
      expect.anything(),
    )
  })

  it('CONDUTOR sem perfil → foto vai para o User', async () => {
    db.user.findUnique.mockResolvedValue(userRow({ role: 'CONDUTOR', guideProfile: null }))
    await app.inject({
      method: 'PATCH',
      url: '/account/me',
      headers: auth('CONDUTOR'),
      payload: { photoUrl: 'https://cdn.x/avatars/novo.jpg' },
    })
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { photoUrl: 'https://cdn.x/avatars/novo.jpg' } }),
    )
    expect(db.guideProfile.update).not.toHaveBeenCalled()
  })
})

describe('POST /account/password', () => {
  it('nova senha curta → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/account/password',
      headers: auth('CLIENTE'),
      payload: { currentPassword: 'x', newPassword: '123' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('senha atual errada → 400 sem alterar nada', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'user-1', password: 'hash' })
    mockCompare.mockReturnValue(false)
    const res = await app.inject({
      method: 'POST',
      url: '/account/password',
      headers: auth('CLIENTE'),
      payload: { currentPassword: 'errada', newPassword: 'novasenha123' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().message).toBe('Senha atual incorreta')
    expect(db.user.update).not.toHaveBeenCalled()
    expect(db.refreshToken.updateMany).not.toHaveBeenCalled()
    expect(db.auditLog.create).not.toHaveBeenCalled()
  })

  it('senha correta → 204, grava hash, revoga refresh tokens e audita', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'user-1', password: 'hash' })
    mockCompare.mockReturnValue(true)
    const res = await app.inject({
      method: 'POST',
      url: '/account/password',
      headers: auth('CLIENTE'),
      payload: { currentPassword: 'certa', newPassword: 'novasenha123' },
    })
    expect(res.statusCode).toBe(204)
    expect(hashSync).toHaveBeenCalledWith('novasenha123', 10)
    expect(db.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { password: 'novo-hash' } }))
    expect(db.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    })
    // tokens rotacionados perdem a janela de tolerância
    expect(db.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', replacedAt: { not: null } },
      data: { replacedAt: null },
    })
    expect(db.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'account.password_changed',
        targetType: 'USER',
        targetId: 'user-1',
        ipAddress: expect.any(String),
        metadata: { actorUserId: 'user-1' },
      }),
    })
  })
})

describe('POST /account/email', () => {
  const ok = { password: 'certa', newEmail: '  Novo@X.com ' }

  it('senha errada → 400 sem gravar pendência', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'maria@x.com', password: 'hash' })
    mockCompare.mockReturnValue(false)
    const res = await app.inject({
      method: 'POST',
      url: '/account/email',
      headers: auth('ADMIN'),
      payload: { password: 'errada', newEmail: 'novo@x.com' },
    })
    expect(res.statusCode).toBe(400)
    expect(db.user.update).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('e-mail inválido → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/account/email',
      headers: auth('ADMIN'),
      payload: { password: 'x', newEmail: 'nao-email' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('e-mail já usado → 409 sem enviar código', async () => {
    db.user.findUnique
      .mockResolvedValueOnce({ id: 'user-1', email: 'maria@x.com', password: 'hash' })
      .mockResolvedValueOnce({ id: 'outro' })
    mockCompare.mockReturnValue(true)
    const res = await app.inject({ method: 'POST', url: '/account/email', headers: auth('ADMIN'), payload: ok })
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('E-mail já cadastrado')
    expect(db.user.update).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('mesmo e-mail atual → 400', async () => {
    db.user.findUnique.mockResolvedValueOnce({ id: 'user-1', email: 'novo@x.com', password: 'hash' })
    mockCompare.mockReturnValue(true)
    const res = await app.inject({ method: 'POST', url: '/account/email', headers: auth('ADMIN'), payload: ok })
    expect(res.statusCode).toBe(400)
  })

  it('ok → 202, grava pendência com hash do código e envia código ao NOVO e-mail; e-mail atual não muda', async () => {
    db.user.findUnique
      .mockResolvedValueOnce({ id: 'user-1', email: 'maria@x.com', password: 'hash' })
      .mockResolvedValueOnce(null)
    mockCompare.mockReturnValue(true)
    const before = Date.now()
    const res = await app.inject({ method: 'POST', url: '/account/email', headers: auth('ADMIN'), payload: ok })
    expect(res.statusCode).toBe(202)
    expect(res.json()).toEqual({ pendingEmail: 'novo@x.com' })

    const data = db.user.update.mock.calls[0][0].data
    expect(data.pendingEmail).toBe('novo@x.com')
    expect(data.emailChangeAttempts).toBe(0)
    expect(data).not.toHaveProperty('email')
    const ttl = data.emailChangeExpiresAt.getTime() - before
    expect(ttl).toBeGreaterThan(14 * 60 * 1000)
    expect(ttl).toBeLessThanOrEqual(15 * 60 * 1000 + 1000)

    expect(sendEmail).toHaveBeenCalledTimes(1)
    const mail = sendEmail.mock.calls[0][0]
    expect(mail.to).toBe('novo@x.com')
    const code = /<strong>(\d{6})<\/strong>/.exec(mail.html)![1]
    expect(data.emailChangeCodeHash).toBe(createHash('sha256').update(`user-1:${code}`).digest('hex'))
    expect(db.refreshToken.updateMany).not.toHaveBeenCalled()
  })
})

describe('POST /account/email/confirm', () => {
  const code = '123456'
  const codeHash = createHash('sha256').update(`user-1:${code}`).digest('hex')

  function pending(overrides: Record<string, unknown> = {}) {
    return {
      id: 'user-1',
      email: 'maria@x.com',
      pendingEmail: 'novo@x.com',
      emailChangeCodeHash: codeHash,
      emailChangeExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      ...overrides,
    }
  }

  function confirm(payload: unknown) {
    return app.inject({ method: 'POST', url: '/account/email/confirm', headers: auth('ADMIN'), payload })
  }

  it('sem token → 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/account/email/confirm', payload: { code } })
    expect(res.statusCode).toBe(401)
  })

  it('código mal formatado → 400', async () => {
    const res = await confirm({ code: '12ab' })
    expect(res.statusCode).toBe(400)
    expect(db.user.findUnique).not.toHaveBeenCalled()
  })

  it('sem troca pendente → 400', async () => {
    db.user.findUnique.mockResolvedValue(pending({ pendingEmail: null, emailChangeCodeHash: null, emailChangeExpiresAt: null }))
    const res = await confirm({ code })
    expect(res.statusCode).toBe(400)
    expect(res.json().message).toBe('Nenhuma troca de e-mail pendente')
  })

  it('expirado → 400 e invalida a pendência', async () => {
    db.user.findUnique.mockResolvedValue(pending({ emailChangeExpiresAt: new Date(Date.now() - 1000) }))
    const res = await confirm({ code })
    expect(res.statusCode).toBe(400)
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ pendingEmail: null, emailChangeCodeHash: null }) }),
    )
    expect(db.user.updateMany).not.toHaveBeenCalled()
  })

  it('código errado → 400 e conta tentativa', async () => {
    db.user.findUnique.mockResolvedValue(pending())
    db.user.update.mockResolvedValueOnce({ emailChangeAttempts: 1 })
    const res = await confirm({ code: '000000' })
    expect(res.statusCode).toBe(400)
    expect(res.json().message).toBe('Código incorreto')
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { emailChangeAttempts: { increment: 1 } } }),
    )
    expect(db.user.updateMany).not.toHaveBeenCalled()
  })

  it('5ª tentativa errada → invalida a pendência', async () => {
    db.user.findUnique.mockResolvedValue(pending())
    db.user.update.mockResolvedValueOnce({ emailChangeAttempts: 5 })
    const res = await confirm({ code: '000000' })
    expect(res.statusCode).toBe(400)
    expect(db.user.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ pendingEmail: null }) }),
    )
  })

  it('acima de 5 tentativas → 400 mesmo com código certo', async () => {
    db.user.findUnique.mockResolvedValue(pending())
    db.user.update.mockResolvedValueOnce({ emailChangeAttempts: 6 })
    const res = await confirm({ code })
    expect(res.statusCode).toBe(400)
    expect(res.json().message).toMatch(/Muitas tentativas/)
    expect(db.user.updateMany).not.toHaveBeenCalled()
  })

  it('código certo → 200, troca e-mail, limpa pendência, revoga tokens, avisa e-mail antigo e audita', async () => {
    db.user.findUnique.mockResolvedValue(pending())
    db.user.update.mockResolvedValueOnce({ emailChangeAttempts: 1 })
    db.user.updateMany.mockResolvedValue({ count: 1 })
    const res = await confirm({ code: ` ${code} ` })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ email: 'novo@x.com' })
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', pendingEmail: 'novo@x.com', emailChangeCodeHash: codeHash },
      data: {
        email: 'novo@x.com',
        pendingEmail: null,
        emailChangeCodeHash: null,
        emailChangeExpiresAt: null,
        emailChangeAttempts: 0,
      },
    })
    expect(db.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    })
    expect(db.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', replacedAt: { not: null } },
      data: { replacedAt: null },
    })
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'maria@x.com' }))
    expect(sendEmail.mock.calls[0][0].html).toContain('Seu e-mail de acesso foi alterado')

    const audit = db.auditLog.create.mock.calls[0][0].data
    expect(audit).toMatchObject({ action: 'account.email_changed', targetType: 'USER', targetId: 'user-1' })
    expect(JSON.stringify(audit.metadata)).not.toMatch(/@/)
  })

  it('confirmação concorrente já efetivada (updateMany count 0) → 400', async () => {
    db.user.findUnique.mockResolvedValue(pending())
    db.user.update.mockResolvedValueOnce({ emailChangeAttempts: 1 })
    db.user.updateMany.mockResolvedValue({ count: 0 })
    const res = await confirm({ code })
    expect(res.statusCode).toBe(400)
    expect(db.refreshToken.updateMany).not.toHaveBeenCalled()
  })

  it('e-mail tomado entre o pedido e a confirmação (P2002) → 409 e invalida pendência', async () => {
    db.user.findUnique.mockResolvedValue(pending())
    db.user.update.mockResolvedValueOnce({ emailChangeAttempts: 1 })
    db.user.updateMany.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', { code: 'P2002', clientVersion: 'x' }),
    )
    const res = await confirm({ code })
    expect(res.statusCode).toBe(409)
    expect(res.json().message).toBe('E-mail já cadastrado')
    expect(db.user.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ pendingEmail: null }) }),
    )
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('falha ao avisar o e-mail antigo não derruba a troca', async () => {
    db.user.findUnique.mockResolvedValue(pending())
    db.user.update.mockResolvedValueOnce({ emailChangeAttempts: 1 })
    db.user.updateMany.mockResolvedValue({ count: 1 })
    sendEmail.mockRejectedValueOnce(new Error('resend down'))
    const res = await confirm({ code })
    expect(res.statusCode).toBe(200)
  })
})
