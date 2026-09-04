# Codebase Structure

**Analysis Date:** 2026-09-04

## Directory Layout

```
turismo-capivara/                          # pnpm monorepo root
├── apps/                                  # Monorepo workspaces
│   ├── api/                               # Fastify backend (CommonJS, port 3333)
│   │   ├── src/
│   │   │   ├── app.ts                     # Fastify instance, plugin registration, entry point
│   │   │   ├── database.ts                # Prisma client singleton
│   │   │   ├── modules/                   # Domain-driven modules
│   │   │   │   ├── auth/                  # Authentication
│   │   │   │   │   ├── auth.routes.ts     # Login, register, password reset routes
│   │   │   │   │   ├── routes/
│   │   │   │   │   │   ├── lookup-tenant.ts
│   │   │   │   │   │   ├── request-password-reset.ts
│   │   │   │   │   │   └── reset-password.ts
│   │   │   │   ├── bookings/              # Reservations
│   │   │   │   │   ├── bookings.routes.ts # Create, confirm, cancel, lookup
│   │   │   │   │   ├── bookings.schemas.ts
│   │   │   │   │   ├── expiry.job.ts      # Cron job: expire unpaid bookings
│   │   │   │   │   ├── emails/            # Notification templates
│   │   │   │   │   │   ├── booking-created-email.ts
│   │   │   │   │   │   ├── booking-confirmed-email.ts
│   │   │   │   │   │   ├── booking-cancelled-email.ts
│   │   │   │   │   │   └── booking-expired-email.ts
│   │   │   │   │   └── __tests__/         # Unit tests for CPF validation
│   │   │   │   ├── packages/              # Tour packages & availability
│   │   │   │   │   ├── packages.routes.ts # CRUD, slot management
│   │   │   │   │   ├── packages.schemas.ts
│   │   │   │   │   ├── packages.service.ts
│   │   │   │   │   └── *.test.ts
│   │   │   │   ├── tenants/               # Operator management
│   │   │   │   │   ├── tenants.routes.ts  # Signup, approval workflow
│   │   │   │   │   ├── emails/
│   │   │   │   │   │   ├── approval-email.ts
│   │   │   │   │   │   └── rejection-email.ts
│   │   │   │   │   └── __tests__/
│   │   │   │   ├── guides/                # Guide profiles
│   │   │   │   │   └── guides.routes.ts
│   │   │   │   ├── destinations/          # Destination catalog
│   │   │   │   │   ├── destinations.routes.ts
│   │   │   │   │   ├── destinations.schemas.ts
│   │   │   │   │   ├── destinations.service.ts
│   │   │   │   │   └── *.test.ts
│   │   │   │   ├── uploads/               # Photo upload to R2
│   │   │   │   │   ├── uploads.routes.ts
│   │   │   │   │   ├── uploads.service.ts
│   │   │   │   │   └── *.test.ts
│   │   │   │   ├── dashboard/             # Analytics & reporting
│   │   │   │   │   └── dashboard.routes.ts
│   │   │   │   └── webhooks/              # Payment webhooks
│   │   │   │       └── webhooks.routes.ts
│   │   │   ├── services/                  # Cross-module services
│   │   │   │   └── payment.service.ts     # Mercado Pago PIX integration
│   │   │   ├── shared/                    # Shared infrastructure
│   │   │   │   ├── config/
│   │   │   │   │   └── r2.ts              # Cloudflare R2 config
│   │   │   │   ├── middlewares/
│   │   │   │   │   ├── authenticate.ts    # JWT + tenant ownership check
│   │   │   │   │   └── authorize.ts       # Role-based access control
│   │   │   │   ├── errors/
│   │   │   │   │   └── AppError.ts        # Business error class
│   │   │   │   ├── utils/
│   │   │   │   │   └── hash.ts            # CPF hashing utility
│   │   │   │   ├── email.ts               # Resend integration
│   │   │   │   ├── env.ts                 # Environment validation (Zod)
│   │   │   │   └── sentry.ts              # Sentry initialization
│   │   │   └── shared/types/
│   │   │       └── fastify.d.ts           # Fastify type augmentation
│   │   ├── prisma/
│   │   │   ├── schema.prisma              # Database schema (Tenant, User, TourPackage, etc.)
│   │   │   └── migrations/                # Prisma migrations (20260319..., 20260321..., etc.)
│   │   ├── package.json                   # API dependencies
│   │   └── tsconfig.json
│   │
│   └── web/                               # Next.js frontend (port 3000)
│       ├── app/                           # Next.js App Router (NOT src/)
│       │   ├── layout.tsx                 # Root layout (fonts, Providers)
│       │   ├── page.tsx                   # Home page (/destinos, featured content)
│       │   ├── providers.tsx              # NextAuth, React Query providers
│       │   │
│       │   ├── [slug]/                    # Tenant-scoped routes (/:slug/...)
│       │   │   ├── login/page.tsx         # Tenant-aware login
│       │   │   ├── cadastro/page.tsx      # Registration
│       │   │   │
│       │   │   ├── (public)/layout.tsx    # Public pages (no auth required)
│       │   │   │   ├── roteiros/page.tsx  # List packages
│       │   │   │   ├── roteiros/[packageId]/page.tsx  # Package detail
│       │   │   │   ├── guias/page.tsx     # List guides
│       │   │   │   ├── guias/[guideId]/page.tsx       # Guide profile
│       │   │   │   ├── checkout/page.tsx  # Booking form
│       │   │   │   ├── confirmacao/page.tsx           # Booking confirmation
│       │   │   │   ├── reservar/page.tsx  # Reservation lookup
│       │   │   │   └── minha-reserva/page.tsx         # My bookings
│       │   │   │
│       │   │   ├── (painel)/layout.tsx    # Guide/staff dashboard (auth + role check)
│       │   │   │   ├── painel/dashboard/page.tsx      # Overview
│       │   │   │   ├── painel/roteiros/page.tsx       # My packages
│       │   │   │   ├── painel/roteiros/[id]/page.tsx  # Edit package
│       │   │   │   ├── painel/roteiros/novo/page.tsx  # Create package
│       │   │   │   ├── painel/reservas/page.tsx       # My bookings
│       │   │   │   ├── painel/disponibilidade/page.tsx # Slot calendar
│       │   │   │   ├── painel/destino/page.tsx        # Operator destination
│       │   │   │   ├── painel/destinos/page.tsx       # Destination list
│       │   │   │   ├── painel/destinos/novo/page.tsx  # Create destination
│       │   │   │   ├── painel/destinos/[id]/editar/page.tsx
│       │   │   │   └── painel/perfil/page.tsx         # Profile settings
│       │   │   │
│       │   │   └── (admin)/layout.tsx     # Operator admin (role: ADMIN only)
│       │   │       └── admin/guias/page.tsx           # Manage guides
│       │   │
│       │   ├── destinos/                  # Global destination browsing (no tenant slug)
│       │   │   ├── page.tsx               # All destinations
│       │   │   └── [destination-slug]/    # Destination detail
│       │   │       ├── layout.tsx
│       │   │       ├── page.tsx
│       │   │       ├── roteiros/page.tsx
│       │   │       └── roteiros/[id]/page.tsx
│       │   │
│       │   ├── guias/                     # Global guide browsing
│       │   │   └── [id]/page.tsx          # Guide portfolio
│       │   │
│       │   ├── super-admin/               # Super-admin pages (SUPER_ADMIN role only)
│       │   │   ├── layout.tsx
│       │   │   ├── operadoras/page.tsx    # Approve/manage tenants
│       │   │   └── destinos/page.tsx      # Approve/manage destinations
│       │   │
│       │   ├── onboarding/                # Workflow pages
│       │   │   ├── page.tsx               # Initial onboarding
│       │   │   └── aguardando/page.tsx    # Approval waiting
│       │   │
│       │   ├── login/                     # Global login pages
│       │   │   ├── page.tsx               # Global login (non-tenant)
│       │   │   └── esqueci-a-senha/page.tsx
│       │   │
│       │   ├── reset-password/page.tsx    # Password reset
│       │   │
│       │   ├── explorar/page.tsx          # Exploration/discovery
│       │   │
│       │   └── api/                       # Next.js API routes (server-side functions)
│       │       ├── proxy/route.ts         # Generic proxy: /api/proxy?path=/tenants/...
│       │       ├── auth/[...nextauth]/route.ts  # NextAuth handler
│       │       ├── tenants/[slug]/...     # Tenant-scoped endpoints
│       │       ├── admin/                 # Super-admin endpoints
│       │       └── ...                    # Other utility endpoints
│       │
│       ├── src/                           # Non-App Router sources
│       │   ├── components/                # React components
│       │   │   ├── layout/                # Layout components (PublicLayout, etc.)
│       │   │   ├── ui/                    # Reusable UI (BookingForm, SlotPicker, etc.)
│       │   │   ├── home/                  # Home page sections
│       │   │   ├── destination/           # Destination-specific components
│       │   │   ├── roteiro/               # Package/itinerary components
│       │   │   ├── painel/                # Dashboard components
│       │   │   └── ...                    # Other feature-specific components
│       │   └── styles/                    # Global CSS
│       │
│       ├── lib/                           # Utilities & hooks (typically api client, form utils)
│       ├── public/                        # Static assets
│       ├── types/                         # TypeScript type definitions
│       ├── middleware.ts                  # Next.js middleware (role-based routing)
│       ├── next.config.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── AGENTS.md                      # Next.js version warning
│
├── .planning/                             # Planning and roadmap documents
│   ├── codebase/                          # Architecture maps (this file, ARCHITECTURE.md)
│   ├── phases/                            # Phase specifications
│   └── ...
│
├── docs/                                  # Documentation
├── scripts/                               # Build/deployment scripts
├── package.json                           # Root monorepo config (Turborepo)
└── CLAUDE.md                              # Project guide (this context)
```

## Directory Purposes

**`apps/api/src/modules/`:**
- Purpose: Domain-driven module organization; each module owns its routes, schemas, business logic, tests
- Contains: Route handlers (FastifyInstance plugin), Zod validation schemas, service functions, email templates, unit tests
- Key principle: Modules are independent; route handlers import from shared (auth, errors) and database

**`apps/api/src/shared/`:**
- Purpose: Cross-cutting infrastructure used by all modules
- Contains: Middleware (authenticate, authorize), error class, utilities (CPF hash), external service configs (R2, email, Sentry)
- Key principle: No module-specific logic here; only re-usable infrastructure

**`apps/web/app/`:**
- Purpose: Next.js App Router structure (not src/); defines all routes via directory naming
- Contains: Pages (page.tsx), layouts (layout.tsx), API routes (api/), grouping with parentheses `(groupName)/`
- Key principle: File-based routing; `[slug]` creates dynamic param; `(groupName)` groups routes without changing URL

**`apps/web/app/[slug]/(public)/`:**
- Purpose: Customer-facing pages (no authentication required, public read access)
- Contains: Package browsing, guide profiles, booking forms, reservation lookup
- Scoped to: Single tenant (via [slug] param)

**`apps/web/app/[slug]/(painel)/`:**
- Purpose: Guide/staff dashboard (authentication + role check in middleware.ts)
- Contains: Guide's packages, bookings, availability calendar, profile settings
- Protected by: middleware.ts checks role (CONDUTOR, ADMIN, ATENDENTE only)

**`apps/web/app/[slug]/(admin)/`:**
- Purpose: Operator admin pages (higher privilege than guide)
- Contains: Guide management, staff management
- Protected by: middleware.ts checks role (ADMIN only for this tenant)

**`apps/web/app/super-admin/`:**
- Purpose: Platform super-admin pages (global, not tenant-scoped)
- Contains: Tenant approval, destination approval, operator management
- Protected by: middleware.ts checks role (SUPER_ADMIN only)

**`apps/web/app/destinos/`:**
- Purpose: Global destination discovery (not under [slug])
- Contains: All destinations catalog, destination detail pages, per-destination guide listings
- Not tenant-scoped; public read

**`apps/web/src/components/`:**
- Purpose: Reusable React components (RSC or client, organized by feature)
- Contains: UI components (BookingForm, SlotPicker, DestinationCard), layout templates, animations
- Pattern: Components in `apps/web/src/`, imported via `@/src/components/...` (see tsconfig.json paths)

## Key File Locations

**Entry Points:**
- Backend: `apps/api/src/app.ts` — Fastify instance initialization, plugin registration
- Frontend root: `apps/web/app/layout.tsx` — Root HTML, fonts, global providers
- Frontend home: `apps/web/app/page.tsx` — Home page content

**Configuration:**
- Environment validation: `apps/api/src/shared/env.ts` — Zod schema for all required env vars
- Build: `apps/web/next.config.ts`, `apps/api/package.json` scripts
- Database schema: `apps/api/prisma/schema.prisma` — All models (Tenant, User, Booking, etc.)

**Core Logic:**
- Tenant auth: `apps/api/src/modules/auth/auth.routes.ts` — Login, register
- Booking transactions: `apps/api/src/modules/bookings/bookings.routes.ts` — Create, confirm, cancel with slot locking
- Payment integration: `apps/api/src/services/payment.service.ts` — Mercado Pago PIX
- Web authentication: `apps/web/app/api/auth/[...nextauth]/route.ts` — NextAuth handler
- Web proxy: `apps/web/app/api/proxy/route.ts` — Forwarding API calls server-side

**Testing:**
- API tests: `apps/api/src/modules/*/` and `apps/api/src/modules/*/__tests__/` (.test.ts files)
- No end-to-end tests detected; testing is unit-level per module

**Middleware & Guards:**
- API auth: `apps/api/src/shared/middlewares/authenticate.ts` — JWT + tenant ownership
- API authorization: `apps/api/src/shared/middlewares/authorize.ts` — Role checks
- Web routing guard: `apps/web/middleware.ts` — NextAuth middleware with role-based redirect

## Naming Conventions

**Files:**
- Routes: `{module}.routes.ts` (e.g., `auth.routes.ts`, `bookings.routes.ts`)
- Schemas: `{module}.schemas.ts` (e.g., `bookings.schemas.ts`)
- Services: `{name}.service.ts` (e.g., `payment.service.ts`)
- Tests: `{name}.test.ts` (e.g., `cpf-hash.test.ts`)
- Jobs: `{name}.job.ts` (e.g., `expiry.job.ts`)
- Emails: `{event}-email.ts` (e.g., `booking-created-email.ts`)
- Pages: `page.tsx` (RSC), `layout.tsx` (parent container), `loading.tsx` (skeleton), `route.ts` (API)

**Directories:**
- Modules: kebab-case domain name (auth, bookings, packages, tenants, guides, destinations, uploads, dashboard)
- Components: folder name matches purpose (layout, ui, home, destination, painel)
- Grouped routes: parentheses `(groupName)` for logical grouping without URL segment (e.g., `(public)`, `(painel)`, `(admin)`)

**Functions:**
- camelCase for all functions and variables (e.g., `createBooking`, `authenticate`, `formatPrice`)
- PascalCase for React components (e.g., `SlotPicker`, `BookingForm`, `DestinationCard`)

**Types:**
- PascalCase interfaces (e.g., `TourPackage`, `DepartureSlot`, `Booking`)
- Suffix -Schema for Zod types (e.g., `createBookingBodySchema`, `loginBodySchema`)

## Where to Add New Code

**New Backend Endpoint (e.g., Guide rating system):**
1. Create `apps/api/src/modules/guides/guides.routes.ts` if not exists
2. Add Zod schema for request: `apps/api/src/modules/guides/guides.schemas.ts`
3. Add route handler in auth.routes.ts: `app.post('/tenants/:slug/guides/:id/rate', ...)`
4. Register module in `apps/api/src/app.ts`: `app.register(guidesRoutes)`
5. Add tests: `apps/api/src/modules/guides/__tests__/rating.test.ts`

**New Frontend Page (e.g., Guide reviews page):**
1. Create `apps/web/app/[slug]/(public)/guias/[guideId]/reviews/page.tsx` (as RSC)
2. Fetch data from API via `/api/proxy?path=/tenants/:slug/...` or direct fetch in RSC
3. Import components from `apps/web/src/components/`
4. Add to navigation in layout component (e.g., `PublicLayout.tsx`)

**New Reusable Component (e.g., RatingStars):**
1. Create `apps/web/src/components/ui/RatingStars.tsx` (or feature-specific folder)
2. Export from component file; import in pages via `@/src/components/ui/RatingStars`
3. Use TypeScript for prop typing

**New Utility Service (e.g., Email queue for async sending):**
1. Create `apps/api/src/services/{name}.service.ts`
2. Export functions that can be called from modules
3. Import in route handlers: `import { enqueueMail } from '../../services/email.service'`

**New Database Model (e.g., Review):**
1. Add model to `apps/api/prisma/schema.prisma`
2. Create migration: `pnpm prisma migrate dev --name add_review_model`
3. Regenerate Prisma client (auto)
4. Create queries in modules that use it

## Special Directories

**`apps/api/prisma/migrations/`:**
- Purpose: Incremental database migration history (Prisma)
- Generated: Auto-created by `pnpm prisma migrate dev`
- Committed: Yes; never manually edited

**`apps/web/public/`:**
- Purpose: Static assets (logos, images) served at /
- Generated: Manual uploads
- Committed: Yes

**`.next/` (in apps/web):**
- Purpose: Next.js build output
- Generated: Auto-created by `pnpm build`
- Committed: No (.gitignore)

**`dist/` (in apps/api):**
- Purpose: Compiled JavaScript (if used; currently CommonJS in src/)
- Generated: Build scripts
- Committed: No

**`.planning/codebase/`:**
- Purpose: Architecture documentation (this file, ARCHITECTURE.md)
- Generated: Manually (GSD codebase mapping)
- Committed: Yes

**`.planning/phases/`:**
- Purpose: Detailed phase plans and requirements
- Generated: Planning phase
- Committed: Yes

---

*Structure analysis: 2026-09-04*
