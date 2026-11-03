# CAPI — Plano de Melhoria Full-Stack

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevar a plataforma CAPI de MVP funcional para produto pronto para produção, cobrindo segurança, qualidade de código, infra CI/CD, testes, observabilidade e polish de frontend.

**Architecture:** A CAPI é um monorepo pnpm + Turborepo com API Fastify 5 (Railway) e Web Next.js 16.2 (Vercel). O plano segue 6 sprints priorizados por impacto: fundação → qualidade backend → CI/CD → testes → segurança → polish. Cada task produz mudanças testáveis e commitáveis independentemente.

**Tech Stack:** Fastify 5, Prisma 7, PostgreSQL 16, Next.js 16.2, React 19, Tailwind CSS 4, Zod 4, Vitest, GitHub Actions, Mercado Pago PIX, Sentry, PostHog, OpenTelemetry, Pino, Resend, Cloudflare R2.

---

## File Structure Overview

### New Files (API)
- `apps/api/src/shared/utils/zod-error.ts` — centralizar zodError helper
- `apps/api/src/modules/bookings/routes/create.route.ts` — booking create saga
- `apps/api/src/modules/bookings/routes/self-service.route.ts` — self-service lookup
- `apps/api/src/modules/bookings/routes/cancel.route.ts` — cancel by token
- `apps/api/src/modules/bookings/routes/repay.route.ts` — repay PIX
- `apps/api/src/modules/bookings/routes/admin.route.ts` — admin list/confirm/cancel
- `apps/api/src/modules/bookings/booking.service.ts` — lógica extraída dos handlers
- `apps/api/src/__tests__/webhooks.test.ts` — testes de webhook
- `apps/api/src/__tests__/auth.test.ts` — testes de auth
- `apps/api/src/__tests__/guides.test.ts` — testes de guides
- `apps/api/src/__tests__/users-lgpd.test.ts` — testes LGPD

### New Files (Web)
- `apps/web/src/lib/api.ts` — HTTP client centralizado
- `apps/web/src/components/ui/capi/Toast.tsx` — toast notification system
- `apps/web/app/politica-privacidade/page.tsx` — política de privacidade LGPD
- `apps/web/src/components/providers/ConsentBanner.tsx` — consent banner LGPD

### New Files (Infra)
- `.github/workflows/ci.yml` — pipeline CI/CD
- `apps/api/railway.toml` — Railway config com watch paths
- `apps/web/vercel.json` — Vercel config com ignored build step

### Modified Files (API)
- `apps/api/src/modules/bookings/bookings.routes.ts` — refatorar para barrel de sub-rotas
- `apps/api/src/modules/bookings/bookings.schemas.ts` — expandir com create schema
- `apps/api/src/shared/env.ts` — adicionar NEXT_PUBLIC_CONSENT vars
- `apps/api/src/app.ts` — registrar sub-rotas refatoradas
- `apps/api/vitest.config.ts` — adicionar coverage threshold

### Modified Files (Web)
- `apps/web/src/app/layout.tsx` — integrar ConsentBanner
- `apps/web/src/components/providers/PostHogProvider.tsx` — condicionar a consent

### Modified Files (Root)
- `turbo.json` — adicionar tasks lint, test, typecheck
- `package.json` — adicionar scripts lint, test, typecheck

---

## Sprint 1 — Fundação

### Task 1: Centralizar zodError helper

**Files:**
- Create: `apps/api/src/shared/utils/zod-error.ts`
- Modify: `apps/api/src/modules/bookings/bookings.routes.ts`
- Modify: `apps/api/src/modules/destinations/destinations.routes.ts`
- Modify: `apps/api/src/modules/packages/packages.routes.ts`
- Modify: `apps/api/src/modules/guides/guides.routes.ts`
- Modify: `apps/api/src/modules/tenants/tenants.routes.ts`
- Modify: `apps/api/src/modules/auth/auth.routes.ts`

- [ ] **Step 1: Criar o helper centralizado**

```typescript
// apps/api/src/shared/utils/zod-error.ts
import { ZodError } from 'zod'

export function zodError(err: ZodError) {
  return {
    message: 'Dados inválidos',
    errors: err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  }
}
```

- [ ] **Step 2: Criar helper parseBody/parseParams/parseQuery para eliminar try-catch repetido**

```typescript
// Adicionar ao mesmo arquivo apps/api/src/shared/utils/zod-error.ts
import { FastifyReply } from 'fastify'
import { z, ZodError } from 'zod'

export function zodError(err: ZodError) {
  return {
    message: 'Dados inválidos',
    errors: err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  }
}

export function parseBody<T extends z.ZodType>(
  schema: T,
  data: unknown,
  reply: FastifyReply
): { data: z.infer<T>; error: false } | { data: null; error: true } {
  const result = schema.safeParse(data)
  if (!result.success) {
    reply.status(400).send(zodError(result.error))
    return { data: null, error: true }
  }
  return { data: result.data, error: false }
}

export function parseParams<T extends z.ZodType>(
  schema: T,
  data: unknown,
  reply: FastifyReply
): { data: z.infer<T>; error: false } | { data: null; error: true } {
  return parseBody(schema, data, reply)
}

export function parseQuery<T extends z.ZodType>(
  schema: T,
  data: unknown,
  reply: FastifyReply
): { data: z.infer<T>; error: false } | { data: null; error: true } {
  return parseBody(schema, data, reply)
}
```

- [ ] **Step 3: Atualizar cada módulo para usar o helper centralizado**

Em cada arquivo de rotas, substituir a função local `zodError` e os blocos try-catch por:

```typescript
// Exemplo em qualquer route file:
import { zodError, parseParams, parseBody } from '../../shared/utils/zod-error'

// ANTES:
let params
try {
  params = slugParamsSchema.parse(request.params)
} catch (err) {
  if (err instanceof ZodError) return reply.status(400).send(zodError(err))
  throw err
}

// DEPOIS:
const { data: params, error } = parseParams(slugParamsSchema, request.params, reply)
if (error) return
```

Arquivos a atualizar (remover a função local `zodError` de cada um):
- `apps/api/src/modules/bookings/bookings.routes.ts`
- `apps/api/src/modules/destinations/destinations.routes.ts`
- `apps/api/src/modules/packages/packages.routes.ts`
- `apps/api/src/modules/guides/guides.routes.ts`
- `apps/api/src/modules/tenants/tenants.routes.ts`
- `apps/api/src/modules/auth/auth.routes.ts`

**Nota:** packages.routes.ts e destinations.routes.ts já usam `parseParams` importado — verificar se é o mesmo pattern. Se sim, apenas redirecionar o import para o shared.

- [ ] **Step 4: Rodar testes existentes**

Run: `cd apps/api && pnpm test`
Expected: Todos os testes passam — a mudança é puramente de import.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/shared/utils/zod-error.ts apps/api/src/modules/*/
git commit -m "refactor(api): centralizar zodError e parse helpers no shared layer"
```

---

### Task 2: Criar HTTP client centralizado no frontend

**Files:**
- Create: `apps/web/src/lib/api.ts`

- [ ] **Step 1: Criar o client**

```typescript
// apps/web/src/lib/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
  ) {
    super(`API error ${status}`)
    this.name = 'ApiError'
  }
}

type FetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  token?: string
}

export async function api<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { body, token, headers: customHeaders, ...rest } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders as Record<string, string>,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new ApiError(response.status, data)
  }

  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}
```

- [ ] **Step 2: Verificar build do web**

Run: `cd apps/web && pnpm build`
Expected: Build completa sem erros (o módulo é importável mas ainda não usado).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/api.ts
git commit -m "feat(web): criar HTTP client centralizado em lib/api.ts"
```

---

### Task 3: LGPD Consent Banner + Política de Privacidade

**Files:**
- Create: `apps/web/src/components/providers/ConsentBanner.tsx`
- Create: `apps/web/app/politica-privacidade/page.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/components/providers/PostHogProvider.tsx`

- [ ] **Step 1: Criar ConsentBanner component**

```tsx
// apps/web/src/components/providers/ConsentBanner.tsx
'use client'

import { useState, useEffect } from 'react'

const CONSENT_KEY = 'capi-cookie-consent'

type Consent = 'accepted' | 'rejected' | null

export function useConsent(): Consent {
  const [consent, setConsent] = useState<Consent>(null)
  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY)
    if (stored === 'accepted' || stored === 'rejected') {
      setConsent(stored)
    }
  }, [])
  return consent
}

export function ConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY)
    if (!stored) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setVisible(false)
    window.location.reload()
  }

  function reject() {
    localStorage.setItem(CONSENT_KEY, 'rejected')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Consentimento de cookies"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '1rem',
        background: 'var(--capi-surface, #FDF8F3)',
        borderTop: '1px solid var(--capi-border, #E8DDD0)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        fontSize: '0.875rem',
      }}
    >
      <p style={{ margin: 0, maxWidth: '600px' }}>
        Usamos cookies para melhorar sua experiência e analisar o uso do site.
        Veja nossa{' '}
        <a href="/politica-privacidade" style={{ textDecoration: 'underline' }}>
          política de privacidade
        </a>.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={accept}
          style={{
            padding: '0.5rem 1rem',
            background: '#C4852A',
            color: '#fff',
            border: 'none',
            borderRadius: '9999px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Aceitar
        </button>
        <button
          onClick={reject}
          style={{
            padding: '0.5rem 1rem',
            background: 'transparent',
            border: '1px solid #C4852A',
            color: '#C4852A',
            borderRadius: '9999px',
            cursor: 'pointer',
          }}
        >
          Recusar
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar página de política de privacidade**

```tsx
// apps/web/app/politica-privacidade/page.tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidade — CAPI',
}

export default function PoliticaPrivacidade() {
  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Política de Privacidade</h1>
      <p><strong>Última atualização:</strong> Outubro 2026</p>

      <h2>1. Dados coletados</h2>
      <p>
        Coletamos os dados necessários para a prestação do serviço de reservas turísticas:
        nome, e-mail, CPF (armazenado de forma hasheada), dados de reserva e pagamento.
      </p>

      <h2>2. Finalidade</h2>
      <p>
        Os dados são utilizados para processar reservas, enviar confirmações por e-mail,
        prevenir fraudes e melhorar a experiência do usuário na plataforma.
      </p>

      <h2>3. Cookies e analytics</h2>
      <p>
        Utilizamos cookies de analytics (PostHog) apenas com seu consentimento explícito.
        Você pode revogar o consentimento a qualquer momento limpando os cookies do navegador.
        Utilizamos Sentry para monitoramento de erros técnicos, o que é necessário para
        o funcionamento adequado da plataforma (base legal: legítimo interesse).
      </p>

      <h2>4. Compartilhamento</h2>
      <p>
        Seus dados são compartilhados apenas com os prestadores necessários:
        Mercado Pago (pagamentos), Resend (e-mails transacionais), Cloudflare (armazenamento de fotos).
        Não vendemos seus dados a terceiros.
      </p>

      <h2>5. Seus direitos (LGPD Art. 18)</h2>
      <p>
        Você tem direito a: acessar seus dados, solicitar correção, solicitar exclusão/anonimização,
        revogar consentimento e portabilidade. Para exercer seus direitos,
        entre em contato pelo e-mail indicado abaixo.
      </p>

      <h2>6. Retenção</h2>
      <p>
        Dados de reservas são mantidos para fins fiscais e legais. Ao solicitar exclusão,
        seus dados pessoais são anonimizados — o histórico de transações é preservado
        de forma não identificável.
      </p>

      <h2>7. Segurança</h2>
      <p>
        Utilizamos criptografia em trânsito (HTTPS/TLS), senhas hasheadas com bcrypt,
        CPFs hasheados com SHA-256 + salt, e validação de webhooks com HMAC-SHA256.
      </p>

      <h2>8. Contato</h2>
      <p>
        Para questões sobre privacidade: privacidade@capi.turismo
      </p>
    </main>
  )
}
```

- [ ] **Step 3: Condicionar PostHog ao consentimento**

No `PostHogProvider.tsx`, adicionar check de consent antes de inicializar:

```tsx
// Adicionar no PostHogProvider.tsx, antes do posthog.init():
const consent = typeof window !== 'undefined' ? localStorage.getItem('capi-cookie-consent') : null
if (consent !== 'accepted') return null // não inicializa PostHog sem consent
```

- [ ] **Step 4: Adicionar ConsentBanner ao layout root**

No `apps/web/src/app/layout.tsx` (ou `apps/web/app/layout.tsx`), adicionar:

```tsx
import { ConsentBanner } from '../src/components/providers/ConsentBanner'
// ... dentro do body, antes do </body>:
<ConsentBanner />
```

- [ ] **Step 5: Testar manualmente**

1. Abrir o site — consent banner deve aparecer
2. Clicar "Recusar" — banner desaparece, PostHog NÃO inicializa
3. Limpar localStorage — banner reaparece
4. Clicar "Aceitar" — PostHog inicializa após reload
5. Visitar /politica-privacidade — página renderiza corretamente

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/providers/ConsentBanner.tsx apps/web/app/politica-privacidade/page.tsx
git add apps/web/src/components/providers/PostHogProvider.tsx apps/web/app/layout.tsx
git commit -m "feat(web): adicionar consent banner LGPD e política de privacidade"
```

---

### Task 4: Adicionar idempotency no booking create

**Files:**
- Modify: `apps/api/src/modules/bookings/bookings.routes.ts:76-338`
- Modify: `apps/api/src/modules/bookings/bookings.schemas.ts`

- [ ] **Step 1: Adicionar idempotencyKey ao schema de criação**

```typescript
// Adicionar em apps/api/src/modules/bookings/bookings.schemas.ts:
export const createBookingBodySchema = z.object({
  slotId: z.string().min(1, { message: 'slotId é obrigatório' }),
  customerName: z.string().min(1, { message: 'Nome é obrigatório' }),
  customerEmail: z.string().email({ message: 'Email inválido' }),
  customerPhone: z.string().optional(),
  cpf: z.string().regex(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos numéricos' }),
  pax: z.coerce.number().int().positive({ message: 'Quantidade de pessoas deve ser positiva' }),
  idempotencyKey: z.string().min(8).max(64).optional(),
})

export type CreateBookingBody = z.infer<typeof createBookingBodySchema>
```

- [ ] **Step 2: Adicionar check de idempotência no handler**

No início do handler POST `/tenants/:slug/bookings` (linha ~76 de bookings.routes.ts), após validar o body, adicionar:

```typescript
// Se idempotencyKey fornecida, verificar se booking já existe
if (body.idempotencyKey) {
  const existing = await prisma.booking.findFirst({
    where: {
      tenantId: tenant.id,
      idempotencyKey: body.idempotencyKey,
    },
    select: {
      id: true,
      status: true,
      paymentUrl: true,
      qrCode: true,
    },
  })
  if (existing) {
    return reply.status(200).send({
      booking: existing,
      message: 'Reserva já existente (idempotent)',
      deduplicated: true,
    })
  }
}
```

- [ ] **Step 3: Adicionar campo idempotencyKey ao Prisma schema**

```prisma
// Em apps/api/prisma/schema.prisma, no model Booking:
  idempotencyKey String?

  @@index([tenantId, idempotencyKey])
```

- [ ] **Step 4: Gerar migration e aplicar**

Run: `cd apps/api && npx prisma migrate dev --name add-booking-idempotency-key`
Expected: Migration criada e aplicada com sucesso.

- [ ] **Step 5: Salvar idempotencyKey ao criar booking**

No Tx2 do handler de create (onde o booking é criado via `prisma.booking.create`), adicionar o campo:

```typescript
data: {
  // ... campos existentes ...
  idempotencyKey: body.idempotencyKey ?? null,
}
```

- [ ] **Step 6: Rodar testes existentes**

Run: `cd apps/api && pnpm test`
Expected: Todos os testes passam — idempotencyKey é opcional.

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma/ apps/api/src/modules/bookings/
git commit -m "feat(api): adicionar idempotency key no booking create"
```

---

## Sprint 2 — Refatoração Backend

### Task 5: Extrair booking service layer

**Files:**
- Create: `apps/api/src/modules/bookings/booking.service.ts`
- Modify: `apps/api/src/modules/bookings/bookings.routes.ts`

- [ ] **Step 1: Criar booking.service.ts com tipos e interface**

```typescript
// apps/api/src/modules/bookings/booking.service.ts
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { hashCpf } from '../../shared/utils/hash'
import * as paymentService from '../../services/payment.service'
import { randomBytes } from 'crypto'
import { auditLog } from '../../shared/audit.js'
import { bookingsCreatedCounter } from '../../shared/metrics.js'

export interface CreateBookingInput {
  tenantId: string
  tenantSlug: string
  slotId: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  cpf: string
  pax: number
  idempotencyKey?: string
}

export interface CreateBookingResult {
  booking: {
    id: string
    status: string
    paymentUrl: string
    qrCode: string
    expiresAt: Date | null
  }
  paymentUrl: string
  qrCode: string
  cancelToken: string
}
```

- [ ] **Step 2: Mover a lógica de criação para o service**

Extrair a saga de 3 fases (linhas ~90-335 do bookings.routes.ts) para o método `BookingService.create()`. A lógica inclui:
1. Validação de CPF
2. Tx1: SELECT FOR UPDATE no slot + validação de capacidade
3. Criação do PIX no Mercado Pago
4. Tx2: Criar booking com paymentId
5. Compensação em caso de falha do Tx2

```typescript
// Continuar em booking.service.ts:
export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  // Mover toda a lógica do handler aqui, substituindo request/reply
  // por parâmetros explícitos e throws ao invés de reply.status()
  
  // ... (copiar a lógica existente do handler, adaptando)
  // Onde antes fazia reply.status(400).send({...}), agora faz:
  // throw new AppError('mensagem', 400)
  
  // Retornar o resultado ao invés de reply.send()
}
```

**Nota para o implementador:** Este é um refactor extract-method. Copiar a lógica existente das linhas 90-335 de bookings.routes.ts, substituir `reply.status().send()` por `throw new AppError()` para erros e `return` para sucesso. O handler na rota passa a ser apenas:

```typescript
app.post('/tenants/:slug/bookings', { ... }, async (request, reply) => {
  // validação do body com Zod (mantém no handler)
  // chamar service
  const result = await createBooking({ tenantId: tenant.id, tenantSlug: slug, ...body })
  // enviar emails (mantém fire-and-forget no handler)
  return reply.status(201).send(result)
})
```

- [ ] **Step 3: Rodar testes existentes**

Run: `cd apps/api && pnpm test`
Expected: Todos os testes de booking passam — comportamento não mudou.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/bookings/booking.service.ts apps/api/src/modules/bookings/bookings.routes.ts
git commit -m "refactor(api): extrair booking service layer do handler monolítico"
```

---

### Task 6: Quebrar bookings.routes.ts em sub-rotas

**Files:**
- Create: `apps/api/src/modules/bookings/routes/create.route.ts`
- Create: `apps/api/src/modules/bookings/routes/self-service.route.ts`
- Create: `apps/api/src/modules/bookings/routes/cancel.route.ts`
- Create: `apps/api/src/modules/bookings/routes/repay.route.ts`
- Create: `apps/api/src/modules/bookings/routes/admin.route.ts`
- Modify: `apps/api/src/modules/bookings/bookings.routes.ts` — transformar em barrel

- [ ] **Step 1: Criar cada sub-rota**

Cada arquivo contém uma função `export async function xxxRoute(app: FastifyInstance)` que registra as rotas relevantes:

- `create.route.ts`: POST `/tenants/:slug/bookings` (linhas 76-338)
- `self-service.route.ts`: POST `/tenants/:slug/bookings/self-service` (linhas 339-403)
- `cancel.route.ts`: POST `/tenants/:slug/bookings/cancel-self` (linhas 404-492)
- `repay.route.ts`: POST `/tenants/:slug/bookings/repay` (linhas 493-613)
- `admin.route.ts`: GET `/tenants/:slug/bookings` (linha 614), PATCH confirm (664), PATCH cancel (732), GET single (784)

- [ ] **Step 2: Transformar bookings.routes.ts em barrel**

```typescript
// apps/api/src/modules/bookings/bookings.routes.ts
import { FastifyInstance } from 'fastify'
import { createBookingRoute } from './routes/create.route'
import { selfServiceRoute } from './routes/self-service.route'
import { cancelSelfRoute } from './routes/cancel.route'
import { repayRoute } from './routes/repay.route'
import { adminBookingsRoute } from './routes/admin.route'

export async function bookingsRoutes(app: FastifyInstance) {
  await app.register(createBookingRoute)
  await app.register(selfServiceRoute)
  await app.register(cancelSelfRoute)
  await app.register(repayRoute)
  await app.register(adminBookingsRoute)
}
```

- [ ] **Step 3: Verificar que app.ts não precisa de mudanças**

O `app.ts` importa `bookingsRoutes` de `./modules/bookings/bookings.routes` — o barrel mantém o mesmo export. Nenhuma mudança necessária.

- [ ] **Step 4: Rodar testes existentes**

Run: `cd apps/api && pnpm test`
Expected: Todos os testes passam — endpoints idênticos, apenas reorganizados.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/bookings/routes/ apps/api/src/modules/bookings/bookings.routes.ts
git commit -m "refactor(api): quebrar bookings.routes.ts em 5 sub-rotas coesas"
```

---

### Task 7: Adicionar paginação cursor-based nas listagens

**Files:**
- Modify: `apps/api/src/modules/bookings/routes/admin.route.ts`
- Modify: `apps/api/src/modules/packages/packages.routes.ts`
- Modify: `apps/api/src/modules/guides/guides.routes.ts`

- [ ] **Step 1: Criar schema de paginação reutilizável**

```typescript
// Adicionar em apps/api/src/shared/utils/zod-error.ts (ou criar pagination.ts separado)
import { z } from 'zod'

export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export function paginatedResponse<T>(items: T[], limit: number) {
  const hasMore = items.length > limit
  const data = hasMore ? items.slice(0, limit) : items
  const nextCursor = hasMore ? (data[data.length - 1] as { id: string }).id : null
  return { data, nextCursor, hasMore }
}
```

- [ ] **Step 2: Aplicar no GET /tenants/:slug/bookings**

```typescript
// Na admin.route.ts, no handler GET /tenants/:slug/bookings:
const { data: query, error: qErr } = parseQuery(paginationQuerySchema, request.query, reply)
if (qErr) return

const bookings = await prisma.booking.findMany({
  where: { tenantId: tenant.id },
  take: query.limit + 1, // +1 para detectar hasMore
  ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  orderBy: { createdAt: 'desc' },
  select: { /* campos existentes */ },
})

return reply.status(200).send(paginatedResponse(bookings, query.limit))
```

- [ ] **Step 3: Aplicar no GET /tenants/:slug/packages e GET /tenants/:slug/guides**

Mesmo pattern — adicionar `paginationQuerySchema` como query validation e usar `paginatedResponse()`.

- [ ] **Step 4: Rodar testes existentes**

Run: `cd apps/api && pnpm test`
Expected: Testes passam — sem cursor, comportamento default (limit 20) é compatível.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/shared/utils/ apps/api/src/modules/
git commit -m "feat(api): adicionar paginação cursor-based em listagens de bookings, packages e guides"
```

---

## Sprint 3 — CI/CD e Infra

### Task 8: Criar pipeline CI/CD com GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `turbo.json`
- Modify: `package.json`

- [ ] **Step 1: Adicionar tasks no turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "cache": false
    }
  }
}
```

- [ ] **Step 2: Adicionar scripts no root package.json**

```json
{
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test"
  }
}
```

- [ ] **Step 3: Adicionar scripts em cada app package.json**

Em `apps/api/package.json`:
```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit"
  }
}
```

Em `apps/web/package.json` (se não existir):
```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "next lint"
  }
}
```

- [ ] **Step 4: Criar GitHub Actions workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: turismo
          POSTGRES_PASSWORD: turismo123
          POSTGRES_DB: turismo_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

    env:
      DATABASE_URL: postgresql://turismo:turismo123@localhost:5432/turismo_test
      JWT_SECRET: ci-test-secret-minimum-32-characters-xxxx
      MP_ACCESS_TOKEN: ""
      MP_WEBHOOK_SECRET: test-webhook-secret
      CPF_SECRET: test-cpf-secret
      ANONYMIZATION_SALT: test-anonymization-salt
      CLOUDFLARE_ACCOUNT_ID: test
      CLOUDFLARE_API_TOKEN: test
      R2_BUCKET_NAME: test
      R2_PUBLIC_URL: https://test.r2.dev
      NODE_ENV: test

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Generate Prisma client
        run: pnpm --filter @turismo/api exec prisma generate

      - name: Run migrations
        run: pnpm --filter @turismo/api exec prisma migrate deploy

      - name: Typecheck
        run: pnpm typecheck

      - name: Test API
        run: pnpm --filter @turismo/api test

      - name: Build
        run: pnpm build
```

- [ ] **Step 5: Testar localmente o workflow (dry run)**

Run: `pnpm typecheck && pnpm --filter @turismo/api test && pnpm build`
Expected: Todos os steps passam.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml turbo.json package.json apps/api/package.json apps/web/package.json
git commit -m "feat(infra): adicionar pipeline CI/CD com GitHub Actions"
```

---

### Task 9: Configurar Railway e Vercel para monorepo

**Files:**
- Create: `apps/api/railway.toml`
- Create: `apps/web/vercel.json`

- [ ] **Step 1: Criar railway.toml para API**

```toml
# apps/api/railway.toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "../../Dockerfile"
watchPatterns = ["apps/api/**", "package.json", "pnpm-lock.yaml"]

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

- [ ] **Step 2: Criar vercel.json para Web**

```json
{
  "ignoreCommand": "npx turbo-ignore"
}
```

Isso faz o Vercel pular builds quando apenas `apps/api/` mudou.

- [ ] **Step 3: Commit**

```bash
git add apps/api/railway.toml apps/web/vercel.json
git commit -m "feat(infra): configurar Railway watch paths e Vercel ignore command"
```

---

## Sprint 4 — Testes

### Task 10: Testes de webhook Mercado Pago

**Files:**
- Create: `apps/api/src/__tests__/webhooks.test.ts`

- [ ] **Step 1: Escrever testes de webhook**

```typescript
// apps/api/src/__tests__/webhooks.test.ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import crypto from 'node:crypto'
import { buildApp, TEST_JWT_SECRET } from './helpers/build-app'
import { webhooksRoutes } from '../modules/webhooks/webhooks.routes'
import { FastifyInstance } from 'fastify'
import rawBody from 'fastify-raw-body'

const WEBHOOK_SECRET = 'test-webhook-secret-for-hmac'

function buildWebhookApp(): FastifyInstance {
  const app = buildApp(webhooksRoutes)
  // webhooks need rawBody plugin
  app.register(rawBody, { global: false, encoding: false, runFirst: true })
  return app
}

function makeSignature(paymentId: string, ts: string): string {
  const manifest = `id:${paymentId};request-date:${ts};`
  const hash = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(manifest)
    .digest('hex')
  return `ts=${ts},v1=${hash}`
}

describe('Webhooks - Mercado Pago', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    process.env.MP_WEBHOOK_SECRET = WEBHOOK_SECRET
    app = buildWebhookApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('rejects request without x-signature header', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/mercadopago',
      payload: { action: 'payment.updated', data: { id: '123' } },
    })
    expect(res.statusCode).toBe(401)
  })

  it('rejects request with invalid HMAC signature', async () => {
    const ts = String(Math.floor(Date.now() / 1000))
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/mercadopago',
      headers: {
        'x-signature': `ts=${ts},v1=invalidsignature`,
        'x-request-id': '123',
      },
      payload: { action: 'payment.updated', data: { id: '123' } },
    })
    expect(res.statusCode).toBe(401)
  })

  it('rejects request with expired timestamp (>300s)', async () => {
    const ts = String(Math.floor(Date.now() / 1000) - 400)
    const sig = makeSignature('123', ts)
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/mercadopago',
      headers: {
        'x-signature': sig,
        'x-request-id': '123',
      },
      payload: { action: 'payment.updated', data: { id: '123' } },
    })
    expect(res.statusCode).toBe(401)
  })

  it('accepts request with valid HMAC and returns 200 for non-payment action', async () => {
    const paymentId = '456'
    const ts = String(Math.floor(Date.now() / 1000))
    const sig = makeSignature(paymentId, ts)
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/mercadopago',
      headers: {
        'x-signature': sig,
        'x-request-id': paymentId,
      },
      payload: { action: 'test.created', data: { id: paymentId } },
    })
    // Should be 200 — valid signature but non-payment action
    expect(res.statusCode).toBe(200)
  })
})
```

- [ ] **Step 2: Rodar o teste**

Run: `cd apps/api && pnpm vitest run src/__tests__/webhooks.test.ts`
Expected: Testes passam (ou falham por detalhes de setup — ajustar conforme necessário).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/__tests__/webhooks.test.ts
git commit -m "test(api): adicionar testes de webhook Mercado Pago (HMAC, replay, signature)"
```

---

### Task 11: Testes de auth routes

**Files:**
- Create: `apps/api/src/__tests__/auth.test.ts`

- [ ] **Step 1: Escrever testes de auth**

```typescript
// apps/api/src/__tests__/auth.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp, TEST_JWT_SECRET } from './helpers/build-app'
import { authRoutes } from '../modules/auth/auth.routes'
import { FastifyInstance } from 'fastify'

describe('Auth routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = buildApp(authRoutes)
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /auth/login with missing fields returns 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /auth/login with invalid email returns 400 or 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'invalid', password: 'password123' },
    })
    expect([400, 401]).toContain(res.statusCode)
  })

  it('GET /auth/me without token returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/auth/me',
    })
    expect(res.statusCode).toBe(401)
  })

  it('POST /auth/register-independent with weak email returns 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/register-independent',
      payload: {
        email: 'not-an-email',
        password: 'short',
        name: 'Test',
      },
    })
    expect(res.statusCode).toBe(400)
  })
})
```

- [ ] **Step 2: Rodar o teste**

Run: `cd apps/api && pnpm vitest run src/__tests__/auth.test.ts`
Expected: Testes passam.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/__tests__/auth.test.ts
git commit -m "test(api): adicionar testes de auth routes (login, me, register)"
```

---

### Task 12: Testes de guides routes

**Files:**
- Create: `apps/api/src/__tests__/guides.test.ts`

- [ ] **Step 1: Escrever testes de guides**

```typescript
// apps/api/src/__tests__/guides.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from './helpers/build-app'
import { guidesRoutes } from '../modules/guides/guides.routes'
import { FastifyInstance } from 'fastify'

describe('Guides routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = buildApp(guidesRoutes)
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /tenants/:slug/guides with nonexistent tenant returns 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/nonexistent-slug/guides',
    })
    expect(res.statusCode).toBe(404)
  })

  it('GET /tenants/:slug/guides/:id with nonexistent guide returns 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/nonexistent-slug/guides/nonexistent-id',
    })
    expect(res.statusCode).toBe(404)
  })

  it('GET /tenants/:slug/admin/guides without auth returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/any-slug/admin/guides',
    })
    expect(res.statusCode).toBe(401)
  })

  it('PATCH /tenants/:slug/admin/guides/:id/approve without auth returns 401', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/tenants/any-slug/admin/guides/some-id/approve',
    })
    expect(res.statusCode).toBe(401)
  })
})
```

- [ ] **Step 2: Rodar o teste**

Run: `cd apps/api && pnpm vitest run src/__tests__/guides.test.ts`
Expected: Testes passam.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/__tests__/guides.test.ts
git commit -m "test(api): adicionar testes de guides routes (public, admin, auth)"
```

---

### Task 13: Testes de LGPD (users routes)

**Files:**
- Create: `apps/api/src/__tests__/users-lgpd.test.ts`

- [ ] **Step 1: Escrever testes de LGPD**

```typescript
// apps/api/src/__tests__/users-lgpd.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from './helpers/build-app'
import { usersRoutes } from '../modules/users/users.routes'
import { FastifyInstance } from 'fastify'

describe('Users LGPD routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = buildApp(usersRoutes)
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /tenants/:slug/users/me/export without auth returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/tenants/any-slug/users/me/export',
    })
    expect(res.statusCode).toBe(401)
  })

  it('DELETE /tenants/:slug/users/me without auth returns 401', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/tenants/any-slug/users/me',
    })
    expect(res.statusCode).toBe(401)
  })
})
```

- [ ] **Step 2: Rodar o teste**

Run: `cd apps/api && pnpm vitest run src/__tests__/users-lgpd.test.ts`
Expected: Testes passam.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/__tests__/users-lgpd.test.ts
git commit -m "test(api): adicionar testes de rotas LGPD (export, anonymization)"
```

---

### Task 14: Configurar coverage threshold

**Files:**
- Modify: `apps/api/vitest.config.ts`

- [ ] **Step 1: Adicionar thresholds**

```typescript
// apps/api/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/modules/**/*.ts', 'src/services/**/*.ts', 'src/shared/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 50,
        lines: 50,
      },
    },
  },
})
```

- [ ] **Step 2: Rodar com coverage**

Run: `cd apps/api && pnpm vitest run --coverage`
Expected: Report de coverage gerado — thresholds iniciais propositalmente baixos para não bloquear CI.

- [ ] **Step 3: Commit**

```bash
git add apps/api/vitest.config.ts
git commit -m "feat(api): configurar coverage thresholds no vitest (50% initial)"
```

---

## Sprint 5 — Segurança

### Task 15: Adicionar auth no booking create

**Files:**
- Modify: `apps/api/src/modules/bookings/routes/create.route.ts` (ou bookings.routes.ts se Task 6 não executada)

- [ ] **Step 1: Adicionar email verification opcional no booking create**

A estratégia é: se o usuário está autenticado (JWT), usar os dados do token. Se não, exigir confirmação por código enviado por email (similar ao self-service pattern já existente).

Para MVP, adicionar um check mais simples — rate limit mais agressivo por email:

```typescript
// No handler POST /tenants/:slug/bookings, adicionar:
// Rate limit por email para prevenir abuso sem auth
const recentBookings = await prisma.booking.count({
  where: {
    customerEmail: body.customerEmail,
    tenantId: tenant.id,
    createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // última hora
    status: { in: ['PENDING', 'CONFIRMED'] },
  },
})

if (recentBookings >= 3) {
  throw new AppError('Limite de reservas por hora atingido para este email', 429)
}
```

- [ ] **Step 2: Rodar testes**

Run: `cd apps/api && pnpm test`
Expected: Testes passam — limite de 3 por hora não é atingido nos testes.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/bookings/
git commit -m "feat(api): adicionar rate limit por email no booking create (anti-abuse)"
```

---

### Task 16: Adicionar expiração ao cancelToken

**Files:**
- Modify: `apps/api/src/modules/bookings/routes/cancel.route.ts` (ou bookings.routes.ts)

- [ ] **Step 1: Adicionar campo cancelTokenExpiresAt ao Prisma schema**

```prisma
// Em apps/api/prisma/schema.prisma, no model Booking:
  cancelTokenExpiresAt DateTime?
```

- [ ] **Step 2: Gerar e aplicar migration**

Run: `cd apps/api && npx prisma migrate dev --name add-cancel-token-expiry`
Expected: Migration criada.

- [ ] **Step 3: Definir expiração ao criar booking**

No handler de create (ou booking.service.ts), ao gerar o cancelToken, também definir expiresAt:

```typescript
cancelTokenExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 horas
```

- [ ] **Step 4: Verificar expiração no cancel handler**

```typescript
// No handler cancel-self, após encontrar o booking pelo token:
if (booking.cancelTokenExpiresAt && booking.cancelTokenExpiresAt < new Date()) {
  throw new AppError('Token de cancelamento expirado. Entre em contato com a operadora.', 410)
}
```

- [ ] **Step 5: Rodar testes**

Run: `cd apps/api && pnpm test`
Expected: Testes passam — bookings existentes têm cancelTokenExpiresAt = null (bypass).

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/ apps/api/src/modules/bookings/
git commit -m "feat(api): adicionar expiração de 48h ao cancelToken de booking"
```

---

## Sprint 6 — Observabilidade e Polish

### Task 17: Expandir métricas de negócio no OTel

**Files:**
- Modify: `apps/api/src/shared/metrics.ts`
- Modify: `apps/api/src/modules/bookings/routes/create.route.ts`
- Modify: `apps/api/src/modules/bookings/routes/cancel.route.ts`
- Modify: `apps/api/src/modules/bookings/expiry.job.ts`

- [ ] **Step 1: Adicionar novos counters**

```typescript
// Em apps/api/src/shared/metrics.ts, adicionar:
import { metrics } from '@opentelemetry/api'

const meter = metrics.getMeter('capi-api')

export const bookingsCreatedCounter = meter.createCounter('bookings_created_total', {
  description: 'Total de bookings criadas',
})

export const bookingsCancelledCounter = meter.createCounter('bookings_cancelled_total', {
  description: 'Total de bookings canceladas',
})

export const bookingsExpiredCounter = meter.createCounter('bookings_expired_total', {
  description: 'Total de bookings expiradas',
})

export const bookingsConfirmedCounter = meter.createCounter('bookings_confirmed_total', {
  description: 'Total de bookings confirmadas via webhook',
})

export const paymentsFailedCounter = meter.createCounter('payments_failed_total', {
  description: 'Total de falhas de pagamento',
})

export const bookingRevenueHistogram = meter.createHistogram('booking_revenue_brl', {
  description: 'Valor das reservas confirmadas em BRL',
  unit: 'BRL',
})
```

**Nota:** Verificar quais já existem em metrics.ts antes de adicionar — não duplicar.

- [ ] **Step 2: Instrumentar cancel e expiry**

Adicionar `bookingsCancelledCounter.add(1)` no handler de cancel e `bookingsExpiredCounter.add(1)` no expiry job.

- [ ] **Step 3: Rodar testes**

Run: `cd apps/api && pnpm test`
Expected: Testes passam — counters são no-op sem OTLP endpoint.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/shared/metrics.ts apps/api/src/modules/bookings/
git commit -m "feat(api): expandir métricas OTel com counters de cancel, expiry e revenue"
```

---

### Task 18: Adicionar Toast system no frontend

**Files:**
- Create: `apps/web/src/components/providers/ToastProvider.tsx`
- Modify: `apps/web/src/app/layout.tsx` ou `apps/web/app/layout.tsx`

- [ ] **Step 1: Criar toast provider simples**

```tsx
// apps/web/src/components/providers/ToastProvider.tsx
'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextValue {
  toast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const colors = {
    success: { bg: '#E8F5E9', border: '#4CAF50', text: '#2E7D32' },
    error: { bg: '#FFEBEE', border: '#F44336', text: '#C62828' },
    info: { bg: '#FFF8E1', border: '#C4852A', text: '#6B5D4F' },
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: colors[t.type].bg,
              border: `1px solid ${colors[t.type].border}`,
              color: colors[t.type].text,
              fontSize: '0.875rem',
              fontWeight: 500,
              maxWidth: '360px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
```

- [ ] **Step 2: Integrar no layout root**

```tsx
// No layout.tsx root, envolver children com:
import { ToastProvider } from '../src/components/providers/ToastProvider'

// Dentro do body:
<ToastProvider>
  {children}
</ToastProvider>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/providers/ToastProvider.tsx apps/web/app/layout.tsx
git commit -m "feat(web): adicionar toast notification system com useToast hook"
```

---

### Task 19: Adicionar loading states com Skeleton

**Files:**
- Verify existing: `apps/web/src/components/ui/capi/Feedback.tsx` — já exporta `Skeleton`
- Create loading.tsx files onde faltam

- [ ] **Step 1: Verificar que Skeleton já existe no design system**

O design system CAPI já exporta `Skeleton` de `./Feedback`. Verificar a implementação em `apps/web/src/components/ui/capi/Feedback.tsx`.

- [ ] **Step 2: Criar loading.tsx para rotas que faltam**

```tsx
// apps/web/app/destinos/loading.tsx
import { Skeleton } from '../../src/components/ui/capi'

export default function Loading() {
  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '1200px', margin: '0 auto' }}>
      <Skeleton style={{ height: '2rem', width: '200px', marginBottom: '1.5rem' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} style={{ height: '280px', borderRadius: '12px' }} />
        ))}
      </div>
    </div>
  )
}
```

Criar loading.tsx similares para:
- `apps/web/app/destinos/loading.tsx`
- `apps/web/app/[slug]/(painel)/painel/dashboard/loading.tsx`
- `apps/web/app/[slug]/(painel)/painel/reservas/loading.tsx`
- `apps/web/app/[slug]/(painel)/painel/roteiros/loading.tsx`

**Nota:** Alguns já existem (checkout, roteiros/[packageId]). Só criar onde faltam.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/
git commit -m "feat(web): adicionar loading.tsx com Skeleton nas rotas principais"
```

---

### Task 20: Health check expandido

**Files:**
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Expandir o health check existente**

```typescript
// Em apps/api/src/app.ts, substituir o health check simples por:
app.get('/health', { config: { rateLimit: false } }, async (request, reply) => {
  const checks: Record<string, 'ok' | 'error'> = {}

  // PostgreSQL
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch {
    checks.database = 'error'
  }

  const allOk = Object.values(checks).every((v) => v === 'ok')

  return reply.status(allOk ? 200 : 503).send({
    status: allOk ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  })
})
```

- [ ] **Step 2: Rodar testes**

Run: `cd apps/api && pnpm test`
Expected: Testes passam.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/app.ts
git commit -m "feat(api): expandir health check com status detalhado por serviço"
```

---

### Task 21: Atualizar .env.example

**Files:**
- Modify: `apps/api/.env.example`

- [ ] **Step 1: Sincronizar com env.ts schema**

Garantir que `.env.example` contém todas as variáveis definidas no `envSchema` de `apps/api/src/shared/env.ts`, com valores de exemplo:

```bash
# apps/api/.env.example

# === OBRIGATÓRIAS ===
DATABASE_URL=postgresql://turismo:turismo123@localhost:5432/turismo_dev
JWT_SECRET=your-jwt-secret-minimum-32-characters-here
MP_ACCESS_TOKEN=TEST-your-mercado-pago-access-token
MP_WEBHOOK_SECRET=your-webhook-secret
CPF_SECRET=your-cpf-hash-secret
ANONYMIZATION_SALT=your-anonymization-salt

# === Cloudflare R2 ===
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
R2_BUCKET_NAME=capi-uploads
R2_PUBLIC_URL=https://your-r2-domain.dev

# === Opcionais (defaults para dev) ===
RESEND_API_KEY=
EMAIL_FROM=CAPI <noreply@capi.turismo>
APP_URL=http://localhost:3333
CORS_ORIGIN=http://localhost:3000
WEB_URL=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=debug
BOOKING_EXPIRY_MINUTES=30

# === OpenTelemetry (opcional) ===
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_EXPORTER_OTLP_HEADERS=
OTEL_SERVICE_NAME=capi-api

# === Sentry (opcional) ===
SENTRY_DSN=
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/.env.example
git commit -m "docs(api): sincronizar .env.example com env.ts schema"
```

---

## Resumo de Entrega por Sprint

| Sprint | Tasks | Foco |
|--------|-------|------|
| Sprint 1 — Fundação | Tasks 1-4 | zodError centralizado, HTTP client, LGPD, idempotency |
| Sprint 2 — Refatoração Backend | Tasks 5-7 | Service layer, sub-rotas, paginação |
| Sprint 3 — CI/CD e Infra | Tasks 8-9 | GitHub Actions, Railway/Vercel config |
| Sprint 4 — Testes | Tasks 10-14 | Webhook, auth, guides, LGPD tests, coverage |
| Sprint 5 — Segurança | Tasks 15-16 | Rate limit por email, cancelToken expiry |
| Sprint 6 — Observabilidade e Polish | Tasks 17-21 | Métricas OTel, toasts, loading states, health check, env sync |

**Total: 21 tasks, ~42 commits atômicos.**

Cada task é independente e pode ser executada/commitada isoladamente. As dependências entre tasks são mínimas:
- Task 6 depende de Task 5 (service layer antes de quebrar rotas)
- Task 15-16 podem usar Task 6 se executada (ou modificar o arquivo original)
- Todos os outros tasks são independentes
