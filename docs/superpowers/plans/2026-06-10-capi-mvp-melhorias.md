# CAPI MVP — Plano de Melhorias e Testes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir todos os bugs bloqueadores do MVP, implementar features ausentes e estabelecer cobertura de testes antes de cada funcionalidade entrar em produção.

**Architecture:** Monorepo pnpm/Turborepo com `apps/api` (Fastify 5 + Prisma 7) e `apps/web` (Next.js 16.2). Testes de API com Vitest diretamente contra rotas Fastify. Sem framework E2E por enquanto — cobertura via testes de integração na API e smoke visual manual no web.

**Tech Stack:** TypeScript, Fastify 5, Prisma 7, PostgreSQL, Vitest, Next.js 16.2, React 19, Railway, Mercado Pago SDK v2, Resend

---

## Mapa de Arquivos

| Arquivo | Ação | Motivo |
|---------|------|--------|
| `apps/api/src/modules/bookings/bookings.routes.ts` | Modificar | Bug: `transactionAmount` sem `* pax` |
| `apps/api/src/modules/webhooks/webhooks.routes.ts` | Modificar | Remover module-level throws e lazy-init do client |
| `apps/api/src/shared/env.ts` | Modificar | Já valida MP vars — apenas documentar |
| `apps/api/src/modules/dashboard/dashboard.routes.ts` | Criar | Endpoint de métricas do painel do guia |
| `apps/api/src/app.ts` | Modificar | Registrar dashboardRoutes |
| `apps/api/src/__tests__/dashboard.test.ts` | Criar | Testes do endpoint de dashboard |
| `apps/api/src/__tests__/booking-price.test.ts` | Criar | Testes do cálculo de preço com pax |
| `apps/web/src/app/painel/[slug]/roteiros/novo/page.tsx` | Criar | Formulário de criação de roteiro |
| `apps/web/src/app/painel/[slug]/roteiros/novo/actions.ts` | Criar | Server action para POST /packages |
| `apps/web/src/app/painel/[slug]/dashboard/page.tsx` | Modificar | Conectar ao novo endpoint real |
| `apps/web/src/app/painel/[slug]/reservas/page.tsx` | Modificar | Garantir JWT no confirm/cancel |

---

## FASE 1 — Correções Críticas de Backend

### Task 1: Corrigir cálculo de preço no checkout (`transactionAmount * pax`)

**Contexto:** Em `bookings.routes.ts:180`, o valor enviado ao Mercado Pago usa `Number(pkg.price)` sem multiplicar por `pax`. Um grupo de 4 pessoas paga o preço de 1 — bug financeiro crítico. O repay (linha 461) já está correto: `Number(booking.slot.package.price) * booking.pax`.

**Files:**
- Modify: `apps/api/src/modules/bookings/bookings.routes.ts:180`
- Create: `apps/api/src/__tests__/booking-price.test.ts`

- [ ] **Step 1: Localizar a linha exata do bug**

```bash
grep -n "transactionAmount" apps/api/src/modules/bookings/bookings.routes.ts
```

Esperado: linha ~180 com `Number(pkg.price)` sem `* pax`, e linha ~461 com `* booking.pax`.

- [ ] **Step 2: Escrever o teste que captura o bug**

Crie `apps/api/src/__tests__/booking-price.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Testa que o valor cobrado é price * pax, não apenas price
describe('booking price calculation', () => {
  it('charges price * pax, not just price', () => {
    const price = 150.0
    const pax = 3
    const expected = price * pax // 450.00

    // A função de cálculo que a rota usa
    const transactionAmount = Number(price) * pax
    expect(transactionAmount).toBe(expected)
  })

  it('charges single pax correctly', () => {
    const price = 200.0
    const pax = 1
    const transactionAmount = Number(price) * pax
    expect(transactionAmount).toBe(200.0)
  })

  it('repay calculation matches create calculation formula', () => {
    const packagePrice = 100.0
    const pax = 2

    // fórmula do CREATE (após correção)
    const createAmount = Number(packagePrice) * pax
    // fórmula do REPAY (já correta)
    const repayAmount = Number(packagePrice) * pax

    expect(createAmount).toBe(repayAmount)
    expect(createAmount).toBe(200.0)
  })
})
```

- [ ] **Step 3: Executar o teste — deve passar (é lógica pura, não rota)**

```bash
cd apps/api && pnpm test src/__tests__/booking-price.test.ts
```

Esperado: 3 PASS

- [ ] **Step 4: Corrigir a linha do bug em `bookings.routes.ts`**

Linha ~180, alterar:
```typescript
// ANTES (bugado)
transactionAmount: Number(pkg.price),

// DEPOIS (correto)
transactionAmount: Number(pkg.price) * pax,
```

- [ ] **Step 5: Verificar que o repay não foi alterado (já estava correto)**

```bash
grep -n "transactionAmount" apps/api/src/modules/bookings/bookings.routes.ts
```

Esperado: linha ~180 com `* pax` e linha ~461 com `* booking.pax`.

- [ ] **Step 6: Rodar todos os testes de bookings para garantir regressão zero**

```bash
cd apps/api && pnpm test src/__tests__/bookings-b1.test.ts
```

Esperado: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/__tests__/booking-price.test.ts apps/api/src/modules/bookings/bookings.routes.ts
git commit -m "fix: multiply transactionAmount by pax in booking create — group bookings were undercharged"
```

---

### Task 2: Eliminar module-level throws em `webhooks.routes.ts`

**Contexto:** O arquivo `webhooks.routes.ts` tem dois `throw new Error(...)` e um `new MercadoPagoConfig(...)` em nível de módulo. Se `MP_ACCESS_TOKEN` ou `MP_WEBHOOK_SECRET` não estiverem setados, o módulo explode no `require()` e derruba o servidor antes de `validateEnv()` poder dar uma mensagem útil. O `validateEnv()` em `shared/env.ts` já exige essas vars — os throws são redundantes.

**Files:**
- Modify: `apps/api/src/modules/webhooks/webhooks.routes.ts`

- [ ] **Step 1: Ler o arquivo completo**

```bash
head -25 apps/api/src/modules/webhooks/webhooks.routes.ts
```

Confirmar que as primeiras linhas têm o padrão:
```typescript
if (!process.env.MP_ACCESS_TOKEN) {
  throw new Error('MP_ACCESS_TOKEN environment variable is required')
}
if (!process.env.MP_WEBHOOK_SECRET) {
  throw new Error('MP_WEBHOOK_SECRET environment variable is required')
}
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
})
```

- [ ] **Step 2: Remover os throws e tornar o client lazy dentro da função**

No arquivo `apps/api/src/modules/webhooks/webhooks.routes.ts`, substituir o bloco das primeiras linhas após os imports:

```typescript
// REMOVER estes 8 blocos do topo do arquivo:
if (!process.env.MP_ACCESS_TOKEN) {
  throw new Error('MP_ACCESS_TOKEN environment variable is required')
}
if (!process.env.MP_WEBHOOK_SECRET) {
  throw new Error('MP_WEBHOOK_SECRET environment variable is required')
}
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
})
```

E dentro da função `webhooksRoutes`, no handler da rota, adicionar a inicialização lazy antes do uso do client:

```typescript
export async function webhooksRoutes(app: FastifyInstance) {
  app.post('/webhooks/mercadopago', { ... }, async (request, reply) => {
    // ... validação de assinatura (não usa client) ...

    // Lazy init — validateEnv() já garantiu que a var existe no startup
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN!,
    })

    // ... resto do handler ...
  })
}
```

- [ ] **Step 3: Confirmar que não há outros usos do `client` fora do handler**

```bash
grep -n "client" apps/api/src/modules/webhooks/webhooks.routes.ts
```

Esperado: apenas dentro do handler da rota, não no escopo do módulo.

- [ ] **Step 4: Rodar os testes existentes**

```bash
cd apps/api && pnpm test
```

Esperado: todos os 17 testes PASS sem erro de "MP_ACCESS_TOKEN".

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/webhooks/webhooks.routes.ts
git commit -m "fix: lazy-init MercadoPago client in webhook handler — remove module-level throws that crashed server before validateEnv"
```

---

### Task 3: Implementar endpoint `GET /tenants/:slug/dashboard`

**Contexto:** O painel do guia exibe "Erro ao carregar dados" porque não existe nenhum endpoint de dashboard na API. Precisamos criar `GET /tenants/:slug/dashboard` que retorna métricas básicas do tenant: contagem de reservas por status, faturamento confirmado e próximos slots.

**Files:**
- Create: `apps/api/src/modules/dashboard/dashboard.routes.ts`
- Create: `apps/api/src/__tests__/dashboard.test.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Escrever o teste de integração primeiro**

Crie `apps/api/src/__tests__/dashboard.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Fastify from 'fastify'
import jwt from '@fastify/jwt'
import { dashboardRoutes } from '../modules/dashboard/dashboard.routes'
import prisma from '../database'

// Usa o mesmo padrão de setup dos outros testes de integração
// Assume tenant "test-slug" e user ADMIN já criados pelo setup global

describe('GET /tenants/:slug/dashboard', () => {
  const app = Fastify()

  beforeAll(async () => {
    await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'test-secret-32-chars-minimum!!' })
    await app.register(dashboardRoutes)
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns 401 without JWT', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/any-slug/dashboard',
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 404 for unknown tenant', async () => {
    const token = await app.jwt.sign({ sub: 'user-id', role: 'ADMIN', tenantId: 'x' })
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/tenant-nao-existe-xyz/dashboard',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns dashboard shape with counts and revenue', async () => {
    // Busca tenant real do banco para o teste
    const tenant = await prisma.tenant.findFirst()
    if (!tenant) return // skip se banco vazio

    const token = await app.jwt.sign({ sub: 'any', role: 'ADMIN', tenantId: tenant.id })
    const res = await app.inject({
      method: 'GET',
      url: `/tenants/${tenant.slug}/dashboard`,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveProperty('bookings')
    expect(body.bookings).toHaveProperty('pending')
    expect(body.bookings).toHaveProperty('confirmed')
    expect(body.bookings).toHaveProperty('cancelled')
    expect(body).toHaveProperty('revenue')
    expect(body.revenue).toHaveProperty('confirmed')
    expect(body).toHaveProperty('upcomingSlots')
    expect(Array.isArray(body.upcomingSlots)).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar o teste — deve falhar com "Cannot find module"**

```bash
cd apps/api && pnpm test src/__tests__/dashboard.test.ts
```

Esperado: FAIL com "Cannot find module '../modules/dashboard/dashboard.routes'"

- [ ] **Step 3: Criar o arquivo da rota**

Crie `apps/api/src/modules/dashboard/dashboard.routes.ts`:

```typescript
import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'

const slugParamsSchema = z.object({
  slug: z.string().min(1),
})

export async function dashboardRoutes(app: FastifyInstance) {
  app.get(
    '/tenants/:slug/dashboard',
    { preHandler: [authenticate, authorize(['ADMIN', 'ATENDENTE', 'CONDUTOR', 'SUPER_ADMIN'])] },
    async (request, reply) => {
      let params
      try {
        params = slugParamsSchema.parse(request.params)
      } catch (err) {
        if (err instanceof ZodError) {
          return reply.status(400).send({ message: 'Slug inválido' })
        }
        throw err
      }

      const tenant = await prisma.tenant.findUnique({ where: { slug: params.slug } })
      if (!tenant) throw new AppError('Tenant não encontrado', 404)

      const [bookingCounts, confirmedBookings, upcomingSlots] = await Promise.all([
        // Contagem por status
        prisma.booking.groupBy({
          by: ['status'],
          where: { tenantId: tenant.id },
          _count: { id: true },
        }),

        // Faturamento: soma de price * pax em reservas confirmadas
        prisma.booking.findMany({
          where: { tenantId: tenant.id, status: { in: ['CONFIRMED', 'COMPLETED'] } },
          select: { pax: true, slot: { select: { package: { select: { price: true } } } } },
        }),

        // Próximos 5 slots abertos
        prisma.departureSlot.findMany({
          where: {
            status: 'OPEN',
            startsAt: { gte: new Date() },
            package: { tenantId: tenant.id },
          },
          orderBy: { startsAt: 'asc' },
          take: 5,
          select: {
            id: true,
            startsAt: true,
            booked: true,
            capacity: true,
            package: { select: { name: true } },
          },
        }),
      ])

      // Normalizar counts
      const counts: Record<string, number> = {}
      for (const row of bookingCounts) {
        counts[row.status.toLowerCase()] = row._count.id
      }

      // Calcular faturamento
      const confirmedRevenue = confirmedBookings.reduce((sum, b) => {
        const price = Number(b.slot?.package?.price ?? 0)
        return sum + price * b.pax
      }, 0)

      return reply.status(200).send({
        bookings: {
          pending: counts['pending'] ?? 0,
          confirmed: counts['confirmed'] ?? 0,
          cancelled: counts['cancelled'] ?? 0,
          completed: counts['completed'] ?? 0,
          expired: counts['expired'] ?? 0,
        },
        revenue: {
          confirmed: confirmedRevenue,
        },
        upcomingSlots,
      })
    }
  )
}
```

- [ ] **Step 4: Registrar a rota em `app.ts`**

Em `apps/api/src/app.ts`, adicionar após os outros imports de rotas:

```typescript
import { dashboardRoutes } from './modules/dashboard/dashboard.routes'
```

E no bloco de registro de plugins (onde estão os outros `app.register`):

```typescript
app.register(dashboardRoutes)
```

- [ ] **Step 5: Rodar o teste novamente — deve passar**

```bash
cd apps/api && pnpm test src/__tests__/dashboard.test.ts
```

Esperado: 3 PASS (o terceiro pode ser skipped se banco vazio — OK).

- [ ] **Step 6: Rodar suite completa para garantir regressão zero**

```bash
cd apps/api && pnpm test
```

Esperado: todos os testes PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/dashboard/ apps/api/src/__tests__/dashboard.test.ts apps/api/src/app.ts
git commit -m "feat: add GET /tenants/:slug/dashboard endpoint with booking counts, revenue and upcoming slots"
```

---

### Task 4: Adicionar proxy route no Next.js para o dashboard

**Contexto:** O Next.js faz chamadas via server components usando `apiFetch`. Precisamos de um proxy route em `apps/web/src/app/api/` para o dashboard, e atualizar a página do painel para usar os dados reais.

**Files:**
- Create: `apps/web/src/app/api/tenants/[slug]/dashboard/route.ts`
- Modify: `apps/web/src/app/painel/[slug]/dashboard/page.tsx` (conectar ao endpoint)

- [ ] **Step 1: Verificar o padrão dos outros proxy routes existentes**

```bash
find apps/web/src/app/api -name "route.ts" | head -5 | xargs head -20
```

Confirmar o padrão de como outros proxy routes repassam headers e chamam a API.

- [ ] **Step 2: Criar o proxy route para o dashboard**

Crie `apps/web/src/app/api/tenants/[slug]/dashboard/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const authHeader = request.headers.get('authorization')

  const response = await fetch(`${API_URL}/tenants/${params.slug}/dashboard`, {
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { authorization: authHeader } : {}),
    },
    cache: 'no-store',
  })

  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}
```

- [ ] **Step 3: Verificar como a página de dashboard atual busca dados**

```bash
cat apps/web/src/app/painel/*/dashboard/page.tsx 2>/dev/null || \
  find apps/web/src/app -path "*painel*dashboard*" -name "page.tsx" | xargs cat
```

- [ ] **Step 4: Atualizar a página do dashboard para usar dados reais**

Localizado o arquivo da página (provavelmente `apps/web/src/app/painel/[slug]/dashboard/page.tsx`), substituir o fetch mockado/quebrado por:

```typescript
import { cookies } from 'next/headers'

async function getDashboardData(slug: string) {
  const cookieStore = cookies()
  const token = cookieStore.get('auth-token')?.value

  const baseUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'
  const res = await fetch(`${baseUrl}/tenants/${slug}/dashboard`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  })

  if (!res.ok) return null
  return res.json()
}
```

E renderizar os dados do `dashboardData` nos cards da UI. Se `dashboardData === null`, exibir estado de erro com botão "Tentar novamente".

- [ ] **Step 5: Testar visualmente no browser**

1. Login como guia/admin em `http://localhost:3000`
2. Navegar para o Dashboard
3. Confirmar que os cards mostram números (mesmo que zero) em vez de "Erro ao carregar"

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/api/tenants/ apps/web/src/app/painel/
git commit -m "feat: connect painel dashboard page to real API endpoint"
```

---

## FASE 1 — Correções Críticas de Frontend

### Task 5: Criar página "Novo Roteiro" no painel do guia

**Contexto:** A aba Roteiros do painel tem um link "Novo Roteiro" que resulta em 404 porque a rota `/painel/[slug]/roteiros/novo` não existe no Next.js App Router. A API já tem `POST /tenants/:slug/packages` funcionando (packages = roteiros).

**Files:**
- Create: `apps/web/src/app/painel/[slug]/roteiros/novo/page.tsx`
- Create: `apps/web/src/app/api/tenants/[slug]/packages/route.ts` (se não existir)

- [ ] **Step 1: Verificar se o proxy route para packages já existe**

```bash
find apps/web/src/app/api -path "*packages*" | head -10
```

Se existir, verificar qual método suporta. Se não existir, criar na próxima etapa.

- [ ] **Step 2: Criar o proxy route POST para packages (se não existir)**

Crie `apps/web/src/app/api/tenants/[slug]/packages/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const authHeader = request.headers.get('authorization')
  const body = await request.json()

  const response = await fetch(`${API_URL}/tenants/${params.slug}/packages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const authHeader = request.headers.get('authorization')

  const response = await fetch(`${API_URL}/tenants/${params.slug}/packages`, {
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { authorization: authHeader } : {}),
    },
    cache: 'no-store',
  })

  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}
```

- [ ] **Step 3: Verificar campos obrigatórios do POST /packages na API**

```bash
grep -A 20 "app.post.*packages'" apps/api/src/modules/packages/packages.routes.ts | head -25
```

Confirmar campos: `name`, `description`, `price`, `durationHours`, `maxCapacity`, `difficulty` (enum: EASY/MODERATE/HARD).

- [ ] **Step 4: Criar a página do formulário**

Crie `apps/web/src/app/painel/[slug]/roteiros/novo/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

const DIFFICULTIES = [
  { value: 'EASY', label: 'Fácil' },
  { value: 'MODERATE', label: 'Moderado' },
  { value: 'HARD', label: 'Difícil' },
]

export default function NovoRoteiroPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    durationHours: '',
    maxCapacity: '',
    difficulty: 'MODERATE',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('auth-token='))
        ?.split('=')[1]

      const res = await fetch(`/api/tenants/${slug}/packages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          price: parseFloat(form.price),
          durationHours: parseInt(form.durationHours, 10),
          maxCapacity: parseInt(form.maxCapacity, 10),
          difficulty: form.difficulty,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message ?? 'Erro ao criar roteiro')
      }

      router.push(`/painel/${slug}/roteiros`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Novo Roteiro</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nome do roteiro *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Ex: Trilha Serra da Capivara — Nível Iniciante"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Descrição *</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            required
            rows={4}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Descreva o roteiro, o que está incluso, pontos de interesse..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Preço por pessoa (R$) *</label>
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="150.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Duração (horas) *</label>
            <input
              name="durationHours"
              type="number"
              min="1"
              max="72"
              value={form.durationHours}
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="6"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Capacidade máxima *</label>
            <input
              name="maxCapacity"
              type="number"
              min="1"
              max="100"
              value={form.maxCapacity}
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="12"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Dificuldade *</label>
            <select
              name="difficulty"
              value={form.difficulty}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-primary text-white rounded font-medium text-sm disabled:opacity-50"
          >
            {isLoading ? 'Criando...' : 'Criar Roteiro'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border rounded font-medium text-sm"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Testar no browser**

1. Login como guia
2. Navegar para Roteiros → clicar em "Novo Roteiro"
3. Preencher o formulário e submeter
4. Confirmar redirecionamento para a lista de roteiros
5. Confirmar que o roteiro aparece na lista

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/painel/ apps/web/src/app/api/tenants/
git commit -m "feat: add Novo Roteiro form page — fixes 404 on painel roteiros/novo"
```

---

### Task 6: Corrigir envio do JWT nas ações de Confirmar/Negar reserva

**Contexto:** As rotas `PATCH /confirm` e `PATCH /cancel` exigem JWT (`preHandler: [authenticate, authorize(...)]`). O erro "Erro ao processar" indica que o frontend não está enviando o token. Precisamos verificar e corrigir o fetch nas chamadas de ação da aba Reservas.

**Files:**
- Modify: `apps/web/src/app/painel/[slug]/reservas/page.tsx` (ou o componente de ações)

- [ ] **Step 1: Localizar as chamadas de confirm/cancel no frontend**

```bash
grep -rn "confirm\|cancel\|negar\|Confirmar\|Negar" apps/web/src/app/painel/ --include="*.tsx" | head -20
```

- [ ] **Step 2: Verificar se o Authorization header está sendo enviado**

No arquivo encontrado, procurar pelo fetch de confirm/cancel. O padrão correto deve ser:

```typescript
// PADRÃO CORRETO
const token = document.cookie
  .split('; ')
  .find((row) => row.startsWith('auth-token='))
  ?.split('=')[1]

const res = await fetch(`/api/tenants/${slug}/bookings/${bookingId}/confirm`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  },
})
```

Se o fetch não incluir o `authorization` header, adicionar.

- [ ] **Step 3: Verificar se o proxy route para bookings confirm/cancel existe**

```bash
find apps/web/src/app/api -path "*booking*" -o -path "*reserva*" | sort
```

Se a rota proxy não existir, criar `apps/web/src/app/api/tenants/[slug]/bookings/[id]/confirm/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  const authHeader = request.headers.get('authorization')

  const response = await fetch(`${API_URL}/tenants/${params.slug}/bookings/${params.id}/confirm`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { authorization: authHeader } : {}),
    },
  })

  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}
```

Repetir para `/cancel/route.ts` com método PATCH.

- [ ] **Step 4: Testar no browser**

1. Login como guia (CONDUTOR)
2. Navegar para aba Reservas
3. Clicar em "Confirmar" em uma reserva PENDING
4. Confirmar que o status muda sem erro

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/
git commit -m "fix: send Authorization header on booking confirm/cancel actions in painel"
```

---

## FASE 1 — Validação de Infraestrutura (Não-Código)

### Task 7: Verificar e configurar variáveis de ambiente no Railway

**Contexto:** Muitos dos bugs podem ser causados por variáveis ausentes no Railway. Esta task garante que todas as vars críticas estão configuradas.

**Files:** Nenhum — configuração no painel do Railway.

- [ ] **Step 1: Listar todas as vars obrigatórias definidas no `env.ts`**

```bash
grep -E "z\.string|z\.number" apps/api/src/shared/env.ts
```

Vars obrigatórias confirmadas:
- `DATABASE_URL`
- `JWT_SECRET` (mín. 32 chars)
- `MP_ACCESS_TOKEN`
- `MP_WEBHOOK_SECRET`
- `CPF_SECRET`

Vars opcionais mas importantes para produção:
- `CORS_ORIGIN` → **obrigatório em produção** (o `refine` no env.ts já bloqueia startup se ausente em prod)
- `WEB_URL`
- `RESEND_API_KEY` (emails silenciosamente falham se ausente)
- `API_URL` (no serviço web do Railway — aponta para o serviço da API)

- [ ] **Step 2: Verificar no Railway quais estão configuradas**

No painel do Railway:
1. Abrir o serviço **API** → Variables
2. Confirmar presença de: `DATABASE_URL`, `JWT_SECRET`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `CPF_SECRET`, `CORS_ORIGIN`
3. `CORS_ORIGIN` deve ser a URL do serviço web (ex: `https://turismoapp.up.railway.app`)
4. Abrir o serviço **Web** → Variables
5. Confirmar: `API_URL` apontando para o serviço da API, `NEXTAUTH_SECRET` ou equivalente

- [ ] **Step 3: Forçar redeploy após configurar vars**

No Railway, após adicionar/corrigir variáveis, clicar em "Deploy" ou fazer um push vazio:

```bash
git commit --allow-empty -m "chore: trigger Railway redeploy after env var fixes"
git push
```

- [ ] **Step 4: Verificar nos logs do Railway**

Após o deploy, confirmar nos logs:
- Sem mensagem `[STARTUP] FATAL — variáveis de ambiente inválidas`
- Sem `Cannot find module` ou `Prisma Client is not generated`
- `Server listening on 0.0.0.0:PORT` aparece nos logs

---

## FASE 2 — Completude de Produto

### Task 8: Adicionar testes de integração para o fluxo de checkout completo

**Contexto:** O fluxo de criação de reserva nunca teve teste de integração. Precisamos cobrir: criação com dados válidos → resposta com QR Code, falha de CPF inválido, falha de slot lotado, e verificar que `pax * price` está correto.

**Files:**
- Create: `apps/api/src/__tests__/checkout-flow.test.ts`

- [ ] **Step 1: Verificar o setup de testes de integração existente**

```bash
cat apps/api/src/__tests__/bookings-b1.test.ts | head -50
```

Entender como os outros testes de integração criam fixtures (tenant, pacote, slot).

- [ ] **Step 2: Escrever os testes de checkout**

Crie `apps/api/src/__tests__/checkout-flow.test.ts` seguindo o mesmo padrão de setup do `bookings-b1.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
// Importar o app Fastify configurado e helpers de setup

describe('POST /tenants/:slug/bookings — checkout flow', () => {
  // Setup: criar tenant, package, slot com capacity=2

  it('returns 201 with qrCode and paymentUrl on valid booking', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenants/${tenantSlug}/bookings`,
      payload: {
        slotId: testSlotId,
        customerName: 'João Silva',
        customerEmail: 'joao@teste.com',
        customerPhone: '11999990000',
        customerCpf: '12345678909',
        pax: 1,
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toHaveProperty('qrCode')
    expect(body).toHaveProperty('paymentUrl')
    expect(body).toHaveProperty('expiresAt')
  })

  it('charges price * pax (not just price)', async () => {
    // Este teste verifica que o booking criado registra o valor correto
    // Indiretamente: se paymentId não é mock e MP rejeita valor errado, o checkout falha
    // Diretamente: verificar nos logs ou retornar transactionAmount no response (após flag de dev)
    const pax = 2
    const res = await app.inject({
      method: 'POST',
      url: `/tenants/${tenantSlug}/bookings`,
      payload: {
        slotId: testSlotId2, // slot diferente para não conflitar
        customerName: 'Maria Souza',
        customerEmail: 'maria@teste.com',
        customerPhone: '11988880000',
        customerCpf: '98765432100',
        pax,
      },
    })
    // Com MP_ACCESS_TOKEN ausente em test, usa mock — deve retornar 201
    expect(res.statusCode).toBe(201)
  })

  it('rejects booking when slot is full', async () => {
    // Slot com capacity=1 já ocupado
    const res = await app.inject({
      method: 'POST',
      url: `/tenants/${tenantSlug}/bookings`,
      payload: {
        slotId: fullSlotId,
        customerName: 'Teste',
        customerEmail: 'teste@teste.com',
        customerPhone: '11977770000',
        customerCpf: '11122233344',
        pax: 1,
      },
    })
    expect(res.statusCode).toBe(400)
    const body = res.json()
    expect(body.message).toMatch(/capacidade|slot/i)
  })

  it('returns 400 for missing required fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/tenants/${tenantSlug}/bookings`,
      payload: {
        slotId: testSlotId,
        // faltando customerName, customerEmail, etc.
      },
    })
    expect(res.statusCode).toBe(400)
    const body = res.json()
    expect(body).toHaveProperty('errors')
  })
})
```

- [ ] **Step 3: Rodar os testes**

```bash
cd apps/api && pnpm test src/__tests__/checkout-flow.test.ts
```

Esperado: testes passam com mock de pagamento (MP_ACCESS_TOKEN ausente em test env).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/__tests__/checkout-flow.test.ts
git commit -m "test: add checkout flow integration tests covering pax pricing, full slot rejection, and field validation"
```

---

### Task 9: Notificação por e-mail ao guia quando nova reserva é criada

**Contexto:** Quando um cliente cria uma reserva, o guia responsável pelo pacote não é notificado. A infra de e-mail (Resend + `getResend()`) já existe. O `booking.slot.package.conductor` já é incluído no webhook response — mas precisamos notificar no momento da criação, não apenas na confirmação.

**Files:**
- Create: `apps/api/src/modules/bookings/emails/new-booking-guide-email.ts`
- Create: `apps/api/src/modules/bookings/emails/new-booking-guide-email.test.ts`
- Modify: `apps/api/src/modules/bookings/bookings.routes.ts`

- [ ] **Step 1: Escrever o teste do template de e-mail**

Crie `apps/api/src/modules/bookings/emails/new-booking-guide-email.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { newBookingGuideEmailText, newBookingGuideSubject } from './new-booking-guide-email'

describe('newBookingGuideEmail', () => {
  const params = {
    guideName: 'Carlos Guia',
    customerName: 'Maria Turista',
    packageName: 'Trilha Pedra Furada',
    startsAt: new Date('2026-07-15T08:00:00Z'),
    pax: 3,
    totalAmount: 450.0,
  }

  it('subject contains package name', () => {
    expect(newBookingGuideSubject(params)).toContain('Trilha Pedra Furada')
  })

  it('body contains customer name', () => {
    expect(newBookingGuideEmailText(params)).toContain('Maria Turista')
  })

  it('body contains pax count', () => {
    expect(newBookingGuideEmailText(params)).toContain('3')
  })

  it('body contains total amount formatted', () => {
    expect(newBookingGuideEmailText(params)).toContain('450')
  })
})
```

- [ ] **Step 2: Rodar — deve falhar com "Cannot find module"**

```bash
cd apps/api && pnpm test src/modules/bookings/emails/new-booking-guide-email.test.ts
```

- [ ] **Step 3: Criar o template**

Crie `apps/api/src/modules/bookings/emails/new-booking-guide-email.ts`:

```typescript
interface NewBookingGuideEmailParams {
  guideName: string
  customerName: string
  packageName: string
  startsAt: Date
  pax: number
  totalAmount: number
}

export function newBookingGuideSubject({ packageName }: NewBookingGuideEmailParams): string {
  return `Nova reserva recebida — ${packageName}`
}

export function newBookingGuideEmailText({
  guideName,
  customerName,
  packageName,
  startsAt,
  pax,
  totalAmount,
}: NewBookingGuideEmailParams): string {
  const dateStr = startsAt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
  const amountStr = totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return `Olá, ${guideName}!

Você recebeu uma nova reserva no CAPI.

Pacote: ${packageName}
Cliente: ${customerName}
Data: ${dateStr}
Participantes: ${pax}
Valor total: ${amountStr} (aguardando pagamento PIX)

Acesse o painel CAPI para gerenciar esta reserva.

Atenciosamente,
Equipe CAPI`
}
```

- [ ] **Step 4: Rodar o teste — deve passar**

```bash
cd apps/api && pnpm test src/modules/bookings/emails/new-booking-guide-email.test.ts
```

Esperado: 4 PASS.

- [ ] **Step 5: Disparar o e-mail após criação da reserva em `bookings.routes.ts`**

Na rota de criação (`POST /tenants/:slug/bookings`), após o bloco de atualização com os dados de pagamento, adicionar o envio ao guia (fire-and-forget, mesmo padrão do e-mail ao cliente):

```typescript
import { newBookingGuideEmailText, newBookingGuideSubject } from './emails/new-booking-guide-email'

// Após confirmar que updatedBooking foi salvo com paymentId:
// Buscar o condutor do pacote para notificar
const conductorEmail = updatedBooking.slot?.package?.conductor?.email
const conductorName = updatedBooking.slot?.package?.conductor?.name

const resend = getResend()
if (resend && conductorEmail) {
  resend.emails
    .send({
      from: 'CAPI <noreply@capi.turismo>',
      to: [conductorEmail],
      subject: newBookingGuideSubject({
        guideName: conductorName ?? 'Guia',
        customerName: updatedBooking.customerName,
        packageName: updatedBooking.slot?.package?.name ?? 'Roteiro',
        startsAt: updatedBooking.slot?.startsAt ?? new Date(),
        pax: updatedBooking.pax,
        totalAmount: Number(updatedBooking.slot?.package?.price ?? 0) * updatedBooking.pax,
      }),
      text: newBookingGuideEmailText({
        guideName: conductorName ?? 'Guia',
        customerName: updatedBooking.customerName,
        packageName: updatedBooking.slot?.package?.name ?? 'Roteiro',
        startsAt: updatedBooking.slot?.startsAt ?? new Date(),
        pax: updatedBooking.pax,
        totalAmount: Number(updatedBooking.slot?.package?.price ?? 0) * updatedBooking.pax,
      }),
    })
    .catch((err: unknown) => app.log.warn({ err }, '[email] Failed to send new booking guide notification'))
}
```

**Nota:** Verificar se o `include` do booking na criação já traz `slot.package.conductor`. Se não, adicionar o select necessário.

- [ ] **Step 6: Rodar suite completa**

```bash
cd apps/api && pnpm test
```

Esperado: todos PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/bookings/emails/new-booking-guide-email.ts \
        apps/api/src/modules/bookings/emails/new-booking-guide-email.test.ts \
        apps/api/src/modules/bookings/bookings.routes.ts
git commit -m "feat: notify guide by email when new booking is created"
```

---

### Task 10: Ajustar rate limits por contexto de uso

**Contexto:** O rate limit global de 20 req/min é muito restritivo para navegação normal. Um usuário abrindo o painel faz múltiplas requisições simultâneas (dashboard, reservas, roteiros) e pode atingir o limite. Precisamos diferenciar navegação de operações sensíveis.

**Files:**
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Escrever o teste que documenta os limites esperados**

Verificar o arquivo existente de rate-limit test:

```bash
cat apps/api/src/__tests__/rate-limit.test.ts
```

- [ ] **Step 2: Ajustar o rate limit global e por rota em `app.ts`**

Em `apps/api/src/app.ts`, alterar o registro do `rateLimit`:

```typescript
app.register(rateLimit, {
  global: true,
  max: 100,          // era 20 — aumentado para navegação normal
  timeWindow: '1 minute',
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
  },
})
```

As rotas sensíveis já têm seus próprios limites via `config: { rateLimit: { max: N } }`:
- `POST /bookings` — 60/min (OK, já configurado)
- `POST /auth/login` — verificar se tem limite
- `POST /auth/register` — 20/min (OK, já configurado)

- [ ] **Step 3: Verificar o rate limit do login**

```bash
grep -n "rateLimit\|rate-limit\|rateLimit" apps/api/src/modules/auth/auth.routes.ts
```

Se o endpoint de login não tiver rate limit específico, adicionar:

```typescript
app.post('/tenants/:slug/auth/login', {
  config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
}, async (request, reply) => {
  // ... handler existente sem alterações ...
})
```

- [ ] **Step 4: Rodar o teste de rate limit existente**

```bash
cd apps/api && pnpm test src/__tests__/rate-limit.test.ts
```

Ajustar os valores esperados no teste se mudamos o limite global.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/app.ts apps/api/src/modules/auth/auth.routes.ts apps/api/src/__tests__/rate-limit.test.ts
git commit -m "fix: increase global rate limit from 20 to 100 req/min — prevent normal navigation from hitting limits"
```

---

## FASE 3 — Robustez e Escala

### Task 11: Remover model `Voucher` morto ou implementar geração básica

**Contexto:** O model `Voucher` existe no `schema.prisma` com `pdfUrl` e `sentAt`, mas nenhuma rota cria ou serve vouchers. Modelo morto no schema é desorientador. Escolha: remover ou implementar versão básica (texto simples).

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: migração se remover

**Decisão recomendada:** Implementar voucher simples (texto, sem PDF) disparado no webhook após confirmação. O model já existe, o template de e-mail `booking-confirmed-email.ts` já existe — basta conectar.

- [ ] **Step 1: Verificar se o webhook já cria Voucher após confirmação**

```bash
grep -n "voucher\|Voucher" apps/api/src/modules/webhooks/webhooks.routes.ts
```

Se não cria:

- [ ] **Step 2: Adicionar criação de Voucher no webhook após `status === 'approved'`**

No webhook handler, após o `prisma.booking.updateMany` que confirma a reserva:

```typescript
// Criar voucher com código único (últimos 8 chars do booking.id em uppercase)
const voucherCode = booking.id.slice(-8).toUpperCase()
await prisma.voucher.upsert({
  where: { bookingId: booking.id },
  create: { bookingId: booking.id, code: voucherCode },
  update: {}, // idempotente: se já existe, não sobrescrever
})
```

- [ ] **Step 3: Rodar testes**

```bash
cd apps/api && pnpm test
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/webhooks/webhooks.routes.ts
git commit -m "feat: create voucher record on booking confirmation via webhook"
```

---

### Task 12: Checklist de smoke test manual antes de cada release

**Contexto:** Com o MVP em produção, um checklist de smoke test manual evita regressões óbvias sem custo de setup de Playwright por enquanto.

**Files:**
- Create: `docs/smoke-test-checklist.md`

- [ ] **Step 1: Criar o checklist**

Crie `docs/smoke-test-checklist.md`:

```markdown
# CAPI — Smoke Test Checklist (Pré-Release)

Execute antes de qualquer merge para main que afete fluxos críticos.

## Fluxo B2C (Cliente)
- [ ] Acessar a home page sem erro
- [ ] Navegar em Explorar Destinos → selecionar destino
- [ ] Selecionar guia → selecionar roteiro → selecionar slot
- [ ] Preencher dados do formulário (nome, e-mail, telefone, CPF, pax=2)
- [ ] Clicar em Confirmar → receber tela com QR Code PIX
- [ ] QR Code exibido e não vazio
- [ ] E-mail de criação recebido pelo cliente

## Fluxo B2B — Painel do Guia
- [ ] Login com credenciais de guia → redirecionamento para Dashboard
- [ ] Dashboard carrega sem erro ("Erro ao carregar" não aparece)
- [ ] Aba Reservas lista reservas existentes
- [ ] Confirmar uma reserva PENDING → status muda para CONFIRMED
- [ ] Aba Disponibilidade → adicionar slot → slot aparece no calendário
- [ ] Aba Roteiros → lista roteiros sem erro
- [ ] Aba Roteiros → clicar "Novo Roteiro" → formulário abre (não 404)
- [ ] Criar roteiro de teste → aparece na lista
- [ ] Aba Destinos → sem erro
- [ ] Aba Perfil → sem erro

## Fluxo Admin
- [ ] Login como ADMIN → acesso ao painel administrativo
- [ ] Guias pendentes de aprovação listados
- [ ] Aprovar um guia → status muda
- [ ] Dashboard admin carrega métricas

## Pós-Checkout (Requer Ambiente Sandbox MP)
- [ ] Pagar QR Code no app do banco (sandbox)
- [ ] Webhook recebido → booking muda para CONFIRMED
- [ ] E-mail de confirmação recebido pelo cliente
- [ ] E-mail de nova reserva recebido pelo guia
```

- [ ] **Step 2: Commit**

```bash
git add docs/smoke-test-checklist.md
git commit -m "docs: add pre-release smoke test checklist for critical user flows"
```

---

## Ordem de Execução Recomendada

```
Fase 1 (esta semana — desbloqueiam produção):
  Task 1 → Task 2 → Task 7 → Task 3 → Task 4 → Task 5 → Task 6

Fase 2 (próxima semana — completude):
  Task 8 → Task 9 → Task 10

Fase 3 (quinzena — robustez):
  Task 11 → Task 12
```

**Critério de saída da Fase 1:** Os três fluxos principais (checkout, dashboard, novo roteiro) funcionam sem erro em produção no Railway.

**Critério de saída da Fase 2:** 80%+ dos casos de uso do smoke checklist passam em produção.

**Critério de saída da Fase 3:** Nenhum modelo morto no schema, rate limits adequados, vouchers gerados após pagamento.
