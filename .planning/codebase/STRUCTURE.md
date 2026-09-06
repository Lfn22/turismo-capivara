# Structure — turismo-capivara

> Last mapped: 2026-09-06

## Root Layout

```
turismo-capivara/
├── apps/
│   ├── api/              # Fastify API
│   └── web/              # Next.js frontend
├── .planning/            # GSD planning artifacts
├── package.json          # Workspace root
├── turbo.json            # Turborepo config
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

## API (`apps/api/`)

```
apps/api/
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data
├── src/
│   ├── app.ts            # Main entry — plugin registration + server start
│   ├── server.ts         # Thin server wrapper
│   ├── database.ts       # Prisma singleton
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   └── routes/   # Sub-routes (lookup-tenant, password-reset)
│   │   ├── bookings/
│   │   │   ├── bookings.routes.ts
│   │   │   ├── bookings.schemas.ts
│   │   │   ├── emails/   # Email templates
│   │   │   ├── expiry.job.ts
│   │   │   └── __tests__/
│   │   ├── dashboard/
│   │   │   └── dashboard.routes.ts
│   │   ├── destinations/
│   │   │   ├── destinations.routes.ts
│   │   │   ├── destinations.schemas.ts
│   │   │   └── destinations.service.ts
│   │   ├── guides/
│   │   │   └── guides.routes.ts
│   │   ├── packages/
│   │   │   ├── packages.routes.ts
│   │   │   ├── packages.schemas.ts
│   │   │   └── packages.service.ts
│   │   ├── tenants/
│   │   │   ├── tenants.routes.ts
│   │   │   ├── emails/
│   │   │   └── __tests__/
│   │   ├── uploads/
│   │   │   ├── uploads.routes.ts
│   │   │   └── uploads.service.ts
│   │   ├── users/
│   │   │   └── users.routes.ts
│   │   └── webhooks/
│   │       └── webhooks.routes.ts
│   ├── services/
│   │   └── payment.service.ts
│   ├── shared/
│   │   ├── config/
│   │   │   └── r2.ts
│   │   ├── email.ts
│   │   ├── env.ts
│   │   ├── errors/
│   │   │   └── AppError.ts
│   │   ├── middlewares/
│   │   │   ├── authenticate.ts
│   │   │   └── authorize.ts
│   │   ├── sentry.ts
│   │   ├── types/
│   │   │   └── fastify.d.ts
│   │   └── utils/
│   │       └── hash.ts
│   └── __tests__/
│       ├── helpers/
│       │   └── build-app.ts
│       ├── bookings-b1.test.ts
│       ├── bookings-create.test.ts
│       ├── checkout.test.ts
│       ├── cancel-self.test.ts
│       ├── dashboard.test.ts
│       ├── rate-limit.test.ts
│       ├── self-service.test.ts
│       ├── sentry.test.ts
│       └── tenants.test.ts
└── vitest.config.ts
```

## Web (`apps/web/`)

```
apps/web/
├── app/
│   ├── layout.tsx            # Root layout
│   ├── globals.css
│   ├── page.tsx              # Landing page
│   ├── actions/              # Server actions (waitlist)
│   ├── [slug]/
│   │   ├── login/page.tsx
│   │   ├── cadastro/page.tsx
│   │   ├── (public)/         # Public tenant pages
│   │   │   ├── roteiros/     # Tour packages
│   │   │   ├── guias/        # Guides
│   │   │   ├── reservar/     # Booking
│   │   │   ├── checkout/     # Payment
│   │   │   ├── confirmacao/  # Confirmation
│   │   │   └── minha-reserva/# My booking
│   │   ├── (painel)/         # Operator panel (authenticated)
│   │   │   └── painel/
│   │   │       ├── dashboard/
│   │   │       ├── reservas/
│   │   │       ├── roteiros/
│   │   │       ├── destinos/
│   │   │       ├── disponibilidade/
│   │   │       └── perfil/
│   │   └── (admin)/          # Admin pages
│   │       └── admin/guias/
│   └── api/                  # Next.js API routes (proxy to Fastify)
│       ├── auth/
│       ├── [slug]/bookings/
│       ├── [slug]/dashboard/
│       ├── tenants/
│       ├── admin/destinations/
│       └── super-admin/tenants/
├── src/
│   ├── components/
│   │   ├── home/             # Landing page components
│   │   ├── layout/           # Nav, bottom nav, public layout
│   │   ├── ui/               # Shared UI components
│   │   ├── destination/      # Destination-specific
│   │   ├── painel/           # Panel components
│   │   └── roteiro/          # Tour detail components
│   ├── styles/
│   │   ├── animations.css
│   │   └── rupestre.css
│   └── lib/                  # Utilities
└── next.config.ts
```

## Naming Conventions

- **Modules:** `{domain}.routes.ts`, `{domain}.schemas.ts`, `{domain}.service.ts`
- **Tests:** `{domain}.routes.test.ts` (co-located) or `__tests__/{name}.test.ts` (integration)
- **Emails:** `{event}-email.ts` in `emails/` subdirectory
- **Components:** PascalCase `.tsx` files
- **Pages:** PT-BR slugs (`roteiros`, `reservar`, `confirmacao`, `guias`)
- **Route groups:** Next.js `(public)`, `(painel)`, `(admin)` for layout grouping
