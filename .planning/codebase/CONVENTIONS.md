# Conventions — turismo-capivara

> Last mapped: 2026-09-06

## Code Style

- **TypeScript** strict mode across both apps
- **No ESLint/Prettier config** at root — only `eslint-config-next` for web
- **Imports:** Relative paths in API; `@/*` alias in Web
- **Semicolons:** Not enforced (mixed usage, mostly without)
- **Quotes:** Single quotes predominant

## API Patterns

### Route Plugins
Routes export async Fastify plugin functions registered in `app.ts`:

```typescript
export async function bookingsRoutes(app: FastifyInstance) {
  app.post('/...', { preHandler: [authenticate, authorize([...])] }, async (req, reply) => {
    // handler logic inline
  })
}
```

### Validation — Zod Schemas
Schemas in `{module}.schemas.ts`, types inferred and exported:

```typescript
// bookings.schemas.ts
export const createBookingSchema = z.object({ ... })
export type CreateBookingInput = z.infer<typeof createBookingSchema>
```

Validation called inline in route handlers: `schema.parse(request.body)`.

### Error Handling
- `throw new AppError('Message in PT-BR', statusCode)` for business errors
- Global `setErrorHandler` in `app.ts` catches `AppError` and Zod `ZodError`
- Response format: `{ message: string }` — NOT `{ error }` field
- All user-facing messages in Portuguese

### Auth Middleware Chain
```typescript
{ preHandler: [authenticate] }                    // JWT only
{ preHandler: [authenticate, authorize(['ADMIN'])] }  // JWT + role
```

- `authenticate` — JWT verify + cross-tenant slug ownership check
- `authorize(roles)` — role whitelist check

### Database Access
- Direct `prisma.model.method()` calls in route handlers
- Singleton Prisma client from `apps/api/src/database.ts`
- `prisma.$transaction()` for booking operations (anti-overbooking)
- IDs are CUIDs (`@default(cuid())`) — never UUID

### Email Templates
- Inline HTML strings returned from functions in `emails/` directories
- Pattern: `function buildXxxEmail(data): { to, subject, html }`

## Web Patterns

### App Router
- Route groups: `(public)`, `(painel)`, `(admin)` for layout separation
- Dynamic `[slug]` segment for multi-tenant routing
- API routes in `app/api/` proxy to Fastify backend
- Server components by default; `"use client"` for interactive components

### Components
- PascalCase file names
- Tailwind CSS for all styling (v4)
- `@radix-ui/react-dialog` for modals
- `sonner` for toast notifications
- Custom CSS in `src/styles/` (animations, rupestre theme)

### Authentication (Web)
- next-auth v4 with credentials provider
- Session-based, stores JWT from API
- Protected routes via layout middleware

## Environment Variables

- Validated at startup via Zod in `apps/api/src/shared/env.ts`
- `process.exit(1)` on validation failure
- `CORS_ORIGIN` required in production
- Mercado Pago tokens optional (mock fallback)
