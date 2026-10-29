# Plano 2 — Notificações (sininho + e-mail) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Todo usuário logado vê um sininho com as novidades que exigem atenção dele (reservas, guias novos, decisões, entrada em roteiro), e admins recebem um resumo diário por e-mail.

**Architecture:** Uma tabela genérica `Notification` (por usuário, com `type` livre, link de destino, agrupamento por `groupKey` e pendência por `actionKey`). Um único módulo `notifications` na API expõe o serviço `notify()`/`resolveAction()`, funções de evento por domínio e as rotas `/notifications*`. Os pontos que hoje já mandam e-mail passam a chamar essas funções em fire-and-forget, sem nunca derrubar a operação. Na web, uma barra de usuário logado (`UserBar`) no layout raiz mostra o sininho por polling de 60 s; o plano 4 vai acrescentar a chave "Modo edição" nessa mesma barra.

**Tech Stack:** Fastify 5, Prisma 7 (PostgreSQL), Zod v4 (`err.issues`), fastify-cron, Resend; Next.js 16.2 App Router + next-auth; Vitest com prisma mockado.

**Spec:** `docs/superpowers/specs/2026-10-28-hierarquia-edicao-guias-notificacoes-design.md` — seções "6. Sistema de notificações" e "Notificações que levam à ação".

## Global Constraints

- Validação Zod em toda rota nova; erros 400 no formato `{ message: 'Dados inválidos', errors: [{ field, message }] }` (igual a `auth.routes.ts`).
- Mensagens de erro e textos de notificação em português, com acentos.
- Falha de notificação ou de e-mail **nunca** reverte nem quebra a operação principal (mesmo padrão "fire-and-forget" dos e-mails D-12).
- Turista sem conta (guest checkout) continua só com e-mail. **Não** casar reservas por e-mail (LGPD) — só `Booking.userId`.
- Um usuário só lê e altera as próprias notificações (inclusive via chamada direta à API).
- Next.js 16.2 tem mudanças incompatíveis: ler o guia relevante em `apps/web/node_modules/next/dist/docs/` antes de escrever código web.
- `pnpm` não está no PATH: usar `npx` dentro de `apps/api` e `apps/web`. Não há banco local: migração gerada offline com `npx prisma migrate diff`.
- **Nunca rodar `git commit`, `git add` ou `git stash`** — o usuário commita manualmente. Os passos "Commit" deste plano viram "deixar a árvore pronta para o usuário commitar".
- Baseline de testes da API: 7 falhas pré-existentes (self-service repay, `expiry.job`, `uploads.routes`) e erros de tsc em `testimonials.test.ts` (arquivo do usuário). Não piorar; não precisa consertar.

## Decisões deste plano (do Claude)

- **Escopo dos eventos:** entram os eventos cujos fluxos já existem hoje. Pedido de roteiro pendente/aceito/recusado, verificação de guia pela equipe da plataforma e **Aprovar/Recusar direto na notificação** entram no plano 3, que cria esses fluxos; este plano deixa pronta a base (`actionKey`, `resolveAction`, tela Pendências).
- **Entrega:** polling (60 s e ao voltar o foco da aba), sem WebSocket.
- **Destinatários de "agência":** usuários `ADMIN` do tenant da reserva/roteiro.
- **Destinatários de "admins e superadmin":** todos os usuários `SUPER_ADMIN` e `PLATFORM_ADMIN`.
- **Agrupamento:** `notify()` com `groupKey`: se o usuário já tem notificação **não lida** com o mesmo `groupKey`, incrementa `count`, troca título/corpo e "sobe" a notificação (`updatedAt`); senão cria. Listas ordenam por `updatedAt desc`.
- **E-mail:** os e-mails por evento que já existem continuam iguais. Novo: **resumo diário** às 08:00 (America/Sao_Paulo) para `ADMIN`, `SUPER_ADMIN` e `PLATFORM_ADMIN` com notificações não lidas e ainda não resumidas.
- **Acesso web à API:** o proxy genérico `/api/proxy` passa a aceitar também `path` começando em `/notifications`.

## Catálogo de eventos (textos exatos)

| `type` | Quando | Para quem | `title` | `body` | `link` | `groupKey` / `actionKey` |
|---|---|---|---|---|---|---|
| `booking.created` | reserva criada (após o PIX ser gerado) | turista (`booking.userId`), condutor do roteiro, ADMINs do tenant | `Nova reserva` | `{customerName} · {packageName} · {pax} pessoa(s)` | turista: `/{slug}/minha-reserva`; demais: `/{slug}/painel/reservas` | — |
| `booking.confirmed` | PIX aprovado (webhook) ou confirmação manual | idem | `Reserva confirmada` | `{packageName} em {dd/MM/yyyy}` | idem | — |
| `booking.expired` | expirou (cron, webhook cancelado/rejeitado) | idem | `Reserva expirada` | `{packageName} — pagamento não concluído` | idem | — |
| `booking.cancelled` | cancelada pelo turista (token) ou por guia/admin | idem | `Reserva cancelada` | `{packageName} em {dd/MM/yyyy}` | idem | — |
| `guide.registered` | conta de guia criada (`/tenants/:slug/auth/register` com CONDUTOR e `/auth/register-independent`) | staff da plataforma + ADMINs do tenant do guia | `Guia aguardando verificação` | `{guideName} enviou cadastro` | staff: `/pendencias`; ADMIN: `/{slug}/admin/guias` | `groupKey: 'guide.registered'`; `actionKey: 'guide-verification:{userId}'` |
| `guide.approved` | guia aprovado | o guia | `Cadastro aprovado` | `Seu perfil já pode aparecer no site.` | `/{slug}/painel/perfil` | — |
| `guide.rejected` | guia recusado | o guia | `Cadastro recusado` | `Motivo: {reason}` | `/{slug}/painel/perfil` | — |
| `package.guide-joined` | guia entrou em roteiro (`POST /tenants/:slug/packages/:id/guides/me`) | ADMINs do tenant dono do roteiro, exceto o próprio guia | `Guia entrou no roteiro` | `{guideName} · {packageName}` | `/{slug}/painel/roteiros/{packageId}` | — |

O `{slug}` dos links de reserva e roteiro é o slug do tenant da reserva/roteiro; o do guia é o slug do tenant do guia. Data no fuso `America/Sao_Paulo`.

## Review Focus

1. **Notificação de outro usuário** — `PATCH /notifications/:id/read` com id de outra pessoa deve responder 404 e não alterar nada. Teste na Task 2.
2. **Banco de notificações fora do ar no meio de uma reserva** — `notify` lançando erro não pode mudar a resposta de `POST /tenants/:slug/bookings` (continua 201). Teste na Task 3.
3. **JWT inválido/vencido no checkout** — reserva com `Authorization` quebrado deve seguir como guest (201, `userId` nulo), nunca 401. Teste na Task 3.
4. **Destinatário duplicado** — condutor que também é ADMIN do tenant recebe **uma** notificação, não duas. Teste na Task 1 (`notify` deduplica `userIds`).
5. **Visitante deslogado** — a `UserBar` não renderiza nada sem sessão (nenhuma chamada a `/notifications`). Verificação manual na Task 6.

---

### Task 1: Modelo `Notification`, `Booking.userId` e serviço de notificação

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20261028000002_notifications/migration.sql` (gerada offline)
- Create: `apps/api/src/modules/notifications/notifications.service.ts`
- Test: `apps/api/src/modules/notifications/__tests__/notifications.service.test.ts`

**Interfaces:**
- Produces:
  - `notify(input: NotifyInput): Promise<void>` onde `NotifyInput = { userIds: string[]; type: string; title: string; body: string; link?: string | null; groupKey?: string; actionKey?: string }` — deduplica e ignora `userIds` vazios; lança em erro de banco (quem chama decide engolir).
  - `resolveAction(actionKey: string, resolvedByName: string): Promise<void>` — marca `resolvedAt = now`, `resolvedByName` e `readAt = now` (se nulo) em todas as notificações com esse `actionKey`.
  - `platformStaffIds(): Promise<string[]>` — ids de `SUPER_ADMIN` e `PLATFORM_ADMIN`.
  - `tenantAdminIds(tenantId: string): Promise<string[]>` — ids de `ADMIN` do tenant.

- [ ] **Step 1: Schema**

Em `schema.prisma`, adicionar o modelo e as relações:

```prisma
model Notification {
  id             String    @id @default(cuid())
  userId         String
  type           String
  title          String
  body           String
  link           String?
  groupKey       String?
  count          Int       @default(1)
  actionKey      String?
  resolvedAt     DateTime?
  resolvedByName String?
  readAt         DateTime?
  digestedAt     DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, updatedAt])
  @@index([userId, readAt])
  @@index([actionKey])
}
```

`User` ganha `notifications Notification[]` e `bookings Booking[]`. `Booking` ganha `userId String?` + `user User? @relation(fields: [userId], references: [id], onDelete: SetNull)` + `@@index([userId])`.

- [ ] **Step 2: Gerar a migração offline**

Antes do Step 1, copiar o `schema.prisma` atual (já com o plano 1) para um arquivo temporário no scratchpad. Depois do Step 1, rodar (em `apps/api`): `npx prisma migrate diff --from-schema-datamodel <cópia-anterior> --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/20261028000002_notifications/migration.sql`.
Expected: o SQL contém só `CREATE TABLE "Notification"`, os três índices, a FK, `ALTER TABLE "Booking" ADD COLUMN "userId"`, o índice e a FK de `Booking.userId`. Nada de `DROP` — se aparecer, o schema de partida está errado.
Depois: `npx prisma generate` → sem erro.

- [ ] **Step 3: Testes do serviço (falhando)**

Em `notifications.service.test.ts`, com `vi.mock('../../../database')`:

```ts
it('cria uma notificação por usuário, sem duplicar ids', async () => {
  await notify({ userIds: ['u1', 'u1', 'u2'], type: 'booking.created', title: 'Nova reserva', body: 'x' })
  expect(prisma.notification.createMany).toHaveBeenCalledWith({
    data: [
      expect.objectContaining({ userId: 'u1', type: 'booking.created', title: 'Nova reserva', body: 'x', link: null }),
      expect.objectContaining({ userId: 'u2' }),
    ],
  })
})
it('não faz nada com lista vazia', async () => {
  await notify({ userIds: [], type: 't', title: 't', body: 'b' })
  expect(prisma.notification.createMany).not.toHaveBeenCalled()
})
it('com groupKey, incrementa a não lida existente em vez de criar', async () => {
  prisma.notification.findFirst.mockResolvedValueOnce({ id: 'n1' })
  await notify({ userIds: ['u1'], type: 'guide.registered', title: 'T2', body: 'B2', groupKey: 'guide.registered' })
  expect(prisma.notification.findFirst).toHaveBeenCalledWith(expect.objectContaining({
    where: { userId: 'u1', groupKey: 'guide.registered', readAt: null },
  }))
  expect(prisma.notification.update).toHaveBeenCalledWith({
    where: { id: 'n1' },
    data: expect.objectContaining({ count: { increment: 1 }, title: 'T2', body: 'B2' }),
  })
  expect(prisma.notification.create).not.toHaveBeenCalled()
})
it('com groupKey e sem não lida, cria', async () => {
  prisma.notification.findFirst.mockResolvedValueOnce(null)
  await notify({ userIds: ['u1'], type: 'guide.registered', title: 'T', body: 'B', groupKey: 'g', actionKey: 'a:1' })
  expect(prisma.notification.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ userId: 'u1', groupKey: 'g', actionKey: 'a:1' }),
  })
})
it('resolveAction marca todas as notificações da pendência', async () => {
  await resolveAction('guide-verification:g1', 'Fulana')
  expect(prisma.notification.updateMany).toHaveBeenCalledWith({
    where: { actionKey: 'guide-verification:g1', resolvedAt: null },
    data: { resolvedAt: expect.any(Date), resolvedByName: 'Fulana' },
  })
})
it('platformStaffIds busca SUPER_ADMIN e PLATFORM_ADMIN', async () => {
  prisma.user.findMany.mockResolvedValueOnce([{ id: 's1' }, { id: 'p1' }])
  expect(await platformStaffIds()).toEqual(['s1', 'p1'])
  expect(prisma.user.findMany).toHaveBeenCalledWith({
    where: { role: { in: ['SUPER_ADMIN', 'PLATFORM_ADMIN'] } }, select: { id: true },
  })
})
it('tenantAdminIds busca ADMIN do tenant', async () => {
  prisma.user.findMany.mockResolvedValueOnce([{ id: 'a1' }])
  expect(await tenantAdminIds('t1')).toEqual(['a1'])
  expect(prisma.user.findMany).toHaveBeenCalledWith({ where: { tenantId: 't1', role: 'ADMIN' }, select: { id: true } })
})
```

Nota: `resolveAction` também precisa marcar como lida — fazer um segundo `updateMany({ where: { actionKey, readAt: null }, data: { readAt } })`; adicionar essa asserção ao teste.

- [ ] **Step 4: Rodar e ver falhar** — `npx vitest run src/modules/notifications` → FAIL (módulo inexistente).
- [ ] **Step 5: Implementar `notifications.service.ts`** — sem `groupKey`, um `createMany`; com `groupKey`, por usuário `findFirst` + `update`/`create`.
- [ ] **Step 6: Rodar e ver passar** — `npx vitest run src/modules/notifications` → PASS; `npx tsc --noEmit` sem erros novos.
- [ ] **Step 7: Deixar pronto para o usuário commitar** (não commitar).

---

### Task 2: Rotas `/notifications`

**Files:**
- Create: `apps/api/src/modules/notifications/notifications.routes.ts`
- Modify: `apps/api/src/app.ts` (registrar depois de `platformAdminsRoutes`)
- Test: `apps/api/src/modules/notifications/__tests__/notifications.routes.test.ts`

**Interfaces:**
- Consumes: modelo `Notification` (Task 1).
- Produces (todas com `preHandler: [authenticate]`, escopo `userId = request.user.sub`):
  - `GET /notifications?cursor=<id>` → `200 { notifications: NotificationDTO[], nextCursor: string | null }`, 20 por página, `orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }]`. `NotificationDTO = { id, type, title, body, link, count, readAt, actionKey, resolvedAt, resolvedByName, updatedAt }`.
  - `GET /notifications/summary` → `200 { unread: number, pending: number }`. `pending` = notificações do usuário com `actionKey` não nulo e `resolvedAt` nulo.
  - `GET /notifications/pending` → `200 { notifications: NotificationDTO[] }` (mesmo filtro de `pending`, até 100, `updatedAt desc`).
  - `PATCH /notifications/:id/read` → `204`; `404 { message: 'Notificação não encontrada' }` se não for do usuário.
  - `POST /notifications/read-all` → `204`.
  - Rate limit `{ max: 120, timeWindow: '1 minute' }` em `summary` (chamada pelo polling).

- [ ] **Step 1: Testes (falhando)** com `buildApp()` e token assinado como nos testes de `platform-admins.routes.test.ts`:
  - `GET /notifications` sem token → 401.
  - `GET /notifications` → chama `findMany` com `where: { userId: <sub> }`, `take: 21`; com 21 resultados devolve 20 e `nextCursor` = id do 20º.
  - `GET /notifications?cursor=abc` → `findMany` recebe `cursor: { id: 'abc' }, skip: 1`.
  - `GET /notifications/summary` → `{ unread: 3, pending: 1 }` a partir de dois `count` mockados; o segundo `count` recebe `where: { userId, actionKey: { not: null }, resolvedAt: null }`.
  - `PATCH /notifications/n1/read` → `updateMany({ where: { id: 'n1', userId: <sub> }, data: { readAt: expect.any(Date) } })`; com `count: 0` → 404 `'Notificação não encontrada'`. **(Review Focus 1)**
  - `POST /notifications/read-all` → `updateMany({ where: { userId: <sub>, readAt: null }, ... })` e 204.
  - `GET /notifications?cursor=` com valor de mais de 64 caracteres → 400 `'Dados inválidos'`.
- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/modules/notifications`.
- [ ] **Step 3: Implementar** — Zod para `params` (`id: z.string().min(1).max(64)`) e `query` (`cursor` opcional, máx. 64). `PATCH` usa `updateMany` com `userId` no `where` (nunca `update` por id).
- [ ] **Step 4: Rodar e ver passar** + `npx tsc --noEmit`.
- [ ] **Step 5: Deixar pronto para o usuário commitar.**

---

### Task 3: Eventos de reserva e `Booking.userId`

**Files:**
- Create: `apps/api/src/modules/notifications/booking-events.ts`
- Modify: `apps/api/src/modules/bookings/bookings.routes.ts` (criação ~L107, `cancel-self` ~L468, `:id/cancel` ~L730, `:id/confirm` ~L783)
- Modify: `apps/api/src/modules/webhooks/webhooks.routes.ts` (~L171 CONFIRMED, ~L200 EXPIRED)
- Modify: `apps/api/src/modules/bookings/expiry.job.ts` (~L59)
- Modify: `apps/web/app/api/[slug]/bookings/route.ts` (repassar o token)
- Test: `apps/api/src/modules/notifications/__tests__/booking-events.test.ts`, e um caso novo em `apps/api/src/__tests__/bookings-create.test.ts`

**Interfaces:**
- Consumes: `notify`, `tenantAdminIds` (Task 1).
- Produces: `notifyBookingEvent(log: FastifyBaseLogger, bookingId: string, kind: 'created' | 'confirmed' | 'expired' | 'cancelled'): Promise<void>` — **nunca lança**: faz `try/catch` e `log.warn({ err, bookingId }, '[notif] Falha ao notificar evento de reserva')`. Carrega a reserva (`userId`, `customerName`, `pax`, `tenant.slug`, `tenantId`, `slot.startsAt`, `slot.package.name`, `slot.package.conductorId`) e chama `notify` **duas vezes**: uma para o turista (se `userId`) com link de turista, outra para `[conductorId, ...tenantAdminIds]` sem o `userId` do turista, com link de painel. Textos exatos no Catálogo.

- [ ] **Step 1: Testes de `booking-events` (falhando)**, mockando `../notifications.service` e o database:
  - `created` com `userId: 'c1'`, conductor `g1`, admins `['a1','g1']` → `notify` chamado com `{ userIds: ['c1'], type: 'booking.created', title: 'Nova reserva', body: 'Ana · Trilha do Boqueirão · 2 pessoa(s)', link: '/capivara/minha-reserva' }` e com `{ userIds: ['g1','a1','g1'] ... link: '/capivara/painel/reservas' }` (a deduplicação é do `notify`; **Review Focus 4** fica coberto pela Task 1).
  - `confirmed` com `slot.startsAt = new Date('2026-11-05T12:00:00Z')` → `body: 'Trilha do Boqueirão em 05/11/2026'`.
  - `expired` → `body: 'Trilha do Boqueirão — pagamento não concluído'`.
  - Reserva guest (`userId: null`) → só uma chamada de `notify` (painel).
  - `findUnique` lançando erro → a função resolve sem lançar e chama `log.warn`.
- [ ] **Step 2: Teste em `bookings-create.test.ts` (falhando):**
  - com `Authorization: Bearer <token de CLIENTE sub 'c1'>` → `tx.booking.create` recebe `data: expect.objectContaining({ userId: 'c1' })`.
  - com token de `CONDUTOR` → `userId: null` (só turista grava `userId`).
  - com `Authorization: Bearer lixo` → 201 e `userId: null`. **(Review Focus 3)**
  - com o módulo `../modules/notifications/booking-events` mockado e `notifyBookingEvent.mockRejectedValueOnce(new Error('db'))` → resposta continua 201. **(Review Focus 2)**
- [ ] **Step 3: Rodar e ver falhar.**
- [ ] **Step 4: Implementar.**
  - Criação: no início do handler, `let userId: string | null = null; try { await request.jwtVerify(); if (request.user.role === 'CLIENTE') userId = request.user.sub } catch {}` e gravar `userId` no `tx.booking.create`. **Não** usar `authenticate` (a rota continua pública). Ao lado de cada envio de e-mail existente (e na confirmação manual e no cancelamento por guia/admin, que não têm e-mail), chamar `void notifyBookingEvent(app.log, booking.id, '<kind>').catch(() => {})`, sempre **depois** que a transação/`update` de status terminar. No webhook e no cron, só quando a transição de fato aconteceu (`updateMany.count > 0` / dentro do ramo que já envia e-mail).
  - Web `app/api/[slug]/bookings/route.ts`: `const jwt = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })`; se `jwt?.apiToken`, enviar `Authorization: Bearer ${jwt.apiToken}`. Sem sessão, igual a hoje.
- [ ] **Step 5: Rodar e ver passar** — `npx vitest run` em `apps/api`: nenhuma falha além das 7 do baseline; `npx tsc --noEmit` em `apps/api` e `apps/web` sem erros novos.
- [ ] **Step 6: Deixar pronto para o usuário commitar.**

---

### Task 4: Eventos de guia

**Files:**
- Create: `apps/api/src/modules/notifications/guide-events.ts`
- Modify: `apps/api/src/modules/auth/auth.routes.ts` (`/tenants/:slug/auth/register` ramo CONDUTOR, `/auth/register-independent`)
- Modify: `apps/api/src/modules/guides/guides.routes.ts` (`approve` ~L179, `reject` ~L232)
- Modify: `apps/api/src/modules/packages/packages.routes.ts` (`POST /tenants/:slug/packages/:id/guides/me` ~L274)
- Test: `apps/api/src/modules/notifications/__tests__/guide-events.test.ts`

**Interfaces:**
- Consumes: `notify`, `resolveAction`, `platformStaffIds`, `tenantAdminIds` (Task 1).
- Produces (todas `Promise<void>`, nunca lançam, logam `'[notif] Falha ao notificar evento de guia'`):
  - `notifyGuideRegistered(log, guideUserId: string)`
  - `notifyGuideDecision(log, guideUserId: string, decision: { approved: true } | { approved: false; reason: string }, decidedByName: string)`
  - `notifyGuideJoinedPackage(log, guideUserId: string, packageId: string)`

- [ ] **Step 1: Testes (falhando):**
  - `notifyGuideRegistered` com guia `{ id: 'g1', name: 'Rui', tenantId: 't1', tenant: { slug: 'capivara' } }`, staff `['s1']`, admins `['a1']` → `notify({ userIds: ['s1'], type: 'guide.registered', title: 'Guia aguardando verificação', body: 'Rui enviou cadastro', link: '/pendencias', groupKey: 'guide.registered', actionKey: 'guide-verification:g1' })` e `notify({ userIds: ['a1'], ..., link: '/capivara/admin/guias', ... })`.
  - Guia do tenant `independente` sem ADMINs → só a chamada da staff (a segunda é pulada porque a lista é vazia — o `notify` já ignora vazio; pode chamar mesmo assim).
  - `notifyGuideDecision(..., { approved: true }, 'Fulana')` → `resolveAction('guide-verification:g1', 'Fulana')` e `notify({ userIds: ['g1'], type: 'guide.approved', title: 'Cadastro aprovado', body: 'Seu perfil já pode aparecer no site.', link: '/capivara/painel/perfil' })`.
  - `{ approved: false, reason: 'Documento ilegível' }` → `type: 'guide.rejected', title: 'Cadastro recusado', body: 'Motivo: Documento ilegível'`, e também chama `resolveAction('guide-verification:g1', 'Fulana')`.
  - `notifyGuideJoinedPackage(log, 'g1', 'p1')` com roteiro `{ name: 'Boqueirão', tenantId: 't2', tenant: { slug: 'agencia-x' } }`, admins `['a2', 'g1']` → `notify({ userIds: ['a2'], type: 'package.guide-joined', title: 'Guia entrou no roteiro', body: 'Rui · Boqueirão', link: '/agencia-x/painel/roteiros/p1' })` (o próprio guia sai da lista).
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar e ligar nas rotas.** Os `register` precisam do id do usuário criado: devolver `user.id` de dentro do `$transaction`. Chamar `void notifyGuideRegistered(app.log, userId).catch(() => {})` depois do 201 ser decidido (antes do `return`). Em `approve`/`reject`, buscar o nome de quem decidiu (`prisma.user.findUnique({ where: { id: admin.sub }, select: { name: true } })`, fallback `'Admin'`) e chamar `notifyGuideDecision`; usar o motivo já validado pelo `rejectBodySchema`. Em `guides/me`, chamar `notifyGuideJoinedPackage` só quando o vínculo **passou** a ficar ativo (não notificar se já estava ativo: ler o `PackageGuide` existente antes do `upsert`).
- [ ] **Step 4: Rodar e ver passar** — suíte da API sem falhas novas; `npx tsc --noEmit`.
- [ ] **Step 5: Deixar pronto para o usuário commitar.**

---

### Task 5: Resumo diário por e-mail para admins

**Files:**
- Create: `apps/api/src/modules/notifications/digest.job.ts`
- Create: `apps/api/src/modules/notifications/emails/digest-email.ts`
- Modify: `apps/api/src/app.ts` (adicionar o job em `fastifyCron.jobs`)
- Test: `apps/api/src/modules/notifications/__tests__/digest.job.test.ts`

**Interfaces:**
- Consumes: modelo `Notification` (Task 1), `getResend`/`getEmailFrom` (`shared/email.ts`).
- Produces: `createNotificationDigestJob(app: FastifyInstance)` → `{ cronTime: '0 8 * * *', timeZone: 'America/Sao_Paulo', onTick }`, mesmo formato e mesmo advisory lock de `expiry.job.ts` (lock id `1_234_567_891`). `digestEmailText(input: { name: string; items: { title: string; body: string; count: number }[]; baseUrl: string }): string` e `digestSubject(n: number): string` → `` `Você tem ${n} novidade(s) na CAPI` ``.

- [ ] **Step 1: Testes (falhando):**
  - Busca `notification.findMany({ where: { readAt: null, digestedAt: null, user: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'PLATFORM_ADMIN'] } } }, select: {..., user: { select: { id, name, email } } } })`.
  - Agrupa por usuário: duas notificações de `u1` e uma de `u2` → `resend.emails.send` chamado 2 vezes, `to: ['u1@x.com']`, `subject: 'Você tem 2 novidade(s) na CAPI'`.
  - Depois de enviar para um usuário, `updateMany({ where: { id: { in: [ids daquele usuário] } }, data: { digestedAt: expect.any(Date) } })`.
  - Falha no envio para `u1` → não marca `digestedAt` de `u1`, mas continua e marca `u2`.
  - Sem `RESEND_API_KEY` (`getResend()` → null) → não marca nada (para tentar de novo amanhã).
  - Lock não obtido → não busca nada.
  - `digestEmailText` contém `'Olá, Ana'`, cada `title — body` (com ` (3x)` quando `count > 1`) e `` `${baseUrl}/pendencias` ``.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.** `baseUrl` vem de `process.env.WEB_URL ?? 'http://localhost:3000'` (conferir em `shared/env.ts` se já existe variável de URL do site usada nos e-mails e reutilizá-la). Conferir na doc do `fastify-cron` instalado se o campo de fuso é `timeZone`.
- [ ] **Step 4: Rodar e ver passar** + `npx tsc --noEmit`.
- [ ] **Step 5: Deixar pronto para o usuário commitar.**

---

### Task 6: Web — barra do usuário logado, sininho e Pendências

**Files:**
- Modify: `apps/web/app/api/proxy/route.ts` (permitir `/notifications`)
- Create: `apps/web/src/components/layout/UserBar.tsx` (client)
- Create: `apps/web/src/components/layout/NotificationBell.tsx` (client)
- Create: `apps/web/lib/notifications-client.ts`
- Modify: `apps/web/app/providers.tsx` ou `apps/web/app/layout.tsx` (renderizar `<UserBar />` acima de `children`)
- Modify: `apps/web/app/page.tsx` (nav fixa da home respeita a barra)
- Create: `apps/web/app/pendencias/page.tsx`
- Modify: `apps/web/middleware.ts` (`/pendencias` exige login)

**Interfaces:**
- Consumes: rotas da Task 2 via `/api/proxy?path=/notifications...`.
- Produces: `lib/notifications-client.ts` com `fetchSummary(): Promise<{ unread: number; pending: number }>`, `fetchNotifications(cursor?: string): Promise<{ notifications: NotificationDTO[]; nextCursor: string | null }>`, `fetchPending(): Promise<{ notifications: NotificationDTO[] }>`, `markRead(id: string): Promise<void>`, `markAllRead(): Promise<void>`, e o tipo `NotificationDTO` (mesmos campos da Task 2). `UserBar` é o "cabeçalho logado único" que o plano 4 estende com a chave "Modo edição".

- [ ] **Step 1: Ler** `apps/web/node_modules/next/dist/docs/` sobre layouts, client components e middleware antes de escrever.
- [ ] **Step 2: Proxy** — `ALLOWED_PATH` vira `/^\/(tenants\/[^/\s]+\/|notifications(\/|$))/`. O `path` normalizado precisa continuar sem `..` e a query string `?cursor=` precisa ser repassada (hoje o proxy só repassa `pathname`: repassar também `search` do `path` normalizado).
- [ ] **Step 3: `UserBar`** — usa `useSession()`. Sem sessão ou carregando: `return null` e **nenhum** fetch **(Review Focus 5)**. Com sessão: barra de 40 px, fundo `var(--stone-900)`, texto `var(--stone-50)`, normal flow no topo da página; à direita `NotificationBell`, nome do usuário e um menu com "Meu painel" (oculto para `CLIENTE`; destino igual à regra pós-login do plano 1: staff → `/super-admin/operadoras`, `ADMIN` → `/${tenantSlug}/admin/guias`, demais → `/${tenantSlug}/painel/dashboard`), "Pendências" (só `ADMIN`, `SUPER_ADMIN`, `PLATFORM_ADMIN`) e "Sair" (`signOut({ callbackUrl: '/' })`). Ao montar, define `document.documentElement.style.setProperty('--userbar-h', '40px')` e remove ao desmontar. Na home, a `<nav className="fixed top-0 ...">` passa a usar `style={{ top: 'var(--userbar-h, 0px)' }}`.
- [ ] **Step 4: `NotificationBell`** — botão com `aria-label="Notificações"` e selo com `unread` (oculto se 0; `9+` acima de 9) e, se `pending > 0`, um segundo selo de pendências. Polling de `fetchSummary` a cada 60 s e em `visibilitychange` para visível; para quando a aba está oculta. Clique abre um painel (no celular, < 768 px, ocupa a largura toda abaixo da barra) com a lista de `fetchNotifications`, "Carregar mais" quando há `nextCursor` e "Marcar todas como lidas". Item não lido em destaque; `count > 1` mostra `({count})` depois do título; item resolvido mostra "Resolvido por {resolvedByName}". Clicar num item: `markRead(id)` e, se houver `link`, `router.push(link)`. Estados vazios: `CONDUTOR` → `Nenhuma novidade. Complete seu perfil para ser encontrado`; demais → `Nenhuma novidade`. Fecha com Esc e clique fora.
- [ ] **Step 5: `/pendencias`** — server component que exige sessão (redireciona para `/login?callbackUrl=/pendencias` sem sessão) e renderiza um client component que chama `fetchPending()`. Cada item: título, corpo, data e botão "Abrir" (vai para `link`; se o `link` for `/pendencias`, não mostra o botão — a ação direta chega no plano 3). Estado vazio: `Nenhuma pendência`. No `middleware.ts`, adicionar `/pendencias` ao `matcher` e à regra "precisa de token".
- [ ] **Step 6: Verificar** — `npx tsc --noEmit` em `apps/web` sem erros; `npx next lint` (se configurado) sem erros novos nos arquivos criados.
- [ ] **Step 7: Verificação manual (para o usuário, com banco e API rodando):** deslogado, a home não mostra barra nem faz chamadas a `/api/proxy?path=/notifications` (aba Network); logado como guia, criar uma reserva de teste no roteiro dele e ver o sininho com 1 em até 60 s; clicar leva a `/{slug}/painel/reservas` e zera o contador.
- [ ] **Step 8: Deixar pronto para o usuário commitar.**
