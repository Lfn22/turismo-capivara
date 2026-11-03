# CAPI Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add production-grade observability to CAPI — structured logging, audit trail, frontend error tracking, web analytics with conversion funnel, and infrastructure metrics.

**Architecture:** 5 independent components, each deployable on its own. Pino for structured logs (zero deps), Prisma AuditLog writes (zero deps), Sentry for web errors, PostHog for analytics/funnel, OpenTelemetry→Grafana for infra metrics.

**Tech Stack:** Fastify 5, Prisma 7, Next.js 16.2, Pino, @sentry/nextjs, posthog-js, @opentelemetry/sdk-node, Grafana Cloud

---

## Task 1: Structured Logging (Pino)

**Files:**
- Modify: `apps/api/src/shared/env.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/services/payment.service.ts`
- Install dev dep: `pino-pretty`

- [ ] **Step 1: Add LOG_LEVEL to env schema**

In `apps/api/src/shared/env.ts`, add inside the Zod schema object (before the `NODE_ENV` line):

```ts
LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
```

- [ ] **Step 2: Install pino-pretty as dev dependency**

Run:
```bash
cd apps/api && pnpm add -D pino-pretty
```

- [ ] **Step 3: Configure Fastify logger in app.ts**

Replace the current Fastify instantiation (`logger: true`) with structured config:

```ts
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    ...(process.env.NODE_ENV !== 'production' && {
      transport: { target: 'pino-pretty', options: { colorize: true } },
    }),
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          tenantSlug: (request.params as Record<string, string>)?.slug,
          userId: (request as Record<string, unknown>).user
            ? ((request as Record<string, unknown>).user as { sub: string }).sub
            : undefined,
        }
      },
    },
  },
  genReqId: () => crypto.randomUUID(),
})
```

Add `import crypto from 'node:crypto'` at the top if not present.

- [ ] **Step 4: Replace console.warn/error in payment.service.ts**

Find `console.warn` and `console.error` calls. Replace with a module-level Pino logger:

```ts
import pino from 'pino'

const logger = pino({ name: 'payment-service' })
```

Then replace:
- `console.warn(...)` → `logger.warn(...)`
- `console.error(...)` → `logger.error(...)`

- [ ] **Step 5: Verify build passes**

Run:
```bash
cd apps/api && pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/shared/env.ts apps/api/src/app.ts apps/api/src/services/payment.service.ts apps/api/package.json apps/api/pnpm-lock.yaml
git commit -m "feat(observability): structured logging with Pino

- Configure Fastify logger with JSON in prod, pino-pretty in dev
- Add LOG_LEVEL env var
- Custom serializers include tenantSlug and userId per request
- Replace console.warn/error in payment service with structured logger"
```

---

## Task 2: Audit Log Writes

**Files:**
- Create: `apps/api/src/shared/audit.ts`
- Modify: `apps/api/src/modules/bookings/bookings.routes.ts`
- Modify: `apps/api/src/modules/webhooks/webhooks.routes.ts`
- Modify: `apps/api/src/modules/tenants/tenants.routes.ts`
- Modify: `apps/api/src/modules/destinations/destinations.routes.ts`

- [ ] **Step 1: Create audit.ts utility**

Create `apps/api/src/shared/audit.ts`:

```ts
import type { PrismaClient, AuditActorType, AuditTargetType } from '@prisma/client'
import pino from 'pino'

const logger = pino({ name: 'audit' })

interface AuditEntry {
  actorType: AuditActorType
  actorId?: string
  action: string
  targetType: AuditTargetType
  targetId: string
  ipAddress?: string
  metadata?: Record<string, unknown>
}

export function auditLog(prisma: PrismaClient, entry: AuditEntry): void {
  prisma.auditLog
    .create({ data: entry })
    .catch((err) => logger.error({ err, entry }, 'Failed to write audit log'))
}
```

- [ ] **Step 2: Add audit log to booking creation**

In `apps/api/src/modules/bookings/bookings.routes.ts`, add import at top:

```ts
import { auditLog } from '../../shared/audit.js'
```

After the successful booking creation reply (after the booking is created and response is about to be sent), add:

```ts
auditLog(prisma, {
  actorType: 'USER',
  action: 'booking.created',
  targetType: 'BOOKING',
  targetId: booking.id,
  ipAddress: request.ip,
  metadata: { tenantSlug: slug, pax: body.pax, slotId: body.slotId },
})
```

- [ ] **Step 3: Add audit log to booking cancellation**

In the same file, find the cancel booking handler. After successful cancellation, add:

```ts
auditLog(prisma, {
  actorType: 'USER',
  action: 'booking.cancelled',
  targetType: 'BOOKING',
  targetId: booking.id,
  ipAddress: request.ip,
  metadata: { tenantSlug: slug, previousStatus: booking.status },
})
```

- [ ] **Step 4: Add audit log to webhook confirmation**

In `apps/api/src/modules/webhooks/webhooks.routes.ts`, add import:

```ts
import { auditLog } from '../../shared/audit.js'
```

After the booking status is updated to CONFIRMED, add:

```ts
auditLog(prisma, {
  actorType: 'SYSTEM',
  action: 'booking.confirmed',
  targetType: 'BOOKING',
  targetId: booking.id,
  metadata: { paymentId: paymentData.id, tenantSlug: booking.tenant?.slug },
})
```

- [ ] **Step 5: Add audit log to tenant approval**

In `apps/api/src/modules/tenants/tenants.routes.ts`, add import:

```ts
import { auditLog } from '../../shared/audit.js'
```

After the tenant is updated to APPROVED, add:

```ts
auditLog(prisma, {
  actorType: 'USER',
  actorId: request.user.sub,
  action: 'tenant.approved',
  targetType: 'TENANT',
  targetId: tenant.id,
  ipAddress: request.ip,
  metadata: { tenantName: tenant.name },
})
```

- [ ] **Step 6: Add audit log to destination approval**

In `apps/api/src/modules/destinations/destinations.routes.ts`, add import:

```ts
import { auditLog } from '../../shared/audit.js'
```

After destination approval, add:

```ts
auditLog(prisma, {
  actorType: 'USER',
  actorId: request.user.sub,
  action: 'destination.approved',
  targetType: 'DESTINATION',
  targetId: destination.id,
  ipAddress: request.ip,
  metadata: { destinationName: destination.name },
})
```

- [ ] **Step 7: Verify build passes**

Run:
```bash
cd apps/api && pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/shared/audit.ts apps/api/src/modules/bookings/bookings.routes.ts apps/api/src/modules/webhooks/webhooks.routes.ts apps/api/src/modules/tenants/tenants.routes.ts apps/api/src/modules/destinations/destinations.routes.ts
git commit -m "feat(observability): audit log writes for 6 critical events

- Create audit.ts utility with fire-and-forget pattern
- Instrument: booking created/cancelled/confirmed, tenant approved, destination approved
- Uses existing AuditLog Prisma model with actor, target, metadata"
```

---

## Task 3: Sentry Frontend

**Files:**
- Create: `apps/web/sentry.client.config.ts`
- Create: `apps/web/sentry.server.config.ts`
- Create: `apps/web/instrumentation.ts`
- Create: `apps/web/app/global-error.tsx`
- Modify: `apps/web/next.config.ts`
- Modify: `apps/web/src/components/ui/ErrorBoundary.tsx`

- [ ] **Step 1: Install @sentry/nextjs**

Run:
```bash
cd apps/web && pnpm add @sentry/nextjs
```

- [ ] **Step 2: Create sentry.client.config.ts**

Create `apps/web/sentry.client.config.ts`:

```ts
import * as Sentry from '@sentry/nextjs'

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    debug: false,
  })
}
```

- [ ] **Step 3: Create sentry.server.config.ts**

Create `apps/web/sentry.server.config.ts`:

```ts
import * as Sentry from '@sentry/nextjs'

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug: false,
  })
}
```

- [ ] **Step 4: Create instrumentation.ts**

Create `apps/web/instrumentation.ts`:

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
}

export const onRequestError = async (
  err: { digest: string } & Error,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
  context: { routerKind: string; routePath: string; routeType: string; renderSource: string },
) => {
  const Sentry = await import('@sentry/nextjs')
  Sentry.captureRequestError(err, request, context)
}
```

- [ ] **Step 5: Create global-error.tsx**

Create `apps/web/app/global-error.tsx`:

```tsx
'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body>
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>Algo deu errado</h2>
          <p style={{ color: '#6B5D4F' }}>Ocorreu um erro inesperado. Nossa equipe foi notificada.</p>
          <button
            onClick={reset}
            style={{
              marginTop: '1rem',
              padding: '0.625rem 1.5rem',
              backgroundColor: '#C4852A',
              color: '#fff',
              border: 'none',
              borderRadius: '9999px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Wrap next.config.ts with Sentry**

Read current `apps/web/next.config.ts`. Replace with:

```ts
import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: false,
})
```

- [ ] **Step 7: Add Sentry.captureException to ErrorBoundary**

In `apps/web/src/components/ui/ErrorBoundary.tsx`, add import:

```ts
import * as Sentry from '@sentry/nextjs'
```

In the `componentDidCatch` method (or `getDerivedStateFromError`), add before or after the existing `console.error`:

```ts
Sentry.captureException(error, { contexts: { react: { componentStack: info?.componentStack } } })
```

- [ ] **Step 8: Verify build passes**

Run:
```bash
cd apps/web && pnpm tsc --noEmit
```
Expected: no errors (Sentry DSN is optional, so build works without it).

- [ ] **Step 9: Commit**

```bash
git add apps/web/sentry.client.config.ts apps/web/sentry.server.config.ts apps/web/instrumentation.ts apps/web/app/global-error.tsx apps/web/next.config.ts apps/web/src/components/ui/ErrorBoundary.tsx apps/web/package.json
git commit -m "feat(observability): Sentry frontend error tracking

- @sentry/nextjs with client + server configs
- instrumentation.ts for SSR/RSC error capture
- global-error.tsx root boundary with Portuguese UI
- ErrorBoundary now sends exceptions to Sentry
- Source map upload via withSentryConfig"
```

---

## Task 4: PostHog Web Analytics + Conversion Funnel

**Files:**
- Create: `apps/web/src/lib/posthog.ts`
- Create: `apps/web/src/components/providers/PostHogProvider.tsx`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/destinos/[destination-slug]/page.tsx`
- Modify: `apps/web/app/destinos/[destination-slug]/roteiros/[id]/page.tsx`
- Modify: `apps/web/src/components/ui/SlotPicker.tsx`
- Modify: `apps/web/src/components/ui/BookingForm.tsx`

- [ ] **Step 1: Install posthog-js**

Run:
```bash
cd apps/web && pnpm add posthog-js
```

- [ ] **Step 2: Create posthog.ts client**

Create `apps/web/src/lib/posthog.ts`:

```ts
import posthog from 'posthog-js'

export function initPostHog() {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    autocapture: true,
    capture_pageview: false, // manual via router
    disable_session_recording: true,
    persistence: 'localStorage+cookie',
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') ph.debug()
    },
  })
}

export { posthog }
```

- [ ] **Step 3: Create PostHogProvider.tsx**

Create `apps/web/src/components/providers/PostHogProvider.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPostHog, posthog } from '@/lib/posthog'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    initPostHog()
  }, [])

  useEffect(() => {
    if (!pathname) return
    const url = window.origin + pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return <>{children}</>
}
```

- [ ] **Step 4: Add PostHogProvider to layout.tsx**

In `apps/web/app/layout.tsx`, add import:

```ts
import { PostHogProvider } from '@/components/providers/PostHogProvider'
```

Wrap children inside the existing `<Providers>` (or alongside it):

```tsx
<Providers>
  <PostHogProvider>
    {/* existing Header, main, Footer, BottomNav */}
  </PostHogProvider>
</Providers>
```

- [ ] **Step 5: Add destination_viewed event**

In `apps/web/app/destinos/[destination-slug]/page.tsx`, add a client component or use a tracking hook. Since this is a server component, create a small client tracker inline or via a shared hook.

Create `apps/web/src/hooks/useTrackView.ts`:

```ts
'use client'

import { useEffect } from 'react'
import { posthog } from '@/lib/posthog'

export function useTrackView(event: string, properties: Record<string, unknown>) {
  useEffect(() => {
    posthog.capture(event, properties)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
```

Then in the destination page, if it's a server component, add a client wrapper:

Create `apps/web/src/components/tracking/TrackView.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { posthog } from '@/lib/posthog'

export function TrackView({ event, properties }: { event: string; properties: Record<string, unknown> }) {
  useEffect(() => {
    posthog.capture(event, properties)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
```

Add to destination page:

```tsx
<TrackView event="destination_viewed" properties={{ slug: params['destination-slug'], name: destination.name }} />
```

- [ ] **Step 6: Add package_viewed event**

In `apps/web/app/destinos/[destination-slug]/roteiros/[id]/page.tsx`, add:

```tsx
<TrackView event="package_viewed" properties={{ packageId: pkg.id, destinationSlug: params['destination-slug'], price: pkg.price }} />
```

- [ ] **Step 7: Add slot_selected event**

In `apps/web/src/components/ui/SlotPicker.tsx`, find the slot selection handler. Add after state update:

```ts
import { posthog } from '@/lib/posthog'

// Inside the selection handler:
posthog.capture('slot_selected', { packageId, date: slot.date, pax })
```

- [ ] **Step 8: Add booking_started event**

In `apps/web/src/components/ui/BookingForm.tsx`, at the start of `handleSubmit` (after validation passes, before fetch):

```ts
import { posthog } from '@/lib/posthog'

// Inside handleSubmit, after validation:
posthog.capture('booking_started', { packageId, pax: form.pax, totalPrice })
```

- [ ] **Step 9: Verify build passes**

Run:
```bash
cd apps/web && pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/lib/posthog.ts apps/web/src/components/providers/PostHogProvider.tsx apps/web/src/components/tracking/TrackView.tsx apps/web/src/hooks/useTrackView.ts apps/web/app/layout.tsx apps/web/app/destinos/ apps/web/src/components/ui/SlotPicker.tsx apps/web/src/components/ui/BookingForm.tsx apps/web/package.json
git commit -m "feat(observability): PostHog analytics with booking conversion funnel

- PostHog client init with LGPD compliance (no session recording, no PII)
- PostHogProvider with automatic pageview tracking via Next.js router
- TrackView component for server component pages
- Funnel events: destination_viewed, package_viewed, slot_selected, booking_started
- Autocapture enabled for button/link clicks"
```

---

## Task 5: OpenTelemetry Metrics → Grafana Cloud

**Files:**
- Create: `apps/api/src/shared/telemetry.ts`
- Create: `apps/api/src/shared/metrics.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/src/shared/env.ts`
- Modify: `apps/api/src/modules/bookings/bookings.routes.ts`
- Modify: `apps/api/src/modules/webhooks/webhooks.routes.ts`

- [ ] **Step 1: Install OpenTelemetry packages**

Run:
```bash
cd apps/api && pnpm add @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-metrics-otlp-http @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources @opentelemetry/semantic-conventions
```

- [ ] **Step 2: Add OTel env vars to env.ts**

In `apps/api/src/shared/env.ts`, add to the Zod schema:

```ts
OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
OTEL_SERVICE_NAME: z.string().default('capi-api'),
```

- [ ] **Step 3: Create telemetry.ts**

Create `apps/api/src/shared/telemetry.ts`:

```ts
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { Resource } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'

export function initTelemetry(): void {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  if (!endpoint) return // gracefully disable if no endpoint

  const headers: Record<string, string> = {}
  if (process.env.OTEL_EXPORTER_OTLP_HEADERS) {
    for (const pair of process.env.OTEL_EXPORTER_OTLP_HEADERS.split(',')) {
      const [key, ...rest] = pair.split('=')
      headers[key.trim()] = rest.join('=').trim()
    }
  }

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? 'capi-api',
    [ATTR_SERVICE_VERSION]: '1.0.0',
  })

  const sdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces`, headers }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics`, headers }),
      exportIntervalMillis: 60_000,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
      }),
    ],
  })

  sdk.start()

  const shutdown = () => sdk.shutdown().catch(console.error)
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}
```

- [ ] **Step 4: Create metrics.ts with custom counters**

Create `apps/api/src/shared/metrics.ts`:

```ts
import { metrics } from '@opentelemetry/api'

const meter = metrics.getMeter('capi-api')

export const bookingsCreatedCounter = meter.createCounter('capi.bookings.created', {
  description: 'Total bookings created',
})

export const bookingsConfirmedCounter = meter.createCounter('capi.bookings.confirmed', {
  description: 'Total bookings confirmed via webhook',
})

export const paymentsFailedCounter = meter.createCounter('capi.payments.failed', {
  description: 'Total payment failures',
})

export const slotsOccupancyGauge = meter.createObservableGauge('capi.slots.occupancy', {
  description: 'Slot occupancy ratio',
})
```

- [ ] **Step 5: Initialize telemetry before Fastify**

In `apps/api/src/app.ts`, add as the FIRST import (before env validation, before Sentry):

```ts
import { initTelemetry } from './shared/telemetry.js'
initTelemetry()
```

This must be the very first thing that runs — OTel needs to monkey-patch HTTP/Prisma before they're imported.

- [ ] **Step 6: Instrument booking creation with counter**

In `apps/api/src/modules/bookings/bookings.routes.ts`, add import:

```ts
import { bookingsCreatedCounter } from '../../shared/metrics.js'
```

After successful booking creation (near the audit log call), add:

```ts
bookingsCreatedCounter.add(1, { tenant: slug })
```

- [ ] **Step 7: Instrument webhook confirmation with counter**

In `apps/api/src/modules/webhooks/webhooks.routes.ts`, add import:

```ts
import { bookingsConfirmedCounter } from '../../shared/metrics.js'
```

After booking is confirmed, add:

```ts
bookingsConfirmedCounter.add(1, { tenant: booking.tenant?.slug ?? 'unknown' })
```

- [ ] **Step 8: Verify build passes**

Run:
```bash
cd apps/api && pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/shared/telemetry.ts apps/api/src/shared/metrics.ts apps/api/src/app.ts apps/api/src/shared/env.ts apps/api/src/modules/bookings/bookings.routes.ts apps/api/src/modules/webhooks/webhooks.routes.ts apps/api/package.json
git commit -m "feat(observability): OpenTelemetry metrics and tracing → Grafana Cloud

- Auto-instrumentation for HTTP, Prisma, fetch
- Custom counters: bookings.created, bookings.confirmed, payments.failed
- OTLP exporter with graceful disable when endpoint absent
- Proper shutdown handlers for clean metric flush"
```

---

## Task 6: Update .env.example Files

**Files:**
- Modify: `apps/api/.env.example`
- Create or modify: `apps/web/.env.example`

- [ ] **Step 1: Update API .env.example**

Add at the end of `apps/api/.env.example`:

```env
# --- Observability ---
LOG_LEVEL=info
# OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-us-central-0.grafana.net/otlp
# OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic base64(instanceId:token)
# OTEL_SERVICE_NAME=capi-api
```

- [ ] **Step 2: Update Web .env.example**

Add to `apps/web/.env.example` (create if doesn't exist):

```env
# --- Sentry ---
# NEXT_PUBLIC_SENTRY_DSN=https://key@sentry.io/project
# SENTRY_AUTH_TOKEN=sntrys_xxx
# SENTRY_ORG=your-org
# SENTRY_PROJECT=capi-web

# --- PostHog ---
# NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
# NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/.env.example apps/web/.env.example
git commit -m "docs: add observability env vars to .env.example files"
```
