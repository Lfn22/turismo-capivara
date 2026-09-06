# Integrations — turismo-capivara

> Last mapped: 2026-09-06

## Database — PostgreSQL

- **Connection:** `DATABASE_URL` env var, connected via `@prisma/adapter-pg` (PrismaPg)
- **Client:** Singleton in `apps/api/src/database.ts`
- **Models:** Destination, Tenant, User, GuideProfile, TourPackage, PackageGuide, DepartureSlot, Booking, Voucher, PasswordResetToken, Testimonial, ProcessedWebhookEvent

## Authentication — JWT (@fastify/jwt)

- **Secret:** `JWT_SECRET` env var
- **Middleware:** `apps/api/src/shared/middlewares/authenticate.ts` — verifies JWT, cross-tenant ownership check via slug param
- **Authorization:** `apps/api/src/shared/middlewares/authorize.ts` — role-based (`Role[]`)
- **Web auth:** next-auth 4.x — `apps/web/app/api/auth/[...nextauth]/route.ts`

## Payments — Mercado Pago

- **SDK:** `mercadopago` ^2.12.0
- **Service:** `apps/api/src/services/payment.service.ts` — PIX with mock fallback
- **Webhooks:** `apps/api/src/modules/webhooks/webhooks.routes.ts`
- **Idempotency:** `ProcessedWebhookEvent` model prevents duplicate processing
- **Raw body:** `fastify-raw-body` for webhook signature verification
- **Config:** `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` env vars

## Email — Resend

- **SDK:** `resend` ^6.12.3
- **Client:** `apps/api/src/shared/email.ts`
- **Templates:** Inline HTML in `apps/api/src/modules/bookings/emails/` and `apps/api/src/modules/tenants/emails/`
- **Types:** booking-confirmed, booking-created, booking-cancelled, booking-expired, booking-guide-notification, guide-approved, tenant approval/rejection
- **Config:** `RESEND_API_KEY`, `EMAIL_FROM` env vars

## Object Storage — Cloudflare R2

- **SDK:** `@aws-sdk/client-s3` (S3-compatible API)
- **Config:** `apps/api/src/shared/config/r2.ts`
- **Service:** `apps/api/src/modules/uploads/uploads.service.ts`
- **Routes:** `apps/api/src/modules/uploads/uploads.routes.ts`
- **Config:** `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`

## Monitoring — Sentry

- **SDK:** `@sentry/node` ^8.55.2
- **Init:** `apps/api/src/shared/sentry.ts` — initialized before Fastify (D-08 requirement)
- **Integration:** `Sentry.setupFastifyErrorHandler(app)` registered before custom error handler
- **Config:** `SENTRY_DSN` env var (optional)

## Security — LGPD Compliance

- **CPF hashing:** HMAC-SHA256 via `CPF_SECRET` — never stored in plaintext
- **Anonymization:** `ANONYMIZATION_SALT` for data anonymization
- **Utilities:** `apps/api/src/shared/utils/hash.ts`

## Maps — MapLibre GL

- **Web only:** `maplibre-gl` ^5.24.0
- **Component:** `apps/web/src/components/ui/MapWidget.tsx` / `MapWidgetClient.tsx`

## Cron Jobs

- **Library:** `fastify-cron` ^1.4.0
- **Jobs:** Booking expiry — `apps/api/src/modules/bookings/expiry.job.ts`
- **Config:** `BOOKING_EXPIRY_MINUTES` env var (default: 30)
