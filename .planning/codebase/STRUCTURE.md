# Directory Structure

**Analysis Date:** 2026-04-17

```
turismo-capivara/
├── apps/
│   ├── api/                         # Fastify REST API (@turismo/api)
│   │   ├── src/
│   │   │   ├── app.ts               # Entry point: Fastify instance, plugin + route registration
│   │   │   ├── database.ts          # Singleton Prisma client export
│   │   │   ├── modules/
│   │   │   │   ├── auth/auth.routes.ts
│   │   │   │   ├── tenants/tenants.routes.ts
│   │   │   │   ├── packages/packages.routes.ts
│   │   │   │   └── bookings/bookings.routes.ts
│   │   │   └── shared/
│   │   │       ├── middlewares/authenticate.ts
│   │   │       ├── middlewares/authorize.ts
│   │   │       ├── errors/AppError.ts
│   │   │       ├── errors/middlewares/   # STALE — duplicate of shared/middlewares
│   │   │       ├── errors/types/         # STALE — duplicate of shared/types
│   │   │       └── types/fastify.d.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── seed.ts
│   │   │   └── migrations/
│   │   ├── dist/                    # Compiled output (tsc, CommonJS)
│   │   ├── package.json             # name: @turismo/api
│   │   ├── tsconfig.json
│   │   ├── prisma.config.ts
│   │   ├── railway.json             # Railway deployment config
│   │   ├── Procfile
│   │   └── AGENTS.md
│   └── web/                         # Next.js 16 frontend (@turismo/web)
│       ├── app/
│       │   ├── layout.tsx           # Root layout, fonts
│       │   ├── page.tsx             # Landing page (static)
│       │   ├── globals.css
│       │   ├── roteiros/
│       │   │   ├── page.tsx         # Package listing (Server Component)
│       │   │   ├── detalhe/page.tsx # Package detail + slots (Server Component, ?id= query)
│       │   │   └── slug/page.tsx    # STALE — older Tailwind draft (params.slug)
│       │   ├── reservar/page.tsx    # Booking form (Client Component)
│       │   └── dashboard/
│       │       ├── page.tsx         # Login form (Client Component)
│       │       └── reservas/page.tsx # Admin booking list (Client Component)
│       ├── public/
│       ├── next.config.ts
│       └── package.json             # name: @turismo/web
├── packages/                        # EMPTY — reserved for shared libs
├── src/                             # EMPTY — leftover scaffold
├── docker-compose.yml               # postgres:16 + redis:7 for local dev
├── Dockerfile                       # Builds API only; runs prisma migrate deploy + node dist/app.js
├── turbo.json
├── pnpm-workspace.yaml
└── package.json                     # Root: turbo dev/build scripts
```

## Key Files

| File | Purpose |
|------|---------|
| `apps/api/src/app.ts` | Fastify instance setup, CORS, JWT, route registration |
| `apps/api/src/database.ts` | Singleton Prisma client |
| `apps/api/prisma/schema.prisma` | Database schema |
| `apps/web/app/layout.tsx` | Root layout and fonts |
| `Dockerfile` | Production build for Railway (API only) |
| `docker-compose.yml` | Local dev: PostgreSQL + Redis |
