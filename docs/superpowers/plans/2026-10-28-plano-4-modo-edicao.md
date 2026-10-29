# Plano 4: Modo edição no site público (plano de implementação)

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: usar superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** Quem tem permissão liga a chave "Modo edição" e edita, cria, arquiva ou publica destinos e roteiros direto na página pública. Cada um só vê os controles do que pode mexer, e as edições publicam na hora.

**Arquitetura:**
- **Permissões na API.** Um módulo único (`edit-permissions.ts`) decide quem edita o quê. Todas as rotas de escrita de destino e roteiro passam a usá-lo, e uma rota `GET /edit/scope` diz ao site o que mostrar.
- **Modo edição no site.** Um `EditModeProvider` no layout raiz guarda a chave no `sessionStorage`. A chave fica na `UserBar`, e uma faixa e a barra do celular aparecem quando ela está ligada.
- **Um editor só.** As páginas públicas montam componentes de edição em folha lateral ou inferior (`EditSheet`). Os painéis reutilizam os mesmos editores.

**Tech Stack:** Fastify 5, Prisma 7, Zod v4; Next.js 16.2 App Router + next-auth, `revalidatePath`, sonner; Vitest com prisma mockado.

**Spec:** `docs/superpowers/specs/2026-10-28-hierarquia-edicao-guias-notificacoes-design.md`. Seções que valem aqui:
- 1, papéis (o guia deixa de editar destino);
- 2, modo edição, opção A;
- 3, rotas;
- Requisitos de UX: "Edição sem quebrar a página", "Encontrar o modo edição", "Celular primeiro", "Rascunho, oculto e pendente" e "Uma regra, um editor";
- anti-objetivos.

## Global Constraints

- Validação Zod em toda rota nova, com 400 no formato `{ message: 'Dados inválidos', errors: [{ field, message }] }`. Mensagens em português, com acentos.
- **Anti-objetivos (testar):**
  - dono de agência não edita destino nem roteiro de outra agência, nem chamando a API direto;
  - visitante comum não vê nenhum vestígio do modo edição, nem marcação, nem chamada a `/edit/*`;
  - o guia continua criando e editando os próprios roteiros;
  - o dono continua editando a página do destino ligado à agência dele.
- A permissão é **sempre verificada no servidor**. A chave só controla o que aparece na tela.
- Edição feita por quem tem permissão publica direto, sem voltar para `PENDING`. A moderação continua só para **criar destino novo** por quem não é da equipe (fluxo do painel que já existe).
- **Excluir = arquivar** (`active=false`), com toast **"Desfazer"**. Exclusão definitiva de destino só pela equipe, digitando o nome.
- Next.js 16.2 tem mudanças incompatíveis: ler `apps/web/node_modules/next/dist/docs/` antes de escrever código web.
- `pnpm` não está no PATH: usar `npx`. Não há banco local. A migração é gerada offline com `npx prisma migrate diff --from-schema <cópia> --to-schema prisma/schema.prisma --script` e ajustada à mão onde o plano mandar.
- `authenticate` trata qualquer parâmetro `:slug` como slug de **tenant**. Rotas novas sob `/destinations/...` usam `:destinationSlug`.
- **Nunca rodar `git commit`, `git add` nem `git stash`.** O usuário commita manualmente.
- Baseline da API: 7 falhas que já existiam (self-service repay, `expiry.job` ×2, `uploads.routes` ×4) e erros de tsc em `testimonials.test.ts`. Na web, um erro velho em `.next/types/validator.ts`. Não piorar.

## Decisões deste plano (do Claude)

- **Quem edita o quê** (`edit-permissions.ts`):
  - **Destino.** A equipe (`SUPER_ADMIN`, `PLATFORM_ADMIN`) edita todos. O `ADMIN` edita o destino em que `Tenant.destinationId` do tenant dele é o id do destino. **O `CONDUTOR` não edita destino.**
  - **Criar, arquivar, restaurar e excluir destino:** só a equipe.
  - **Roteiro.** A equipe edita todos. O `ADMIN` edita os do próprio tenant. O `CONDUTOR` edita os roteiros em que `conductorId` é o id dele. Criar roteiro segue a mesma regra: a equipe cria em qualquer tenant (com `conductorId: null`), o `ADMIN` cria no próprio tenant e o `CONDUTOR` cria no próprio tenant.
- **Rascunho.** `TourPackage` ganha `publishedAt DateTime?`. A migração preenche `publishedAt = createdAt` nos roteiros existentes.
  - **Rascunho:** `publishedAt` nulo.
  - **Oculto:** `active=false`.
  - **Publicado:** `active` e `publishedAt` preenchido.
  
  As leituras públicas de roteiro passam a exigir `active: true, publishedAt: { not: null }`. **Todo roteiro novo nasce rascunho**, inclusive os criados pelo painel, e é publicado com `POST .../publish`.
- **Selo de destino no modo edição:**
  - **Aguardando aprovação:** `approvalStatus` diferente de `APPROVED`.
  - **Oculto:** `active=false`.
- **Página oficial de roteiro:** `/[slug]/roteiros/[packageId]`, a que tem reserva. `/destinos/[destination-slug]/roteiros/[id]` passa a redirecionar para ela. A lista de guias do roteiro e o `PackageMembershipButton` (plano 3) vão para a página oficial.
- **Atualização imediata.** Todo route handler web que escreve em destino ou roteiro chama `revalidatePath` nas páginas afetadas. O client chama `router.refresh()` depois de salvar.
- **Celular.** Não existe barra "Reservar" fixa hoje (`FloatingCTA` não é usado). Com a chave ligada, abaixo de 768 px aparece uma barra fixa embaixo: `Modo edição · Sair`.
- **Quem vê a chave:** a equipe, o `ADMIN` e o `CONDUTOR` aprovado. Para o guia, os controles aparecem só nos próprios roteiros.
- **Fora deste plano:**
  - editar slots ou agenda no modo edição (continua no painel);
  - editar a página de guia;
  - reformar os painéis.

## Review Focus

1. **Dono de outra agência editando direto pela API.** `PUT /tenants/A/packages/:id` com token de `ADMIN` do tenant B deve responder 403 (já responde, pelo `authenticate`). `PATCH /destinations/:destinationSlug` por `ADMIN` cujo tenant não é ligado ao destino deve responder 403. `CONDUTOR` em qualquer destino também deve responder 403. Testes nas Tasks 1 e 2.
2. **Rascunho aparecendo para visitante.** `GET /destinations/:slug/packages`, `GET /tenants/:slug/packages`, `GET /tenants/:slug/packages/:id` e `GET /packages/:id/guides` devem ignorar roteiro com `publishedAt` nulo. A página pública responde 404 para o rascunho. Testes na Task 2.
3. **Desfazer depois do arquivar.** Arquivar e depois restaurar devolve exatamente o estado anterior (`active: true`, `publishedAt` intacto). Restaurar algo que já está ativo responde 200 sem mudar nada. Testes nas Tasks 1 e 2.
4. **Excluir destino definitivamente com nome errado ou com dependências.** Nome diferente (comparação sem diferenciar maiúsculas e sem espaços nas pontas) deve responder 400 `O nome não confere`. Destino com tenants ou roteiros ligados deve responder 409 `Este destino tem agências ou roteiros ligados. Arquive em vez de excluir.` Testes na Task 1.
5. **Visitante ou turista.** A `UserBar` não mostra a chave para `CLIENTE`. Sem sessão, nenhum componente de edição faz fetch ou renderiza. Verificação manual na Task 4, guardas no código.

---

### Task 1: API de destinos (permissões, sem volta a PENDING, arquivar, restaurar, excluir, criar)

**Files:**
- Create: `apps/api/src/shared/auth/edit-permissions.ts` (+ `__tests__/edit-permissions.test.ts`)
- Modify: `apps/api/src/modules/destinations/destinations.routes.ts`, `apps/api/src/modules/destinations/destinations.service.ts`
- Test: os testes de destinos que já existem (`destinations.routes.test.ts`, `destinations.authz.test.ts`) e um arquivo novo `destinations.edit.routes.test.ts`

**Interfaces:**
- Produces (`edit-permissions.ts`), com `type EditUser = { sub: string; role: string; tenantId: string }`:
  - `canEditDestination(user: EditUser, destinationId: string): Promise<boolean>`. Equipe → true. `ADMIN` → `prisma.tenant.findFirst({ where: { id: user.tenantId, destinationId } })` não nulo. Demais → false.
  - `canManageDestinations(user: EditUser): boolean`, que é `isPlatformStaff(user.role)`.
  - `canEditPackage(user: EditUser, pkg: { tenantId: string; conductorId: string | null }): boolean`: equipe → true; `ADMIN` → `pkg.tenantId === user.tenantId`; `CONDUTOR` → `pkg.conductorId === user.sub`; senão false.
  - `canCreatePackageIn(user: EditUser, tenantId: string): boolean`: equipe → true; `ADMIN` ou `CONDUTOR` → `tenantId === user.tenantId`.
- Rotas:
  - `PATCH /destinations/:destinationSlug` passa a usar `authorize(['ADMIN','SUPER_ADMIN'])` (sai o `CONDUTOR`) e `canEditDestination` no lugar da checagem inline. O comportamento sem reset continua. Passa a aceitar também `state`. A resposta passa a devolver o destino completo (`select` igual ao do GET público mais `approvalStatus` e `active`).
  - `POST /destinations`, só equipe. Corpo `{ title (3–100), subtitle?, description (10–5000), state (enum que já existe), tagline?, highlights?: string[] (≤ 10), photos?: url[] (≤ 5), heroImageUrl?: url }`. O `slug` é gerado do título com o mesmo helper de slug que `createDestination` usa. Se colidir, acrescenta `-2`, `-3` e assim por diante. Cria `APPROVED`, `active: true`, `createdById: user.sub` e responde 201 com o destino.
  - `POST /destinations/:destinationSlug/archive` e `.../restore`, só equipe. Ajustam `active` e respondem 200 `{ slug, active }`. Se já estiver no estado pedido, respondem 200 sem `update`.
  - `DELETE /destinations/:destinationSlug`, só equipe, corpo `{ confirmName: string }`:
    - nome não confere → 400 `O nome não confere`;
    - há `Tenant` com esse `destinationId` ou `GuideDestination` → 409 com a mensagem da Review Focus 4;
    - senão apaga e responde 204.
    
    Não precisa checar roteiro direto, porque roteiros ligam ao destino via tenant.
  - `updateDestination()` (`destinations.service.ts` ~L120): **remover** o reset para `PENDING`. As rotas `/tenants/:slug/destinations*` passam a `authorize(['ADMIN','SUPER_ADMIN'])` (sai o `CONDUTOR`).

- [ ] **Step 1: Testes (falhando):**
  - `canEditDestination`:
    - `PLATFORM_ADMIN` → true, sem consulta;
    - `ADMIN` com tenant ligado → true;
    - `ADMIN` com tenant não ligado → false;
    - `CONDUTOR` → false.
  - `canEditPackage` e `canCreatePackageIn`: um caso por papel.
  - `PATCH /destinations/serra-da-capivara`:
    - `ADMIN` não ligado → 403 `Acesso negado` sem `update`;
    - `CONDUTOR` → 403;
    - `ADMIN` ligado → 200 e o `update.data` **não** contém `approvalStatus`.
    
    **(Review Focus 1)**
  - `updateDestination` com usuário não `ADMIN` e destino `APPROVED` → `update.data` sem `approvalStatus`.
  - `POST /destinations`:
    - `ADMIN` → 403;
    - `SUPER_ADMIN` → 201 com `approvalStatus: 'APPROVED'`;
    - slug colidindo → `serra-nova-2`.
  - `archive` → `update` com `{ active: false }`. `restore` em destino já ativo → 200 sem `update`. **(Review Focus 3)**
  - `DELETE`:
    - `confirmName: ' serra da capivara '` com título `Serra da Capivara` → 204;
    - `confirmName: 'outra'` → 400;
    - com `tenant.count` maior que 0 → 409 com a mensagem exata;
    - `ADMIN` → 403.
    
    **(Review Focus 4)**
  - Testes que já existiam e esperavam `CONDUTOR` editando destino: ajustar para 403 e registrar no relatório.
- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4:** Rodar e ver passar. Suíte completa só com o baseline. `npx tsc --noEmit`.
- [ ] **Step 5:** Deixar a árvore pronta para o usuário commitar.

---

### Task 2: API de roteiros (equipe pode editar, rascunho/publicar, arquivar/restaurar, filtros públicos)

**Files:**
- Modify: `apps/api/prisma/schema.prisma`; create `apps/api/prisma/migrations/20261028000004_package_published_at/migration.sql`
- Modify: `apps/api/src/modules/packages/packages.routes.ts`, `apps/api/src/modules/packages/packages.service.ts` (se `updatePackagePhotos` e `updatePackageHighlights` fizerem checagem própria), `apps/api/src/modules/destinations/destinations.routes.ts` (`GET /destinations/:slug/packages`), `apps/api/src/modules/guides/guides.routes.ts` (`/guides/:id/packages`), `apps/api/src/modules/memberships/package-membership.routes.ts` (pedido só em publicado), `apps/api/prisma/seed.ts`
- Test: os de pacotes que já existem + `packages.edit.routes.test.ts`

**Interfaces:**
- Consumes: `canEditPackage` e `canCreatePackageIn` (Task 1).
- Produces:
  - **Schema:** `TourPackage.publishedAt DateTime?`. Migração: `ADD COLUMN` e depois `UPDATE "TourPackage" SET "publishedAt" = "createdAt";`.
  - **Escrita em `/tenants/:slug/packages*`** (POST, PUT, PATCH, DELETE e slots) passa a `authorize([Role.CONDUTOR, Role.ADMIN, Role.SUPER_ADMIN])`, com a checagem de dono feita por `canEditPackage` e `canCreatePackageIn`, no lugar das checagens inline.
  - **POST:**
    - cria com `publishedAt: null`;
    - equipe → `conductorId: null` e sem `PackageGuide`;
    - `CONDUTOR` ou `ADMIN` → como hoje (`conductorId = user.sub` e `PackageGuide ACCEPTED` se tiver perfil de guia).
    
    Corpo igual ao de hoje, mais `photos?` e `highlights?` opcionais.
  - **PUT** aceita também `photos` e `highlights`. A resposta devolve o roteiro completo, com `active` e `publishedAt`.
  - **Rotas novas:**
    - `POST /tenants/:slug/packages/:id/publish` → `publishedAt = now` se ainda for nulo e responde 200 `{ id, publishedAt }`. Já publicado → 200 sem `update`.
    - `POST /tenants/:slug/packages/:id/unpublish` → volta `publishedAt` para nulo (vira rascunho).
    - `POST /tenants/:slug/packages/:id/restore` → `active: true`. Já ativo → 200 sem `update`.
    
    O `DELETE` continua arquivando (`active: false`).
  - **Leituras públicas exigem `active: true, publishedAt: { not: null }`:**
    - `GET /tenants/:slug/packages`;
    - `GET /tenants/:slug/packages/:id`, que responde 404 se não estiver publicado;
    - `GET /destinations/:slug/packages`;
    - `GET /guides/:id/packages`;
    - `GET /packages/:id/guides`, que responde 404 se o roteiro não estiver publicado;
    - `POST /packages/:id/guides/me`, que responde 404 `Roteiro não encontrado` para rascunho.

- [ ] **Step 1:** Copiar o schema para o scratchpad, editar e gerar a migração. O SQL tem só `ADD COLUMN` e `UPDATE`, sem `DROP`. UTF-8 sem BOM. Rodar `npx prisma generate`.
- [ ] **Step 2: Testes (falhando):**
  - `PUT /tenants/agencia-a/packages/p1` com `PLATFORM_ADMIN` → 200. Com `ADMIN` do tenant B → 403. Com `CONDUTOR` que não é o condutor → 403. **(Review Focus 1)**
  - `POST /tenants/agencia-a/packages` por `SUPER_ADMIN` → `create.data` com `conductorId: null, publishedAt: null` e sem `packageGuide.create`. Por `CONDUTOR` → `publishedAt: null`.
  - `publish` → `update` com `publishedAt: expect.any(Date)`. Já publicado → sem `update`.
  - `restore` depois de `DELETE` → `update` com `{ active: true }`, sem mexer em `publishedAt`. **(Review Focus 3)**
  - Cada uma das leituras públicas acima tem uma asserção de `where` contendo `publishedAt: { not: null }`. `GET /tenants/:slug/packages/:id` com rascunho → 404. **(Review Focus 2)**
- [ ] **Step 3: Implementar.** Seed: roteiros do seed com `publishedAt: new Date()`.
- [ ] **Step 4:** Rodar e ver passar. Suíte completa só com o baseline. `npx tsc --noEmit`. Checar o tipo do seed com o comando explícito (`npx tsc --noEmit --skipLibCheck --esModuleInterop --module nodenext --moduleResolution nodenext --target es2022 prisma/seed.ts prisma/backfill-v2.1.ts`).
- [ ] **Step 5:** Deixar a árvore pronta para o usuário commitar.

---

### Task 3: API do escopo de edição e listagens com itens ocultos

**Files:**
- Create: `apps/api/src/modules/edit/edit.routes.ts` (+ `__tests__/edit.routes.test.ts`)
- Modify: `apps/api/src/app.ts`

**Interfaces:**
- Consumes: `canEditPackage` e `canEditDestination` (Task 1); `publishedAt` (Task 2).
- Produces (todas com `authenticate`, papéis `SUPER_ADMIN` (admite `PLATFORM_ADMIN`), `ADMIN` e `CONDUTOR`; `CLIENTE` → 403):
  - `GET /edit/scope` → `{ destinations: 'ALL' | string[] (slugs), packages: 'ALL' | { tenantId: string; tenantSlug: string } | { conductorId: string }, canManageDestinations: boolean, label: string }`. O `label` segue a spec:
    - equipe: `Você pode editar: todos os destinos e roteiros`;
    - `ADMIN` com destino ligado: `Você pode editar: página de {destinationTitle} e roteiros da {tenantName}`;
    - `ADMIN` sem destino: `Você pode editar: roteiros da {tenantName}`;
    - `CONDUTOR` aprovado: `Você pode editar: seus roteiros`;
    - `CONDUTOR` não aprovado: 403 `Disponível após verificação`.
  - `GET /edit/destinations` → `{ destinations: [{ slug, title, state, heroImageUrl, approvalStatus, active }] }`. A equipe recebe todos, inclusive pendentes e ocultos. O `ADMIN` recebe só o ligado. O `CONDUTOR` recebe `[]`.
  - `GET /edit/destinations/:destinationSlug` → o destino completo (campos do GET público mais `approvalStatus` e `active`), mesmo oculto ou pendente, se `canEditDestination`. Senão 403. Inexistente → 404.
  - `GET /edit/destinations/:destinationSlug/packages` → `{ packages: [{ id, tenantSlug, name, description, price, duration, capacity, difficulty, photos, highlights, active, publishedAt, status: 'PUBLISHED' | 'DRAFT' | 'HIDDEN', editable: boolean }] }`. Inclui todos os roteiros dos tenants ligados ao destino, com `editable = canEditPackage(user, pkg)`. Roteiros não publicados ou ocultos só entram quando `editable` é true. `status` vale `HIDDEN` se `!active`, `DRAFT` se `publishedAt` é nulo e `PUBLISHED` nos demais casos.

- [ ] **Step 1: Testes (falhando):**
  - `scope`:
    - equipe → `destinations: 'ALL'`, `canManageDestinations: true` e o label exato;
    - `ADMIN` ligado → slugs do destino ligado, `packages: { tenantId, tenantSlug }` e o label com o título e o nome da agência;
    - `CONDUTOR` aprovado → `{ conductorId: sub }`;
    - `CONDUTOR` pendente → 403;
    - `CLIENTE` → 403.
  - `GET /edit/destinations` para `ADMIN` → `findMany` filtrado pelo destino ligado.
  - `GET /edit/destinations/:destinationSlug/packages` como `ADMIN` da agência A:
    - rascunho de A → `editable: true, status: 'DRAFT'`;
    - rascunho de B → não aparece;
    - publicado de B → aparece com `editable: false`.
  - Rota com `:destinationSlug` cujo slug não é de tenant → 200 (não cai no checagem de tenant do `authenticate`).
- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4:** Rodar e ver passar. Suíte completa só com o baseline. `npx tsc --noEmit`.
- [ ] **Step 5:** Deixar a árvore pronta para o usuário commitar.

---

### Task 4: Web: estrutura do modo edição (chave, faixa, barra no celular, folha, toasts)

**Files:**
- Create: `apps/web/src/components/edit-mode/EditModeProvider.tsx`, `apps/web/src/components/edit-mode/EditModeBanner.tsx`, `apps/web/src/components/edit-mode/EditSheet.tsx`, `apps/web/lib/edit-client.ts`
- Modify: `apps/web/app/providers.tsx` (envolver com `EditModeProvider`, montar `<Toaster position="top-center" richColors />` de `sonner`, a faixa e a barra), `apps/web/src/components/layout/UserBar.tsx` (a chave), `apps/web/app/api/proxy/route.ts` (permitir `^/edit/(scope|destinations(/[^/]+(/packages)?)?)$`)

**Interfaces:**
- Consumes: `GET /edit/scope` (Task 3).
- Produces:
  - `useEditMode(): { enabled: boolean; available: boolean; scope: EditScope | null; setEnabled(v: boolean): void; registerDirty(id: string, dirty: boolean): void; canEditDestination(slug: string): boolean; canEditPackage(p: { tenantSlug: string; conductorId: string | null }): boolean }`. Os dois `can*` são **só para a interface**, porque o servidor decide. `canEditPackage` dá true se o escopo for `'ALL'`, se `scope.packages.tenantSlug === p.tenantSlug`, ou se `scope.packages.conductorId === p.conductorId`.
    - `available`: há sessão, o papel é `SUPER_ADMIN`, `PLATFORM_ADMIN`, `ADMIN` ou `CONDUTOR`, e `/edit/scope` respondeu 200.
    - `enabled` vem de `sessionStorage['capi:edit-mode'] === '1'`. Também liga quando a URL tem `?editar=1` e, nesse caso, remove o parâmetro com `router.replace`.
    - Ao desligar com algo marcado como sujo, pergunta `Você tem alterações não salvas. Sair mesmo assim?`.
    - `beforeunload` é registrado enquanto houver algo sujo.
  - `type EditScope` espelha a resposta de `/edit/scope`. `lib/edit-client.ts` exporta:
    - `fetchEditScope()`;
    - `editJson(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: any }>`, via `/api/proxy`, a não ser que a Task 5 ou a 6 diga que vai por route handler próprio.
  - `EditSheet({ open, title, onClose, children, footer })`:
    - abaixo de 768 px, folha inferior com até 90 vh de altura e rolagem;
    - acima disso, painel lateral direito de 480 px;
    - foco no primeiro campo, Esc fecha e devolve o foco;
    - `role="dialog"`, `aria-modal`.
  - **UserBar:** se `available`, mostra a chave `✏️ Modo edição` (`role="switch"`, `aria-checked`) entre o sininho e o menu. Para `CLIENTE` ou sem sessão, nada **(Review Focus 5)**.
  - **EditModeBanner:**
    - com `enabled`, mostra uma faixa de uma linha logo abaixo da `UserBar`, com o `scope.label` e o botão `Sair do modo edição`;
    - abaixo de 768 px, mostra também uma barra fixa embaixo com `Modo edição · Sair`.
    
    Sem `enabled`, nada.

- [ ] **Step 1:** Ler as docs do Next sobre client components, `useSearchParams`/`useRouter` e o `Suspense` exigido por `useSearchParams` no App Router.
- [ ] **Step 2:** Implementar o provider, a chave, a faixa, a barra, a folha e o `edit-client`, além da linha nova do proxy, mantendo a normalização e as âncoras.
- [ ] **Step 3: Verificar.** `npx tsc --noEmit` e eslint nos arquivos tocados. Conferir pelo código que, sem sessão, `EditModeProvider` não chama `/edit/scope`.
- [ ] **Step 4:** Deixar a árvore pronta para o usuário commitar.

---

### Task 5: Web: editar destino na página e na lista de destinos

**Files:**
- Create: `apps/web/src/components/edit-mode/DestinationEditor.tsx`, `apps/web/src/components/edit-mode/EditableSection.tsx`, `apps/web/src/components/edit-mode/DestinationEditControls.tsx`, `apps/web/src/components/edit-mode/NewDestinationButton.tsx`, `apps/web/app/api/edit/destinations/[destinationSlug]/route.ts`, `apps/web/app/api/edit/destinations/route.ts`
- Modify: `apps/web/app/destinos/[destination-slug]/page.tsx`, `apps/web/app/destinos/page.tsx`, `apps/web/app/api/destinations/[slug]/route.ts` (sai `CONDUTOR` da checagem de papel). Delete `apps/web/components/ui/DestinationPhotoEditor.tsx` (não é usado e é substituído pelo editor).

**Interfaces:**
- Consumes: `useEditMode`, `EditSheet`, `editJson` (Task 4); rotas da Task 1; `GET /edit/destinations*` (Task 3).
- Produces:
  - `EditableSection({ editable: boolean; deniedMessage: string; onEdit(): void; children })`:
    - com o modo edição ligado, contorna a seção com borda tracejada `var(--ochre)` e mostra **um** botão `✏️ Editar`;
    - se não for editável, tocar na seção mostra o toast `deniedMessage`, sem botão;
    - com o modo desligado, renderiza só `children`, sem nenhuma marcação extra.
  - `DestinationEditor({ slug, initial, onSaved })`: formulário dentro de uma `EditSheet`.
    - **Campos:** título, subtítulo, estado, tagline, descrição (parágrafos separados por linha em branco), destaques (lista editável de até 10 itens), foto de capa e até 5 fotos, usando o upload que já existe (`/api/uploads/photos?folder=destinations`).
    - Salvar faz `PATCH` pelo route handler.
    - Marca a folha como suja no `registerDirty` enquanto houver alteração.
    - **Excluir fica dentro da folha, nunca ao lado de Editar.** Só a equipe vê **Arquivar destino**: arquivar mostra o toast `Destino arquivado` com a ação **Desfazer**, que restaura. Só a equipe vê também **Excluir definitivamente**, que pede para digitar o nome e mostra o erro 400 ou 409 da API.
  - **Route handlers web** (repassam com `jwt.apiToken` e chamam `revalidatePath('/destinos')` e `revalidatePath('/destinos/{slug}')` quando dá certo):
    - `api/edit/destinations/[destinationSlug]`: `GET` → `/edit/destinations/:slug`, `PATCH` → `/destinations/:slug`, `DELETE` → `/destinations/:slug` com corpo, `POST ?action=archive|restore` → `/destinations/:slug/archive|restore`;
    - `api/edit/destinations`: `GET` → `/edit/destinations`, `POST` → `/destinations`.
  - **Página do destino:** cada bloco (hero, história, destaques/fotos) fica embrulhado em `EditableSection`, com `deniedMessage` igual a `Destino de outra agência`. Com o modo edição ligado e `canEditDestination`, o editor carrega os dados de `GET /api/edit/destinations/{slug}` (que inclui `approvalStatus` e `active`). Se o destino não estiver aprovado ou estiver oculto, mostra o selo `Aguardando aprovação` ou `Oculto` no topo.
  - **Lista `/destinos`:** com o modo edição ligado e `canManageDestinations`:
    - mostra o cartão **＋ Novo destino**, que abre uma folha com título, estado e descrição e, ao criar, leva para `/destinos/{slug}?editar=1`;
    - mostra também os destinos de `/api/edit/destinations` que não aparecem na lista pública, acinzentados (`opacity: .55`), com o selo `Aguardando aprovação` ou `Oculto`.
- [ ] **Step 1: Implementar.** As páginas continuam server components e montam os client components. Depois de salvar, chamam `router.refresh()`.
- [ ] **Step 2: Verificar.** `npx tsc --noEmit` e eslint nos arquivos tocados. `grep` confirma que `DestinationPhotoEditor` não é mais importado em lugar nenhum.
- [ ] **Step 3:** Deixar a árvore pronta para o usuário commitar.

---

### Task 6: Web: editar, criar, publicar e arquivar roteiros na página

**Files:**
- Create: `apps/web/src/components/edit-mode/PackageEditor.tsx`, `apps/web/src/components/edit-mode/PackageEditControls.tsx`, `apps/web/src/components/edit-mode/NewPackageCard.tsx`, `apps/web/src/components/edit-mode/StatusBadge.tsx`, `apps/web/app/api/edit/packages/route.ts`
- Modify: `apps/web/app/destinos/[destination-slug]/roteiros/page.tsx` (lista), `apps/web/app/[slug]/(public)/roteiros/[packageId]/page.tsx` (página oficial)

**Interfaces:**
- Consumes: Task 4; rotas da Task 2; `GET /edit/destinations/:destinationSlug/packages` (Task 3).
- Produces:
  - **Route handler `app/api/edit/packages/route.ts`.** Uma rota POST com corpo `{ action: 'create' | 'update' | 'publish' | 'unpublish' | 'archive' | 'restore', tenantSlug: string, packageId?: string, data?: object }`.
    - Valida `tenantSlug` e `packageId` com `/^[a-z0-9-]+$/i` e no máximo 64 caracteres.
    - Mapeia cada ação para a rota da API: `create` → POST `/tenants/:t/packages`; `update` → PUT; `archive` → DELETE; as outras → POST `.../:action`.
    - Repassa com o token e chama `revalidatePath` em `/{tenantSlug}/roteiros/{id}`, `/{tenantSlug}/roteiros` e `/destinos/[destination-slug]/roteiros` (`revalidatePath('/destinos/[destination-slug]/roteiros', 'page')`).
  - `PackageEditor({ tenantSlug, pkg | null, onSaved })`, dentro de uma `EditSheet`:
    - campos nome, descrição, preço, duração (horas), capacidade, dificuldade (Fácil / Moderado / Difícil), fotos (até 5, `folder=packages`) e destaques (até 10);
    - **Arquivar roteiro** fica dentro da folha e mostra o toast `Roteiro arquivado` com **Desfazer**;
    - **Publicar** aparece quando é rascunho. **Voltar para rascunho** aparece quando está publicado.
  - `StatusBadge({ status: 'DRAFT' | 'HIDDEN' | 'PENDING' })` → `Rascunho`, `Oculto` ou `Aguardando aprovação`.
  - **Lista `/destinos/[destination-slug]/roteiros`:** com o modo edição ligado, a lista usa `GET /edit/destinations/:slug/packages` pelo proxy, no lugar dos dados públicos.
    - Itens `DRAFT` ou `HIDDEN` aparecem acinzentados com o `StatusBadge`.
    - Cada cartão editável ganha um único `✏️ Editar`. Não editável → toast `Roteiro de outra agência`.
    - Aparece o cartão **＋ Novo roteiro** se o usuário pode criar em algum tenant ligado ao destino:
      - a equipe escolhe a agência num seletor com os tenants ligados ao destino, que vêm dos `tenantSlug` dos roteiros e do escopo;
      - o `ADMIN` e o `CONDUTOR` criam no próprio tenant, se ele for ligado ao destino.
      
      Criar abre a folha. Ao salvar, o roteiro aparece como `Rascunho`, com o botão **Publicar**.
  - **Página oficial `/[slug]/roteiros/[packageId]`:** o bloco de título, descrição, fotos e destaques fica em `EditableSection` com o `PackageEditor`. A permissão de interface vem de `canEditPackage({ tenantSlug: slug, conductorId: pkg.conductorId })`.
- [ ] **Step 1: Implementar.**
- [ ] **Step 2: Verificar.** `npx tsc --noEmit` e eslint nos arquivos tocados.
- [ ] **Step 3:** Deixar a árvore pronta para o usuário commitar.

---

### Task 7: Web: uma página de roteiro, painéis com "Ver e editar no site", menus

**Files:**
- Modify:
  - `apps/web/app/destinos/[destination-slug]/roteiros/[id]/page.tsx` (passa a ser um redirect);
  - `apps/web/app/[slug]/(public)/roteiros/[packageId]/page.tsx` (recebe a lista de guias e o `PackageMembershipButton`);
  - links para a página antiga (`grep -rn "roteiros/\${" apps/web`, por exemplo `PackageCard` e a lista de roteiros do destino);
  - `apps/web/components/sidebar/SidebarNav.tsx`;
  - `apps/web/src/components/layout/PublicNav.tsx`;
  - painéis `apps/web/app/[slug]/(painel)/painel/roteiros/page.tsx`, `.../roteiros/[id]/page.tsx`, `.../destino/page.tsx`, `apps/web/app/super-admin/destinos/page.tsx`

**Interfaces:**
- Consumes: `PackageEditor` e `DestinationEditor` (Tasks 5 e 6); `PackageMembershipButton` (plano 3).

- [ ] **Step 1: Redirect.** `/destinos/[destination-slug]/roteiros/[id]` busca o roteiro (`GET /destinations/:slug/packages`) e chama `redirect('/{tenantSlug}/roteiros/{id}')`, sem tela de cópia. A API precisa devolver o slug do tenant em cada roteiro dessa listagem; se não devolver, acrescentar `tenantSlug` ao `select` de `GET /destinations/:slug/packages`, com teste de API. Roteiro não encontrado → `notFound()`. Os links internos passam a apontar direto para a página oficial.
- [ ] **Step 2: Página oficial.** Ganha a seção `Guias deste roteiro`, com os `GuideCard` vindos de `GET /packages/:id/guides`, e o `PackageMembershipButton` abaixo do título, como estava na página antiga.
- [ ] **Step 3: Painéis.**
  - Cada cartão de roteiro em `painel/roteiros` ganha o link **Ver e editar no site** (`/{slug}/roteiros/{id}?editar=1`).
  - `painel/destino` e cada linha de `super-admin/destinos` ganham **Ver e editar no site** (`/destinos/{slug}?editar=1`).
  - Em `painel/roteiros/[id]`, o formulário próprio de fotos e destaques é trocado pelo `PackageEditor`, renderizado direto na página: dentro de um contêiner quando `inline`, ou com uma prop `inline` no `EditSheet`. Assim painel e site seguem as mesmas regras.
  - Em `painel/destino`, o mesmo vale para o `DestinationEditor`.
  - O botão **Publicar** aparece no painel para rascunhos.
- [ ] **Step 4: Menus.**
  - `SidebarNav` deixa de mostrar **Locais** para `CONDUTOR`. Ler o papel com `useSession` no componente ou receber o `role` como prop do layout.
  - `PublicNav` troca o botão **Painel** fixo por **Entrar** (`/login`) quando não há sessão, e não mostra nada quando há sessão, porque a `UserBar` já cuida disso. Turista logado não vê "Painel".
- [ ] **Step 5: Verificar.** `npx tsc --noEmit` em `apps/web` e `apps/api` (se a API foi tocada no Step 1) e eslint nos arquivos tocados. A suíte da API, se tocada, fica só com o baseline.
- [ ] **Step 6: Verificação manual (para o usuário, com banco):**
  1. Como admin da plataforma, ligar a chave na página de um destino, editar a história, salvar e ver a mudança na hora. Arquivar e desfazer.
  2. Criar um roteiro rascunho, ver o selo `Rascunho`, publicar e ver o roteiro na lista pública (numa aba anônima).
  3. Como dono de agência, ver controles só no destino da agência e nos roteiros dela. Tocar num roteiro de outra agência mostra `Roteiro de outra agência`.
  4. Como guia, ver controles só nos próprios roteiros.
  5. Deslogado, nada de chave, faixa ou contorno.
  6. No celular, conferir a barra `Modo edição · Sair` e a folha inferior.
- [ ] **Step 7:** Deixar a árvore pronta para o usuário commitar.
