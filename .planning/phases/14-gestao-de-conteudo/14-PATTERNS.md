# Phase 14: Gestão de Conteúdo — Pattern Map

**Mapped:** 2026-06-08  
**Files analyzed:** 13 new/modified files  
**Analogs found:** 12/13 with matches

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/api/src/modules/destinations/destinations.service.ts` | service | CRUD | `apps/api/src/modules/guides/guides.routes.ts` (admin approval logic) | role-match |
| `apps/api/src/modules/destinations/destinations.routes.ts` (expand) | controller | CRUD | `apps/api/src/modules/guides/guides.routes.ts` | exact |
| `apps/api/src/modules/destinations/destinations.schemas.ts` | utility/validation | validation | `apps/api/src/modules/bookings/bookings.schemas.ts` | exact |
| `apps/api/src/modules/uploads/uploads.service.ts` | service | file-I/O | `apps/api/src/modules/guides/guides.routes.ts` (profile update pattern) | partial |
| `apps/api/src/modules/uploads/uploads.routes.ts` | controller | file-I/O | `apps/api/src/modules/destinations/destinations.routes.ts` | role-match |
| `apps/api/src/modules/tours-packages/packages.service.ts` | service | CRUD | `apps/api/src/modules/destinations/destinations.routes.ts` (update logic) | partial |
| `apps/api/src/modules/tours-packages/packages.routes.ts` (expand) | controller | CRUD | `apps/api/src/modules/guides/guides.routes.ts` | role-match |
| `apps/api/src/modules/tours-packages/packages.schemas.ts` | utility/validation | validation | `apps/api/src/modules/bookings/bookings.schemas.ts` | exact |
| `apps/web/app/[slug]/(painel)/painel/destino/page.tsx` | page/component | request-response | `apps/web/app/[slug]/(painel)/painel/roteiros/page.tsx` | exact |
| `apps/web/app/super-admin/destinos/page.tsx` | page/component | request-response | `apps/web/app/super-admin/operadoras/page.tsx` | exact |
| `prisma/migrations/[ts]_add_approval_status_destination/migration.sql` | migration | transform | (existing enum ApprovalStatus pattern) | exact |
| `prisma/migrations/[ts]_add_created_by_destination/migration.sql` | migration | transform | (existing FK patterns in schema) | exact |
| `prisma/migrations/[ts]_add_photos_highlights_package/migration.sql` | migration | transform | (existing String[] field patterns) | exact |

---

## Pattern Assignments

### `apps/api/src/modules/destinations/destinations.routes.ts` — EXPAND (controller, CRUD)

**Analog:** `apps/api/src/modules/guides/guides.routes.ts` (lines 178–230: admin approval route pattern)

**Imports pattern** (from guides.routes.ts, lines 1–8):
```typescript
import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
```

**Auth decorator pattern** (guides.routes.ts, line 178–181):
```typescript
app.patch('/tenants/:slug/admin/guides/:id/approve', {
  preHandler: [authenticate, authorize(['ADMIN'])],
}, async (request, reply) => {
```

**Error handling for Zod validation** (guides.routes.ts, lines 10–15):
```typescript
function zodError(err: ZodError) {
  return {
    message: 'Dados inválidos',
    errors: err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  }
}
// Usage: return reply.status(400).send(zodError(err))
```

**Ownership check pattern** (guides.routes.ts, lines 198–209):
```typescript
const guideProfile = await prisma.guideProfile.findFirst({
  where: {
    id: params.id,
    user: {
      tenantId: admin.tenantId,
      role: 'CONDUTOR',
    },
  },
  select: { userId: true, user: { select: { name: true, email: true } } },
})

if (!guideProfile) throw new AppError('Guia não encontrado', 404)
```

**PATCH response pattern** (guides.routes.ts, line 228):
```typescript
return reply.status(200).send({ message: 'Guia aprovado com sucesso' })
```

---

### `apps/api/src/modules/destinations/destinations.service.ts` — NEW (service, CRUD)

**Analog:** `apps/api/src/modules/guides/guides.routes.ts` (admin approval pattern, lines 200–215)

**Service function pattern for ownership + update:**
```typescript
// From guides.routes.ts, lines 207–213 (ownership check + update pattern)
const guideProfile = await prisma.guideProfile.findFirst({
  where: {
    id: params.id,
    user: { tenantId: admin.tenantId, role: 'CONDUTOR' },
  },
  select: { userId: true },
})

if (!guideProfile) throw new AppError('Guia não encontrado', 404)

await prisma.user.update({
  where: { id: guideProfile.userId },
  data: { approvalStatus: 'APPROVED', rejectionReason: null },
})
```

**Note:** Extract this ownership check pattern for `editDestination` and `deleteDestination` functions. Verify `createdById === currentUserId` before mutation.

---

### `apps/api/src/modules/destinations/destinations.schemas.ts` — NEW (utility, validation)

**Analog:** `apps/api/src/modules/bookings/bookings.schemas.ts` (lines 1–6)

**Zod schema pattern:**
```typescript
import { z } from 'zod'

export const selfServiceBodySchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  code: z.string().length(6, { message: 'Código deve ter 6 caracteres' }),
})

export type SelfServiceBody = z.infer<typeof selfServiceBodySchema>
```

**Apply to:** POST/PATCH destination body validation. Add `photos: z.array(z.string()).max(5, { message: 'Máximo 5 fotos' })` for photo limit enforcement.

---

### `apps/api/src/modules/uploads/uploads.service.ts` — NEW (service, file-I/O)

**Analog:** guides.routes.ts doesn't have explicit upload, but AWS SDK pattern is standard. No existing R2 code found.

**R2 pre-signed URL pattern** (from RESEARCH.md, lines 266–294):
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({
  region: 'auto',
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
  },
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
})

export async function generateUploadUrl(
  destinationId: string,
  fileName: string,
  contentType: string
) {
  const key = `destinations/${destinationId}/${Date.now()}-${fileName}`
  const command = new PutObjectCommand({
    Bucket: 'turismo-capivara',
    Key: key,
    ContentType: contentType,
  })
  const url = await getSignedUrl(s3, command, { expiresIn: 3600 })
  return { url, key }
}
```

---

### `apps/api/src/modules/uploads/uploads.routes.ts` — NEW (controller, file-I/O)

**Analog:** `apps/api/src/modules/destinations/destinations.routes.ts` (existing GET endpoints, lines 20–36)

**Route structure with auth:**
```typescript
// From destinations.routes.ts, lines 20–36
app.get('/destinations', async (_request, reply) => {
  const destinations = await prisma.destination.findMany({
    where: { active: true },
    select: { /* fields */ },
    orderBy: { title: 'asc' },
  })
  return reply.status(200).send(destinations)
})

// Apply auth decorator from guides.routes.ts, line 178:
app.post(
  '/destinations/:id/upload',
  { preHandler: [authenticate, authorize(['CONDUTOR', 'ADMIN'])] },
  async (request, reply) => { /* handler */ }
)
```

---

### `apps/api/src/modules/tours-packages/packages.service.ts` — NEW (service, CRUD)

**Analog:** guides.routes.ts PATCH pattern (lines 317–360)

**Service update pattern:**
```typescript
// From guides.routes.ts, lines 340–360
const guideProfile = await prisma.guideProfile.findFirst({
  where: { userId: request.user.sub, id: profile.id },
})

if (!guideProfile) throw new AppError('Seu perfil não foi encontrado', 404)

await prisma.guideProfile.update({
  where: { id: guideProfile.id },
  data: {
    bio: body.bio,
    photoUrl: body.photoUrl,
    especialidades: body.especialidades,
    regioes: body.regioes,
    portfolioPhotos: body.portfolioPhotos,
  },
})
```

**Apply to packages:** Update `TourPackage` with `photos: String[]` and `highlights: String[]`.

---

### `apps/api/src/modules/tours-packages/packages.routes.ts` — NEW (controller, CRUD)

**Analog:** `apps/api/src/modules/guides/guides.routes.ts` (lines 317–360: PATCH pattern)

**Tenant-scoped route pattern:**
```typescript
// From destinations.routes.ts, lines 45–48
app.get('/tenants/:slug/guides/:id', async (request, reply) => {
  let params
  try {
    params = guideIdParamsSchema.parse(request.params)
  } catch (err) {
    if (err instanceof ZodError) return reply.status(400).send(zodError(err))
    throw err
  }
  // ...handler body
})
```

**Apply to packages enrichment route:** PATCH `/tenants/:slug/packages/:id` with auth + ownership check.

---

### `apps/api/src/modules/tours-packages/packages.schemas.ts` — NEW (utility, validation)

**Analog:** `apps/api/src/modules/bookings/bookings.schemas.ts` (lines 1–8)

**Schema pattern for array validation:**
```typescript
import { z } from 'zod'

export const enrichPackageBodySchema = z.object({
  photos: z.array(z.string().url()).max(5, { message: 'Máximo 5 fotos' }),
  highlights: z.array(z.string()).max(20, { message: 'Máximo 20 experiências' }),
})

export type EnrichPackageBody = z.infer<typeof enrichPackageBodySchema>
```

---

### `apps/web/app/[slug]/(painel)/painel/destino/page.tsx` — NEW (page, request-response)

**Analog:** `apps/web/app/[slug]/(painel)/painel/roteiros/page.tsx` (RSC + client component pattern)

**Server component with API token extraction** (roteiros/page.tsx pattern):
```typescript
import { getServerSession } from "next-auth"
import { getToken } from "next-auth/jwt"

export default async function DestinoPage() {
  const session = await getServerSession()
  const token = await getToken()
  
  // Fetch destinations via proxy
  const res = await fetch(`${API_URL}/tenants/${slug}/destinations`, {
    headers: {
      Authorization: `Bearer ${token?.apiToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })
  
  const destinations = await res.json()
  return <DestinoClientComponent destinations={destinations} />
}
```

**Client component pattern** (from operadoras/page.tsx, lines 28–85):
```typescript
"use client"
import { useState, useEffect } from "react"

interface Destination {
  id: string
  title: string
  state: string
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  heroImageUrl?: string
  createdById: string
}

export default function DestinoClientComponent() {
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetch("/api/proxy?path=/tenants/" + slug + "/destinations")
      .then(r => r.json())
      .then(setDestinations)
  }, [slug])
  
  return (
    <div>
      {destinations.map(d => (
        <div key={d.id}>
          <h3>{d.title}</h3>
          <span style={{ 
            background: d.approvalStatus === 'APPROVED' ? '#10b981' : '#f59e0b' 
          }}>
            {d.approvalStatus === 'PENDING' ? 'PENDENTE' : 'APROVADO'}
          </span>
        </div>
      ))}
    </div>
  )
}
```

**Ownership-filtered edit/delete buttons:**
```typescript
const isOwner = (createdById: string) => createdById === currentUserId

{isOwner(dest.createdById) && (
  <div>
    <button onClick={() => { /* edit */ }}>Editar</button>
    <button onClick={() => { /* delete with confirm */ }}>Deletar</button>
  </div>
)}
```

---

### `apps/web/app/super-admin/destinos/page.tsx` — NEW (page, request-response)

**Analog:** `apps/web/app/super-admin/operadoras/page.tsx` (approval queue pattern, lines 26–90)

**Client component pattern (super-admin approval queue):**
```typescript
"use client"
import { useState, useEffect } from "react"
import { Modal } from "@/components/ui/Modal"

interface Destination {
  id: string
  title: string
  state: string
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED"
  createdBy: { name: string }
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  PENDING: { label: "Pendente", bg: "#FEF9EC", color: "#B45309" },
  APPROVED: { label: "Aprovado", bg: "#F0FDF4", color: "#15803D" },
  REJECTED: { label: "Rejeitado", bg: "#FEF2F2", color: "#DC2626" },
}

export default function SuperAdminDestinosPage() {
  const [items, setItems] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/proxy?path=/destinations?approvalStatus=PENDING")
      .then(r => r.json())
      .then(setItems)
      .finally(() => setLoading(false))
  }, [])

  async function handleApprove(id: string) {
    setActionLoading(id)
    try {
      const res = await fetch("/api/proxy?path=/destinations/" + id + "/approve", {
        method: "PATCH",
        body: JSON.stringify({ approvalStatus: "APPROVED" }),
      })
      if (res.ok) {
        setItems(prev => prev.filter(d => d.id !== id))
      }
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div>
      <h1>Fila de Aprovação — Destinos</h1>
      {items.map(dest => (
        <div key={dest.id}>
          <h3>{dest.title}</h3>
          <button onClick={() => handleApprove(dest.id)}>Aprovar</button>
          <button onClick={() => handleReject(dest.id)}>Rejeitar</button>
        </div>
      ))}
    </div>
  )
}
```

**Rejection modal pattern** (operadoras/page.tsx, lines 77–140):
```typescript
const [rejectTarget, setRejectTarget] = useState<Tenant | null>(null)
const [rejectReason, setRejectReason] = useState("")

async function handleRejectSubmit() {
  setRejectSubmitting(true)
  try {
    const res = await fetch(`/api/proxy?path=/destinations/${rejectTarget.id}/approve`, {
      method: "PATCH",
      body: JSON.stringify({ 
        approvalStatus: "REJECTED",
        rejectionReason: rejectReason,
      }),
    })
    if (res.ok) {
      setItems(prev => prev.filter(t => t.id !== rejectTarget.id))
      setRejectTarget(null)
    }
  } finally {
    setRejectSubmitting(false)
  }
}

return (
  <Modal isOpen={!!rejectTarget} onClose={() => setRejectTarget(null)}>
    <textarea 
      value={rejectReason} 
      onChange={(e) => setRejectReason(e.target.value)}
      placeholder="Motivo da rejeição"
    />
    <button onClick={handleRejectSubmit}>Rejeitar</button>
  </Modal>
)
```

---

## Shared Patterns

### Authentication Middleware (All API routes)

**Source:** `apps/api/src/modules/guides/guides.routes.ts` (lines 1–5, 178)

**Apply to:** All new POST/PATCH/DELETE destination and package routes

```typescript
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'

// Usage in route handler:
app.post('/tenants/:slug/destinations', {
  preHandler: [authenticate, authorize(['CONDUTOR', 'ADMIN'])],
}, async (request, reply) => {
  // request.user contains JWT payload with sub (userId), tenantId, role
})
```

---

### Error Handling with AppError

**Source:** `apps/api/src/modules/destinations/destinations.routes.ts` (lines 5, 67)

**Apply to:** All service functions and route handlers

```typescript
import { AppError } from '../../shared/errors/AppError'

// Pattern:
if (!destination) throw new AppError('Destino não encontrado', 404)
if (destination.createdById !== currentUserId) {
  throw new AppError('Você pode editar apenas seus próprios destinos', 403)
}
```

---

### Zod Input Validation

**Source:** `apps/api/src/modules/guides/guides.routes.ts` (lines 9–17)

**Apply to:** All POST/PATCH handlers before body parsing

```typescript
function zodError(err: ZodError) {
  return {
    message: 'Dados inválidos',
    errors: err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  }
}

// Usage:
try {
  const body = destinationCreateSchema.parse(request.body)
} catch (err) {
  if (err instanceof ZodError) return reply.status(400).send(zodError(err))
  throw err
}
```

---

### API Proxy Pattern (Web)

**Source:** `apps/web/app/api/proxy/route.ts` (lines 1–65)

**Apply to:** All client-side API calls from painel and super-admin

```typescript
// Client calls:
fetch("/api/proxy?path=/tenants/slug/destinations")
fetch("/api/proxy?path=/destinations/id/approve", {
  method: "PATCH",
  body: JSON.stringify({ approvalStatus: "APPROVED" }),
})

// Proxy automatically injects JWT from NextAuth session
```

---

### Status Badge Component (Web)

**Source:** `apps/web/app/super-admin/operadoras/page.tsx` (lines 17–21)

**Apply to:** All approval status displays in painel and super-admin

```typescript
const STATUS_CONFIG = {
  PENDING: { label: "Pendente", bg: "#FEF9EC", color: "#B45309" },
  APPROVED: { label: "Aprovado", bg: "#F0FDF4", color: "#15803D" },
  REJECTED: { label: "Rejeitado", bg: "#FEF2F2", color: "#DC2626" },
}

return (
  <span style={{
    background: STATUS_CONFIG[approvalStatus].bg,
    color: STATUS_CONFIG[approvalStatus].color,
  }}>
    {STATUS_CONFIG[approvalStatus].label}
  </span>
)
```

---

## Database Migrations

### Migration: Add `approvalStatus` enum to Destination

**Analog:** `apps/api/prisma/schema.prisma` (lines 28–30, existing TenantApprovalStatus enum pattern)

```sql
-- [timestamp]_add_approval_status_destination/migration.sql
-- Add ApprovalStatus enum if not exists (may exist from Tenant model)
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Add column to Destination
ALTER TABLE "Destination" ADD COLUMN "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING';

-- Backfill existing destinations based on active status
UPDATE "Destination" SET "approvalStatus" = 'APPROVED' WHERE active = true;
UPDATE "Destination" SET "approvalStatus" = 'PENDING' WHERE active = false;
```

---

### Migration: Add `createdById` FK to Destination

**Analog:** `apps/api/prisma/schema.prisma` (lines 47–48, existing FK pattern User.tenantId)

```sql
-- [timestamp]_add_created_by_destination/migration.sql
ALTER TABLE "Destination" ADD COLUMN "createdById" TEXT;

-- Add FK constraint
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_createdById_fkey" 
  FOREIGN KEY ("createdById") REFERENCES "User"("id");

-- Create index for ownership queries
CREATE INDEX "Destination_createdById_idx" ON "Destination"("createdById");
```

---

### Migration: Add `photos` and `highlights` to TourPackage

**Analog:** `apps/api/prisma/schema.prisma` (lines 12–13, existing String[] pattern on Destination)

```sql
-- [timestamp]_add_photos_highlights_package/migration.sql
ALTER TABLE "TourPackage" ADD COLUMN "photos" text[] DEFAULT '{}';
ALTER TABLE "TourPackage" ADD COLUMN "highlights" text[] DEFAULT '{}';
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| (None) | — | — | All new files have existing analogs in destinations, guides, bookings, or super-admin modules. |

---

## Metadata

**Analog search scope:** `apps/api/src/modules/` (destinations, guides, bookings), `apps/web/app/` (painel, super-admin)  
**Files scanned:** 12 existing route/service/schema files  
**Pattern extraction date:** 2026-06-08  

**Key patterns identified:**
1. **API CRUD:** All routes follow `/tenants/:slug/resource` pattern with auth middleware + Zod validation
2. **Ownership checks:** Query by `createdById` before PATCH/DELETE; throw AppError 403 if mismatch
3. **Approval workflow:** Status enum (PENDING | APPROVED | REJECTED); public GET filters by `approvalStatus: 'APPROVED'`
4. **File upload:** Pre-signed URL pattern via AWS SDK (R2 compatible); direct frontend upload to cloud
5. **Web UI:** RSC + client components; API proxy via `/api/proxy?path=/...` with NextAuth JWT injection
6. **Super-admin:** Approval queue with modal for rejection reason; optimistic updates with rollback
