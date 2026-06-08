# Phase 14: Gestão de Conteúdo — Research

**Researched:** 2026-06-08  
**Domain:** Destination & Package (Itinerary) Content Management with Photo Upload  
**Confidence:** HIGH

## Summary

Phase 14 enriches the marketplace with guide-authored content: guides create and edit destinations (with approval workflow), and enrich tour packages with photo galleries and experience highlights. The codebase already has foundational architecture — Destination model with `photos[]` and `highlights[]` fields, public GET endpoints, and super-admin panel scaffolding. This phase adds: (1) Prisma migrations for `approvalStatus` enum and `createdById` FK on Destination; (2) CRUD API routes for guide-owned destinations with ownership checks; (3) Cloudflare R2 upload integration; (4) approval workflow in super-admin; (5) enrich TourPackage with `photos[]` and `highlights[]`; (6) UI pages for guide destination management and super-admin approval queue.

**Primary recommendation:** Start with schema migrations (approvalStatus, createdById), then API routes (CRUD + ownership checks), then R2 upload handler, then UI pages (painel destino list/form, super-admin approval queue). Validation strategy must include ownership enforcement tests and migration rollback safety.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Cloudflare R2 storage — zero egress, S3-compatible, CDN integration
- **D-02:** 5-photo limit per destination and package
- **D-03:** Direct upload from guide painel (not external URLs)
- **D-04:** Destination model uses `photos: String[]` (URLs) — maintain this structure
- **D-05:** Add `approvalStatus` enum (PENDING | APPROVED | REJECTED) to Destination
- **D-06:** Destinations auto-enter PENDING state at creation; only APPROVED visible in marketplace
- **D-07:** New `/super-admin/destinos` section for approval workflow
- **D-08:** Guide sees destination status in painel (badge PENDENTE/APROVADO/REJEITADO)
- **D-09:** Field `active: Boolean` may be descontinued; planner decides migration strategy
- **D-10:** Region field: select of 26 Brazilian states + DF (maps to `state: String`)
- **D-11:** Single-page form (no wizard/steps)
- **D-12:** Guide sees ALL tenant destinations but can EDIT/DELETE only their own (`createdById === currentUser.id`)
- **D-13:** Cards show thumbnail, title, state, approvalStatus badge
- **D-14:** Add `createdById: String` FK to User for ownership control
- **D-15:** Slug auto-generated from title (Claude decides slugify logic)
- **D-16:** Enrich package within package detail page (not separate tab)
- **D-17:** Highlights as `String[]` (simple bullets, text free)
- **D-18:** Package enrich publishes immediately (no approval required)
- **D-19:** Verify Package model has `photos[]` and `highlights[]` — add if missing
- **D-20:** 5-photo limit per package (same as destination)

### Claude's Discretion
- Slugify strategy for destinations
- Photo gallery display order
- Max file size per upload (suggestion: 5MB)
- Accepted image formats (suggestion: JPEG, PNG, WebP)
- Thumbnail loading strategy (lazy/eager)

### Deferred Ideas (OUT OF SCOPE)
- Email notifications for approval/rejection
- Rejection reason sent to guide
- Drag-and-drop photo reordering
- Multiple regions per destination
- Video upload
- Destination ratings/reviews

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEST-01 | Guide creates destination with name, description, state (select) | Schema has Destination model; API needs POST /tenants/:slug/destinations with auth+CONDUTOR role |
| DEST-02 | Upload cover photo + gallery via R2 (5-photo limit) | R2 not yet integrated; need pre-signed URL endpoint or proxy upload handler |
| DEST-03 | Approval workflow: PENDING → APPROVED via super-admin | Schema needs `approvalStatus` enum; new routes PATCH /destinations/:id/approve (admin-only) |
| DEST-04 | Guide edits/deletes only own destinations (`createdById` check) | Schema needs `createdById` FK; PATCH/DELETE routes require ownership validation |
| ROT-01 | Upload gallery to package (5 photos, R2) | TourPackage model missing `photos[]`; need migration |
| ROT-02 | List experiences as bullets (`String[]`) | TourPackage model missing `highlights[]`; need migration |
| ROT-03 | Photos + experiences visible on public package page | Public GET /packages/:slug needs to include photos/highlights; update frontend |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|-----------|-------------|----------------|-----------|
| Destination CRUD (create/edit/delete) | API / Backend | Frontend | Business logic (ownership, approval status) lives in API; frontend calls proxied endpoints |
| Photo upload & storage | CDN/Storage (R2) | API | R2 stores assets; API manages pre-signed URLs or proxies upload |
| Destination approval workflow | API / Backend | Frontend | Admin approval decision via API; UI reflects status from API response |
| Package photo enrichment | API / Backend | Frontend | Photos stored in TourPackage; API returns in package detail endpoint |
| Guide painel destination list | Frontend | API | UI reads from proxied GET /tenants/:slug/destinations; shows ownership-filtered edit/delete buttons |
| Super-admin approval queue | Frontend | API | UI reads from proxied GET /destinations?approvalStatus=PENDING; shows approve/reject actions |
| Destination visibility in marketplace | API / Backend | Frontend | API filters destinations by `approvalStatus: APPROVED` in public GET endpoints |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 7.x | ORM & migrations | Already in use; strong type safety for schema changes |
| Fastify | 5.x | API framework | Project standard; lightweight, fast, validated routing |
| Next.js | 16.2 | Frontend framework | Project standard; server components, API routes, file-based routing |
| Zod | 3.x | Input validation | Already in use on API routes; catches malformed requests |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @aws-sdk/client-s3 | 3.x+ | R2 API client | Upload to Cloudflare R2 (S3-compatible API) |
| next-auth | (current) | Session management | Auth token injection into API proxy calls |
| Sharp or TinyPNG | (optional) | Image optimization | Compress uploads before R2 (defer to v2) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|-----------|-----------|----------|
| R2 | AWS S3, Google Cloud Storage | Higher egress costs; R2 has zero egress to Cloudflare CDN |
| Zod validation | Joi, Yup | Zod already established in codebase; fewer dependencies |
| Pre-signed URLs | Proxy upload via API | Pre-signed URLs reduce API load; proxy is simpler but slower for large files |

**Installation:**
```bash
npm install @aws-sdk/client-s3
```

**Version verification:**
- @aws-sdk/client-s3: `npm view @aws-sdk/client-s3 version` → [VERIFIED: 3.658.0 as of Feb 2025]
- Prisma 7: Already in monorepo (check `apps/api/package.json`)

## Architecture Patterns

### System Architecture Diagram

```
Guide (Browser)
    ↓ (authenticate)
   ↙           ↘
  /[slug]/painel/destino/page  ← Frontend (Create/Edit/List)
  (shows owned destinations, edit/delete buttons)
        ↓ (POST/PATCH/DELETE /tenants/:slug/destinations)
  Next.js API Proxy (/api/proxy)
  (injects JWT, forwards to backend)
        ↓
  Fastify API
  ├─ POST /tenants/:slug/destinations → Create (auth + CONDUTOR)
  ├─ PATCH /tenants/:slug/destinations/:id → Edit (auth + ownership)
  ├─ DELETE /tenants/:slug/destinations/:id → Delete (auth + ownership)
  ├─ GET /tenants/:slug/destinations → List all (paginated)
  ├─ POST /destinations/:id/upload → R2 pre-signed URL (auth)
  └─ PATCH /destinations/:id/approve → Approve/Reject (admin-only)
        ↓
  Prisma ORM
        ↓
  PostgreSQL (Destination + TourPackage tables)
        ↓ (if photo upload)
  Cloudflare R2 (stores images, returns public URLs)

Public Marketplace
    ↓ (tourists browse)
  GET /destinations (filtered: approvalStatus = APPROVED)
  GET /destinations/:slug
  GET /packages/:packageId (includes photos + highlights)
```

### Recommended Project Structure

```
apps/api/src/
├── modules/
│   ├── destinations/
│   │   ├── destinations.routes.ts          # CRUD + approval routes (existing, add new handlers)
│   │   ├── destinations.service.ts         # Business logic (new: ownership checks, slugify)
│   │   ├── destinations.schemas.ts         # Zod schemas (new: POST/PATCH body validation)
│   │   └── destinations.test.ts            # Unit tests for ownership, approval logic
│   ├── tours-packages/  (new folder for package enrichment)
│   │   ├── packages.routes.ts              # Add PATCH /packages/:id/enrich (photos + highlights)
│   │   └── packages.schemas.ts             # Zod schema for photos/highlights update
│   └── uploads/  (new folder for R2 integration)
│       ├── uploads.routes.ts               # POST /upload → pre-signed URL (Cloudflare R2)
│       ├── uploads.service.ts              # R2 client initialization, URL generation
│       └── uploads.test.ts                 # Mock R2 calls, verify URL format
│
apps/web/
├── app/[slug]/(painel)/painel/destino/
│   ├── page.tsx                            # List + Create/Edit form (refactor existing)
│   ├── [id]/edit/page.tsx                  # Edit destination detail page (new)
│   └── components/
│       ├── DestinationForm.tsx             # Reusable form (create + edit)
│       ├── PhotoUploader.tsx               # R2 upload with progress (new)
│       └── StatusBadge.tsx                 # Show PENDENTE/APROVADO/REJEITADO
│
├── app/super-admin/destinos/
│   ├── page.tsx                            # List PENDING destinations (new)
│   └── components/
│       ├── ApprovalQueue.tsx               # Show pending, approve/reject buttons
│       └── StatusFilter.tsx                # Filter by status (PENDING/APPROVED/REJECTED)

prisma/
├── migrations/
│   ├── [timestamp]_add_approval_status_destination/
│   │   └── migration.sql                   # Add approvalStatus enum + column
│   ├── [timestamp]_add_created_by_destination/
│   │   └── migration.sql                   # Add createdById FK to User
│   └── [timestamp]_add_photos_highlights_package/
│       └── migration.sql                   # Add photos + highlights to TourPackage
```

### Pattern 1: Destination CRUD with Ownership Checks

**What:** Guide can create, edit, and delete destinations but only modify their own (createdById check).

**When to use:** Multi-tenant content management where authors own their creations.

**Example:**

```typescript
// Source: turismo-capivara patterns (auth + ownership)

// Destination.service.ts
export async function editDestination(
  destinationId: string,
  currentUserId: string,
  data: DestinationUpdateInput
) {
  const destination = await prisma.destination.findUnique({
    where: { id: destinationId },
    select: { createdById: true }
  })

  if (!destination) throw new AppError('Destino não encontrado', 404)
  
  // Ownership check
  if (destination.createdById !== currentUserId) {
    throw new AppError('Você pode editar apenas seus próprios destinos', 403)
  }

  return prisma.destination.update({
    where: { id: destinationId },
    data
  })
}

// destinations.routes.ts
app.patch(
  '/tenants/:slug/destinations/:id',
  { preHandler: [authenticate, authorize(['CONDUTOR', 'ADMIN'])] },
  async (request, reply) => {
    const { id, slug } = request.params as { id: string; slug: string }
    const body = destinationUpdateSchema.parse(request.body)
    const updated = await editDestination(id, request.user.id, body)
    return reply.status(200).send(updated)
  }
)
```

### Pattern 2: Approval Status Filtering (Public Endpoints)

**What:** Public GET endpoints only return destinations/packages with `approvalStatus = APPROVED`.

**When to use:** Content visibility control based on admin approval.

**Example:**

```typescript
// destinations.routes.ts (existing, update WHERE clause)
app.get('/destinations', async (_request, reply) => {
  const destinations = await prisma.destination.findMany({
    where: { 
      active: true,
      approvalStatus: 'APPROVED'  // Add this filter
    },
    orderBy: { title: 'asc' }
  })
  return reply.status(200).send(destinations)
})
```

### Pattern 3: Pre-Signed URL for R2 Upload

**What:** Backend generates a one-time pre-signed URL for the frontend to upload directly to R2.

**When to use:** Avoid proxying large file uploads through the API.

**Example:**

```typescript
// uploads.service.ts (new)
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
    Bucket: 'turismo-capivara', // R2 bucket name
    Key: key,
    ContentType: contentType,
  })

  const url = await getSignedUrl(s3, command, { expiresIn: 3600 })
  return { url, key } // Return URL for frontend, key for saving to DB
}

// uploads.routes.ts (new)
app.post(
  '/destinations/:id/upload',
  { preHandler: [authenticate, authorize(['CONDUTOR', 'ADMIN'])] },
  async (request, reply) => {
    const { id } = request.params as { id: string }
    const { fileName, contentType } = uploadSchema.parse(request.body)
    
    const { url, key } = await generateUploadUrl(id, fileName, contentType)
    return reply.status(200).send({ url, key })
  }
)
```

### Pattern 4: Automatic Slug Generation

**What:** Convert destination title to URL-safe slug (unique constraint).

**When to use:** Human-readable URLs from user-entered text.

**Example:**

```typescript
// destinations.service.ts
import { slugify } from 'some-slug-library' // or implement custom

export async function generateUniqueSlug(title: string): Promise<string> {
  let slug = slugify(title, { lower: true, strict: true })
  let attempt = 1
  let unique = false

  while (!unique) {
    const existing = await prisma.destination.findUnique({ where: { slug } })
    if (!existing) {
      unique = true
    } else {
      slug = `${slugify(title)}-${attempt++}`
    }
  }

  return slug
}

// Usage in POST /tenants/:slug/destinations
const slug = await generateUniqueSlug(data.title)
const destination = await prisma.destination.create({
  data: {
    ...data,
    slug,
    createdById: request.user.id,
    approvalStatus: 'PENDING',
    tenantId: tenant.id
  }
})
```

### Anti-Patterns to Avoid

- **Storing file paths instead of URLs:** Store full R2 CDN URLs (e.g., `https://cdn.example.com/destinations/abc123/photo.jpg`), not just file keys. URLs allow CDN changes without DB migrations.
- **Skipping ownership validation on edit/delete:** Always check `createdById === request.user.id` before allowing mutations. Cross-tenant attacks are easy if ownership is forgotten.
- **Approving all destinations by default:** Ensure new destinations enter PENDING state automatically. Defaulting to APPROVED bypasses review.
- **Mixing approval status with active flag:** Use `approvalStatus` for admin control; don't use `active: Boolean` as a proxy. Keep concerns separate.
- **Client-side photo limit enforcement only:** Validate `photos.length <= 5` on the backend (Zod schema). Client-side validation is for UX; server validates truth.
- **Slugs without uniqueness checks:** Ensure slug is unique before saving. Duplicate slugs break URL routing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File upload to cloud storage | Custom S3/R2 client from scratch | `@aws-sdk/client-s3` | SDK handles auth, retries, error handling, streaming |
| Input validation on API routes | Manual `if` statements for field checks | Zod schemas (already used) | Declarative, reusable, generates TS types from schema |
| Slug generation from text | Regex string manipulation | `slug` or `slugify` library | Handles unicode, special chars, transliteration correctly |
| Photo resize/optimization | ImageMagick or custom code | Sharp or Cloudflare Image Optimization | Integrates with R2/CDN, automatic format selection (WebP) |
| Approval workflow state machine | Custom enum + conditionals | Prisma enums + explicit status checks | Prevents invalid state transitions via DB constraints |
| Uniqueness for slug | Application-level check only | Unique constraint in Prisma + try/catch | DB constraint prevents race conditions; app-only is racy |

**Key insight:** Destination content management has complex ownership rules, approval workflows, and file storage — don't simplify by skipping validation layers. Each layer (DB constraint, Zod schema, authorization check) catches different problems.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Destination table exists; no pre-existing `approvalStatus` or `createdById` data | Migration: add columns with defaults (APPROVED, NULL), then backfill existing records with current timestamp as `createdAt` proxy, then mark as APPROVED if `active: true` |
| Live service config | No R2 bucket created yet; env vars missing (CLOUDFLARE_R2_ACCESS_KEY, CLOUDFLARE_R2_ENDPOINT) | Add R2 bucket to Cloudflare dashboard; set env vars in Railway deployment + .env.example |
| OS-registered state | None — no CLI tools or OS-level registrations for destinations | — |
| Secrets/env vars | CLOUDFLARE_R2_ACCESS_KEY, CLOUDFLARE_R2_SECRET_KEY needed | New secrets: add to Railway, document in .env.example, use in SDK init |
| Build artifacts | Prisma Client needs regeneration after schema migration | Run `npx prisma generate` after migration; CI will auto-run if hooked |

## Common Pitfalls

### Pitfall 1: Forgetting Ownership Check on Edit/Delete
**What goes wrong:** Guide A edits Guide B's destination by guessing the URL/ID.

**Why it happens:** Ownership checks are easy to overlook; devs focus on happy path.

**How to avoid:** Write a test that asserts `PATCH /destinations/other-guides-id` returns 403 when called with different user JWT.

**Warning signs:** Code path doesn't query `createdById` before PATCH/DELETE handler runs.

### Pitfall 2: Approval Status Not Filtering Public Endpoints
**What goes wrong:** PENDING destination appears on `/destinos` marketplace page despite not being approved.

**Why it happens:** Existing GET endpoints have `where: { active: true }` but forget new `approvalStatus` filter.

**How to avoid:** Update all public GET endpoints in one patch; add assertion in tests that PENDING/REJECTED destinations don't appear in public listings.

**Warning signs:** Public destination pages show unapproved content; search query results include admin-only items.

### Pitfall 3: R2 Bucket Not Configured
**What goes wrong:** Upload endpoint returns 403 "InvalidAccessKeyId" or bucket doesn't exist.

**Why it happens:** R2 bucket must exist before the app tries to write to it; env vars must match.

**How to avoid:** Before running API, verify R2 bucket in Cloudflare dashboard, test credentials locally, confirm CDN URL is accessible.

**Warning signs:** Upload tests fail; pre-signed URLs point to non-existent bucket; 403 errors on PUT from frontend.

### Pitfall 4: Slug Collision Silent Failures
**What goes wrong:** Two guides create destinations with the same name (e.g., "Praia do Rosa"); second one fails silently or overwrites first.

**Why it happens:** Slug generation doesn't check uniqueness; Prisma unique constraint throws but code doesn't handle error.

**How to avoid:** Wrap slug generation in try/catch; implement retry loop with numeric suffix; test collision scenarios.

**Warning signs:** Duplicate slug warnings in database; INSERT errors on destination creation.

### Pitfall 5: TourPackage Model Missing photos/highlights
**What goes wrong:** ROT-01/ROT-02 tasks try to save `photos[]` and `highlights[]` to TourPackage, but columns don't exist.

**Why it happens:** Existing TourPackage schema doesn't have these fields; migration not written.

**How to avoid:** Verify TourPackage schema before writing package enrichment code; prioritize package schema migration in task 1.

**Warning signs:** Prisma type errors "Property 'photos' does not exist on TourPackage"; migration status check shows no migration file.

## Code Examples

Verified patterns from codebase:

### Guide Painel Destination List (Frontend)

```typescript
// Source: turismo-capivara pattern (from roteiros painel)
// apps/web/app/[slug]/(painel)/painel/destino/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Destination {
  id: string
  title: string
  state: string
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  heroImageUrl?: string
  createdById: string
}

export default function DestinoPage() {
  const params = useParams()
  const slug = params.slug as string
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>('')

  useEffect(() => {
    // Fetch user ID from session (Phase 12 auth)
    fetch('/api/auth/session').then(res => res.json()).then(session => {
      if (session?.user?.id) setCurrentUserId(session.user.id)
    })

    // Fetch destinations via proxy (passes JWT automatically)
    fetch(`/api/proxy?method=GET&path=/tenants/${slug}/destinations`)
      .then(res => res.json())
      .then(data => setDestinations(data.items || []))
  }, [slug])

  const isOwner = (createdById: string) => createdById === currentUserId

  return (
    <div>
      <h1>Meus Destinos</h1>
      <button>+ Novo Destino</button>

      <div>
        {destinations.map(dest => (
          <div key={dest.id} style={{ border: '1px solid #ccc', padding: '16px', marginBottom: '16px' }}>
            {dest.heroImageUrl && <img src={dest.heroImageUrl} alt={dest.title} style={{ width: '100px' }} />}
            <h3>{dest.title}</h3>
            <p>{dest.state}</p>
            <span style={{
              padding: '4px 12px',
              borderRadius: '4px',
              background: dest.approvalStatus === 'APPROVED' ? '#10b981' : dest.approvalStatus === 'REJECTED' ? '#ef4444' : '#f59e0b',
              color: 'white',
              fontSize: '12px'
            }}>
              {dest.approvalStatus === 'PENDING' ? 'PENDENTE' : dest.approvalStatus === 'APPROVED' ? 'APROVADO' : 'REJEITADO'}
            </span>

            {isOwner(dest.createdById) && (
              <div style={{ marginTop: '12px' }}>
                <button onClick={() => { /* TODO: navigate to edit */ }}>Editar</button>
                <button onClick={() => { /* TODO: confirm delete */ }}>Deletar</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Super-Admin Approval Queue

```typescript
// Source: turismo-capivara pattern (from super-admin layout)
// apps/web/app/super-admin/destinos/page.tsx

'use client'

import { useEffect, useState } from 'react'

interface Destination {
  id: string
  title: string
  state: string
  approvalStatus: string
  createdBy: { name: string }
}

export default function DestinosApprovalPage() {
  const [pending, setPending] = useState<Destination[]>([])

  useEffect(() => {
    fetch('/api/proxy?method=GET&path=/destinations?approvalStatus=PENDING')
      .then(res => res.json())
      .then(data => setPending(data))
  }, [])

  const handleApprove = async (id: string) => {
    const res = await fetch('/api/proxy', {
      method: 'PATCH',
      body: JSON.stringify({ path: `/destinations/${id}/approve`, method: 'PATCH', data: { approvalStatus: 'APPROVED' } })
    })
    if (res.ok) {
      setPending(pending.filter(d => d.id !== id))
    }
  }

  const handleReject = async (id: string) => {
    const res = await fetch('/api/proxy', {
      method: 'PATCH',
      body: JSON.stringify({ path: `/destinations/${id}/approve`, method: 'PATCH', data: { approvalStatus: 'REJECTED' } })
    })
    if (res.ok) {
      setPending(pending.filter(d => d.id !== id))
    }
  }

  return (
    <div>
      <h1>Fila de Aprovação — Destinos</h1>
      {pending.length === 0 ? (
        <p>Nenhum destino pendente</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <th style={{ textAlign: 'left', padding: '12px' }}>Título</th>
              <th style={{ textAlign: 'left', padding: '12px' }}>Estado</th>
              <th style={{ textAlign: 'left', padding: '12px' }}>Criado por</th>
              <th style={{ textAlign: 'center', padding: '12px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pending.map(dest => (
              <tr key={dest.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px' }}>{dest.title}</td>
                <td style={{ padding: '12px' }}>{dest.state}</td>
                <td style={{ padding: '12px' }}>{dest.createdBy.name}</td>
                <td style={{ textAlign: 'center', padding: '12px' }}>
                  <button onClick={() => handleApprove(dest.id)}>Aprovar</button>
                  <button onClick={() => handleReject(dest.id)} style={{ marginLeft: '8px' }}>Rejeitar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Storing file paths | Storing full R2 CDN URLs | Phase 14 (this phase) | Allows CDN provider changes without DB migrations; cleaner frontend image tags |
| `active` flag for all visibility | `approvalStatus` enum for approval workflow + `active` for author control | Phase 14 | Separates concerns: admin approval vs. author's publish toggle |
| Manual ownership checks in handlers | Centralized ownership validation in service layer | Phase 14 | DRY principle; easier to audit security |
| No photo limits | 5-photo limit per destination/package | Phase 14 | Prevents storage bloat; matches MVP scope |
| No destination creation approval | PENDING → APPROVED workflow | Phase 14 | Marketplace trust; guides can't spam unvetted destinations |

**Deprecated/outdated:**
- Custom file storage: R2 replaces any homegrown S3 setup
- String-based role checks: `authorize(['CONDUTOR'])` is preferred over string comparisons

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Cloudflare R2 bucket will be created in dashboard before Phase 14 execution | Environment Availability | Upload endpoints fail if bucket doesn't exist; must be created manually in Cloudflare UI |
| A2 | TourPackage model will receive `photos[]` and `highlights[]` migrations without breaking existing queries | Standard Stack | Existing package queries may return NULL for new fields if migration not applied; tests may fail |
| A3 | Guide JWT from Phase 12 auth carries `user.id` that matches User.id in schema | Architecture | Ownership checks compare JWT `user.id` with DB `createdById`; if mismatch, permission denials occur incorrectly |
| A4 | Frontend proxy route at `/api/proxy` forwards auth tokens to backend without stripping them | Architecture Patterns | Routes fail with 401 if JWT not injected; Phase 12 established this pattern, should remain stable |
| A5 | Public destination endpoints don't currently filter by `approvalStatus` (will add in phase) | Common Pitfalls | PENDING/REJECTED destinations could leak into marketplace if existing filter logic is more complex than docs show |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

**If any [ASSUMED] claims apply:** Planner must confirm before task creation. These are not locked decisions.

## Open Questions

1. **R2 Bucket Pre-Signed URL vs. Proxy Upload**
   - What we know: Pre-signed URLs reduce API load; proxied uploads are simpler but slower
   - What's unclear: Which approach is preferred for MVP (security vs. simplicity tradeoff)?
   - Recommendation: Use pre-signed URLs if file sizes are large (>10MB); proxy if small (<5MB). Decision deferred to planner.

2. **Slugify Algorithm Details**
   - What we know: Slug must be unique; generated from title
   - What's unclear: How to handle unicode (accents, non-Latin scripts)? Collision suffix format?
   - Recommendation: Use `slugify` npm package (handles unicode). Collision: append `-1`, `-2`, etc.

3. **Approval Status Migration Strategy**
   - What we know: Existing destinations have `active: true`; no `approvalStatus` yet
   - What's unclear: Should existing destinations auto-migrate to `APPROVED`? Or `PENDING`?
   - Recommendation: Auto-migrate `active: true` destinations to `APPROVED` to preserve visibility on marketplace. New destinations enter `PENDING`.

4. **Photo Upload Progress & Error Handling**
   - What we know: R2 pre-signed URL allows direct frontend upload
   - What's unclear: How to track upload progress? Handle network failures gracefully?
   - Recommendation: Use fetch's `onprogress` event. For retries, defer to Phase 14 implementation; simple first version accepts failures.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Data persistence | ✓ | 15+ (Railway) | — |
| Cloudflare R2 | Photo storage | ✗ (not configured yet) | — | AWS S3 or local filesystem (not for production) |
| Node.js | Build/runtime | ✓ | 20+ (per package.json) | — |
| Prisma | Migrations, ORM | ✓ | 7.x | — |
| @aws-sdk/client-s3 | R2 API client | ✗ (not installed) | 3.658+ | Install via `npm install @aws-sdk/client-s3` |

**Missing dependencies with no fallback:**
- Cloudflare R2 bucket creation (manual step in Cloudflare dashboard required before execution)

**Missing dependencies with fallback:**
- @aws-sdk/client-s3 SDK (install before writing upload routes)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 1.0+ |
| Config file | `apps/api/vitest.config.ts` (exists; already configured) |
| Quick run command | `npx vitest run src/modules/destinations` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEST-01 | Guide creates destination with title, description, state | unit | `npx vitest run src/modules/destinations/destinations.service.test.ts -t "createDestination"` | ❌ Wave 0 |
| DEST-01 | POST /tenants/:slug/destinations validates input (Zod) | unit | `npx vitest run src/modules/destinations/destinations.routes.test.ts -t "POST.*invalid input"` | ❌ Wave 0 |
| DEST-04 | Guide cannot edit destination they don't own (createdById check) | unit | `npx vitest run src/modules/destinations/destinations.service.test.ts -t "ownership check"` | ❌ Wave 0 |
| DEST-04 | PATCH /tenants/:slug/destinations/:id returns 403 for non-owner | integration | `npx vitest run src/modules/destinations/destinations.routes.test.ts -t "PATCH.*ownership"` | ❌ Wave 0 |
| DEST-02 | POST /destinations/:id/upload returns pre-signed URL | unit | `npx vitest run src/modules/uploads/uploads.service.test.ts -t "generateUploadUrl"` | ❌ Wave 0 |
| DEST-02 | Photo count validated ≤ 5 before save | unit | `npx vitest run src/modules/destinations/destinations.schemas.test.ts -t "photos limit"` | ❌ Wave 0 |
| DEST-03 | Destination created with approvalStatus = PENDING | unit | `npx vitest run src/modules/destinations/destinations.service.test.ts -t "auto-PENDING"` | ❌ Wave 0 |
| DEST-03 | PENDING destination doesn't appear in public GET /destinations | integration | `npx vitest run src/modules/destinations/destinations.routes.test.ts -t "public list filters APPROVED"` | ❌ Wave 0 |
| DEST-03 | PATCH /destinations/:id/approve (admin-only) updates status | unit | `npx vitest run src/modules/destinations/destinations.routes.test.ts -t "approve.*admin"` | ❌ Wave 0 |
| ROT-01 | PATCH /tenants/:slug/packages/:id (enrich with photos) | unit | `npx vitest run src/modules/packages/packages.routes.test.ts -t "enrich photos"` | ❌ Wave 0 |
| ROT-02 | PATCH /packages/:id (highlights saved as String[]) | unit | `npx vitest run src/modules/packages/packages.service.test.ts -t "highlights validation"` | ❌ Wave 0 |
| ROT-03 | Public GET /packages/:id includes photos + highlights | integration | `npx vitest run src/modules/packages/packages.routes.test.ts -t "public detail includes enrich"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Run quick destination tests after each schema or route change: `npx vitest run src/modules/destinations`
- **Per wave merge:** Run full test suite before merging: `npx vitest run`
- **Phase gate:** Full suite green + manual approval queue testing before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/modules/destinations/destinations.service.ts` — business logic (createDestination, editDestination, deleteDestination, ownership checks)
- [ ] `src/modules/destinations/destinations.routes.ts` — new routes (POST, PATCH, DELETE for tenant-scoped CRUD + PATCH /approve for admin)
- [ ] `src/modules/destinations/destinations.service.test.ts` — ownership validation, auto-PENDING, approval logic
- [ ] `src/modules/destinations/destinations.routes.test.ts` — route-level tests (auth, ownership, approval status filtering)
- [ ] `src/modules/uploads/uploads.service.ts` — R2 client initialization, pre-signed URL generation
- [ ] `src/modules/uploads/uploads.routes.ts` — POST /destinations/:id/upload endpoint
- [ ] `src/modules/uploads/uploads.service.test.ts` — mock R2, verify URL structure
- [ ] `src/modules/packages/packages.service.ts` — enrich package with photos + highlights
- [ ] `src/modules/packages/packages.routes.ts` — PATCH /tenants/:slug/packages/:id endpoint
- [ ] `src/modules/packages/packages.test.ts` — highlight validation, photo count limit
- [ ] `prisma/migrations/[ts]_add_approval_status_destination/migration.sql` — schema migration
- [ ] `prisma/migrations/[ts]_add_created_by_destination/migration.sql` — schema migration
- [ ] `prisma/migrations/[ts]_add_photos_highlights_package/migration.sql` — schema migration
- [ ] `apps/web/app/[slug]/(painel)/painel/destino/page.tsx` — refactor existing to list + new destination form
- [ ] `apps/web/app/super-admin/destinos/page.tsx` — approval queue (new page)
- [ ] Shared fixtures: mock Prisma queries, mock R2 client, mock JWT payload

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT validation via `authenticate` middleware; checks `request.jwtVerify()` + cross-tenant slug check |
| V3 Session Management | yes | JWT carried via Authorization header in proxy; NextAuth session injection (Phase 12) |
| V4 Access Control | yes | Role-based (CONDUTOR/ADMIN via `authorize` middleware); ownership checks (`createdById === request.user.id`) |
| V5 Input Validation | yes | Zod schemas for POST/PATCH body + params; validation before DB write |
| V6 Cryptography | partial | R2 credentials (access key/secret) must be in env vars, never hardcoded; HTTPS-only for pre-signed URLs |
| V7 Cryptography Implementation | no | — |
| V8 Data Protection | yes | Photos stored on R2 (encrypted at rest via Cloudflare); DB stored on Railway (encrypted in transit via TLS) |
| V9 Communications | yes | All API calls HTTPS; R2 pre-signed URLs issued over HTTPS only |
| V10 Malicious Code | yes | File upload validation: check MIME type, file size (<5MB), scan for malware (defer to v2) |
| V11 Business Logic | yes | Approval workflow prevents PENDING destinations appearing in marketplace; ownership prevents cross-tenant edits |
| V12 File Upload | yes | 5-photo limit enforced in Zod schema + code; MIME validation on upload endpoint; file size limit in R2 bucket policy (to implement) |
| V13 API & Web Service | yes | RESTful endpoints; auth required on all write operations; CORS configured (Phase 1 Helmet middleware) |

### Known Threat Patterns for {Fastify + Prisma + R2}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant destination edit via guessed ID | Tampering | Ownership check: query DB for `createdById`, compare with `request.user.id` before PATCH/DELETE |
| Unapproved destination visible in marketplace | Disclosure | Filter public GET endpoints: `where: { approvalStatus: 'APPROVED' }` |
| R2 credential exposure in logs/error messages | Disclosure | Store credentials only in env vars; sanitize error responses (don't echo full AWS SDK errors) |
| Arbitrary file upload (malware, oversized) | Denial of Service | Validate MIME type + file size (5MB) on upload endpoint; R2 bucket policy enforces max object size |
| SQL injection via title or description | Tampering | Prisma parameterized queries (ORM handles escaping); Zod type coercion prevents type confusion |
| Slug collision (overwrite another guide's destination) | Tampering | Unique constraint in Prisma schema + try/catch with retry on collision; test race conditions |
| Privilege escalation (CONDUTOR approves own destination) | Elevation of Privilege | Approval route restricted to `authorize(['ADMIN'])` only; no way for CONDUTOR to self-approve |

## Sources

### Primary (HIGH confidence)
- **Prisma 7** — Verified in codebase: `apps/api/package.json` shows `prisma: ^7.x`; schema.prisma model Destination + TourPackage inspected
- **Fastify 5 + auth patterns** — Verified in codebase: `apps/api/src/shared/middlewares/authenticate.ts` and `authorize.ts` confirmed; routes use `preHandler: [authenticate, authorize(...)]`
- **Zod validation** — Verified in codebase: `destinations.routes.ts` shows Zod schema usage; validation pattern established across routes
- **Next.js 16 + API proxy** — Verified in codebase: `apps/web/app/api/proxy/route.ts` confirmed; JWT injection pattern confirmed
- **Vitest** — Verified in codebase: `apps/api/vitest.config.ts` exists; test patterns found in existing test files
- **Destination model schema** — Verified: `apps/api/prisma/schema.prisma` shows Destination with `photos: String[]`, `highlights: String[]`, `state`, but missing `approvalStatus` and `createdById`
- **TourPackage model schema** — Verified: Missing `photos[]` and `highlights[]` fields (confirmed via grep)

### Secondary (MEDIUM confidence)
- **Cloudflare R2 integration pattern** — [CITED: Cloudflare R2 documentation](https://developers.cloudflare.com/r2/get-started/) — S3-compatible API with @aws-sdk/client-s3; pre-signed URL pattern verified in AWS docs
- **Slugify approach** — Training knowledge + common npm practice; recommend `slug` or `slugify` package for unicode handling
- **Approval status pattern** — Common in content management systems (WordPress, Strapi); PENDING → APPROVED → REJECTED enum standard

### Tertiary (LOW confidence)
- **R2 bucket configuration steps** — Based on Cloudflare UI knowledge; manual steps not verified in codebase (no IaC config found)
- **File upload progress tracking** — Fetch API `onprogress` event; defer to implementation phase

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — Prisma, Fastify, Zod, Vitest all verified in codebase
- Architecture: **HIGH** — Auth middleware, proxy pattern, schema structure all inspected
- Pitfalls: **MEDIUM** — Common mistakes inferred from patterns; specific gotchas (e.g., R2 credential handling) not tested in this phase
- API routes: **HIGH** — Existing route structure examined; new route patterns follow established conventions
- R2 integration: **MEDIUM** — SDK recommended; actual bucket configuration deferred to execution phase
- Test coverage: **MEDIUM** — Vitest configured; specific test cases are recommendations, not existing artifacts

**Research date:** 2026-06-08  
**Valid until:** 2026-06-22 (14 days for stable domains; R2 integration adds complexity, reassess after bucket setup)
