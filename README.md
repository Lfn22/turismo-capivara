# CAPI — Marketplace de Guias de Turismo

Turistas encontram, comparam e reservam guias para roteiros com pagamento integrado (PIX via Mercado Pago).

## Tech Stack

- **API:** Fastify 5 + Prisma 7 + PostgreSQL
- **Web:** Next.js 16.2 + React 19
- **Monorepo:** pnpm + Turborepo
- **Deploy:** Railway

## Quick Start

### Pré-requisitos

- Node.js >= 22.12.0
- pnpm >= 10.32.1
- Docker + Docker Compose

### Setup

```bash
# 1. Clone e instale
git clone <repo-url> && cd turismo-capivara
pnpm install

# 2. Suba Postgres + Redis
docker compose up -d

# 3. Configure variáveis
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 4. Migrations + seed
pnpm --filter @turismo/api exec prisma migrate deploy
pnpm --filter @turismo/api exec prisma generate
pnpm --filter @turismo/api seed

# 5. Dev server
pnpm dev
```

- API: http://localhost:3333
- Web: http://localhost:3000
- Health: http://localhost:3333/health

## Scripts

| Comando          | Descrição             |
| ---------------- | --------------------- |
| `pnpm dev`       | API + Web em modo dev |
| `pnpm build`     | Build de produção     |
| `pnpm lint`      | ESLint + TypeScript   |
| `pnpm typecheck` | Verificação de tipos  |
| `pnpm test`      | Testes (Vitest)       |

## Estrutura

```
turismo-capivara/
├── apps/
│   ├── api/          # Fastify API
│   │   ├── prisma/   # Schema + migrations
│   │   └── src/
│   │       ├── modules/    # auth, bookings, packages, destinations...
│   │       ├── shared/     # Middlewares, utils, erros
│   │       └── services/   # Pagamento (Mercado Pago)
│   └── web/          # Next.js Frontend
│       ├── app/      # App Router (pages, layouts)
│       └── src/
│           ├── components/ # Design system CAPI + UI
│           ├── lib/        # Utilities
│           └── styles/     # CSS + design tokens
├── packages/         # Shared packages (futuro)
└── docker-compose.yml
```

## Database

```bash
# Reset completo (destroi dados)
pnpm --filter @turismo/api exec prisma migrate reset

# Nova migration
pnpm --filter @turismo/api exec prisma migrate dev --name <nome>
```

## Roles

| Role           | Descrição                     |
| -------------- | ----------------------------- |
| ADMIN          | Dono da operadora turística   |
| CONDUTOR       | Guia de turismo               |
| CLIENTE        | Turista                       |
| PLATFORM_ADMIN | Admin da plataforma CAPI      |
| SUPER_ADMIN    | Super admin (sendo deprecado) |

## Variáveis de Ambiente

Veja `apps/api/.env.example` e `apps/web/.env.example` para lista completa.
