# Plano 1 — Papéis da plataforma e login sem agência — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o papel de admin da plataforma (mesmo poder do superadmin, exceto gerir admins), remover `ATENDENTE`, permitir login só com e-mail + senha e dar ao superadmin uma tela para adicionar/remover admins.

**Architecture:** `ADMIN` continua significando **dono de agência/associação**; entra o papel novo `PLATFORM_ADMIN`. Um helper `isPlatformStaff()` concentra a regra "superadmin ou admin da plataforma", e `authorize()` passa a aceitar `PLATFORM_ADMIN` em toda rota que aceita `SUPER_ADMIN` — exceto as rotas protegidas por `requireSuperAdmin`, que são só do superadmin. E-mail vira único na plataforma inteira, o que permite login sem informar a agência.

**Tech Stack:** Fastify 5, Prisma 7 (PostgreSQL), Zod v4, Vitest (prisma mockado via `vi.mock`), Next.js 16.2 + next-auth (credentials).

**Spec:** `docs/superpowers/specs/2026-10-28-hierarquia-edicao-guias-notificacoes-design.md` (seções 1 e "Encontrar o modo edição" → login; "Cadastro de guia" → "Login precisa funcionar sem agência").

Este é o plano 1 de 4. Os próximos (escritos depois deste ser executado): **2 — Notificações**, **3 — Cadastro de guia + entrar/sair**, **4 — Modo edição**.

## Global Constraints

- **Nunca commitar.** O usuário faz todos os commits manualmente. Onde o fluxo pede commit, pare e informe os arquivos alterados.
- Validação Zod em toda rota nova; erros Zod no formato `{ message: 'Dados inválidos', errors: [{ field, message }] }` (usar `err.issues`).
- Mensagens de erro em português.
- Testes de rota usam `buildApp()` de `apps/api/src/__tests__/helpers/build-app.ts` e prisma mockado com `vi.mock('../../database', ...)` (padrão de `destinations.authz.test.ts`).
- Next.js 16.2 tem breaking changes: antes de escrever código web, ler o guia relevante em `apps/web/node_modules/next/dist/docs/` (regra de `apps/web/AGENTS.md`). `params` em route handlers é `Promise`.
- Só existem dados mock — migração destrutiva de enum/unique é aceitável; o seed é a fonte de verdade.
- Preservar os comentários e checagens A-1/A-2 em `destinations.routes.ts`.

## Review Focus

1. **Admin da plataforma chamando rota de gerir admins** → 403. Coberto em Task 1 (`requireSuperAdmin`) e Task 4.
2. **Superadmin tentando remover a si mesmo ou outro superadmin via `DELETE /platform-admins/:id`** → 404 (a rota só apaga usuários com role `PLATFORM_ADMIN`). Teste em Task 4.
3. **Admin da plataforma acessando rota com `:slug` de qualquer agência** → passa no guard cross-tenant de `authenticate()` como o superadmin. Teste em Task 1.
4. **E-mail com maiúsculas no login e no cadastro de admin** → normalizado com `toLowerCase()`; e-mail já usado → 409 "E-mail já cadastrado". Testes em Task 3 e Task 4.
5. **Login web com `callbackUrl` externo** (`https://evil.com`) → ignorado, só caminhos relativos começando com `/` (e não `//`) são aceitos. Verificação manual em Task 5.

---

### Task 1: Regra "equipe da plataforma" na autorização

**Files:**
- Create: `apps/api/src/shared/auth/roles.ts`
- Modify: `apps/api/src/shared/middlewares/authorize.ts`
- Modify: `apps/api/src/shared/middlewares/authenticate.ts:26`
- Modify: `apps/api/src/modules/destinations/destinations.routes.ts:323`
- Modify: `apps/api/src/modules/destinations/destinations.service.ts:72`
- Test: `apps/api/src/shared/middlewares/authorize.test.ts`
- Test: `apps/api/src/modules/destinations/destinations.authz.test.ts` (acrescentar casos)

**Ordem de execução: Task 2 antes da Task 1** — a Task 1 precisa do valor `PLATFORM_ADMIN` no enum gerado pelo Prisma. Demais tasks seguem a numeração (2 → 1 → 3 → 4 → 5 → 6).

**Interfaces:**
- Produces:
  - `isPlatformStaff(role: string): boolean` — `true` para `'SUPER_ADMIN'` e `'PLATFORM_ADMIN'`.
  - `authorize(roles: Role[])` — comportamento atual + se `roles` inclui `'SUPER_ADMIN'` e o usuário é `'PLATFORM_ADMIN'`, permite.
  - `requireSuperAdmin(request, reply)` — preHandler exportado de `authorize.ts`; 401 sem usuário, 403 `{ message: 'Acesso negado' }` se role ≠ `'SUPER_ADMIN'`.

- [ ] **Step 1: Escrever testes que falham** em `authorize.test.ts`, montando um app com `buildApp` e rotas de teste `GET /t/staff` (`preHandler: [authenticate, authorize(['SUPER_ADMIN'])]`) e `GET /t/super` (`preHandler: [authenticate, requireSuperAdmin]`):
  - `PLATFORM_ADMIN` em `/t/staff` → 200
  - `ADMIN` em `/t/staff` → 403
  - `PLATFORM_ADMIN` em `/t/super` → 403
  - `SUPER_ADMIN` em `/t/super` → 200
  - `isPlatformStaff('PLATFORM_ADMIN') === true`, `isPlatformStaff('ADMIN') === false`
- [ ] **Step 2: Acrescentar em `destinations.authz.test.ts`:**
  - `PLATFORM_ADMIN` com `tenantId` de outra agência faz `PATCH /destinations/:destinationSlug` → não 403 (mesmo resultado do caso `SUPER_ADMIN` já existente).
  - `PLATFORM_ADMIN` em `PATCH /destinations/:id/approve` → chama `approveDestination`.
  - `PLATFORM_ADMIN` em rota com `:slug` de outra agência (ex.: `GET /tenants/operadora-b/destinations`… usar a rota com `slug` já coberta no arquivo) → não 403 "Acesso negado a este tenant".
- [ ] **Step 3: Rodar** `pnpm --filter api test -- authorize destinations.authz` → FAIL.
- [ ] **Step 4: Implementar** `roles.ts`, a regra nova em `authorize`, `requireSuperAdmin`, e trocar `role !== 'SUPER_ADMIN'` por `!isPlatformStaff(role)` em `authenticate.ts:26` e `destinations.routes.ts:323`, e `userRole === 'SUPER_ADMIN'` por `isPlatformStaff(userRole)` em `destinations.service.ts:72`. Atualizar o comentário de `destinations.routes.ts:297` para "SUPER_ADMIN/PLATFORM_ADMIN, qualquer um".
- [ ] **Step 5: Rodar** `pnpm --filter api test` → PASS (suíte inteira).
- [ ] **Step 6: Parar para o usuário commitar** (listar arquivos).

---

### Task 2: Schema — `PLATFORM_ADMIN`, fim do `ATENDENTE`, e-mail único

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (enum `Role` linhas 188-194; `model User` linha 73 `@@unique([tenantId, email])`)
- Create: `apps/api/prisma/migrations/20261028000001_platform_admin_roles/migration.sql` (gerada)
- Modify: `apps/api/src/modules/bookings/bookings.routes.ts:673,741,794`
- Modify: `apps/api/src/modules/dashboard/dashboard.routes.ts:15`
- Modify: `apps/api/src/modules/destinations/destinations.routes.ts:380-385,411-414`
- Modify: `apps/api/src/__tests__/bookings-b1.test.ts:53` (comentário)
- Modify: `apps/api/prisma/seed.ts` (bloco "CAPI Platform", ~linha 375-412)

**Interfaces:**
- Produces: enum `Role { ADMIN, CONDUTOR, CLIENTE, SUPER_ADMIN, PLATFORM_ADMIN }`; `User.email String @unique` (remove `@@unique([tenantId, email])`); tenant da plataforma com slug `'capi-platform'` (já existe no seed) — Task 4 usa esse slug.

- [ ] **Step 1: Editar o schema** (enum e unique acima).
- [ ] **Step 2: Gerar migração** — `pnpm --filter api exec prisma migrate dev --name platform_admin_roles` (precisa do PostgreSQL local do `.env`). Renomear a pasta para `20261028000001_platform_admin_roles` se o prefixo gerado for diferente. Expected: migração aplicada, client regenerado.
- [ ] **Step 3: Remover `ATENDENTE`** dos `authorize([...])` listados (linha 794 de bookings fica `authorize(['ADMIN'])`) e dos comentários em `destinations.routes.ts` ("ADMIN/CONDUTOR").
- [ ] **Step 4: Seed** — após o superadmin, criar `PLATFORM_ADMIN` no tenant `capi-platform`: nome `'Admin da Plataforma'`, e-mail `process.env.PLATFORM_ADMIN_EMAIL ?? 'admin@capi.turismo'`, senha `process.env.PLATFORM_ADMIN_PASSWORD ?? 'admin123'`, `approvalStatus: 'APPROVED'`; acrescentar a linha correspondente no `console.log` final.
- [ ] **Step 5: Verificar** — `pnpm --filter api exec tsc --noEmit` → sem erros; `pnpm --filter api test` → PASS; `pnpm --filter api seed` → conclui sem erro de unique.
- [ ] **Step 6: Parar para o usuário commitar.**

---

### Task 3: Login só com e-mail e senha

**Files:**
- Modify: `apps/api/src/modules/auth/auth.routes.ts:13-17,40-90`
- Test: `apps/api/src/modules/auth/auth.login.test.ts`

**Interfaces:**
- Produces: `POST /auth/login` body `{ email, password }` (campo `tenantSlug` aceito e ignorado — Zod descarta chaves extras, então clientes antigos e o `/[slug]/login` continuam funcionando). Resposta inalterada `{ token }` com claims `sub, tenantId, role, name, approvalStatus`.

- [ ] **Step 1: Testes que falham** (prisma mockado: `user.findUnique`):
  - `POST /auth/login` com `{ email: 'Ana@X.com', password: 'senha123' }` e usuário existente → 200 com `token`; `findUnique` chamado com `{ where: { email: 'ana@x.com' }, ... }`.
  - mesmo body + `tenantSlug: 'qualquer'` → 200 (ignorado).
  - senha errada → 401 `{ message: 'Credenciais inválidas' }`.
  - e-mail inexistente → 401 `{ message: 'Credenciais inválidas' }`.
- [ ] **Step 2: Rodar** `pnpm --filter api test -- auth.login` → FAIL.
- [ ] **Step 3: Implementar** — remover `tenantSlug` do `loginBodySchema` e a busca de tenant; buscar com `prisma.user.findUnique({ where: { email: email.toLowerCase() }, select: { ...igual ao atual } })`.
- [ ] **Step 4: Rodar** `pnpm --filter api test` → PASS (inclui `rate-limit.test.ts`).
- [ ] **Step 5: Parar para o usuário commitar.**

---

### Task 4: API de gestão de admins (só superadmin)

**Files:**
- Create: `apps/api/src/modules/platform-admins/platform-admins.routes.ts`
- Modify: `apps/api/src/app.ts:107` (registrar depois de `dashboardRoutes`)
- Test: `apps/api/src/modules/platform-admins/platform-admins.routes.test.ts`

**Interfaces:**
- Consumes: `requireSuperAdmin` (Task 1), slug `'capi-platform'` (Task 2).
- Produces (todas com `preHandler: [authenticate, requireSuperAdmin]`):
  - `GET /platform-admins` → 200 `{ admins: Array<{ id, name, email, createdAt }> }` (role `PLATFORM_ADMIN`, ordem `createdAt asc`).
  - `POST /platform-admins` body `{ name: string min 1, email: email, password: string min 8 }` → 201 `{ id, name, email, createdAt }`. Cria `User` no tenant `capi-platform` com `role: 'PLATFORM_ADMIN'`, `approvalStatus: 'APPROVED'`, senha `hashSync(password, 10)`, e-mail em minúsculas. P2002 → 409 `'E-mail já cadastrado'`. Tenant ausente → `AppError('Tenant da plataforma não encontrado', 500)`.
  - `DELETE /platform-admins/:id` → 204. Só apaga se o usuário existe **e** tem role `PLATFORM_ADMIN`; senão 404 `'Admin não encontrado'`.

- [ ] **Step 1: Testes que falham:**
  - `PLATFORM_ADMIN` em cada uma das 3 rotas → 403.
  - `SUPER_ADMIN` `GET` → 200 e `findMany` filtrado por `role: 'PLATFORM_ADMIN'`.
  - `POST` com e-mail `'Novo@Capi.com'` → 201, `user.create` recebe `email: 'novo@capi.com'`, `role: 'PLATFORM_ADMIN'`, senha diferente da enviada (hash).
  - `POST` com senha de 7 caracteres → 400 com `errors[0].field === 'password'`.
  - `POST` quando `user.create` lança P2002 → 409 `'E-mail já cadastrado'`.
  - `DELETE` de id cujo usuário é `SUPER_ADMIN` → 404 e `user.delete` não chamado.
  - `DELETE` de `PLATFORM_ADMIN` → 204 e `user.delete` chamado com o id.
- [ ] **Step 2: Rodar** `pnpm --filter api test -- platform-admins` → FAIL.
- [ ] **Step 3: Implementar** a rota e registrar em `app.ts`.
- [ ] **Step 4: Rodar** `pnpm --filter api test` → PASS.
- [ ] **Step 5: Parar para o usuário commitar.**

---

### Task 5: Web — papéis, guards e login de uma etapa

**Files:**
- Create: `apps/web/lib/roles.ts`
- Modify: `apps/web/middleware.ts:29,46`
- Modify: `apps/web/app/[slug]/(painel)/layout.tsx:23`
- Modify: `apps/web/app/super-admin/layout.tsx:15`
- Modify: `apps/web/app/api/admin/destinations/route.ts:11`, `.../pending/route.ts:11`, `.../[id]/approve/route.ts:15`, `apps/web/app/api/super-admin/tenants/[id]/link-destination/route.ts:11`
- Modify: `apps/web/app/login/page.tsx` (remover etapa de lookup; redirecionamento)
- Modify: `apps/web/app/[slug]/login/page.tsx:32-38` (redirecionamento)
- Modify: `apps/web/lib/auth.ts` (`tenantSlug` deixa de ser obrigatório no `authorize`)
- Delete: `lookupTenant` de `apps/web/lib/auth-client.ts`, `apps/web/app/api/tenant-lookup/`, `apps/api/src/modules/auth/routes/lookup-tenant.ts` e seu `register` em `auth.routes.ts` (ficam órfãos com o login novo)

**Interfaces:**
- Produces:
  - `isPlatformStaff(role?: string): boolean` em `apps/web/lib/roles.ts` (mesma regra da API).
  - `safeCallbackUrl(raw: string | null): string | null` em `apps/web/lib/roles.ts` — retorna `raw` só se começa com `/` e não com `//`; senão `null`.
  - `GET /auth/me` passa a retornar também `tenantSlug` (busca `tenant.slug` pelo `tenantId` do JWT); `lib/auth.ts` copia `tenantSlug` para o token e para `session.user`.
  - Destino pós-login (`/login` e `/[slug]/login`): `safeCallbackUrl(searchParams.get('callbackUrl'))` se houver; senão `isPlatformStaff(role)` → `/super-admin/operadoras`; `ADMIN` → `/${tenantSlug}/admin/guias`; demais → `/${tenantSlug}/painel/dashboard` (`tenantSlug` vindo da sessão).

- [ ] **Step 1: Ler** `apps/web/node_modules/next/dist/docs/` sobre middleware e route handlers.
- [ ] **Step 2: API** — em `auth.login.test.ts`, teste `GET /auth/me` com token válido e `tenant.findUnique` mockado retornando `{ slug: 'serra-capivara' }` → body contém `tenantSlug: 'serra-capivara'` (falha); implementar; `pnpm --filter api test` → PASS.
- [ ] **Step 3: Web** — criar `lib/roles.ts`; middleware: remover `ATENDENTE` de `PAINEL_ROLES`, `/super-admin` aceita `isPlatformStaff`, e `/super-admin/admins` exige `SUPER_ADMIN` (redirect `/super-admin/operadoras`); mesma regra no `super-admin/layout.tsx` (staff passa); painel layout sem `ATENDENTE`; os 4 proxies usam `isPlatformStaff(jwt.role)` (os de `/api/admin/destinations` hoje aceitam `ADMIN` por engano — a API já recusa; passar a recusar no proxy também).
- [ ] **Step 4: Login** — `/login` vira formulário único e-mail + senha, chamando `signIn('credentials', { email, password, redirect: false })`; remover `tenantName`/`step`; aplicar destino pós-login acima. `/[slug]/login` usa a mesma regra de destino.
- [ ] **Step 5: Remover órfãos** listados em Delete.
- [ ] **Step 6: Verificar** — `pnpm --filter web exec tsc --noEmit` e `pnpm --filter web lint` → sem erros novos; `pnpm --filter api test` → PASS. Manual (API + web rodando, seed aplicado):
  - `admin@capi.turismo / admin123` em `/login` → cai em `/super-admin/operadoras`; abrir `/super-admin/admins` → redireciona para operadoras.
  - `ana@serracapivara.com / senha123` em `/login` → `/serra-capivara/painel/dashboard`.
  - `/login?callbackUrl=/destinos/serra-da-capivara` → volta para o destino; `callbackUrl=//evil.com` → ignorado.
- [ ] **Step 7: Parar para o usuário commitar.**

---

### Task 6: Web — tela "Admins" do superadmin

**Files:**
- Create: `apps/web/app/super-admin/admins/page.tsx`
- Create: `apps/web/app/api/super-admin/platform-admins/route.ts` (GET, POST)
- Create: `apps/web/app/api/super-admin/platform-admins/[id]/route.ts` (DELETE)
- Modify: `apps/web/app/super-admin/SuperAdminNav.tsx`, `apps/web/app/super-admin/layout.tsx` (passar `role` para o nav)

**Interfaces:**
- Consumes: API da Task 4; `isPlatformStaff` (Task 5).
- Produces: proxies no padrão de `link-destination/route.ts` (`getToken`, 401 sem `apiToken`, 403 se `jwt.role !== 'SUPER_ADMIN'`, repassa status e corpo). `SuperAdminNav` recebe `role: string` e só mostra `{ label: 'Admins', href: '/super-admin/admins' }` quando `role === 'SUPER_ADMIN'`; o título do header vira "Painel da Plataforma".

- [ ] **Step 1: Página** — client component no estilo de `super-admin/operadoras/page.tsx`: lista (nome, e-mail, desde), formulário "Adicionar admin" (nome, e-mail, senha ≥ 8) e botão "Remover" com `confirm('Remover {nome} como admin?')`; feedback com `toast` do `sonner` (já usado no layout). Erros da API exibidos com a `message` retornada.
- [ ] **Step 2: Proxies e nav.**
- [ ] **Step 3: Verificar** — `pnpm --filter web exec tsc --noEmit` e `lint` limpos. Manual: como superadmin, adicionar `teste@capi.turismo`, ver na lista, entrar com ele em outra janela (cai em operadoras, sem item "Admins"), remover como superadmin, login dele passa a falhar.
- [ ] **Step 4: Parar para o usuário commitar.**
