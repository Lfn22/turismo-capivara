# Aprovação de roteiros — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guias (CONDUTOR) passam a precisar de aprovação da equipe da plataforma para colocar roteiro no ar, alterar nome/descrição/valores, despublicar e arquivar; a equipe aprova/recusa numa fila no super-admin.

**Architecture:** Nova tabela `PackageChangeRequest` e um módulo `package-requests` (serviço + rotas). As rotas de escrita de roteiro em `crud.route.ts` (únicas que escrevem `TourPackage` — auditado) desviam para o serviço quando o usuário é CONDUTOR. Aprovar aplica o pedido no roteiro reutilizando a lógica atual (publish / unpublish / archive). Web: selos e "Cancelar pedido" em Meus roteiros, aviso nos editores, fila no super-admin.

**Tech Stack:** Fastify 5 + Prisma 7 + Zod + Vitest (apps/api); Next.js 16.2 + React 19 + Vitest (apps/web); `corepack pnpm`.

**Spec:** `docs/superpowers/specs/2026-11-27-aprovacao-roteiros-design.md`

## Global Constraints

- Só **CONDUTOR** passa por aprovação. ADMIN e platform staff (`isPlatformStaff`) mantêm o comportamento atual.
- Quem decide: **SUPER_ADMIN** (`authorize(['SUPER_ADMIN'])`, mesmo padrão de `destinations/routes/admin.route.ts`).
- Campos importantes: `name`, `description`, `price`, `extraGuidePrice`. Livres: tudo o mais (fotos, destaques, duração, dificuldade, horários).
- Tipos: `PUBLISH | UPDATE | UNPUBLISH | ARCHIVE`. Status: `PENDING | APPROVED | REJECTED | CANCELLED`.
- `changes` (só UPDATE): `{ [campo]: { from, to } }`; `to: null` em `extraGuidePrice` = remover acréscimo.
- No máximo **um PENDING por roteiro**. UPDATE sobre UPDATE pendente → merge (mantém o `from` original de cada campo; atualiza `to`; campo cujo `to` volta a igualar o valor atual sai do `changes`; `changes` vazio → pedido vira CANCELLED). Qualquer outra combinação → 409 `"Já existe um pedido pendente para este roteiro. Cancele-o para fazer outro."`
- Recusa exige motivo de 5 a 500 caracteres.
- Mensagens em português. Arquivar/despublicar aprovados usam `cancelFutureSlots` (cancela + estorna) como hoje.
- Respostas ao guia quando um pedido é criado: `202 { requestId, type, status: 'PENDING', message: 'Enviado para aprovação da equipe' }` — exceto PUT (ver Task 3).
- **Commits:** o usuário faz todos. Passo "Commit" = listar arquivos alterados e sugerir mensagem; nunca rodar `git commit`.
- Web tests: de `apps/web`, `NODE_OPTIONS=--max-old-space-size=4096 corepack pnpm exec vitest run --maxWorkers=2`.

## Review Focus

1. **Guia contornando a aprovação** por PUT/PATCH/publish/unpublish/restore/DELETE em roteiro publicado → nenhuma escrita em campo importante, `publishedAt` ou `active`. Teste-guarda na Task 3.
2. **Aprovação de pedido já decidido ou cancelado** (dois cliques / duas abas) → 409, roteiro não muda duas vezes. Teste na Task 2.
3. **Roteiro publicado com alteração pendente continua visível ao turista com os valores antigos** → público/busca não leem `changes`. Teste na Task 3 (GET público após PUT do guia).
4. **Estorno falha na aprovação de ARCHIVE/UNPUBLISH** → pedido continua PENDING e roteiro não muda (mesma ordem "dinheiro primeiro" do DELETE atual). Teste na Task 2.
5. **Guia restaura roteiro arquivado que estava publicado** → volta como rascunho (`publishedAt = null`), não reaparece no catálogo. Teste na Task 3.

---

### Task 1: Schema e migração

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20261127100000_package_change_requests/migration.sql`

**Interfaces:**

- Produces: `model PackageChangeRequest { id String @id @default(cuid()); packageId String; requestedById String; type PackageRequestType; changes Json?; status PackageRequestStatus @default(PENDING); decidedById String?; decidedAt DateTime?; rejectionReason String?; createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; package TourPackage @relation(...); requestedBy User @relation("PackageRequestRequester", ...); decidedBy User? @relation("PackageRequestDecider", ...); @@index([status, createdAt]); @@index([packageId, status]) }`, enums `PackageRequestType { PUBLISH UPDATE UNPUBLISH ARCHIVE }`, `PackageRequestStatus { PENDING APPROVED REJECTED CANCELLED }`, back-relations em `TourPackage` (`changeRequests`) e `User`.

- [ ] **Step 1:** Editar schema; escrever `migration.sql` à mão no estilo das migrations existentes (CREATE TYPE ×2, CREATE TABLE, índices, FKs com `ON DELETE CASCADE` para package e `RESTRICT`/`SET NULL` coerentes para users).
- [ ] **Step 2:** `corepack pnpm --filter @turismo/api exec prisma generate` e `corepack pnpm --filter @turismo/api typecheck` → limpos.
- [ ] **Step 3: Commit** (usuário) — `feat(api): tabela de pedidos de aprovação de roteiro`.

---

### Task 2: Serviço de pedidos + rotas da equipe

**Files:**

- Create: `apps/api/src/modules/package-requests/package-requests.service.ts`
- Create: `apps/api/src/modules/package-requests/package-requests.routes.ts`
- Create: `apps/api/src/modules/package-requests/__tests__/package-requests.service.test.ts`
- Create: `apps/api/src/modules/package-requests/__tests__/package-requests.routes.test.ts`
- Modify: `apps/api/src/app.ts` (registrar `packageRequestsRoutes`)

**Interfaces:**

- Produces (service):
  - `export const IMPORTANT_FIELDS = ['name', 'description', 'price', 'extraGuidePrice'] as const`
  - `export function diffImportant(current: Pick<TourPackage, ImportantField>, incoming: Partial<Record<ImportantField, unknown>>): Record<ImportantField, { from: unknown; to: unknown }>` — só campos presentes em `incoming` e diferentes do atual (compare `price`/`extraGuidePrice` como número; Decimal → `Number`).
  - `export async function submitRequest(input: { packageId: string; requestedById: string; type: PackageRequestType; changes?: Record<string, { from: unknown; to: unknown }> }): Promise<PackageChangeRequest | null>` — em `prisma.$transaction`: busca PENDING do roteiro; aplica a regra de merge/409 dos Global Constraints; retorna `null` quando um merge esvazia o pedido (que vira CANCELLED). Ao criar, `notify({ userIds: await platformStaffIds(), type: 'package_request', title, body, link: '/super-admin/roteiros?pedidos=1', actionKey: 'package-request:<id>' })`.
  - `export async function cancelRequest(packageId: string, userId: string): Promise<void>` — PENDING do roteiro feito por `userId` → CANCELLED + `resolveAction`; 404 se não houver.
  - `export async function approveRequest(id: string, staffId: string, log: FastifyBaseLogger): Promise<PackageChangeRequest>` — 404 se não existe; 409 `"Este pedido já foi decidido."` se não PENDING. Efeito por tipo: PUBLISH → `publishedAt = now`; UPDATE → aplica `to` de cada campo; UNPUBLISH → `cancelFutureSlots({ packageId }, log)` depois `publishedAt = null`; ARCHIVE → `cancelFutureSlots` depois `active = false`. Para UNPUBLISH/ARCHIVE o estorno roda **antes** de marcar o pedido; se lançar, nada é gravado. A marcação `APPROVED` usa `updateMany({ where: { id, status: 'PENDING' } })` e, se `count === 0`, lança 409 (corrida). Depois: `resolveAction('package-request:<id>', nome)` e `notify` ao `requestedById` ("Seu pedido para o roteiro X foi aprovado", link `/<tenantSlug>/painel/roteiros`).
  - `export async function rejectRequest(id: string, staffId: string, reason: string): Promise<PackageChangeRequest>` — mesmas guardas 404/409; grava REJECTED + motivo; `resolveAction`; `notify` ao guia ("... foi recusado: <motivo>").
  - `export async function latestRequestsByPackage(packageIds: string[]): Promise<Map<string, { id: string; type: PackageRequestType; status: PackageRequestStatus; rejectionReason: string | null; changes: unknown }>>` — por roteiro, o PENDING se houver, senão o último REJECTED **mais novo que** qualquer APPROVED/CANCELLED (para o selo "Recusado").
- Produces (routes, todos `authorize(['SUPER_ADMIN'])` exceto o último):
  - `GET /admin/package-requests?status=PENDING` → `{ requests: [{ id, type, status, createdAt, changes, package: { id, name, description, price: number, extraGuidePrice: number|null, tenantSlug, destinationTitle|null }, requestedBy: { id, name } }] }`, mais antigos primeiro. Zod no query (`status` opcional, default PENDING).
  - `POST /admin/package-requests/:id/approve` → 200 `{ id, status: 'APPROVED' }`.
  - `POST /admin/package-requests/:id/reject` body `{ reason }` (5–500) → 200 `{ id, status: 'REJECTED' }`.
  - `DELETE /tenants/:slug/packages/:id/request` (`authorize(['CONDUTOR'])`, roteiro do próprio guia via `canEditPackage`) → 204.

- [ ] **Step 1: Testes que falham** (service, Prisma mockado no padrão do repo):
  - `diffImportant`: `{name:'A', price:'600.00'}` vs `{name:'A', price:600}` → `{}`; vs `{price:700, extraGuidePrice:null}` com atual `extraGuidePrice:'400.00'` → `{ price:{from:600,to:700}, extraGuidePrice:{from:400,to:null} }`.
  - `submitRequest` UPDATE sem pendente → cria + `notify` com `actionKey` `package-request:<id>`.
  - UPDATE sobre UPDATE pendente `{price:{from:600,to:700}}` + novo `{price:{from:600,to:650}, name:{from:'A',to:'B'}}` → `{price:{from:600,to:650}, name:{from:'A',to:'B'}}` (mesmo id).
  - Merge que devolve tudo ao atual → pedido CANCELLED, retorna `null`.
  - ARCHIVE com UPDATE pendente → 409 com a mensagem exata.
  - `approveRequest` UPDATE → `tourPackage.update` com `{ price: 700 }`; PUBLISH → `publishedAt` Date; ARCHIVE → `cancelFutureSlots` chamado antes de `active:false`; ARCHIVE com `cancelFutureSlots` rejeitando → nenhum `update` de pedido/roteiro.
  - `approveRequest` em pedido APPROVED → 409 `"Este pedido já foi decidido."`; `updateMany` retornando `count: 0` → 409.
  - `rejectRequest` grava motivo e notifica o guia.
- [ ] **Step 2: Testes de rota:** GET exige SUPER_ADMIN (CONDUTOR → 403); reject com `reason: 'abc'` → 400 com mensagem PT; GET serializa `price` como número.
- [ ] **Step 3:** Rodar → FAIL. **Step 4:** Implementar. **Step 5:** Rodar → PASS; suíte API + typecheck.
- [ ] **Step 6: Commit** (usuário) — `feat(api): pedidos de aprovação de roteiro (serviço e rotas da equipe)`.

---

### Task 3: Rotas de roteiro desviam o guia para pedidos

**Files:**

- Modify: `apps/api/src/modules/packages/routes/crud.route.ts` (PUT ~l.194, DELETE ~l.222, publish ~l.276, unpublish ~l.300, restore ~l.321, manage list ~l.84)
- Test: `apps/api/src/modules/packages/packages.edit.routes.test.ts` (ou novo `__tests__/crud.approval.test.ts` no mesmo padrão)

**Interfaces:**

- Consumes: `submitRequest`, `diffImportant`, `IMPORTANT_FIELDS`, `latestRequestsByPackage` (Task 2).
- Produces:
  - `GET /tenants/:slug/manage/packages` acrescenta a cada roteiro `request: { id, type, status, rejectionReason, changes } | null` (de `latestRequestsByPackage`).
  - PUT para CONDUTOR em roteiro **publicado e ativo**: aplica direto só campos não importantes; `diffImportant` dos importantes → se não vazio, `submitRequest(UPDATE)`. Resposta `200 { ...roteiroAtual, pendingRequest: { id, type, changes } | null }`. Rascunho ou arquivado: comportamento atual (`pendingRequest: null`).
  - publish (CONDUTOR, não publicado): mantém o 403 de `isUnverifiedGuide`; depois `submitRequest(PUBLISH)` → 202.
  - unpublish (CONDUTOR, publicado): `submitRequest(UNPUBLISH)` → 202, sem `cancelFutureSlots`. Não publicado: comportamento atual.
  - DELETE (CONDUTOR, publicado e ativo): `submitRequest(ARCHIVE)` → 202. Rascunho: comportamento atual (arquiva direto).
  - restore (CONDUTOR, arquivado): `active = true` **e** `publishedAt = null`; resposta `{ id, active: true, publishedAt: null }`.
  - ADMIN e staff: inalterado em todas as rotas.

- [ ] **Step 1: Testes que falham:**
  - Guia, roteiro publicado: PUT `{ name:'Novo', duration: 5 }` → `tourPackage.update` chamado só com `{ duration: 5 }`; `submitRequest` chamado com `type:'UPDATE'`, `changes.name = {from:'Antigo', to:'Novo'}`; resposta 200 com `pendingRequest.id`.
  - Guia, PUT só com valores iguais aos atuais → nenhum pedido, `pendingRequest: null`.
  - Guia, rascunho: PUT `{ price: 700 }` → `update` com `price: 700`, sem pedido.
  - Guia: publish → 202 e `publishedAt` não escrito; guia não verificado → 403.
  - Guia: unpublish/DELETE em publicado → 202, `cancelFutureSlots` **não** chamado, `active`/`publishedAt` não escritos.
  - Guia: DELETE em rascunho → arquiva direto (comportamento atual).
  - Guia: restore de arquivado publicado → `update` com `{ active: true, publishedAt: null }`.
  - ADMIN: PUT `{ name }` em publicado → aplica direto, sem pedido; publish → publica direto.
  - **Guarda (Review Focus 1):** para cada rota (PUT, PATCH, publish, unpublish, restore, DELETE) chamada por CONDUTOR num roteiro publicado e ativo, nenhuma chamada a `tourPackage.update` contém `name`, `description`, `price`, `extraGuidePrice`, `publishedAt` ou `active` (exceto restore, que só se aplica a arquivado).
  - **Review Focus 3:** após PUT do guia com `price: 700`, o GET público do roteiro continua devolvendo o `price` antigo (o mock do roteiro não foi alterado).
  - manage list inclui `request` do mapa mockado.
- [ ] **Step 2:** Rodar → FAIL. **Step 3:** Implementar. **Step 4:** Rodar → PASS; suíte API + typecheck.
- [ ] **Step 5: Commit** (usuário) — `feat(api): alterações de guia em roteiros publicados passam por aprovação`.

---

### Task 4: Web — Meus roteiros e editores

**Files:**

- Modify: `apps/web/app/[slug]/(painel)/painel/roteiros/page.tsx`
- Create: `apps/web/src/components/painel/PackageRequestBadge.tsx` (client: selo + botão "Cancelar pedido")
- Modify: `apps/web/src/components/edit-mode/PackageEditor.tsx` e `apps/web/app/api/edit/packages/route.ts` (repassar status 202 e `pendingRequest`)
- Modify: `apps/web/app/[slug]/(painel)/painel/roteiros/[id]/page.tsx` se lá houver edição de campos importantes ou publicar
- Test: `apps/web/src/components/painel/__tests__/PackageRequestBadge.test.tsx`, teste do PackageEditor existente em `apps/web/src/components/edit-mode/__tests__/`

**Interfaces:**

- Consumes: `request` na manage list; respostas 202 `{ requestId, type, message }`; PUT `pendingRequest`; `DELETE /tenants/:slug/packages/:id/request`.

Copy (exata):

- Selos: PUBLISH pendente "Aguardando aprovação"; UPDATE "Alteração pendente"; UNPUBLISH "Despublicação pendente"; ARCHIVE "Arquivamento pendente"; REJECTED "Recusado — {motivo}".
- Botão: "Cancelar pedido" (confirma com `window.confirm('Cancelar este pedido?')`).
- Para guia, o botão "Publicar" do editor vira "Enviar para aprovação".
- Aviso no editor (guia, roteiro publicado), acima dos campos de nome/valor: "Alterações em nome, descrição e valores passam pela aprovação da equipe. O roteiro continua no ar com a versão atual até lá."
- Após salvar com `pendingRequest` ou receber 202: mensagem "Enviado para aprovação da equipe".

- [ ] **Step 1: Testes que falham:** `PackageRequestBadge` com `{type:'UPDATE',status:'PENDING'}` mostra "Alteração pendente" e "Cancelar pedido"; clicar (confirm mockado true) chama `DELETE` em `/api/proxy?path=/tenants/<slug>/packages/<id>/request`; com `{status:'REJECTED', rejectionReason:'Fotos ruins'}` mostra "Recusado — Fotos ruins" sem botão. PackageEditor como guia com roteiro publicado mostra o aviso e, ao salvar com resposta contendo `pendingRequest`, mostra "Enviado para aprovação da equipe"; o botão de publicar mostra "Enviar para aprovação".
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS; suíte web + typecheck.
- [ ] **Step 5: Commit** (usuário) — `feat(web): guia vê e cancela pedidos de aprovação de roteiro`.

---

### Task 5: Web — fila de pedidos no super-admin

**Files:**

- Create: `apps/web/app/super-admin/roteiros/PedidosClient.tsx`
- Modify: `apps/web/app/super-admin/roteiros/page.tsx` (com `?pedidos=1` ou aba "Pedidos pendentes" ao lado da lista atual)
- Test: `apps/web/app/super-admin/roteiros/__tests__/PedidosClient.test.tsx`

**Interfaces:**

- Consumes: `GET /admin/package-requests`, `POST /admin/package-requests/:id/approve`, `POST /admin/package-requests/:id/reject`.

Comportamento/copy:

- Lista: tipo (rótulos iguais aos selos da Task 4, sem "pendente": "Entrada no ar", "Alteração", "Despublicação", "Arquivamento"), roteiro (link para a página pública `/{tenantSlug}/roteiros/{id}`), guia, destino, data.
- UPDATE: tabela "Campo · Antes · Depois" (rótulos "Nome", "Descrição", "Valor do grupo", "Acréscimo por guia extra"; valores em R$ pt-BR; `null` → "sem acréscimo"). Se o valor atual do roteiro ≠ `from`, mostrar "Atual: …" em destaque.
- ARCHIVE/UNPUBLISH: aviso "Ao aprovar, as reservas futuras serão canceladas e estornadas."
- Botões "Aprovar" e "Recusar"; recusar abre campo "Motivo" obrigatório (5–500) e "Confirmar recusa". Após decidir, o item sai da lista.
- Vazio: "Nenhum pedido pendente."

- [ ] **Step 1: Testes que falham:** renderiza um UPDATE com "Valor do grupo · R$ 600,00 · R$ 700,00"; destaque "Atual:" quando `package.price ≠ from`; Aprovar chama o POST correto e remove o item; Recusar sem motivo não envia, com "Fotos ruins" envia `{ reason: 'Fotos ruins' }`; lista vazia mostra "Nenhum pedido pendente."
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS; suíte web + typecheck.
- [ ] **Step 5: Commit** (usuário) — `feat(web): fila de aprovação de roteiros no super-admin`.

---

### Task 6: Verificação

- [ ] **Step 1:** Suítes completas API e web + typechecks → verdes.
- [ ] **Step 2:** Banco local (`turismo_dev` em 127.0.0.1 — confirmar antes): `prisma migrate deploy`. Subir API e web; como guia de seed: alterar o valor de um roteiro publicado → selo "Alteração pendente" e página pública ainda com o valor antigo; como super-admin (seed): aprovar → valor novo na página pública e notificação ao guia; pedir arquivamento e recusar com motivo → selo "Recusado — motivo". Parar os servidores.
- [ ] **Step 3:** Relatar ao usuário.
