# Phase 14: Gestão de Conteúdo — Pattern Map

**Mapped:** 2026-06-08
**Files analyzed:** 14 (novos/modificados)
**Analogs found:** 13 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/api/prisma/schema.prisma` (3 migrations) | migration | CRUD | schema atual — `Destination`, `TourPackage` | exact |
| `apps/api/src/modules/destinations/destinations.routes.ts` (modificar) | route | CRUD + request-response | arquivo atual | exact |
| `apps/api/src/modules/uploads/uploads.routes.ts` | route | file-I/O | `destinations.routes.ts` (padrão auth+preHandler) | role-match |
| `apps/api/src/modules/uploads/uploads.service.ts` | service | file-I/O | sem analog — padrão S3 do RESEARCH.md | no-analog |
| `apps/api/src/modules/packages/packages.routes.ts` (modificar) | route | CRUD | arquivo atual | exact |
| `apps/web/app/api/super-admin/destinos/route.ts` | route | request-response | `app/api/super-admin/tenants/pending/route.ts` | exact |
| `apps/web/app/api/super-admin/destinos/[id]/approve/route.ts` | route | request-response | `app/api/super-admin/tenants/[id]/approve/route.ts` | exact |
| `apps/web/app/api/super-admin/destinos/[id]/reject/route.ts` | route | request-response | `app/api/super-admin/tenants/[id]/approve/route.ts` | role-match |
| `apps/web/app/api/[slug]/destinos/route.ts` | route | request-response | `app/api/super-admin/tenants/pending/route.ts` | role-match |
| `apps/web/app/api/[slug]/destinos/[id]/route.ts` | route | request-response | `app/api/super-admin/tenants/[id]/approve/route.ts` | role-match |
| `apps/web/app/api/uploads/presigned/route.ts` | route | file-I/O | `app/api/super-admin/tenants/pending/route.ts` (proxy auth) | role-match |
| `apps/web/app/super-admin/destinos/page.tsx` | component | request-response | `app/super-admin/operadoras/page.tsx` | exact |
| `apps/web/app/[slug]/(painel)/painel/destinos/page.tsx` | component | CRUD | `app/[slug]/(painel)/painel/destino/page.tsx` | exact |
| `apps/web/app/[slug]/(painel)/painel/roteiros/[id]/page.tsx` | component | CRUD | `app/[slug]/(painel)/painel/destino/page.tsx` | role-match |

---

## Pattern Assignments

### `apps/api/prisma/schema.prisma` — migrations (migration, CRUD)

**Analog:** Schema atual (`apps/api/prisma/schema.prisma`)

**Schema atual de Destination** (linhas 9–26):
```prisma
model Destination {
  id                   String   @id @default(cuid())
  slug                 String   @unique
  title                String
  subtitle             String?
  description          String
  heroImageUrl         String?
  heroImageBlurDataUrl String?
  photos               String[]
  tagline              String?
  state                String
  highlights           String[]
  active               Boolean  @default(true)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  tenants Tenant[]
}
```

**Schema atual de TourPackage** (linhas 79–96) — NÃO tem `photos[]` nem `highlights[]`:
```prisma
model TourPackage {
  id          String   @id @default(cuid())
  tenantId    String
  conductorId  String?
  name        String
  description String
  duration    Int
  price       Decimal  @db.Decimal(10, 2)
  capacity    Int
  difficulty  Difficulty
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  tenant         Tenant          @relation(fields: [tenantId], references: [id])
  conductor      User?           @relation("ConductorPackages", fields: [conductorId], references: [id])
  departureSlots DepartureSlot[]
}
```

**3 migrations necessárias:**

Migration 1 — `approvalStatus` em Destination:
```prisma
enum DestinationApprovalStatus {
  PENDING
  APPROVED
  REJECTED
}
// Adicionar no model Destination:
approvalStatus DestinationApprovalStatus @default(PENDING)
```

Migration 2 — `createdById` FK em Destination:
```prisma
// Adicionar no model Destination:
createdById String?
createdBy   User?   @relation("DestinationCreator", fields: [createdById], references: [id])
```

Migration 3 — `photos` e `highlights` em TourPackage:
```prisma
// Adicionar no model TourPackage:
photos     String[]
highlights String[]
```

---

### `apps/api/src/modules/destinations/destinations.routes.ts` (route, CRUD — modificar)

**Analog:** Arquivo atual (`apps/api/src/modules/destinations/destinations.routes.ts`)

**Imports pattern** (linhas 1–6):
```typescript
import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import prisma from '../../database'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
```

**zodError helper** (linhas 12–17 — reutilizar exato):
```typescript
function zodError(err: ZodError) {
  return {
    message: 'Dados inválidos',
    errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
  }
}
```

**Padrão preHandler auth** (linha 209–211):
```typescript
app.patch(
  '/destinations/:destinationSlug',
  { preHandler: [authenticate, authorize(['ADMIN', 'SUPER_ADMIN', 'CONDUTOR'])] },
```

**Padrão de validação de body inline** (linhas 236–252):
```typescript
const bodySchema = z.object({
  heroImageUrl: z.string().url().nullable().optional(),
  photos: z.array(z.string().url()).max(5).optional(),
  highlights: z.array(z.string().min(1)).optional(),
})
let body
try {
  body = bodySchema.parse(request.body)
} catch (err) {
  if (err instanceof ZodError) return reply.status(400).send(zodError(err))
  throw err
}
```

**Ownership check por CONDUTOR (existente)** (linhas 225–234):
```typescript
if (request.user.role === 'CONDUTOR') {
  const tenant = await prisma.tenant.findUnique({
    where: { id: request.user.tenantId },
    select: { destination: { select: { slug: true } } },
  })
  if (tenant?.destination?.slug !== params.slug) {
    throw new AppError('Acesso negado a este destino', 403)
  }
}
```

**Novo ownership check por `createdById`** (para rotas PATCH/DELETE de destinos criados por guias — baseado em packages.routes.ts linhas 223–226):
```typescript
const user = request.user as { sub: string; role: string }
if (user.role === 'CONDUTOR' && destination.createdById !== user.sub) {
  throw new AppError('Você pode editar apenas seus próprios destinos', 403)
}
```

**Filtro approvalStatus no GET público** (modificar linhas 22–37):
```typescript
// Substituir: where: { active: true }
// Por:
where: { approvalStatus: 'APPROVED' }
```

**Slugify para criação de destino** (Claude's Discretion — sem analog):
```typescript
function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
// Garantir unicidade: consultar prisma antes, adicionar sufixo -2, -3 se necessário
```

---

### `apps/api/src/modules/uploads/uploads.routes.ts` (route, file-I/O)

**Analog:** `apps/api/src/modules/destinations/destinations.routes.ts` (padrão auth + preHandler)

**Estrutura base:**
```typescript
import { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'
import { AppError } from '../../shared/errors/AppError'
import { authenticate } from '../../shared/middlewares/authenticate'
import { authorize } from '../../shared/middlewares/authorize'
import { generateUploadUrl } from './uploads.service'

export async function uploadsRoutes(app: FastifyInstance) {
  app.post(
    '/uploads/presigned',
    { preHandler: [authenticate, authorize(['CONDUTOR', 'ADMIN', 'SUPER_ADMIN'])] },
    async (request, reply) => {
      const bodySchema = z.object({
        fileName: z.string().min(1),
        contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
        context: z.enum(['destination', 'package']),
        contextId: z.string().min(1),
      })
      let body
      try {
        body = bodySchema.parse(request.body)
      } catch (err) {
        if (err instanceof ZodError) return reply.status(400).send(zodError(err))
        throw err
      }
      const result = await generateUploadUrl(body.context, body.contextId, body.fileName, body.contentType)
      return reply.status(200).send(result)
    }
  )
}
```

---

### `apps/api/src/modules/uploads/uploads.service.ts` (service, file-I/O)

**Analog:** Nenhum no codebase. Usar padrão do RESEARCH.md.

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
  context: 'destination' | 'package',
  contextId: string,
  fileName: string,
  contentType: string
) {
  const key = `${context}s/${contextId}/${Date.now()}-${fileName}`
  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
    Key: key,
    ContentType: contentType,
  })
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })
  const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`
  return { uploadUrl, publicUrl, key }
}
```

**Variáveis de ambiente necessárias (novas):**
- `CLOUDFLARE_R2_ACCESS_KEY`
- `CLOUDFLARE_R2_SECRET_KEY`
- `CLOUDFLARE_R2_ENDPOINT` (ex: `https://<account>.r2.cloudflarestorage.com`)
- `CLOUDFLARE_R2_BUCKET`
- `CLOUDFLARE_R2_PUBLIC_URL` (URL pública do bucket via CDN)

---

### `apps/api/src/modules/packages/packages.routes.ts` (route, CRUD — modificar)

**Analog:** Arquivo atual (`apps/api/src/modules/packages/packages.routes.ts`)

**parseParams helper existente** (linhas 18–34 — reutilizar):
```typescript
function parseParams<T>(schema: z.ZodType<T>, params: unknown, reply: any): { data: T; error: null } | { data: null; error: true } {
  try {
    return { data: schema.parse(params) as T, error: null }
  } catch (err) {
    if (err instanceof ZodError) {
      reply.status(400).send({
        message: 'Dados inválidos',
        errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
      })
      return { data: null, error: true }
    }
    throw err
  }
}
```

**Ownership check existente** (linhas 223–226 — copiar para nova rota enrich):
```typescript
const user = request.user as { sub: string; role: string }
if (user.role === 'CONDUTOR' && pkg.conductorId !== user.sub) {
  throw new AppError('Acesso negado', 403)
}
```

**Nova rota PATCH /enrich** (baseada no padrão PUT linhas 198–234):
```typescript
app.patch('/tenants/:slug/packages/:id/enrich', {
  preHandler: [authenticate, authorize([Role.CONDUTOR, Role.ADMIN])],
}, async (request, reply) => {
  const { data: params, error } = parseParams(slugAndIdParamsSchema, request.params, reply)
  if (error) return

  const enrichSchema = z.object({
    photos: z.array(z.string().url()).max(5).optional(),
    highlights: z.array(z.string().min(1)).optional(),
  })
  let body
  try {
    body = enrichSchema.parse(request.body)
  } catch (err) {
    if (err instanceof ZodError) return reply.status(400).send({
      message: 'Dados inválidos',
      errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
    })
    throw err
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: params!.slug } })
  if (!tenant) throw new AppError('Tenant não encontrado', 404)

  const pkg = await prisma.tourPackage.findFirst({ where: { id: params!.id, tenantId: tenant.id } })
  if (!pkg) throw new AppError('Roteiro não encontrado', 404)

  const user = request.user as { sub: string; role: string }
  if (user.role === 'CONDUTOR' && pkg.conductorId !== user.sub) throw new AppError('Acesso negado', 403)

  const updated = await prisma.tourPackage.update({
    where: { id: params!.id },
    data: {
      ...(body.photos !== undefined && { photos: body.photos }),
      ...(body.highlights !== undefined && { highlights: body.highlights }),
    },
  })
  return reply.status(200).send(updated)
})
```

---

### `apps/web/app/api/super-admin/destinos/route.ts` (route, request-response)

**Analog:** `apps/web/app/api/super-admin/tenants/pending/route.ts` (linhas 1–20 — copiar exato)

```typescript
import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

export async function GET(req: NextRequest) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  }
  const status = req.nextUrl.searchParams.get("status") ?? "PENDING"
  const res = await fetch(`${API_URL}/destinations/admin?status=${status}`, {
    headers: { Authorization: `Bearer ${jwt.apiToken}` },
    cache: "no-store",
  })
  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
```

---

### `apps/web/app/api/super-admin/destinos/[id]/approve/route.ts` (route, request-response)

**Analog:** `apps/web/app/api/super-admin/tenants/[id]/approve/route.ts` (linhas 1–22 — copiar quase exato)

```typescript
import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) {
    return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  }
  const { id } = await params
  const res = await fetch(`${API_URL}/destinations/${id}/approve`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${jwt.apiToken}`, "Content-Type": "application/json" },
    cache: "no-store",
  })
  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
```

---

### `apps/web/app/api/super-admin/destinos/[id]/reject/route.ts` (route, request-response)

**Analog:** `apps/web/app/api/super-admin/tenants/[id]/approve/route.ts` — mesma estrutura, com body forwarding

```typescript
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const res = await fetch(`${API_URL}/destinations/${id}/reject`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${jwt.apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  const data = await res.text()
  return new NextResponse(data, { status: res.status, headers: { "Content-Type": "application/json" } })
}
```

---

### `apps/web/app/api/[slug]/destinos/route.ts` (route, request-response)

**Analog:** `apps/web/app/api/super-admin/tenants/pending/route.ts`

**GET + POST no mesmo arquivo:**
```typescript
const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  const { slug } = await params
  const res = await fetch(`${API_URL}/tenants/${slug}/destinations`, {
    headers: { Authorization: `Bearer ${jwt.apiToken}` },
    cache: "no-store",
  })
  const data = await res.text()
  return new NextResponse(data, { status: res.status, headers: { "Content-Type": "application/json" } })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  const { slug } = await params
  const body = await req.json()
  const res = await fetch(`${API_URL}/tenants/${slug}/destinations`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt.apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  const data = await res.text()
  return new NextResponse(data, { status: res.status, headers: { "Content-Type": "application/json" } })
}
```

---

### `apps/web/app/api/[slug]/destinos/[id]/route.ts` (route, request-response)

**Analog:** `apps/web/app/api/super-admin/tenants/[id]/approve/route.ts`

**PATCH + DELETE:**
```typescript
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  const { slug, id } = await params
  const body = await req.json()
  const res = await fetch(`${API_URL}/tenants/${slug}/destinations/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${jwt.apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  const data = await res.text()
  return new NextResponse(data, { status: res.status, headers: { "Content-Type": "application/json" } })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  const { slug, id } = await params
  const res = await fetch(`${API_URL}/tenants/${slug}/destinations/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${jwt.apiToken}` },
    cache: "no-store",
  })
  const data = await res.text()
  return new NextResponse(data, { status: res.status, headers: { "Content-Type": "application/json" } })
}
```

---

### `apps/web/app/api/uploads/presigned/route.ts` (route, file-I/O)

**Analog:** `apps/web/app/api/super-admin/tenants/pending/route.ts` (padrão auth proxy)

```typescript
export async function POST(req: NextRequest) {
  const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!jwt?.apiToken) return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
  const body = await req.json()
  const res = await fetch(`${API_URL}/uploads/presigned`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt.apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  const data = await res.text()
  return new NextResponse(data, { status: res.status, headers: { "Content-Type": "application/json" } })
}
```

---

### `apps/web/app/super-admin/destinos/page.tsx` (component, request-response)

**Analog:** `apps/web/app/super-admin/operadoras/page.tsx` (cópia quase direta — mesma estrutura)

**Status badge map** (linhas 15–19, operadoras — adaptar labels):
```typescript
const DEST_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  PENDING:  { label: "Pendente",  bg: "#FEF9EC", color: "#B45309" },
  APPROVED: { label: "Aprovado",  bg: "#F0FDF4", color: "#15803D" },
  REJECTED: { label: "Rejeitado", bg: "#FEF2F2", color: "#DC2626" },
}
```

**Estado e load pattern** (linhas 30–55, operadoras — copiar estrutura):
```typescript
const [items, setItems] = useState<Destination[]>([])
const [loading, setLoading] = useState(true)
const [loadError, setLoadError] = useState(false)
const [actionLoading, setActionLoading] = useState<string | null>(null)
const [actionError, setActionError] = useState<string | null>(null)

function loadDestinations() {
  setLoading(true)
  setLoadError(false)
  fetch("/api/super-admin/destinos?status=PENDING")
    .then((r) => { if (!r.ok) throw new Error(); return r.json() })
    .then(setItems)
    .catch(() => setLoadError(true))
    .finally(() => setLoading(false))
}
useEffect(() => { loadDestinations() }, [])
```

**Optimistic update + rollback** (linhas 57–78, operadoras — copiar padrão):
```typescript
async function handleApprove(dest: Destination) {
  setActionLoading(dest.id)
  setItems((prev) => prev.map((d) => d.id === dest.id ? { ...d, approvalStatus: "APPROVED" } : d))
  try {
    const res = await fetch(`/api/super-admin/destinos/${dest.id}/approve`, { method: "PATCH" })
    if (!res.ok) throw new Error()
  } catch {
    setItems((prev) => prev.map((d) => d.id === dest.id ? { ...d, approvalStatus: "PENDING" } : d))
    setActionError("Não foi possível realizar a ação. Tente novamente.")
  } finally {
    setActionLoading(null)
  }
}
```

**Shimmer skeleton** (linhas 161–176, operadoras — copiar exato):
```typescript
const shimmerKeyframes = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`
{loading && [1, 2, 3].map((i) => (
  <div key={i} style={{
    height: "52px", marginBottom: "8px", borderRadius: "4px",
    background: "linear-gradient(90deg, var(--stone-100), var(--stone-50), var(--stone-100))",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
  }} />
))}
```

**Cards com thumbnail** (diferença vs operadoras que usa table — D-13 exige foto):
```typescript
// Grid de cards em vez de table — destinos têm heroImageUrl
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
  {items.map((dest) => (
    <div key={dest.id} style={{ border: "1px solid var(--stone-200)", borderRadius: "8px", overflow: "hidden" }}>
      {dest.heroImageUrl && (
        <img src={dest.heroImageUrl} alt="" loading="lazy"
          style={{ width: "100%", height: "160px", objectFit: "cover" }} />
      )}
      {/* título + UF + badge + botões Aprovar/Rejeitar */}
    </div>
  ))}
</div>
```

---

### `apps/web/app/[slug]/(painel)/painel/destinos/page.tsx` (component, CRUD)

**Analog:** `apps/web/app/[slug]/(painel)/painel/destino/page.tsx` (arquivo inteiro)

**useEffect slug resolution** (linhas 43–45, destino — copiar):
```typescript
useEffect(() => {
  Promise.resolve(params).then(({ slug: s }) => setSlug(s))
}, [params])
```

**Fetch de lista** (adaptar do padrão linhas 47–69, destino):
```typescript
useEffect(() => {
  if (!slug) return
  setLoading(true)
  fetch(`/api/${slug}/destinos`)
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
    .then((data) => setDestinations(Array.isArray(data) ? data : []))
    .catch(() => setLoadError(true))
    .finally(() => setLoading(false))
}, [slug])
```

**Input/label styles** (linhas 141–158, destino — copiar exato):
```typescript
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px",
  border: "1px solid var(--stone-300)", borderRadius: "4px",
  fontSize: "16px", color: "var(--stone-800)", background: "white", boxSizing: "border-box",
}
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "14px",
  color: "var(--stone-700)", marginBottom: "4px", fontWeight: 600,
}
```

**Highlights add/remove pattern** (linhas 71–81, destino — copiar exato):
```typescript
function setHighlight(idx: number, value: string) {
  setHighlights((prev) => prev.map((h, i) => (i === idx ? value : h)))
}
function addHighlight() { setHighlights((prev) => [...prev, ""]) }
function removeHighlight(idx: number) { setHighlights((prev) => prev.filter((_, i) => i !== idx)) }
```

**Save com error handling** (linhas 107–138, destino — adaptar para POST):
```typescript
async function handleSave(e: React.FormEvent) {
  e.preventDefault()
  setSaving(true)
  setSaveError(null)
  try {
    const res = await fetch(`/api/${slug}/destinos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, state, heroImageUrl, photos, highlights }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message ?? `Erro ${res.status}`)
    }
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  } catch (err: any) {
    setSaveError(err.message ?? "Não foi possível salvar. Tente novamente.")
  } finally {
    setSaving(false)
  }
}
```

**Badge de status** (reutilizar DEST_STATUS de super-admin/destinos):
```typescript
// D-08: guia vê status do seu destino
<span style={{
  display: "inline-block", padding: "4px 8px", borderRadius: "4px",
  fontSize: "12px", fontWeight: 600,
  background: DEST_STATUS[dest.approvalStatus].bg,
  color: DEST_STATUS[dest.approvalStatus].color,
}}>
  {DEST_STATUS[dest.approvalStatus].label}
</span>
```

**Controle de ownership no frontend (D-12):**
```typescript
// Botões Editar/Deletar apenas nos destinos do próprio guia
{dest.createdById === currentUserId && (
  <>
    <button onClick={() => handleEdit(dest)}>Editar</button>
    <button onClick={() => handleDelete(dest.id)}>Excluir</button>
  </>
)}
```

**Select de estados brasileiros (D-10):**
```typescript
const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO"
]
// <select value={state} onChange={(e) => setState(e.target.value)} style={inputStyle}>
//   {ESTADOS_BR.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
// </select>
```

**PhotoUploader com arquivo real** (diferença crítica vs destino/page.tsx atual que usava URLs manuais):
```typescript
// 1. <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} />
// 2. Validar file.size < 5 * 1024 * 1024 antes de upload
// 3. POST /api/uploads/presigned → { uploadUrl, publicUrl }
// 4. PUT uploadUrl com o arquivo (fetch direto ao R2 — sem Authorization header)
// 5. Salvar publicUrl no array photos[]
async function handleFileUpload(file: File) {
  if (file.size > 5 * 1024 * 1024) { setPhotoError("Arquivo excede 5MB."); return }
  const { uploadUrl, publicUrl } = await fetch("/api/uploads/presigned", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, contentType: file.type, context: "destination", contextId: destinationId }),
  }).then((r) => r.json())
  await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } })
  setPhotos((prev) => [...prev, publicUrl])
}
```

---

### `apps/web/app/[slug]/(painel)/painel/roteiros/[id]/page.tsx` (component, CRUD)

**Analog:** `apps/web/app/[slug]/(painel)/painel/destino/page.tsx`

**Seção de enriquecimento** (adicionar após campos básicos do roteiro — D-16):
```typescript
// Estado separado para enriquecimento:
const [photos, setPhotos] = useState<string[]>([])
const [highlights, setHighlights] = useState<string[]>([])
const [savingEnrich, setSavingEnrich] = useState(false)
const [enrichError, setEnrichError] = useState<string | null>(null)
const [enrichSuccess, setEnrichSuccess] = useState(false)

// Highlights: copiar exato de destino/page.tsx linhas 71–81
// Photos: copiar lógica handleFileUpload com context: "package"

async function handleSaveEnrich(e: React.FormEvent) {
  e.preventDefault()
  setSavingEnrich(true)
  setEnrichError(null)
  try {
    const res = await fetch(`/api/${slug}/pacotes/${packageId}/enrich`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photos, highlights }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message ?? `Erro ${res.status}`)
    }
    setEnrichSuccess(true)
    setTimeout(() => setEnrichSuccess(false), 3000)
  } catch (err: any) {
    setEnrichError(err.message ?? "Não foi possível salvar. Tente novamente.")
  } finally {
    setSavingEnrich(false)
  }
}
```

---

## Shared Patterns

### Autenticação proxy (Next.js API routes)
**Source:** `apps/web/app/api/super-admin/tenants/pending/route.ts` (linhas 1–20)
**Apply to:** Todos os arquivos em `app/api/super-admin/destinos/` e `app/api/[slug]/destinos/` e `app/api/uploads/`
```typescript
const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
if (!jwt?.apiToken) {
  return NextResponse.json({ message: "Não autenticado" }, { status: 401 })
}
// Forward: headers: { Authorization: `Bearer ${jwt.apiToken}` }
const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
```

### Autenticação Fastify (backend routes)
**Source:** `apps/api/src/modules/destinations/destinations.routes.ts` (linhas 209–211)
**Apply to:** Todas as novas rotas protegidas no backend
```typescript
{ preHandler: [authenticate, authorize(['CONDUTOR', 'ADMIN', 'SUPER_ADMIN'])] }
```

### Validação Zod + zodError helper (Fastify)
**Source:** `apps/api/src/modules/destinations/destinations.routes.ts` (linhas 12–17)
**Apply to:** Todos os novos handlers de rotas Fastify
```typescript
function zodError(err: ZodError) {
  return {
    message: 'Dados inválidos',
    errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
  }
}
// Uso: catch (err) { if (err instanceof ZodError) return reply.status(400).send(zodError(err)); throw err }
```

### AppError para erros de negócio (Fastify)
**Source:** `apps/api/src/modules/packages/packages.routes.ts` (linhas 83–84)
**Apply to:** Todos os novos handlers de rotas Fastify
```typescript
import { AppError } from '../../shared/errors/AppError'
throw new AppError('Mensagem em português', statusCode)
```

### Shimmer skeleton (loading state — frontend)
**Source:** `apps/web/app/super-admin/operadoras/page.tsx` (linhas 161–176)
**Apply to:** `super-admin/destinos/page.tsx`, `[slug]/(painel)/painel/destinos/page.tsx`
```typescript
const shimmerKeyframes = `@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`
// height: "52px", animation: "shimmer 1.5s infinite"
// background: "linear-gradient(90deg, var(--stone-100), var(--stone-50), var(--stone-100))"
// backgroundSize: "200% 100%"
```

### Status badge visual (PENDING/APPROVED/REJECTED)
**Source:** `apps/web/app/super-admin/operadoras/page.tsx` (linhas 15–19)
**Apply to:** `super-admin/destinos/page.tsx`, `[slug]/(painel)/painel/destinos/page.tsx`
```typescript
const STATUS_MAP = {
  PENDING:  { label: "Pendente",  bg: "#FEF9EC", color: "#B45309" },
  APPROVED: { label: "Aprovado",  bg: "#F0FDF4", color: "#15803D" },
  REJECTED: { label: "Rejeitado", bg: "#FEF2F2", color: "#DC2626" },
}
// <span style={{ padding: "4px 8px", borderRadius: "4px", fontSize: "12px",
//   fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
```

### Mobile-first (painel UI)
**Source:** `apps/web/app/[slug]/(painel)/painel/destino/page.tsx` (linhas 210–212)
**Apply to:** Toda UI do painel
```typescript
// form: maxWidth: "640px", display: "flex", flexDirection: "column", gap: "20px"
// buttons: minHeight: "44px" (touch target mínimo iOS)
// input: fontSize: "16px" (evita zoom iOS Safari)
```

### Ownership check backend (CONDUTOR por createdById)
**Source:** `apps/api/src/modules/packages/packages.routes.ts` (linhas 223–226)
**Apply to:** PATCH e DELETE de destinos criados por guias
```typescript
const user = request.user as { sub: string; role: string }
if (user.role === 'CONDUTOR' && resource.createdById !== user.sub) {
  throw new AppError('Você pode editar apenas seus próprios destinos', 403)
}
```

### parseParams helper (Fastify)
**Source:** `apps/api/src/modules/packages/packages.routes.ts` (linhas 18–34)
**Apply to:** Novos handlers em destinations.routes.ts e uploads.routes.ts
```typescript
function parseParams<T>(schema: z.ZodType<T>, params: unknown, reply: any) {
  try {
    return { data: schema.parse(params) as T, error: null }
  } catch (err) {
    if (err instanceof ZodError) {
      reply.status(400).send({ message: 'Dados inválidos', errors: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message })) })
      return { data: null, error: true }
    }
    throw err
  }
}
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/api/src/modules/uploads/uploads.service.ts` | service | file-I/O | Nenhuma integração com storage externo existe no codebase. Usar padrão `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` do RESEARCH.md. |

---

## Metadata

**Analog search scope:** `apps/api/src/modules/`, `apps/web/app/api/`, `apps/web/app/super-admin/`, `apps/web/app/[slug]/(painel)/`
**Files scanned:** 8 arquivos lidos diretamente + schema.prisma
**Pattern extraction date:** 2026-06-08
