# CAPI — Observability Implementation Spec

**Date:** 2026-10-03
**Level:** Intermediário (Logging + Sentry Web + Audit Logs + Analytics + Metrics)
**Stack:** Fastify 5 + Prisma 7 + Next.js 16.2 + Railway

---

## 1. Structured Logging (Pino)

Fastify uses Pino internally. Configure for production-grade structured output.

### Changes

- **`apps/api/src/app.ts`**: Configure Pino with:
  - Level from `LOG_LEVEL` env var (default: `info` prod, `debug` dev)
  - JSON format in production, `pino-pretty` in dev
  - Custom serializers to include `tenantSlug`, `userId`, `requestId` per request
  - Request/response logging via built-in Fastify hooks (already supported, needs serializer config)

- **`apps/api/src/shared/env.ts`**: Add `LOG_LEVEL` (z.enum(['debug','info','warn','error']).default('info'))

- **`apps/api/src/services/payment.service.ts`**: Replace remaining `console.warn/error` with Fastify structured logger (requires passing logger instance or using request.log)

### Log Entry Shape

```json
{ "level": "info", "time": 1696300000, "requestId": "uuid", "method": "POST", "url": "/tenants/capi/bookings", "tenantSlug": "capi", "userId": "clx...", "statusCode": 201, "responseTime": 42, "msg": "request completed" }
```

### Not Included

- Log drain (Railway captures stdout natively)
- File rotation (containerized, not needed)
- Dev dependency: `pino-pretty` (already in Fastify ecosystem)

---

## 2. Sentry Frontend (Web)

Sentry already works on API. Connect the web app to the same Sentry project.

### New Files

- `apps/web/sentry.client.config.ts` — Browser SDK init
- `apps/web/sentry.server.config.ts` — Server-side SDK init (SSR/RSC errors)
- `apps/web/instrumentation.ts` — Next.js instrumentation hook for Sentry server init
- `apps/web/app/global-error.tsx` — Root error boundary with Sentry capture

### Modified Files

- `apps/web/next.config.ts` — Wrap with `withSentryConfig` for source map upload
- `apps/web/src/components/ui/ErrorBoundary.tsx` — Add `Sentry.captureException(error)` in `componentDidCatch`
- `apps/web/app/layout.tsx` — No changes needed (Sentry injects via instrumentation)

### Configuration

```ts
// sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: 0,     // no session replay
  replaysOnErrorSampleRate: 0,     // no session replay
})
```

### Env Vars

- `NEXT_PUBLIC_SENTRY_DSN` — Sentry DSN (same project as API or separate)
- `SENTRY_AUTH_TOKEN` — For source map upload during build
- `SENTRY_ORG`, `SENTRY_PROJECT` — Required by withSentryConfig

### Dependencies

- `@sentry/nextjs` (includes client + server + build plugin)

---

## 3. Audit Log Writes

The `AuditLog` Prisma model already exists with full schema (actorType, action, targetType, targetId, ipAddress, metadata). Only the write code is missing.

### New File

- `apps/api/src/shared/audit.ts`

```ts
export async function auditLog(
  prisma: PrismaClient,
  params: {
    actorType: AuditActorType
    actorId?: string
    action: string
    targetType: AuditTargetType
    targetId: string
    ipAddress?: string
    metadata?: Record<string, unknown>
  }
): Promise<void>
```

- Fire-and-forget pattern: `.catch(logger.error)` — audit must never break the main operation
- Called after the main operation succeeds (not inside transactions)

### Instrumented Events (6)

| Event | action | targetType | Location |
|-------|--------|------------|----------|
| Booking created | `booking.created` | BOOKING | `bookings.routes.ts` after Tx2 success |
| Booking cancelled | `booking.cancelled` | BOOKING | `bookings.routes.ts` cancel handler |
| Booking confirmed | `booking.confirmed` | BOOKING | `webhooks.routes.ts` payment webhook |
| Tenant approved | `tenant.approved` | TENANT | `tenants.routes.ts` approval route |
| Destination approved | `destination.approved` | DESTINATION | `destinations.routes.ts` approval route |
| API Key created | `apikey.created` | API_KEY | API key creation route (if exists) |

### Metadata per Event

Includes contextual fields: `{ ip, userAgent, tenantSlug, previousStatus }` as relevant.

### Not Included

- Read/query operations (audit writes/mutations only)
- Admin query endpoint for audit logs (future phase)
- Retention/cleanup policy (future)

---

## 4. Web Analytics + Conversion Funnel (PostHog)

### New Files

- `apps/web/src/lib/posthog.ts` — PostHog client init
- `apps/web/src/components/providers/PostHogProvider.tsx` — React context provider

### Modified Files

- `apps/web/app/layout.tsx` — Wrap children with `PostHogProvider`
- `apps/web/app/destinos/[destination-slug]/page.tsx` — `destination_viewed` event
- `apps/web/app/destinos/[destination-slug]/roteiros/[id]/page.tsx` — `package_viewed` event
- `apps/web/src/components/ui/SlotPicker.tsx` — `slot_selected` event
- `apps/web/src/components/ui/BookingForm.tsx` — `booking_started` event
- `apps/web/app/[slug]/(public)/checkout/page.tsx` or client — `payment_initiated` event
- Confirmation page — `booking_confirmed` event

### Custom Events (Booking Funnel)

| Step | Event | Properties |
|------|-------|------------|
| Views destination | `destination_viewed` | `{ slug, name }` |
| Views package | `package_viewed` | `{ packageId, destinationSlug, price }` |
| Selects slot | `slot_selected` | `{ packageId, date, pax }` |
| Starts booking | `booking_started` | `{ packageId, pax, totalPrice }` |
| Payment created | `payment_initiated` | `{ bookingId, method: 'pix' }` |
| Booking confirmed | `booking_confirmed` | `{ bookingId }` |
| Booking cancelled | `booking_cancelled` | `{ bookingId, reason }` |

### Automatic Behavior Tracking

- Pageviews via Next.js router integration (built-in SDK feature)
- Sessions, referrer, device, country — automatic
- `autocapture: true` for button/link clicks (no PII captured)

### LGPD Compliance

- `persistence: 'localStorage+cookie'` with consent
- `disable_session_recording: true`
- Zero PII in events (no email, CPF, name)
- PostHog Cloud is GDPR/LGPD compliant

### Configuration

```ts
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
  autocapture: true,
  capture_pageview: false,  // manual via Next.js router
  disable_session_recording: true,
  persistence: 'localStorage+cookie',
})
```

### Env Vars

- `NEXT_PUBLIC_POSTHOG_KEY` — PostHog project API key
- `NEXT_PUBLIC_POSTHOG_HOST` — PostHog instance URL (default: US cloud)

### Dependencies

- `posthog-js` (browser SDK, ~45KB)
- `posthog-node` (optional, for server-side events — not needed initially)

---

## 5. Infrastructure Metrics (OpenTelemetry → Grafana Cloud)

### New Files

- `apps/api/src/shared/telemetry.ts` — OTel SDK initialization (must run before Fastify)

### Modified Files

- `apps/api/src/server.ts` or entry point — Import telemetry.ts as first import
- `apps/api/src/shared/env.ts` — Add OTEL env vars

### Auto-Instrumentation Captures

- HTTP requests (latency, status code, method, route)
- Prisma/PostgreSQL queries (duration, operation type)
- DNS lookups
- External fetch (Mercado Pago API calls)

### Custom Metrics (4)

| Metric | Type | Description |
|--------|------|-------------|
| `capi.bookings.created` | Counter | Bookings created, labeled by tenant |
| `capi.bookings.confirmed` | Counter | Bookings confirmed via webhook, by tenant |
| `capi.payments.failed` | Counter | MP payment failures, by error type |
| `capi.slots.occupancy` | Gauge | Slot occupancy ratio (booked/capacity) |

### Grafana Dashboard (pre-configured JSON)

- Request rate + error rate + p95 latency
- Booking pipeline: created → confirmed → cancelled
- Payment success rate
- Top slowest endpoints

### Configuration

```ts
const sdk = new NodeSDK({
  resource: new Resource({ 'service.name': 'capi-api', 'service.version': '1.0.0' }),
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 60_000,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
})
sdk.start()
```

### Env Vars

- `OTEL_EXPORTER_OTLP_ENDPOINT` — Grafana Cloud OTLP endpoint
- `OTEL_EXPORTER_OTLP_HEADERS` — Auth header (`Authorization=Basic base64(instanceId:token)`)
- `OTEL_SERVICE_NAME` — Defaults to `capi-api`

### Dependencies

- `@opentelemetry/sdk-node`
- `@opentelemetry/auto-instrumentations-node`
- `@opentelemetry/exporter-metrics-otlp-http`
- `@opentelemetry/exporter-trace-otlp-http`
- `@opentelemetry/resources`

### Not Included

- Full distributed tracing with span propagation between API↔Web (level 3)
- Custom Grafana provisioning (manual dashboard setup initially)
- Alerting rules (configured in Grafana UI after deployment)

---

## Env Vars Summary

### API (`apps/api/.env`)

| Var | Required | Default |
|-----|----------|---------|
| `LOG_LEVEL` | No | `info` (prod), `debug` (dev) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | — (OTel disabled if absent) |
| `OTEL_EXPORTER_OTLP_HEADERS` | No | — |
| `OTEL_SERVICE_NAME` | No | `capi-api` |

### Web (`apps/web/.env`)

| Var | Required | Default |
|-----|----------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | No | — (Sentry disabled if absent) |
| `SENTRY_AUTH_TOKEN` | Build only | — |
| `SENTRY_ORG` | Build only | — |
| `SENTRY_PROJECT` | Build only | — |
| `NEXT_PUBLIC_POSTHOG_KEY` | No | — (PostHog disabled if absent) |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | `https://us.i.posthog.com` |

---

## Implementation Order

1. **Logging (Pino)** — zero deps, immediate value, unblocks debugging
2. **Audit Log writes** — zero deps, LGPD compliance
3. **Sentry Web** — 1 dep, catches frontend errors
4. **PostHog Analytics** — 1 dep, conversion tracking
5. **OpenTelemetry Metrics** — 4 deps, requires Grafana account setup

Each step is independently deployable and adds value on its own.
