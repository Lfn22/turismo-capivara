# Área do Turista — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the tourist (CLIENTE) dashboard at `/minha-conta/` with trip management, favorites, reviews, and profile editing.

**Architecture:** New API module `/me` with authenticated CLIENTE-only endpoints. New Next.js route group `(turista)` with mobile-first layout (bottom nav → sidebar on desktop). Prisma Favorite model for wishlist. Reuses existing auth (JWT + NextAuth), Booking, and Review models.

**Tech Stack:** Fastify 5 + Prisma 7 (API), Next.js 16.2 + React 19 (Web), Vitest + Testing Library (tests), CSS-in-JSX with CAPI design tokens.

---

## Task 1: Prisma Schema — Favorite model + seed tenant CAPI

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Add Favorite model to schema**

Add at the end of `schema.prisma`, before closing:

```prisma
model Favorite {
  id            String       @id @default(cuid())
  userId        String
  packageId     String?
  destinationId String?
  createdAt     DateTime     @default(now())

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  package     TourPackage? @relation(fields: [packageId], references: [id], onDelete: Cascade)
  destination Destination? @relation(fields: [destinationId], references: [id], onDelete: Cascade)

  @@unique([userId, packageId])
  @@unique([userId, destinationId])
  @@index([userId])
}
```

- [ ] **Step 2: Add relation fields to existing models**

In the `User` model, add:

```prisma
  favorites Favorite[]
```

In the `TourPackage` model, add:

```prisma
  favorites Favorite[]
```

In the `Destination` model, add:

```prisma
  favorites Favorite[]
```

- [ ] **Step 3: Add tenant CAPI to seed**

In `apps/api/prisma/seed.ts`, add a block to upsert the platform tenant:

```typescript
const capiTenant = await prisma.tenant.upsert({
  where: { slug: 'capi' },
  update: {},
  create: {
    name: 'CAPI Plataforma',
    slug: 'capi',
  },
})
console.log('Tenant plataforma:', capiTenant.slug)
```

- [ ] **Step 4: Run migration and generate**

Run:

```bash
cd apps/api && npx prisma migrate dev --name add-favorite-model
```

Expected: Migration created, Prisma client regenerated.

- [ ] **Step 5: Run seed**

Run:

```bash
cd apps/api && npx prisma db seed
```

Expected: "Tenant plataforma: capi" in output.

---

## Task 2: API — /me/bookings endpoints

**Files:**

- Create: `apps/api/src/modules/me/me.routes.ts`
- Create: `apps/api/src/modules/me/__tests__/me-bookings.test.ts`
- Modify: `apps/api/src/app.ts` (register route)

- [ ] **Step 1: Write failing tests for /me/bookings**

Create `apps/api/src/modules/me/__tests__/me-bookings.test.ts`:

```typescript
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'

vi.mock('../../../database', () => {
  const db: any = {
    booking: { findMany: vi.fn(), findFirst: vi.fn() },
  }
  return { default: db }
})

import { buildApp } from '../../../__tests__/helpers/build-app'
import { meRoutes } from '../me.routes'
import prisma from '../../../database'

const db = prisma as any
const app = buildApp(meRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())

function clienteAuth() {
  const t = app.jwt.sign({
    sub: 'user-1',
    role: 'CLIENTE',
    tenantId: 'tenant-a',
    name: 'Turista',
    approvalStatus: 'APPROVED',
  })
  return { authorization: `Bearer ${t}` }
}

function guiaAuth() {
  const t = app.jwt.sign({
    sub: 'user-2',
    role: 'CONDUTOR',
    tenantId: 'tenant-b',
    name: 'Guia',
    approvalStatus: 'APPROVED',
  })
  return { authorization: `Bearer ${t}` }
}

describe('GET /me/bookings', () => {
  it('retorna 401 sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/me/bookings' })
    expect(res.statusCode).toBe(401)
  })

  it('retorna 403 para role CONDUTOR', async () => {
    const res = await app.inject({ method: 'GET', url: '/me/bookings', headers: guiaAuth() })
    expect(res.statusCode).toBe(403)
  })

  it('retorna lista paginada de reservas do turista', async () => {
    db.booking.findMany.mockResolvedValue([
      {
        id: 'b1',
        code: 'ABC123',
        status: 'CONFIRMED',
        pax: 2,
        createdAt: new Date('2026-12-01'),
        slot: {
          startsAt: new Date('2026-12-25T09:00:00Z'),
          package: {
            id: 'pkg-1',
            name: 'Trilha da Capivara',
            photos: ['photo.jpg'],
            duration: 3,
            difficulty: 'EASY',
          },
        },
        tenant: { slug: 'aventura', name: 'Aventura Eco' },
      },
    ])

    const res = await app.inject({ method: 'GET', url: '/me/bookings', headers: clienteAuth() })
    expect(res.statusCode).toBe(200)

    const body = res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0]).toMatchObject({
      id: 'b1',
      code: 'ABC123',
      status: 'CONFIRMED',
      packageName: 'Trilha da Capivara',
    })
    expect(body).toHaveProperty('hasMore')
    expect(body).toHaveProperty('nextCursor')
  })
})

describe('GET /me/bookings/:id', () => {
  it('retorna 404 se reserva não pertence ao usuário', async () => {
    db.booking.findFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'GET',
      url: '/me/bookings/b999',
      headers: clienteAuth(),
    })
    expect(res.statusCode).toBe(404)
  })

  it('retorna detalhe completo da reserva', async () => {
    db.booking.findFirst.mockResolvedValue({
      id: 'b1',
      code: 'ABC123',
      status: 'CONFIRMED',
      pax: 2,
      qrCode: 'qr-data',
      customerName: 'Lucas',
      customerPhone: '11999999999',
      createdAt: new Date('2026-12-01'),
      slot: {
        startsAt: new Date('2026-12-25T09:00:00Z'),
        capacity: 10,
        booked: 3,
        package: {
          id: 'pkg-1',
          name: 'Trilha da Capivara',
          photos: ['photo.jpg'],
          duration: 3,
          difficulty: 'EASY',
          meetingPointName: 'Entrada do parque',
          meetingPointLat: -15.5,
          meetingPointLng: -47.8,
          conductor: { name: 'Maria Guia', guideProfile: { photoUrl: 'maria.jpg' } },
        },
      },
      tenant: { slug: 'aventura', name: 'Aventura Eco' },
      review: null,
      voucher: null,
    })

    const res = await app.inject({ method: 'GET', url: '/me/bookings/b1', headers: clienteAuth() })
    expect(res.statusCode).toBe(200)

    const body = res.json()
    expect(body).toMatchObject({
      id: 'b1',
      status: 'CONFIRMED',
      guideName: 'Maria Guia',
      meetingPointName: 'Entrada do parque',
    })
    expect(body).toHaveProperty('qrCode')
    expect(body).toHaveProperty('hasReview')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx vitest run src/modules/me/__tests__/me-bookings.test.ts`
Expected: FAIL — module `../me.routes` not found.

- [ ] **Step 3: Implement /me/bookings route**

Create `apps/api/src/modules/me/me.routes.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import prisma from '../../database'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { parseQuery, parseParams } from '../../shared/utils/zod-error'
import { paginationQuerySchema, paginatedResponse } from '../../shared/utils/pagination'
import { AppError } from '../../shared/errors/AppError'

const bookingIdParamsSchema = z.object({
  id: z.string().min(1),
})

const bookingsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['upcoming', 'past']).optional().default('upcoming'),
})

export async function meRoutes(app: FastifyInstance) {
  // All /me/* routes require CLIENTE role
  app.addHook('onRequest', authenticate)
  app.addHook('onRequest', authorize(['CLIENTE']))

  // GET /me/bookings — lista reservas do turista (cross-tenant)
  app.get('/me/bookings', async (request, reply) => {
    const user = request.user as { sub: string }
    const { data: query, error } = parseQuery(bookingsQuerySchema, request.query, reply)
    if (error) return

    const { status, cursor, limit } = query

    const now = new Date()
    const upcomingStatuses = ['CONFIRMED', 'PENDING', 'CHECKED_IN']
    const pastStatuses = ['COMPLETED', 'CANCELLED', 'NO_SHOW', 'EXPIRED']

    const bookings = await prisma.booking.findMany({
      where: {
        userId: user.sub,
        status: { in: status === 'upcoming' ? upcomingStatuses : pastStatuses },
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        status: true,
        pax: true,
        createdAt: true,
        slot: {
          select: {
            startsAt: true,
            package: {
              select: {
                id: true,
                name: true,
                photos: true,
                duration: true,
                difficulty: true,
              },
            },
          },
        },
        tenant: { select: { slug: true, name: true } },
      },
    })

    const data = bookings.map((b) => ({
      id: b.id,
      code: b.code,
      status: b.status,
      pax: b.pax,
      startsAt: b.slot.startsAt,
      packageId: b.slot.package.id,
      packageName: b.slot.package.name,
      coverImageUrl: b.slot.package.photos[0] ?? null,
      durationHours: b.slot.package.duration,
      difficulty: b.slot.package.difficulty,
      tenantSlug: b.tenant.slug,
      tenantName: b.tenant.name,
      createdAt: b.createdAt,
    }))

    return reply.status(200).send(paginatedResponse(data, limit))
  })

  // GET /me/bookings/:id — detalhe da reserva
  app.get('/me/bookings/:id', async (request, reply) => {
    const user = request.user as { sub: string }
    const { data: params, error } = parseParams(bookingIdParamsSchema, request.params, reply)
    if (error) return

    const booking = await prisma.booking.findFirst({
      where: { id: params.id, userId: user.sub },
      select: {
        id: true,
        code: true,
        status: true,
        pax: true,
        qrCode: true,
        customerName: true,
        customerPhone: true,
        createdAt: true,
        slot: {
          select: {
            startsAt: true,
            capacity: true,
            booked: true,
            package: {
              select: {
                id: true,
                name: true,
                photos: true,
                duration: true,
                difficulty: true,
                meetingPointName: true,
                meetingPointLat: true,
                meetingPointLng: true,
                conductor: {
                  select: {
                    name: true,
                    guideProfile: { select: { photoUrl: true } },
                  },
                },
              },
            },
          },
        },
        tenant: { select: { slug: true, name: true } },
        review: { select: { id: true } },
        voucher: { select: { id: true } },
      },
    })

    if (!booking) throw new AppError('Reserva não encontrada', 404)

    return reply.status(200).send({
      id: booking.id,
      code: booking.code,
      status: booking.status,
      pax: booking.pax,
      qrCode: booking.qrCode,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      startsAt: booking.slot.startsAt,
      packageId: booking.slot.package.id,
      packageName: booking.slot.package.name,
      coverImageUrl: booking.slot.package.photos[0] ?? null,
      durationHours: booking.slot.package.duration,
      difficulty: booking.slot.package.difficulty,
      meetingPointName: booking.slot.package.meetingPointName,
      meetingPointLat: booking.slot.package.meetingPointLat,
      meetingPointLng: booking.slot.package.meetingPointLng,
      guideName: booking.slot.package.conductor?.name ?? null,
      guidePhotoUrl: booking.slot.package.conductor?.guideProfile?.photoUrl ?? null,
      tenantSlug: booking.tenant.slug,
      tenantName: booking.tenant.name,
      hasReview: !!booking.review,
      hasVoucher: !!booking.voucher,
      createdAt: booking.createdAt,
    })
  })
}
```

- [ ] **Step 4: Register route in app.ts**

In `apps/api/src/app.ts`, add import and registration:

```typescript
import { meRoutes } from './modules/me/me.routes'
// ... after other registrations:
app.register(meRoutes)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/api && npx vitest run src/modules/me/__tests__/me-bookings.test.ts`
Expected: All tests PASS.

---

## Task 3: API — /me/favorites CRUD

**Files:**

- Modify: `apps/api/src/modules/me/me.routes.ts`
- Create: `apps/api/src/modules/me/__tests__/me-favorites.test.ts`

- [ ] **Step 1: Write failing tests for favorites**

Create `apps/api/src/modules/me/__tests__/me-favorites.test.ts`:

```typescript
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'

vi.mock('../../../database', () => {
  const db: any = {
    favorite: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
  }
  return { default: db }
})

import { buildApp } from '../../../__tests__/helpers/build-app'
import { meRoutes } from '../me.routes'
import prisma from '../../../database'

const db = prisma as any
const app = buildApp(meRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())

function clienteAuth() {
  const t = app.jwt.sign({
    sub: 'user-1',
    role: 'CLIENTE',
    tenantId: 'tenant-a',
    name: 'Turista',
    approvalStatus: 'APPROVED',
  })
  return { authorization: `Bearer ${t}` }
}

beforeEach(() => vi.clearAllMocks())

describe('GET /me/favorites', () => {
  it('retorna lista de favoritos do turista', async () => {
    db.favorite.findMany.mockResolvedValue([
      {
        id: 'fav-1',
        packageId: 'pkg-1',
        destinationId: null,
        createdAt: new Date('2026-12-01'),
        package: {
          id: 'pkg-1',
          name: 'Trilha',
          photos: ['p.jpg'],
          price: 5000,
          duration: 3,
          difficulty: 'EASY',
          tenant: { slug: 'eco' },
        },
        destination: null,
      },
    ])

    const res = await app.inject({ method: 'GET', url: '/me/favorites', headers: clienteAuth() })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveLength(1)
    expect(res.json().data[0]).toHaveProperty('packageName', 'Trilha')
  })
})

describe('POST /me/favorites', () => {
  it('cria favorito de pacote', async () => {
    db.favorite.create.mockResolvedValue({
      id: 'fav-new',
      packageId: 'pkg-1',
      destinationId: null,
      createdAt: new Date(),
    })

    const res = await app.inject({
      method: 'POST',
      url: '/me/favorites',
      headers: clienteAuth(),
      payload: { packageId: 'pkg-1' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toHaveProperty('id', 'fav-new')
  })

  it('retorna 400 sem packageId nem destinationId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/me/favorites',
      headers: clienteAuth(),
      payload: {},
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('DELETE /me/favorites/:id', () => {
  it('remove favorito do próprio turista', async () => {
    db.favorite.findFirst.mockResolvedValue({ id: 'fav-1', userId: 'user-1' })
    db.favorite.delete.mockResolvedValue({})

    const res = await app.inject({
      method: 'DELETE',
      url: '/me/favorites/fav-1',
      headers: clienteAuth(),
    })
    expect(res.statusCode).toBe(204)
  })

  it('retorna 404 se favorito não pertence ao usuário', async () => {
    db.favorite.findFirst.mockResolvedValue(null)

    const res = await app.inject({
      method: 'DELETE',
      url: '/me/favorites/fav-999',
      headers: clienteAuth(),
    })
    expect(res.statusCode).toBe(404)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx vitest run src/modules/me/__tests__/me-favorites.test.ts`
Expected: FAIL — routes not yet defined.

- [ ] **Step 3: Add favorites endpoints to me.routes.ts**

Add these routes inside the `meRoutes` function in `apps/api/src/modules/me/me.routes.ts`:

```typescript
const createFavoriteBodySchema = z
  .object({
    packageId: z.string().min(1).optional(),
    destinationId: z.string().min(1).optional(),
  })
  .refine((d) => d.packageId || d.destinationId, {
    message: 'Informe packageId ou destinationId',
  })

const favoriteIdParamsSchema = z.object({
  id: z.string().min(1),
})

// GET /me/favorites
app.get('/me/favorites', async (request, reply) => {
  const user = request.user as { sub: string }
  const { data: query, error } = parseQuery(paginationQuerySchema, request.query, reply)
  if (error) return

  const { cursor, limit } = query

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.sub },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      packageId: true,
      destinationId: true,
      createdAt: true,
      package: {
        select: {
          id: true,
          name: true,
          photos: true,
          price: true,
          duration: true,
          difficulty: true,
          tenant: { select: { slug: true } },
        },
      },
      destination: {
        select: {
          id: true,
          title: true,
          slug: true,
          heroImageUrl: true,
          state: true,
        },
      },
    },
  })

  const data = favorites.map((f) => ({
    id: f.id,
    type: f.packageId ? ('package' as const) : ('destination' as const),
    packageId: f.packageId,
    destinationId: f.destinationId,
    packageName: f.package?.name ?? null,
    packageCoverUrl: f.package?.photos[0] ?? null,
    packagePrice: f.package ? Number(f.package.price) : null,
    packageDuration: f.package?.duration ?? null,
    packageDifficulty: f.package?.difficulty ?? null,
    packageTenantSlug: f.package?.tenant.slug ?? null,
    destinationTitle: f.destination?.title ?? null,
    destinationSlug: f.destination?.slug ?? null,
    destinationImageUrl: f.destination?.heroImageUrl ?? null,
    destinationState: f.destination?.state ?? null,
    createdAt: f.createdAt,
  }))

  return reply.status(200).send(paginatedResponse(data, limit))
})

// POST /me/favorites
app.post('/me/favorites', async (request, reply) => {
  const user = request.user as { sub: string }
  const { data: body, error } = parseBody(createFavoriteBodySchema, request.body, reply)
  if (error) return

  try {
    const favorite = await prisma.favorite.create({
      data: {
        userId: user.sub,
        packageId: body.packageId ?? null,
        destinationId: body.destinationId ?? null,
      },
      select: { id: true, packageId: true, destinationId: true, createdAt: true },
    })

    return reply.status(201).send(favorite)
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw new AppError('Já está nos favoritos', 409)
    }
    throw err
  }
})

// DELETE /me/favorites/:id
app.delete('/me/favorites/:id', async (request, reply) => {
  const user = request.user as { sub: string }
  const { data: params, error } = parseParams(favoriteIdParamsSchema, request.params, reply)
  if (error) return

  const favorite = await prisma.favorite.findFirst({
    where: { id: params.id, userId: user.sub },
  })

  if (!favorite) throw new AppError('Favorito não encontrado', 404)

  await prisma.favorite.delete({ where: { id: params.id } })

  return reply.status(204).send()
})
```

Also add `parseBody` to the import at the top:

```typescript
import { parseQuery, parseParams, parseBody } from '../../shared/utils/zod-error'
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/api && npx vitest run src/modules/me/__tests__/me-favorites.test.ts`
Expected: All tests PASS.

---

## Task 4: API — /me/reviews + /me/profile

**Files:**

- Modify: `apps/api/src/modules/me/me.routes.ts`
- Create: `apps/api/src/modules/me/__tests__/me-reviews.test.ts`
- Create: `apps/api/src/modules/me/__tests__/me-profile.test.ts`

- [ ] **Step 1: Write failing tests for reviews**

Create `apps/api/src/modules/me/__tests__/me-reviews.test.ts`:

```typescript
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'

vi.mock('../../../database', () => {
  const db: any = {
    booking: { findFirst: vi.fn() },
    review: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    guideProfile: { findUnique: vi.fn() },
  }
  return { default: db }
})

import { buildApp } from '../../../__tests__/helpers/build-app'
import { meRoutes } from '../me.routes'
import prisma from '../../../database'

const db = prisma as any
const app = buildApp(meRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())
beforeEach(() => vi.clearAllMocks())

function clienteAuth() {
  const t = app.jwt.sign({
    sub: 'user-1',
    role: 'CLIENTE',
    tenantId: 'tenant-a',
    name: 'Turista',
    approvalStatus: 'APPROVED',
  })
  return { authorization: `Bearer ${t}` }
}

describe('POST /me/reviews', () => {
  it('cria avaliação para booking COMPLETED', async () => {
    db.booking.findFirst.mockResolvedValue({
      id: 'b1',
      status: 'COMPLETED',
      tenantId: 'tenant-x',
      customerName: 'Lucas',
      customerEmail: 'lucas@test.com',
      slot: { package: { conductorId: 'guide-user-1' } },
    })
    db.review.findUnique.mockResolvedValue(null)
    db.guideProfile.findUnique.mockResolvedValue({ id: 'gp-1', userId: 'guide-user-1' })
    db.review.create.mockResolvedValue({
      id: 'rev-1',
      rating: 5,
      comment: 'Excelente!',
      createdAt: new Date(),
    })

    const res = await app.inject({
      method: 'POST',
      url: '/me/reviews',
      headers: clienteAuth(),
      payload: { bookingId: 'b1', rating: 5, comment: 'Excelente!' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json()).toHaveProperty('id', 'rev-1')
  })

  it('retorna 422 se booking não está COMPLETED', async () => {
    db.booking.findFirst.mockResolvedValue({
      id: 'b2',
      status: 'CONFIRMED',
      slot: { package: { conductorId: 'g1' } },
    })

    const res = await app.inject({
      method: 'POST',
      url: '/me/reviews',
      headers: clienteAuth(),
      payload: { bookingId: 'b2', rating: 4 },
    })
    expect(res.statusCode).toBe(422)
  })

  it('retorna 409 se já avaliou', async () => {
    db.booking.findFirst.mockResolvedValue({
      id: 'b3',
      status: 'COMPLETED',
      slot: { package: { conductorId: 'g1' } },
    })
    db.review.findUnique.mockResolvedValue({ id: 'existing' })

    const res = await app.inject({
      method: 'POST',
      url: '/me/reviews',
      headers: clienteAuth(),
      payload: { bookingId: 'b3', rating: 3 },
    })
    expect(res.statusCode).toBe(409)
  })
})

describe('GET /me/reviews', () => {
  it('retorna avaliações do turista', async () => {
    db.review.findMany.mockResolvedValue([
      {
        id: 'rev-1',
        rating: 5,
        comment: 'Top',
        createdAt: new Date(),
        booking: { slot: { package: { name: 'Trilha', photos: ['p.jpg'] } } },
      },
    ])

    const res = await app.inject({ method: 'GET', url: '/me/reviews', headers: clienteAuth() })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Write failing tests for profile**

Create `apps/api/src/modules/me/__tests__/me-profile.test.ts`:

```typescript
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'

vi.mock('../../../database', () => {
  const db: any = {
    user: { findUnique: vi.fn(), update: vi.fn() },
  }
  return { default: db }
})

import { buildApp } from '../../../__tests__/helpers/build-app'
import { meRoutes } from '../me.routes'
import prisma from '../../../database'

const db = prisma as any
const app = buildApp(meRoutes)

beforeAll(() => app.ready())
afterAll(() => app.close())
beforeEach(() => vi.clearAllMocks())

function clienteAuth() {
  const t = app.jwt.sign({
    sub: 'user-1',
    role: 'CLIENTE',
    tenantId: 'tenant-a',
    name: 'Turista',
    approvalStatus: 'APPROVED',
  })
  return { authorization: `Bearer ${t}` }
}

describe('GET /me/profile', () => {
  it('retorna dados do perfil', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Lucas',
      email: 'lucas@test.com',
      photoUrl: null,
      cpf: null,
      createdAt: new Date(),
    })

    const res = await app.inject({ method: 'GET', url: '/me/profile', headers: clienteAuth() })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ name: 'Lucas', email: 'lucas@test.com' })
  })
})

describe('PATCH /me/profile', () => {
  it('atualiza nome e retorna perfil atualizado', async () => {
    db.user.update.mockResolvedValue({
      id: 'user-1',
      name: 'Lucas Atualizado',
      email: 'lucas@test.com',
      photoUrl: null,
      cpf: null,
      createdAt: new Date(),
    })

    const res = await app.inject({
      method: 'PATCH',
      url: '/me/profile',
      headers: clienteAuth(),
      payload: { name: 'Lucas Atualizado' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ name: 'Lucas Atualizado' })
  })

  it('retorna 400 com nome vazio', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/me/profile',
      headers: clienteAuth(),
      payload: { name: '' },
    })
    expect(res.statusCode).toBe(400)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd apps/api && npx vitest run src/modules/me/__tests__/`
Expected: FAIL — routes not yet defined.

- [ ] **Step 4: Add reviews and profile endpoints to me.routes.ts**

Add to `me.routes.ts` inside the `meRoutes` function:

```typescript
// --- REVIEWS ---

const createReviewBodySchema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

// POST /me/reviews
app.post('/me/reviews', async (request, reply) => {
  const user = request.user as { sub: string }
  const { data: body, error } = parseBody(createReviewBodySchema, request.body, reply)
  if (error) return

  const booking = await prisma.booking.findFirst({
    where: { id: body.bookingId, userId: user.sub },
    select: {
      id: true,
      status: true,
      tenantId: true,
      customerName: true,
      customerEmail: true,
      slot: { select: { package: { select: { conductorId: true } } } },
    },
  })

  if (!booking) throw new AppError('Reserva não encontrada', 404)
  if (booking.status !== 'COMPLETED') {
    throw new AppError('Só é possível avaliar reservas concluídas', 422)
  }

  const existing = await prisma.review.findUnique({ where: { bookingId: body.bookingId } })
  if (existing) throw new AppError('Esta reserva já foi avaliada', 409)

  const conductorId = booking.slot.package.conductorId
  if (!conductorId) throw new AppError('Guia não encontrado', 404)

  const guideProfile = await prisma.guideProfile.findUnique({ where: { userId: conductorId } })
  if (!guideProfile) throw new AppError('Perfil de guia não encontrado', 404)

  const review = await prisma.review.create({
    data: {
      tenantId: booking.tenantId,
      bookingId: body.bookingId,
      guideId: guideProfile.id,
      rating: body.rating,
      comment: body.comment,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
    },
    select: { id: true, rating: true, comment: true, createdAt: true },
  })

  return reply.status(201).send(review)
})

// GET /me/reviews
app.get('/me/reviews', async (request, reply) => {
  const user = request.user as { sub: string }
  const { data: query, error } = parseQuery(paginationQuerySchema, request.query, reply)
  if (error) return

  const { cursor, limit } = query

  const reviews = await prisma.review.findMany({
    where: { booking: { userId: user.sub } },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      booking: {
        select: {
          slot: {
            select: {
              package: { select: { name: true, photos: true } },
            },
          },
        },
      },
    },
  })

  const data = reviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    packageName: r.booking.slot.package.name,
    packageCoverUrl: r.booking.slot.package.photos[0] ?? null,
    createdAt: r.createdAt,
  }))

  return reply.status(200).send(paginatedResponse(data, limit))
})

// --- PROFILE ---

const updateProfileBodySchema = z.object({
  name: z.string().min(1, { message: 'Nome obrigatório' }).optional(),
  photoUrl: z.string().url().nullable().optional(),
  phone: z.string().min(10).max(15).optional(),
})

const profileSelect = {
  id: true,
  name: true,
  email: true,
  photoUrl: true,
  cpf: true,
  createdAt: true,
}

// GET /me/profile
app.get('/me/profile', async (request, reply) => {
  const user = request.user as { sub: string }

  const profile = await prisma.user.findUnique({
    where: { id: user.sub },
    select: profileSelect,
  })

  if (!profile) throw new AppError('Usuário não encontrado', 404)

  return reply.status(200).send(profile)
})

// PATCH /me/profile
app.patch('/me/profile', async (request, reply) => {
  const user = request.user as { sub: string }
  const { data: body, error } = parseBody(updateProfileBodySchema, request.body, reply)
  if (error) return

  const updated = await prisma.user.update({
    where: { id: user.sub },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.photoUrl !== undefined ? { photoUrl: body.photoUrl } : {}),
    },
    select: profileSelect,
  })

  return reply.status(200).send(updated)
})
```

- [ ] **Step 5: Run all /me tests**

Run: `cd apps/api && npx vitest run src/modules/me/__tests__/`
Expected: All tests PASS.

---

## Task 5: Web — TuristaLayout + navigation components

**Files:**

- Create: `apps/web/app/(turista)/layout.tsx`
- Create: `apps/web/app/(turista)/minha-conta/layout.tsx`
- Create: `apps/web/src/components/turista/TuristaTopNav.tsx`
- Create: `apps/web/src/components/turista/TuristaBottomNav.tsx`
- Create: `apps/web/src/components/turista/__tests__/TuristaBottomNav.test.tsx`

- [ ] **Step 1: Write failing test for TuristaBottomNav**

Create `apps/web/src/components/turista/__tests__/TuristaBottomNav.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TuristaBottomNav from '../TuristaBottomNav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/minha-conta/viagens',
}))

describe('TuristaBottomNav', () => {
  it('renderiza 4 links de navegação', () => {
    render(<TuristaBottomNav />)
    expect(screen.getByText('Viagens')).toBeInTheDocument()
    expect(screen.getByText('Favoritos')).toBeInTheDocument()
    expect(screen.getByText('Explorar')).toBeInTheDocument()
    expect(screen.getByText('Perfil')).toBeInTheDocument()
  })

  it('marca item ativo baseado no pathname', () => {
    render(<TuristaBottomNav />)
    const viagens = screen.getByText('Viagens').closest('a')
    expect(viagens).toHaveAttribute('aria-current', 'page')
  })

  it('links apontam para as rotas corretas', () => {
    render(<TuristaBottomNav />)
    expect(screen.getByText('Viagens').closest('a')).toHaveAttribute('href', '/minha-conta/viagens')
    expect(screen.getByText('Favoritos').closest('a')).toHaveAttribute(
      'href',
      '/minha-conta/favoritos',
    )
    expect(screen.getByText('Explorar').closest('a')).toHaveAttribute('href', '/explorar')
    expect(screen.getByText('Perfil').closest('a')).toHaveAttribute('href', '/minha-conta/perfil')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/components/turista/__tests__/TuristaBottomNav.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create TuristaBottomNav**

Create `apps/web/src/components/turista/TuristaBottomNav.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapPin, Heart, Search, User } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/minha-conta/viagens', label: 'Viagens', icon: MapPin },
  { href: '/minha-conta/favoritos', label: 'Favoritos', icon: Heart },
  { href: '/explorar', label: 'Explorar', icon: Search },
  { href: '/minha-conta/perfil', label: 'Perfil', icon: User },
]

export default function TuristaBottomNav() {
  const pathname = usePathname()

  return (
    <>
      <style>{turistaBottomNavStyles}</style>
      <nav className="turista-bnav" aria-label="Menu do turista">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === '/explorar' ? pathname === '/explorar' : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`turista-bnav__item${active ? ' turista-bnav__item--active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
              <span className="turista-bnav__label">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}

const turistaBottomNavStyles = `
  .turista-bnav {
    display: flex;
    justify-content: space-around;
    align-items: center;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 56px;
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: var(--glass, rgba(255,255,255,0.92));
    -webkit-backdrop-filter: saturate(1.6) blur(16px);
    backdrop-filter: saturate(1.6) blur(16px);
    border-top: 1px solid var(--border);
    z-index: var(--z-sticky, 10);
  }
  .turista-bnav__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 12px;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 11px;
    min-width: 64px;
    transition: color 0.15s;
  }
  .turista-bnav__item--active {
    color: var(--primary);
  }
  .turista-bnav__label {
    font-weight: 500;
  }

  @media (min-width: 1024px) {
    .turista-bnav { display: none; }
  }
`
```

- [ ] **Step 4: Create TuristaTopNav**

Create `apps/web/src/components/turista/TuristaTopNav.tsx`:

```tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'

interface TuristaTopNavProps {
  userName?: string | null
  userPhotoUrl?: string | null
}

export default function TuristaTopNav({ userName, userPhotoUrl }: TuristaTopNavProps) {
  const initials = userName
    ? userName
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?'

  return (
    <>
      <style>{turistaTopNavStyles}</style>
      <header className="turista-topnav">
        <Link href="/" aria-label="CAPI — página inicial" className="turista-topnav__logo">
          <Image src="/images/logo.png" alt="CAPI" width={36} height={32} priority />
        </Link>
        <div className="turista-topnav__avatar" title={userName ?? 'Perfil'}>
          {userPhotoUrl ? (
            <img src={userPhotoUrl} alt="" className="turista-topnav__avatar-img" />
          ) : (
            <span className="turista-topnav__avatar-initials">{initials}</span>
          )}
        </div>
      </header>
    </>
  )
}

const turistaTopNavStyles = `
  .turista-topnav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 56px;
    padding: 0 var(--gutter-mobile);
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .turista-topnav__logo img { height: 32px; width: auto; display: block; }
  .turista-topnav__avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    overflow: hidden;
  }
  .turista-topnav__avatar-img { width: 100%; height: 100%; object-fit: cover; }
  @media (min-width: 640px) {
    .turista-topnav { padding: 0 var(--gutter-tablet); }
  }
  @media (min-width: 1024px) {
    .turista-topnav { padding: 0 var(--space-6); }
  }
`
```

- [ ] **Step 5: Create the turista root layout**

Create `apps/web/app/(turista)/layout.tsx`:

```tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function TuristaRootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const role = (session.user as any)?.role
  if (role !== 'CLIENTE') {
    const slug = (session.user as any)?.tenantSlug
    redirect(slug ? `/${slug}/painel` : '/')
  }

  return <>{children}</>
}
```

- [ ] **Step 6: Create the minha-conta layout with nav**

Create `apps/web/app/(turista)/minha-conta/layout.tsx`:

```tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import TuristaTopNav from '@/src/components/turista/TuristaTopNav'
import TuristaBottomNav from '@/src/components/turista/TuristaBottomNav'

export default async function MinhaContaLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  return (
    <>
      <style>{minhaContaStyles}</style>
      <div className="minhaconta-shell">
        <TuristaTopNav userName={user?.name} userPhotoUrl={user?.photoUrl} />

        {/* Desktop sidebar */}
        <div className="minhaconta-body">
          <aside className="minhaconta-sidebar">
            <TuristaBottomNav />
          </aside>
          <main className="minhaconta-main">
            <div className="minhaconta-main__inner">{children}</div>
          </main>
        </div>

        {/* Mobile bottom nav */}
        <TuristaBottomNav />
      </div>
    </>
  )
}

const minhaContaStyles = `
  .minhaconta-shell {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background: var(--bg-page);
  }
  .minhaconta-body { flex: 1; display: flex; min-height: 0; }
  .minhaconta-sidebar { display: none; }
  .minhaconta-main {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4) var(--gutter-mobile);
    padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px) + var(--space-4));
  }
  .minhaconta-main__inner { max-width: 720px; margin-inline: auto; }

  @media (min-width: 1024px) {
    .minhaconta-sidebar {
      display: flex;
      flex-direction: column;
      width: 220px;
      border-right: 1px solid var(--border);
      background: var(--surface);
      padding: var(--space-4) 0;
    }
    .minhaconta-sidebar .turista-bnav {
      display: flex;
      flex-direction: column;
      position: static;
      height: auto;
      border-top: none;
      background: transparent;
      backdrop-filter: none;
      gap: var(--space-1);
      padding: 0 var(--space-3);
    }
    .minhaconta-sidebar .turista-bnav__item {
      flex-direction: row;
      justify-content: flex-start;
      gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      font-size: 14px;
      min-width: 0;
    }
    .minhaconta-sidebar .turista-bnav__item--active {
      background: var(--bg-muted);
    }
    .minhaconta-main {
      padding: var(--space-6) var(--space-8);
      padding-bottom: var(--space-6);
    }
    .minhaconta-main__inner { max-width: 800px; }
  }
`
```

- [ ] **Step 7: Create redirect page /minha-conta/**

Create `apps/web/app/(turista)/minha-conta/page.tsx`:

```tsx
import { redirect } from 'next/navigation'

export default function MinhaContaPage() {
  redirect('/minha-conta/viagens')
}
```

- [ ] **Step 8: Run TuristaBottomNav test**

Run: `cd apps/web && npx vitest run src/components/turista/__tests__/TuristaBottomNav.test.tsx`
Expected: PASS.

---

## Task 6: Web — /cadastro + /login pages

**Files:**

- Create: `apps/web/app/cadastro/page.tsx`
- Create: `apps/web/app/login/page.tsx`
- Create: `apps/web/src/components/turista/__tests__/CadastroForm.test.tsx`

- [ ] **Step 1: Write failing test for CadastroForm**

Create `apps/web/src/components/turista/__tests__/CadastroForm.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// We'll test the form component directly
import CadastroForm from '../CadastroForm'

describe('CadastroForm', () => {
  it('renderiza campos obrigatórios', () => {
    render(<CadastroForm />)
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirmar senha/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument()
  })

  it('mostra link para login', () => {
    render(<CadastroForm />)
    expect(screen.getByText(/já tem conta/i)).toBeInTheDocument()
  })

  it('exibe erro se senhas não coincidem', async () => {
    render(<CadastroForm />)
    fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: '12345678' } })
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), { target: { value: 'different' } })
    fireEvent.click(screen.getByRole('button', { name: /criar conta/i }))

    expect(await screen.findByText(/senhas não coincidem/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Create CadastroForm component**

Create `apps/web/src/components/turista/CadastroForm.tsx`:

```tsx
'use client'

import { useState, type FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

export default function CadastroForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`${PUBLIC_API_URL}/tenants/capi/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'CLIENTE', name, email, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.message ?? 'Erro ao criar conta')
        setLoading(false)
        return
      }

      // Auto-login after registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        router.push('/minha-conta/viagens')
      } else {
        // Registration succeeded but auto-login failed — redirect to login
        router.push('/login?registered=true')
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{cadastroFormStyles}</style>
      <form className="cadastro-form" onSubmit={handleSubmit}>
        <h1 className="cadastro-form__title">Criar conta</h1>
        <p className="cadastro-form__subtitle">Crie sua conta para explorar e reservar roteiros.</p>

        {error && (
          <div className="cadastro-form__error" role="alert">
            {error}
          </div>
        )}

        <label className="cadastro-form__label" htmlFor="cadastro-name">
          Nome completo
        </label>
        <input
          id="cadastro-name"
          className="cadastro-form__input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label className="cadastro-form__label" htmlFor="cadastro-email">
          Email
        </label>
        <input
          id="cadastro-email"
          className="cadastro-form__input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="cadastro-form__label" htmlFor="cadastro-password">
          Senha
        </label>
        <input
          id="cadastro-password"
          className="cadastro-form__input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />

        <label className="cadastro-form__label" htmlFor="cadastro-confirm">
          Confirmar senha
        </label>
        <input
          id="cadastro-confirm"
          className="cadastro-form__input"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <button className="cadastro-form__button" type="submit" disabled={loading}>
          {loading ? 'Criando...' : 'Criar conta'}
        </button>

        <p className="cadastro-form__link">
          Já tem conta? <Link href="/login">Entrar</Link>
        </p>
      </form>
    </>
  )
}

const cadastroFormStyles = `
  .cadastro-form { max-width: 400px; margin: 0 auto; }
  .cadastro-form__title { font-size: 24px; font-weight: 700; margin-bottom: var(--space-1); }
  .cadastro-form__subtitle { color: var(--text-secondary); margin-bottom: var(--space-6); font-size: 14px; }
  .cadastro-form__error { background: var(--red-50, #fef2f2); color: var(--red-700, #b91c1c); padding: var(--space-3); border-radius: var(--radius-md); font-size: 14px; margin-bottom: var(--space-4); }
  .cadastro-form__label { display: block; font-size: 14px; font-weight: 500; margin-bottom: var(--space-1); margin-top: var(--space-4); }
  .cadastro-form__input { display: block; width: 100%; padding: var(--space-2) var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 14px; background: var(--surface); }
  .cadastro-form__input:focus { outline: 2px solid var(--primary); outline-offset: -1px; }
  .cadastro-form__button { width: 100%; padding: var(--space-3); background: var(--primary); color: white; border: none; border-radius: var(--radius-md); font-size: 14px; font-weight: 600; cursor: pointer; margin-top: var(--space-6); }
  .cadastro-form__button:disabled { opacity: 0.6; cursor: not-allowed; }
  .cadastro-form__link { text-align: center; margin-top: var(--space-4); font-size: 14px; color: var(--text-secondary); }
  .cadastro-form__link a { color: var(--primary); font-weight: 500; }
`
```

- [ ] **Step 3: Create /cadastro page**

Create `apps/web/app/cadastro/page.tsx`:

```tsx
import type { Metadata } from 'next'
import PublicLayout from '@/src/components/layout/PublicLayout'
import CadastroForm from '@/src/components/turista/CadastroForm'

export const metadata: Metadata = {
  title: 'Criar conta — CAPI',
  description: 'Crie sua conta para explorar roteiros e reservar viagens com guias certificados.',
}

export default function CadastroPage() {
  return (
    <PublicLayout>
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-6) var(--gutter-mobile)',
          background: 'var(--bg-page)',
        }}
      >
        <CadastroForm />
      </div>
    </PublicLayout>
  )
}
```

- [ ] **Step 4: Create /login global page**

Create `apps/web/app/login/page.tsx`:

```tsx
'use client'

import { useState, type FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (!result?.ok) {
      setError('Email ou senha incorretos')
      return
    }

    // Fetch session to determine role-based redirect
    const sessionRes = await fetch('/api/auth/session')
    const session = await sessionRes.json()
    const role = session?.user?.role
    const slug = session?.user?.tenantSlug

    if (role === 'CLIENTE') {
      router.push('/minha-conta/viagens')
    } else if (slug) {
      router.push(`/${slug}/painel`)
    } else {
      router.push('/')
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6) var(--gutter-mobile)',
        background: 'var(--bg-page)',
      }}
    >
      <style>{loginStyles}</style>
      <form className="login-form" onSubmit={handleSubmit}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <Link href="/">
            <Image src="/images/logo.png" alt="CAPI" width={48} height={44} />
          </Link>
        </div>

        <h1 className="login-form__title">Entrar</h1>

        {error && (
          <div className="login-form__error" role="alert">
            {error}
          </div>
        )}

        <label className="login-form__label" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          className="login-form__input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="login-form__label" htmlFor="login-password">
          Senha
        </label>
        <input
          id="login-password"
          className="login-form__input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="login-form__button" type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="login-form__link">
          Não tem conta? <Link href="/cadastro">Criar conta</Link>
        </p>
      </form>
    </div>
  )
}

const loginStyles = `
  .login-form { max-width: 400px; width: 100%; }
  .login-form__title { font-size: 24px; font-weight: 700; margin-bottom: var(--space-4); text-align: center; }
  .login-form__error { background: var(--red-50, #fef2f2); color: var(--red-700, #b91c1c); padding: var(--space-3); border-radius: var(--radius-md); font-size: 14px; margin-bottom: var(--space-4); }
  .login-form__label { display: block; font-size: 14px; font-weight: 500; margin-bottom: var(--space-1); margin-top: var(--space-4); }
  .login-form__input { display: block; width: 100%; padding: var(--space-2) var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 14px; background: var(--surface); }
  .login-form__input:focus { outline: 2px solid var(--primary); outline-offset: -1px; }
  .login-form__button { width: 100%; padding: var(--space-3); background: var(--primary); color: white; border: none; border-radius: var(--radius-md); font-size: 14px; font-weight: 600; cursor: pointer; margin-top: var(--space-6); }
  .login-form__button:disabled { opacity: 0.6; cursor: not-allowed; }
  .login-form__link { text-align: center; margin-top: var(--space-4); font-size: 14px; color: var(--text-secondary); }
  .login-form__link a { color: var(--primary); font-weight: 500; }
`
```

- [ ] **Step 5: Run tests**

Run: `cd apps/web && npx vitest run src/components/turista/__tests__/`
Expected: All tests PASS.

---

## Task 7: Web — /minha-conta/viagens (list + detail)

**Files:**

- Create: `apps/web/app/(turista)/minha-conta/viagens/page.tsx`
- Create: `apps/web/app/(turista)/minha-conta/viagens/[id]/page.tsx`
- Create: `apps/web/src/components/turista/BookingCard.tsx`
- Create: `apps/web/src/components/turista/BookingStatusBadge.tsx`
- Create: `apps/web/src/components/turista/ReviewForm.tsx`
- Create: `apps/web/src/components/turista/StarRating.tsx`
- Create: `apps/web/src/components/turista/EmptyState.tsx`
- Create: `apps/web/src/components/turista/__tests__/BookingStatusBadge.test.tsx`
- Create: `apps/web/src/components/turista/__tests__/StarRating.test.tsx`

- [ ] **Step 1: Write tests for BookingStatusBadge and StarRating**

Create `apps/web/src/components/turista/__tests__/BookingStatusBadge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import BookingStatusBadge from '../BookingStatusBadge'

describe('BookingStatusBadge', () => {
  it.each([
    ['PENDING', 'Pendente'],
    ['CONFIRMED', 'Confirmada'],
    ['COMPLETED', 'Concluída'],
    ['CANCELLED', 'Cancelada'],
    ['CHECKED_IN', 'Check-in'],
    ['NO_SHOW', 'Ausente'],
    ['EXPIRED', 'Expirada'],
  ])('exibe label para status %s', (status, label) => {
    render(<BookingStatusBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
```

Create `apps/web/src/components/turista/__tests__/StarRating.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import StarRating from '../StarRating'

describe('StarRating', () => {
  it('renderiza 5 estrelas', () => {
    render(<StarRating value={0} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(5)
  })

  it('chama onChange ao clicar em uma estrela', () => {
    const onChange = vi.fn()
    render(<StarRating value={0} onChange={onChange} />)
    fireEvent.click(screen.getAllByRole('button')[2])
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('marca estrelas preenchidas até o valor', () => {
    render(<StarRating value={3} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
    expect(buttons[2]).toHaveAttribute('aria-pressed', 'true')
    expect(buttons[3]).toHaveAttribute('aria-pressed', 'false')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && npx vitest run src/components/turista/__tests__/BookingStatusBadge.test.tsx src/components/turista/__tests__/StarRating.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Create BookingStatusBadge**

Create `apps/web/src/components/turista/BookingStatusBadge.tsx`:

```tsx
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pendente', className: 'bsb--warning' },
  CONFIRMED: { label: 'Confirmada', className: 'bsb--success' },
  CHECKED_IN: { label: 'Check-in', className: 'bsb--info' },
  COMPLETED: { label: 'Concluída', className: 'bsb--muted' },
  CANCELLED: { label: 'Cancelada', className: 'bsb--danger' },
  NO_SHOW: { label: 'Ausente', className: 'bsb--muted-dark' },
  EXPIRED: { label: 'Expirada', className: 'bsb--muted-dark' },
}

export default function BookingStatusBadge({ status }: { status: string }) {
  const info = STATUS_MAP[status] ?? { label: status, className: 'bsb--muted' }
  return (
    <>
      <style>{bsbStyles}</style>
      <span className={`bsb ${info.className}`}>{info.label}</span>
    </>
  )
}

const bsbStyles = `
  .bsb { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; }
  .bsb--warning { background: #fef3c7; color: #92400e; }
  .bsb--success { background: #dcfce7; color: #166534; }
  .bsb--info { background: #dbeafe; color: #1e40af; }
  .bsb--muted { background: #f3f4f6; color: #6b7280; }
  .bsb--muted-dark { background: #e5e7eb; color: #4b5563; }
  .bsb--danger { background: #fee2e2; color: #991b1b; }
`
```

- [ ] **Step 4: Create StarRating**

Create `apps/web/src/components/turista/StarRating.tsx`:

```tsx
'use client'

import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number
  onChange: (rating: number) => void
  disabled?: boolean
}

export default function StarRating({ value, onChange, disabled }: StarRatingProps) {
  return (
    <div className="star-rating" style={{ display: 'flex', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !disabled && onChange(star)}
          aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
          aria-pressed={star <= value}
          disabled={disabled}
          style={{
            background: 'none',
            border: 'none',
            cursor: disabled ? 'default' : 'pointer',
            padding: '2px',
          }}
        >
          <Star
            size={24}
            fill={star <= value ? '#f59e0b' : 'none'}
            color={star <= value ? '#f59e0b' : '#d1d5db'}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create EmptyState**

Create `apps/web/src/components/turista/EmptyState.tsx`:

```tsx
import Link from 'next/link'

interface EmptyStateProps {
  title: string
  description: string
  ctaLabel?: string
  ctaHref?: string
}

export default function EmptyState({ title, description, ctaLabel, ctaHref }: EmptyStateProps) {
  return (
    <>
      <style>{emptyStyles}</style>
      <div className="empty-state">
        <div className="empty-state__icon" aria-hidden="true">
          📭
        </div>
        <h3 className="empty-state__title">{title}</h3>
        <p className="empty-state__desc">{description}</p>
        {ctaLabel && ctaHref && (
          <Link href={ctaHref} className="empty-state__cta">
            {ctaLabel}
          </Link>
        )}
      </div>
    </>
  )
}

const emptyStyles = `
  .empty-state { text-align: center; padding: var(--space-12) var(--space-4); }
  .empty-state__icon { font-size: 48px; margin-bottom: var(--space-4); }
  .empty-state__title { font-size: 18px; font-weight: 600; margin-bottom: var(--space-2); }
  .empty-state__desc { font-size: 14px; color: var(--text-secondary); margin-bottom: var(--space-6); max-width: 320px; margin-inline: auto; }
  .empty-state__cta { display: inline-block; padding: var(--space-2) var(--space-5); background: var(--primary); color: white; border-radius: var(--radius-md); font-size: 14px; font-weight: 600; text-decoration: none; }
`
```

- [ ] **Step 6: Create BookingCard**

Create `apps/web/src/components/turista/BookingCard.tsx`:

```tsx
import Link from 'next/link'
import BookingStatusBadge from './BookingStatusBadge'

export interface BookingCardData {
  id: string
  code: string | null
  status: string
  pax: number
  startsAt: string
  packageName: string
  coverImageUrl: string | null
  durationHours: number
  difficulty: string
  tenantName: string
}

export default function BookingCard({ booking }: { booking: BookingCardData }) {
  const date = new Date(booking.startsAt)
  const dateStr = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <style>{bookingCardStyles}</style>
      <Link href={`/minha-conta/viagens/${booking.id}`} className="booking-card">
        {booking.coverImageUrl && (
          <img src={booking.coverImageUrl} alt="" className="booking-card__img" loading="lazy" />
        )}
        <div className="booking-card__body">
          <div className="booking-card__header">
            <span className="booking-card__name">{booking.packageName}</span>
            <BookingStatusBadge status={booking.status} />
          </div>
          <div className="booking-card__meta">
            {dateStr} · {timeStr} · {booking.pax} pax
          </div>
          <div className="booking-card__tenant">{booking.tenantName}</div>
        </div>
      </Link>
    </>
  )
}

const bookingCardStyles = `
  .booking-card { display: flex; gap: var(--space-3); padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-lg); text-decoration: none; color: inherit; transition: box-shadow 0.15s; }
  .booking-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .booking-card__img { width: 80px; height: 80px; border-radius: var(--radius-md); object-fit: cover; flex-shrink: 0; }
  .booking-card__body { flex: 1; min-width: 0; }
  .booking-card__header { display: flex; justify-content: space-between; align-items: start; gap: var(--space-2); margin-bottom: var(--space-1); }
  .booking-card__name { font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .booking-card__meta { font-size: 12px; color: var(--text-secondary); }
  .booking-card__tenant { font-size: 11px; color: var(--text-tertiary, #9ca3af); margin-top: var(--space-1); }
`
```

- [ ] **Step 7: Create ReviewForm**

Create `apps/web/src/components/turista/ReviewForm.tsx`:

```tsx
'use client'

import { useState, type FormEvent } from 'react'
import StarRating from './StarRating'

interface ReviewFormProps {
  bookingId: string
  onSubmitted: () => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

export default function ReviewForm({ bookingId, onSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (rating === 0) {
      setError('Selecione uma nota')
      return
    }
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/me/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bookingId, rating, comment: comment || undefined }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.message ?? 'Erro ao enviar avaliação')
        return
      }
      onSubmitted()
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{reviewFormStyles}</style>
      <form className="review-form" onSubmit={handleSubmit}>
        <h3 className="review-form__title">Avaliar esta viagem</h3>
        {error && (
          <div className="review-form__error" role="alert">
            {error}
          </div>
        )}
        <StarRating value={rating} onChange={setRating} />
        <textarea
          className="review-form__textarea"
          placeholder="Conte como foi sua experiência (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={3}
        />
        <button className="review-form__submit" type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar avaliação'}
        </button>
      </form>
    </>
  )
}

const reviewFormStyles = `
  .review-form { border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-4); margin-top: var(--space-4); }
  .review-form__title { font-size: 16px; font-weight: 600; margin-bottom: var(--space-3); }
  .review-form__error { background: #fef2f2; color: #b91c1c; padding: var(--space-2); border-radius: var(--radius-md); font-size: 13px; margin-bottom: var(--space-3); }
  .review-form__textarea { display: block; width: 100%; margin-top: var(--space-3); padding: var(--space-2); border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 14px; resize: vertical; font-family: inherit; }
  .review-form__submit { margin-top: var(--space-3); padding: var(--space-2) var(--space-4); background: var(--primary); color: white; border: none; border-radius: var(--radius-md); font-size: 14px; font-weight: 600; cursor: pointer; }
  .review-form__submit:disabled { opacity: 0.6; cursor: not-allowed; }
`
```

- [ ] **Step 8: Create /minha-conta/viagens page**

Create `apps/web/app/(turista)/minha-conta/viagens/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ViagensClient from './ViagensClient'

export const metadata: Metadata = {
  title: 'Minhas Viagens — CAPI',
}

const API_URL = process.env.API_URL ?? 'http://localhost:3333'

async function fetchBookings(token: string, status: string) {
  try {
    const res = await fetch(`${API_URL}/me/bookings?status=${status}&limit=20`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.data ?? []
  } catch {
    return []
  }
}

export default async function ViagensPage() {
  const session = await getServerSession(authOptions)
  const token = (session as any)?.apiToken ?? ''

  const upcoming = await fetchBookings(token, 'upcoming')

  return <ViagensClient initialBookings={upcoming} />
}
```

Create `apps/web/app/(turista)/minha-conta/viagens/ViagensClient.tsx`:

```tsx
'use client'

import { useState } from 'react'
import BookingCard, { type BookingCardData } from '@/src/components/turista/BookingCard'
import EmptyState from '@/src/components/turista/EmptyState'

interface ViagensClientProps {
  initialBookings: BookingCardData[]
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

export default function ViagensClient({ initialBookings }: ViagensClientProps) {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [bookings, setBookings] = useState<BookingCardData[]>(initialBookings)
  const [loading, setLoading] = useState(false)

  async function switchTab(newTab: 'upcoming' | 'past') {
    setTab(newTab)
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/me/bookings?status=${newTab}&limit=20`, {
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setBookings(data.data ?? [])
      }
    } catch {
      /* keep current */
    }
    setLoading(false)
  }

  return (
    <>
      <style>{viagensStyles}</style>
      <div className="viagens">
        <h1 className="viagens__title">Minhas Viagens</h1>
        <div className="viagens__tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'upcoming'}
            className={`viagens__tab${tab === 'upcoming' ? ' viagens__tab--active' : ''}`}
            onClick={() => switchTab('upcoming')}
          >
            Próximas
          </button>
          <button
            role="tab"
            aria-selected={tab === 'past'}
            className={`viagens__tab${tab === 'past' ? ' viagens__tab--active' : ''}`}
            onClick={() => switchTab('past')}
          >
            Passadas
          </button>
        </div>

        {loading ? (
          <div className="viagens__loading">Carregando...</div>
        ) : bookings.length === 0 ? (
          <EmptyState
            title={tab === 'upcoming' ? 'Nenhuma viagem agendada' : 'Nenhuma viagem passada'}
            description="Explore roteiros incríveis e reserve sua próxima aventura."
            ctaLabel="Explorar roteiros"
            ctaHref="/explorar"
          />
        ) : (
          <div className="viagens__list">
            {bookings.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

const viagensStyles = `
  .viagens__title { font-size: 22px; font-weight: 700; margin-bottom: var(--space-4); }
  .viagens__tabs { display: flex; gap: var(--space-1); margin-bottom: var(--space-4); border-bottom: 1px solid var(--border); }
  .viagens__tab { padding: var(--space-2) var(--space-4); background: none; border: none; font-size: 14px; font-weight: 500; color: var(--text-secondary); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
  .viagens__tab--active { color: var(--primary); border-bottom-color: var(--primary); }
  .viagens__list { display: flex; flex-direction: column; gap: var(--space-3); }
  .viagens__loading { text-align: center; padding: var(--space-8); color: var(--text-secondary); }
`
```

- [ ] **Step 9: Create /minha-conta/viagens/[id] detail page**

Create `apps/web/app/(turista)/minha-conta/viagens/[id]/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import BookingStatusBadge from '@/src/components/turista/BookingStatusBadge'
import ReviewForm from '@/src/components/turista/ReviewForm'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

interface BookingDetail {
  id: string
  code: string | null
  status: string
  pax: number
  qrCode: string | null
  customerName: string
  startsAt: string
  packageName: string
  coverImageUrl: string | null
  durationHours: number
  difficulty: string
  meetingPointName: string | null
  meetingPointLat: number | null
  meetingPointLng: number | null
  guideName: string | null
  guidePhotoUrl: string | null
  tenantName: string
  hasReview: boolean
  createdAt: string
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/me/bookings/${id}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setBooking(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading)
    return (
      <div
        style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}
      >
        Carregando...
      </div>
    )
  if (!booking)
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>Reserva não encontrada</div>
    )

  const date = new Date(booking.startsAt)

  return (
    <>
      <style>{detailStyles}</style>
      <div className="booking-detail">
        <button className="booking-detail__back" onClick={() => router.back()}>
          ← Voltar
        </button>

        {booking.coverImageUrl && (
          <img src={booking.coverImageUrl} alt="" className="booking-detail__cover" />
        )}

        <div className="booking-detail__header">
          <h1 className="booking-detail__name">{booking.packageName}</h1>
          <BookingStatusBadge status={booking.status} />
        </div>

        <dl className="booking-detail__info">
          <div>
            <dt>Data</dt>
            <dd>
              {date.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </dd>
          </div>
          <div>
            <dt>Horário</dt>
            <dd>{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</dd>
          </div>
          <div>
            <dt>Duração</dt>
            <dd>{booking.durationHours}h</dd>
          </div>
          <div>
            <dt>Participantes</dt>
            <dd>{booking.pax}</dd>
          </div>
          {booking.code && (
            <div>
              <dt>Código</dt>
              <dd className="booking-detail__code">{booking.code}</dd>
            </div>
          )}
        </dl>

        {booking.guideName && (
          <div className="booking-detail__guide">
            {booking.guidePhotoUrl && (
              <img src={booking.guidePhotoUrl} alt="" className="booking-detail__guide-photo" />
            )}
            <div>
              <div className="booking-detail__guide-label">Guia</div>
              <div className="booking-detail__guide-name">{booking.guideName}</div>
            </div>
          </div>
        )}

        {booking.meetingPointName && (
          <div className="booking-detail__section">
            <h3>Ponto de encontro</h3>
            <p>{booking.meetingPointName}</p>
          </div>
        )}

        {booking.qrCode && booking.status === 'CONFIRMED' && (
          <div className="booking-detail__section" style={{ textAlign: 'center' }}>
            <h3>QR Code</h3>
            <div className="booking-detail__qr">{booking.qrCode}</div>
          </div>
        )}

        {booking.status === 'COMPLETED' && !booking.hasReview && (
          <ReviewForm
            bookingId={booking.id}
            onSubmitted={() => setBooking((b) => (b ? { ...b, hasReview: true } : b))}
          />
        )}
      </div>
    </>
  )
}

const detailStyles = `
  .booking-detail__back { background: none; border: none; font-size: 14px; color: var(--text-secondary); cursor: pointer; margin-bottom: var(--space-4); padding: 0; }
  .booking-detail__cover { width: 100%; height: 200px; object-fit: cover; border-radius: var(--radius-lg); margin-bottom: var(--space-4); }
  .booking-detail__header { display: flex; justify-content: space-between; align-items: start; gap: var(--space-3); margin-bottom: var(--space-4); }
  .booking-detail__name { font-size: 20px; font-weight: 700; }
  .booking-detail__info { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-bottom: var(--space-4); }
  .booking-detail__info dt { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.03em; }
  .booking-detail__info dd { font-size: 14px; font-weight: 500; margin: 0; }
  .booking-detail__code { font-family: monospace; font-size: 16px; letter-spacing: 0.1em; }
  .booking-detail__guide { display: flex; gap: var(--space-3); align-items: center; padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-lg); margin-bottom: var(--space-4); }
  .booking-detail__guide-photo { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
  .booking-detail__guide-label { font-size: 11px; color: var(--text-secondary); }
  .booking-detail__guide-name { font-size: 14px; font-weight: 600; }
  .booking-detail__section { margin-bottom: var(--space-4); }
  .booking-detail__section h3 { font-size: 14px; font-weight: 600; margin-bottom: var(--space-2); }
  .booking-detail__qr { font-family: monospace; font-size: 14px; padding: var(--space-4); background: var(--bg-muted); border-radius: var(--radius-md); word-break: break-all; }
`
```

- [ ] **Step 10: Run all turista component tests**

Run: `cd apps/web && npx vitest run src/components/turista/__tests__/`
Expected: All tests PASS.

---

## Task 8: Web — /minha-conta/favoritos + FavoriteButton

**Files:**

- Create: `apps/web/app/(turista)/minha-conta/favoritos/page.tsx`
- Create: `apps/web/src/components/turista/FavoriteButton.tsx`
- Create: `apps/web/src/components/turista/__tests__/FavoriteButton.test.tsx`

- [ ] **Step 1: Write failing test for FavoriteButton**

Create `apps/web/src/components/turista/__tests__/FavoriteButton.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FavoriteButton from '../FavoriteButton'

describe('FavoriteButton', () => {
  it('renderiza coração vazio quando não é favorito', () => {
    render(<FavoriteButton packageId="pkg-1" isFavorite={false} onToggle={vi.fn()} />)
    const btn = screen.getByRole('button', { name: /favoritar/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  it('renderiza coração preenchido quando é favorito', () => {
    render(<FavoriteButton packageId="pkg-1" isFavorite={true} onToggle={vi.fn()} />)
    const btn = screen.getByRole('button', { name: /remover dos favoritos/i })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('chama onToggle ao clicar', () => {
    const onToggle = vi.fn()
    render(<FavoriteButton packageId="pkg-1" isFavorite={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Create FavoriteButton**

Create `apps/web/src/components/turista/FavoriteButton.tsx`:

```tsx
'use client'

import { Heart } from 'lucide-react'

interface FavoriteButtonProps {
  packageId?: string
  destinationId?: string
  isFavorite: boolean
  onToggle: () => void
  size?: number
}

export default function FavoriteButton({ isFavorite, onToggle, size = 20 }: FavoriteButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onToggle()
      }}
      aria-label={isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
      aria-pressed={isFavorite}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        display: 'flex',
      }}
    >
      <Heart
        size={size}
        fill={isFavorite ? '#ef4444' : 'none'}
        color={isFavorite ? '#ef4444' : '#9ca3af'}
        strokeWidth={1.75}
      />
    </button>
  )
}
```

- [ ] **Step 3: Create /minha-conta/favoritos page**

Create `apps/web/app/(turista)/minha-conta/favoritos/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import EmptyState from '@/src/components/turista/EmptyState'
import FavoriteButton from '@/src/components/turista/FavoriteButton'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

interface FavoriteItem {
  id: string
  type: 'package' | 'destination'
  packageId: string | null
  destinationId: string | null
  packageName: string | null
  packageCoverUrl: string | null
  packagePrice: number | null
  packageTenantSlug: string | null
  destinationTitle: string | null
  destinationSlug: string | null
  destinationImageUrl: string | null
}

export default function FavoritosPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/me/favorites`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((data) => {
        setFavorites(data.data ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleRemove(id: string) {
    setFavorites((prev) => prev.filter((f) => f.id !== id))
    await fetch(`${API_URL}/me/favorites/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => {})
  }

  if (loading)
    return (
      <div
        style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}
      >
        Carregando...
      </div>
    )

  return (
    <>
      <style>{favStyles}</style>
      <div>
        <h1 className="fav__title">Favoritos</h1>
        {favorites.length === 0 ? (
          <EmptyState
            title="Nenhum favorito salvo"
            description="Explore roteiros e destinos e salve os que mais gostar."
            ctaLabel="Explorar"
            ctaHref="/explorar"
          />
        ) : (
          <div className="fav__grid">
            {favorites.map((f) => (
              <div key={f.id} className="fav__card">
                {(f.packageCoverUrl || f.destinationImageUrl) && (
                  <img
                    src={(f.packageCoverUrl ?? f.destinationImageUrl)!}
                    alt=""
                    className="fav__card-img"
                    loading="lazy"
                  />
                )}
                <div className="fav__card-body">
                  <Link
                    href={
                      f.type === 'package'
                        ? `/explorar?q=${encodeURIComponent(f.packageName ?? '')}`
                        : `/destinos/${f.destinationSlug}`
                    }
                    className="fav__card-name"
                  >
                    {f.packageName ?? f.destinationTitle}
                  </Link>
                  {f.packagePrice !== null && (
                    <div className="fav__card-price">R$ {(f.packagePrice / 100).toFixed(2)}</div>
                  )}
                </div>
                <FavoriteButton isFavorite={true} onToggle={() => handleRemove(f.id)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

const favStyles = `
  .fav__title { font-size: 22px; font-weight: 700; margin-bottom: var(--space-4); }
  .fav__grid { display: flex; flex-direction: column; gap: var(--space-3); }
  .fav__card { display: flex; gap: var(--space-3); align-items: center; padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  .fav__card-img { width: 72px; height: 72px; border-radius: var(--radius-md); object-fit: cover; flex-shrink: 0; }
  .fav__card-body { flex: 1; min-width: 0; }
  .fav__card-name { font-size: 14px; font-weight: 600; text-decoration: none; color: inherit; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .fav__card-price { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }
`
```

- [ ] **Step 4: Run FavoriteButton test**

Run: `cd apps/web && npx vitest run src/components/turista/__tests__/FavoriteButton.test.tsx`
Expected: PASS.

---

## Task 9: Web — /minha-conta/avaliacoes + /minha-conta/perfil

**Files:**

- Create: `apps/web/app/(turista)/minha-conta/avaliacoes/page.tsx`
- Create: `apps/web/app/(turista)/minha-conta/perfil/page.tsx`

- [ ] **Step 1: Create /minha-conta/avaliacoes page**

Create `apps/web/app/(turista)/minha-conta/avaliacoes/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import EmptyState from '@/src/components/turista/EmptyState'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

interface ReviewItem {
  id: string
  rating: number
  comment: string | null
  packageName: string
  packageCoverUrl: string | null
  createdAt: string
}

export default function AvaliacoesPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/me/reviews`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((data) => {
        setReviews(data.data ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading)
    return (
      <div
        style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}
      >
        Carregando...
      </div>
    )

  return (
    <>
      <style>{avalStyles}</style>
      <div>
        <h1 className="aval__title">Minhas Avaliações</h1>
        {reviews.length === 0 ? (
          <EmptyState
            title="Nenhuma avaliação"
            description="Depois de concluir uma viagem, você poderá avaliar aqui."
            ctaLabel="Ver viagens"
            ctaHref="/minha-conta/viagens"
          />
        ) : (
          <div className="aval__list">
            {reviews.map((r) => (
              <div key={r.id} className="aval__card">
                <div className="aval__card-header">
                  <span className="aval__card-name">{r.packageName}</span>
                  <span className="aval__card-date">
                    {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="aval__card-stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={16}
                      fill={s <= r.rating ? '#f59e0b' : 'none'}
                      color={s <= r.rating ? '#f59e0b' : '#d1d5db'}
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
                {r.comment && <p className="aval__card-comment">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

const avalStyles = `
  .aval__title { font-size: 22px; font-weight: 700; margin-bottom: var(--space-4); }
  .aval__list { display: flex; flex-direction: column; gap: var(--space-3); }
  .aval__card { padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-lg); }
  .aval__card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2); }
  .aval__card-name { font-size: 14px; font-weight: 600; }
  .aval__card-date { font-size: 12px; color: var(--text-secondary); }
  .aval__card-stars { display: flex; gap: 2px; margin-bottom: var(--space-2); }
  .aval__card-comment { font-size: 14px; color: var(--text-secondary); margin: 0; }
`
```

- [ ] **Step 2: Create /minha-conta/perfil page**

Create `apps/web/app/(turista)/minha-conta/perfil/page.tsx`:

```tsx
'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { signOut } from 'next-auth/react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

interface Profile {
  name: string
  email: string
  photoUrl: string | null
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/me/profile`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setProfile(data)
          setName(data.name)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch(`${API_URL}/me/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setMessage('Perfil atualizado!')
      } else {
        setMessage('Erro ao atualizar')
      }
    } catch {
      setMessage('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <div
        style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}
      >
        Carregando...
      </div>
    )

  return (
    <>
      <style>{perfilStyles}</style>
      <div className="perfil">
        <h1 className="perfil__title">Meu Perfil</h1>

        <form className="perfil__form" onSubmit={handleSave}>
          <div className="perfil__avatar">
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="" className="perfil__avatar-img" />
            ) : (
              <div className="perfil__avatar-placeholder">
                {profile?.name?.charAt(0).toUpperCase() ?? '?'}
              </div>
            )}
          </div>

          {message && <div className="perfil__message">{message}</div>}

          <label className="perfil__label" htmlFor="perfil-name">
            Nome
          </label>
          <input
            id="perfil-name"
            className="perfil__input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label className="perfil__label">Email</label>
          <input className="perfil__input" type="email" value={profile?.email ?? ''} disabled />

          <button className="perfil__save" type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>

        <div className="perfil__section">
          <button
            className="perfil__logout"
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            Sair da conta
          </button>
        </div>
      </div>
    </>
  )
}

const perfilStyles = `
  .perfil__title { font-size: 22px; font-weight: 700; margin-bottom: var(--space-6); }
  .perfil__form { max-width: 400px; }
  .perfil__avatar { margin-bottom: var(--space-4); }
  .perfil__avatar-img { width: 72px; height: 72px; border-radius: 50%; object-fit: cover; }
  .perfil__avatar-placeholder { width: 72px; height: 72px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; }
  .perfil__message { padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); font-size: 13px; background: #dcfce7; color: #166534; margin-bottom: var(--space-4); }
  .perfil__label { display: block; font-size: 14px; font-weight: 500; margin-bottom: var(--space-1); margin-top: var(--space-4); }
  .perfil__input { display: block; width: 100%; padding: var(--space-2) var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-md); font-size: 14px; background: var(--surface); }
  .perfil__input:disabled { opacity: 0.6; cursor: not-allowed; }
  .perfil__save { margin-top: var(--space-6); padding: var(--space-2) var(--space-5); background: var(--primary); color: white; border: none; border-radius: var(--radius-md); font-size: 14px; font-weight: 600; cursor: pointer; }
  .perfil__save:disabled { opacity: 0.6; }
  .perfil__section { margin-top: var(--space-8); padding-top: var(--space-4); border-top: 1px solid var(--border); }
  .perfil__logout { background: none; border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-2) var(--space-4); font-size: 14px; color: #b91c1c; cursor: pointer; }
`
```

- [ ] **Step 3: Run full web test suite**

Run: `cd apps/web && npx vitest run`
Expected: All tests PASS (existing + new turista tests).

---

## Task Summary

| Task | Scope                           | Key Files                                                    |
| ---- | ------------------------------- | ------------------------------------------------------------ |
| 1    | Schema + Seed                   | `schema.prisma`, `seed.ts`                                   |
| 2    | API /me/bookings                | `me.routes.ts`, `me-bookings.test.ts`                        |
| 3    | API /me/favorites               | `me.routes.ts`, `me-favorites.test.ts`                       |
| 4    | API /me/reviews + profile       | `me.routes.ts`, `me-reviews.test.ts`, `me-profile.test.ts`   |
| 5    | Web TuristaLayout + nav         | `layout.tsx`, `TuristaBottomNav.tsx`, `TuristaTopNav.tsx`    |
| 6    | Web /cadastro + /login          | `CadastroForm.tsx`, `page.tsx` ×2                            |
| 7    | Web /viagens list + detail      | `BookingCard.tsx`, `ReviewForm.tsx`, `StarRating.tsx`, pages |
| 8    | Web /favoritos + FavoriteButton | `FavoriteButton.tsx`, favorites page                         |
| 9    | Web /avaliacoes + /perfil       | Reviews page, profile page                                   |
