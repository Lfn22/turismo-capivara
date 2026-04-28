---
phase: 03-roteiros-e-disponibilidade
gathered: "2026-04-28"
status: ready_for_planning
source: discuss-phase
---

# Phase 3: Roteiros e Disponibilidade — Context

## Domain Boundary

CONDUTOR aprovado cria e gerencia seus próprios roteiros (TourPackage) e define slots de saída com data, capacidade mínima e máxima. Turistas consultam disponibilidade via endpoints de leitura já existentes.

**Já construído (não replicar):**
- `GET /tenants/:slug/packages` — leitura pública de pacotes ativos com slots futuros abertos
- `GET /tenants/:slug/packages/:id` — detalhe de pacote com slots
- `authenticate` e `authorize(roles)` middlewares — fase 1
- `parseParams` helper em `packages.routes.ts` — reutilizar
- `DepartureSlot.status` enum: `OPEN | FULL | CANCELLED | COMPLETED`
- `BookingStatus` enum: `PENDING | CONFIRMED | CHECKED_IN | COMPLETED | CANCELLED | NO_SHOW`
- `prisma.$transaction` — padrão para operações atômicas (anti-overbooking já usa)

**Fora do escopo desta fase:**
- Discovery, filtros e comparação de guias (Phase 4)
- Pagamento e confirmação de booking (Phase 4/5)
- Frontend Next.js
- Notificações por e-mail
- Multi-guia por roteiro em tempo real (PKG-02 deferred — veja Deferred abaixo)
- Cancelamento de booking pelo turista (BOOK-03)

---

## Decisions

### D-01 — Package ownership: conductorId no TourPackage

`TourPackage` atualmente tem apenas `tenantId`. Nesta fase, adicionamos `conductorId String?` (FK para `User.id`) ao modelo.

- **CONDUTOR** só pode editar/deletar pacotes onde `conductorId = JWT.sub`
- **ADMIN** pode gerenciar todos os pacotes do tenant (sem restrição de conductorId)
- Registros existentes (antes da migration) ficam com `conductorId = null` — aceitável para dados de seed/desenvolvimento
- Campo nullable na migration para não quebrar dados existentes

**Endpoint de criação** seta `conductorId` automaticamente via `JWT.sub` — CONDUTOR não escolhe.

### D-02 — Cancelamento de slot: cascade automático de bookings

Quando CONDUTOR cancela um `DepartureSlot` (status → CANCELLED), todos os `Bookings` com `status = PENDING` desse slot são automaticamente movidos para `status = CANCELLED` na **mesma transação** (`prisma.$transaction`).

- Bookings com `status = CONFIRMED` **não** são tocados — esses já têm pagamento confirmado e exigem intervenção manual/fase futura
- Sem notificações por e-mail nesta fase — frontend detecta o status via polling ou próxima requisição
- Endpoint de cancelamento retorna `{ message: 'Slot cancelado', bookingsCancelled: N }` indicando quantas reservas foram afetadas

### D-03 — Mínimo de participantes: minCapacity no slot + campo calculado

Adicionar `minCapacity Int @default(1)` ao modelo `DepartureSlot`.

- Mínimo é por slot (não por pacote) — CONDUTOR define ao criar ou editar o slot
- Sistema **não age automaticamente** se mínimo não for atingido — enforcement é manual pelo guia
- `GET /packages/:id` (e listagem) inclui campo calculado `hasMinimumReached: boolean` no payload de cada slot: `booked >= minCapacity`
- Validação: `minCapacity` deve ser `>= 1` e `<= capacity` (Zod)

### D-04 — Deleção de roteiro: soft delete (active = false)

`TourPackage` já tem `active: Boolean @default(true)`. DELETE endpoint faz:
```
prisma.tourPackage.update({ data: { active: false } })
```
- Roteiro inativo some dos endpoints públicos (GET /packages filtra `active: true`) — sem migration necessária
- Hard delete nunca: histórico de bookings ficaria órfão
- CONDUTOR só pode inativar pacotes próprios (`conductorId = JWT.sub`); ADMIN pode inativar qualquer um

### D-05 — Padrão de rotas para endpoints CONDUTOR

Seguir o padrão já estabelecido no projeto:
```typescript
// preHandler: [authenticate, authorize([Role.CONDUTOR])]
// ou inline:
await request.jwtVerify()
const user = request.user as { sub: string; tenantId: string; role: string }
if (user.role !== 'CONDUTOR') throw new AppError('Acesso negado', 403)
```
Cross-tenant: verificar que o pacote pertence ao `tenant` resolvido pelo `:slug` da URL **E** que `conductorId = user.sub`.

### D-06 — Onde ficam os novos endpoints

Opções: (a) Adicionar ao `packages.routes.ts` existente, ou (b) Criar `conductor-packages.routes.ts` separado.

**Decisão: Adicionar ao `packages.routes.ts` existente.** Não criar arquivo novo — a fase não justifica separação de módulo. O arquivo já tem o `parseParams` helper e o padrão Zod.

### Claude's Discretion

- Se `conductorId` deve ser `String?` ou `String` na migration (usar nullable para compatibilidade com seed)
- Ordenação padrão de slots em GET (por `startsAt ASC`)
- Campos exatos do response body de cada endpoint além do mínimo
- Se `ADMIN` também pode criar pacotes via estes endpoints (sim — authorize aceita array de roles)

---

## Schema Changes Required

```prisma
// TourPackage — adicionar:
conductorId  String?
conductor    User?   @relation(fields: [conductorId], references: [id])

// DepartureSlot — adicionar:
minCapacity  Int  @default(1)
```

Duas migrations separadas ou uma combinada — Claude decide na hora do plano.

---

## Endpoints a Construir

| Endpoint | Role | Finalidade |
|---|---|---|
| POST /tenants/:slug/packages | CONDUTOR | Cria pacote (conductorId = JWT.sub) |
| PUT /tenants/:slug/packages/:id | CONDUTOR | Edita pacote próprio |
| DELETE /tenants/:slug/packages/:id | CONDUTOR | Soft-delete (active = false) |
| POST /tenants/:slug/packages/:id/slots | CONDUTOR | Cria slot com minCapacity |
| PATCH /tenants/:slug/packages/:id/slots/:slotId | CONDUTOR | Edita slot (capacidade, data, minCapacity) |
| DELETE /tenants/:slug/packages/:id/slots/:slotId | CONDUTOR | Cancela slot + cascade bookings PENDING |

---

## Deferred Ideas

- **PKG-02 completo**: "Múltiplos guias oferecem o mesmo roteiro com preços distintos e visíveis para comparação" — interpretado nesta fase como: cada CONDUTOR cria seu próprio TourPackage (podem ter o mesmo nome/tema). A feature de "comparação lado a lado" vai para Phase 4 (Discovery). Se PKG-02 exigir um modelo de template compartilhado, isso é Phase 4+.
- **Notificação ao turista quando slot é cancelado**: email automático — Phase 5+
- **Cancelamento de booking com política de reembolso** (BOOK-03) — Phase 5
- **Ativação automática de slot quando mínimo é atingido** — sem cron nesta fase

---

## Canonical References

Downstream agents MUST read these before planning or implementing:

- `apps/api/src/modules/packages/packages.routes.ts` — padrão de módulo, parseParams helper, padrão Prisma para TourPackage
- `apps/api/prisma/schema.prisma` — modelos TourPackage, DepartureSlot, Booking, SlotStatus, BookingStatus enums
- `apps/api/src/modules/auth/auth.routes.ts` — padrão JWT verify + role check inline
- `apps/api/src/modules/bookings/bookings.routes.ts` — padrão de prisma.$transaction para operações atômicas
- `.planning/phases/01-security-hardening/01-CONTEXT.md` — D-09 (cross-tenant check pattern)
- `.planning/phases/02-user-access-guide-onboarding/02-CONTEXT.md` — padrão authorize, AppError, Zod errors em português
