# External Integrations

**Analysis Date:** 2026-09-04

## APIs & External Services

**Payment Processing:**
- Mercado Pago - PIX payment gateway for booking transactions
  - SDK: `mercadopago` v2.12.0
  - Auth: `MP_ACCESS_TOKEN` (environment variable)
  - Webhook secret: `MP_WEBHOOK_SECRET`
  - Implementation: `apps/api/src/services/payment.service.ts`
  - Webhook receiver: `apps/api/src/modules/webhooks/webhooks.routes.ts`
  - Signature validation: HMAC-SHA256 via `x-signature` header
  - Payment method: PIX (QR code + link)
  - Fallback: Mock payments in development (no MP_ACCESS_TOKEN)

**Email Delivery:**
- Resend - Transactional email service
  - SDK: `resend` v6.12.3
  - Auth: `RESEND_API_KEY` (environment variable, optional)
  - Implementation: `apps/api/src/shared/email.ts`
  - Graceful no-op if key not set (dev/test environments)
  - Use cases:
    - Booking creation notification
    - Booking confirmation
    - Booking cancellation
    - Guide approval
    - Password reset
    - Tenant approval/rejection
  - Email templates: `apps/api/src/modules/bookings/emails/`, `apps/api/src/modules/tenants/emails/`
  - Sender: `EMAIL_FROM` env var (default: `CAPI <noreply@capi.turismo>`)

**Mapping & Geolocation:**
- MapLibre GL - Vector map rendering (Web frontend)
  - SDK: `maplibre-gl` v5.24.0
  - Usage: `apps/web/components` (destination maps)
  - No authentication required (open-source)

## Data Storage

**Databases:**
- PostgreSQL 12+ (primary transactional database)
  - Connection: `DATABASE_URL` environment variable
  - ORM: Prisma 7.5.0
  - Adapter: @prisma/adapter-pg (native PostgreSQL driver)
  - Schema: `apps/api/prisma/schema.prisma`
  - Migrations: `apps/api/prisma/migrations/` (managed by Prisma)
  - Release command: `npx prisma migrate deploy` (Railway)
  - Logging: Query, error, warn logs enabled in development

**File Storage:**
- Cloudflare R2 (S3-compatible object storage)
  - Provider: Cloudflare R2
  - SDK: @aws-sdk/client-s3 (S3-compatible API)
  - Credentials: HMAC format in `CLOUDFLARE_API_TOKEN` (`accessKeyId:secretAccessKey`)
  - Account ID: `CLOUDFLARE_ACCOUNT_ID`
  - Bucket name: `R2_BUCKET_NAME`
  - Public URL: `R2_PUBLIC_URL` (e.g., `https://pub-xxxx.r2.dev`)
  - Endpoint: `https://{CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
  - Implementation: `apps/api/src/shared/config/r2.ts`, `apps/api/src/modules/uploads/uploads.service.ts`
  - Upload workflow: HTTP multipart → validate → R2 PUT → return public URL
  - Allowed file types: JPEG, PNG, WebP
  - Max file size: 5MB per file
  - Folders: `destinations/`, `packages/`, `guides/`
  - Use cases: Destination hero images, guide photos, guide portfolio, package images
  - Public access: Yes (via R2_PUBLIC_URL)

**Caching:**
- None currently implemented (Fastify in-memory only)

## Authentication & Identity

**API:**
- Fastify JWT (`@fastify/jwt` v10.0.0)
  - Secret: `JWT_SECRET` (required, min 32 chars)
  - Implementation: `apps/api/src/app.ts` (registered as middleware)
  - Strategy: Bearer token in Authorization header
  - Routes requiring auth: Booking, user profile, guide management, dashboard

**Web Frontend:**
- NextAuth.js 4.24.14
  - Secret: `NEXTAUTH_SECRET` (required)
  - URL: `NEXTAUTH_URL` (e.g., `https://app.railway.app`)
  - Session strategy: JWT or database (configurable)
  - Provider support: Credentials (local), OAuth (future)

**Password Management:**
- bcryptjs 3.0.3 - Password hashing
  - Implementation: `apps/api/src/modules/auth/`
  - Storage: PostgreSQL `User.password` (hashed)
  - Reset tokens: `PasswordResetToken` table (time-limited)

**CPF (Brazilian ID) Handling:**
- HMAC-SHA256 encryption (not stored in plaintext)
  - Key: `CPF_SECRET` (required, min 32 chars)
  - Implementation: LGPD compliance (Phase 1)
  - Anonymization salt: `ANONYMIZATION_SALT` (for data deletion)

## Monitoring & Observability

**Error Tracking:**
- Sentry (`@sentry/node` v8.55.2) - Optional error monitoring
  - DSN: `SENTRY_DSN` (optional environment variable)
  - Setup: `apps/api/src/shared/sentry.ts`
  - Initialization: BEFORE Fastify app creation (per Sentry D-08)
  - Environment: NODE_ENV (production/development)
  - Trace sampling: 10% production, 100% development
  - Business errors: NOT reported (per D-07 — expected exceptions like BOOKING_NOT_FOUND)
  - Unexpected errors: Captured with tenant/user context
  - Graceful no-op if SENTRY_DSN not set

**Logs:**
- Fastify logger (built-in)
  - Level: trace (development), error (production)
  - Output: stdout
  - Request IDs: `X-Request-Id` header (crypto.randomUUID)
  - Request logging: enabled in Fastify config

**Health Checks:**
- Endpoint: `GET /health` (API)
- Check: Database connectivity via `SELECT 1`
- Response: `{ db: "ok" }` or `{ db: "error" }` with 503 status

## CI/CD & Deployment

**Hosting:**
- Railway - Container deployment platform
  - Config: `apps/api/railway.json`, `apps/web/railway.json`
  - Build: Dockerfile-based (custom Docker build)
  - API start: `node dist/app.js`
  - Web start: Next.js built-in server
  - Release command (API): `npx prisma migrate deploy`
  - Health checks: `/health` (API), `/` (web)
  - Restart policy: ON_FAILURE

**CI Pipeline:**
- None currently configured
- pnpm scripts available: `pnpm dev`, `pnpm build`, `pnpm test`

**Build Process:**
- Turborepo orchestration (`turbo.json`)
- Parallel build: `turbo build`
- Parallel dev: `turbo dev`

## Environment Configuration

**Required Environment Variables (All Environments):**
```
DATABASE_URL=postgresql://...
JWT_SECRET=[min 32 chars]
MP_ACCESS_TOKEN=[Mercado Pago API key]
MP_WEBHOOK_SECRET=[Mercado Pago webhook key]
CLOUDFLARE_ACCOUNT_ID=[CloudFlare account]
CLOUDFLARE_API_TOKEN=[accessKeyId:secretAccessKey]
R2_BUCKET_NAME=[bucket name]
R2_PUBLIC_URL=[https://pub-xxxx.r2.dev]
CPF_SECRET=[min 32 chars]
ANONYMIZATION_SALT=[min 32 chars]
```

**Required in Production Only:**
```
CORS_ORIGIN=[https://app.railway.app]
NEXTAUTH_SECRET=[min 32 chars]
NEXTAUTH_URL=[https://app.railway.app]
```

**Optional (Graceful Fallback):**
```
RESEND_API_KEY=[Resend email API]
EMAIL_FROM=[sender email, default: CAPI <noreply@capi.turismo>]
SENTRY_DSN=[Sentry monitoring, app runs without it]
BOOKING_EXPIRY_MINUTES=[default: 30]
NODE_ENV=[development|production|test, default: development]
```

**Secrets Location:**
- Git-ignored: `.env`, `.env.local`, `.env.*.local`
- Railway: Environment variables in project settings
- Development: `.env` file (see `.env.example`)

## Webhooks & Callbacks

**Incoming (API):**
- Mercado Pago Payment Notifications
  - Endpoint: `POST /webhooks/mercado-pago` (internal route)
  - Validation: HMAC-SHA256 signature in `x-signature` header
  - Manifest format: `id:{paymentId};request-date:{ts};`
  - Time-based replay protection: 300 seconds (5 minutes)
  - Implementation: `apps/api/src/modules/webhooks/webhooks.routes.ts`
  - Handler: Query payment status, update booking status, send confirmation email
  - Raw body access: via `fastify-raw-body` plugin (required for signature validation)

**Outgoing:**
- None currently configured (Mercado Pago and Resend use API calls, not webhooks)

## Third-Party API Patterns

**Mercado Pago Payment Flow:**
1. Create payment via SDK: `new Payment(client).create({ ... })`
2. Extract: QR code, payment link, ticket URL
3. Return to frontend for display
4. Receive webhook on payment status change
5. Verify signature, update booking + send email

**Resend Email Flow:**
1. Check if RESEND_API_KEY exists (optional)
2. Instantiate: `new Resend(process.env.RESEND_API_KEY)`
3. Call: `resend.emails.send({ from, to, subject, html })`
4. No-op if key missing (development/test)

**Cloudflare R2 Upload Flow:**
1. Client: HTTP multipart form data
2. Server: Validate mime type, file size
3. Sanitize filename
4. S3 PUT via @aws-sdk/client-s3: `PutObjectCommand`
5. Return: `{ url, key }` (public URL + internal key)

---

*Integration audit: 2026-09-04*
