# Plano 3 — Cadastro único de guia + entrar/sair de destinos e roteiros — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O guia se cadastra sozinho por uma porta só, envia o comprovante ICMBio/Cadastur e é verificado pela equipe da plataforma. Depois de verificado, entra ou sai de destinos com um botão e pede para entrar ou sair de roteiros. Quem precisa decidir aprova ou recusa direto pela notificação.

**Architecture:** Este plano faz quatro coisas:
- **Vínculos diretos.** Cria `GuideDestination` (guia↔destino) e troca `PackageGuide.active` por um status com pedido pendente. Também cria `GuideAffiliation`, o vínculo declarado com uma agência ou associação, que só vale depois que o dono confirma.
- **Guia novo em `independente`.** Todo guia novo nasce no tenant `independente` e só passa para o tenant da agência quando o vínculo é confirmado.
- **Comprovante privado.** O arquivo fica no R2 com chave impossível de adivinhar e nunca tem URL pública. A equipe o vê por uma rota que lê o arquivo do R2 e o repassa.
- **Notificações com ação.** Toda decisão gera notificação com `actionKey`. A web associa cada prefixo de `actionKey` aos botões Aprovar/Recusar.

**Tech Stack:** Fastify 5, Prisma 7, Zod v4, @fastify/multipart, Cloudflare R2 (S3 SDK), Resend; Next.js 16.2 + next-auth; Vitest com prisma mockado.

**Spec:** `docs/superpowers/specs/2026-10-28-hierarquia-edicao-guias-notificacoes-design.md`. Seções que valem aqui:
- 1 (papéis);
- 4 (cadastro de guia);
- 5 (entrar/sair);
- 6 (eventos);
- "Cadastro de guia — uma porta só";
- "Guia pendente e recusado";
- "Estados dos botões entrar/sair";
- "Notificações que levam à ação";
- anti-objetivos.

## Global Constraints

- Validação Zod em toda rota nova. Erro 400 no formato `{ message: 'Dados inválidos', errors: [{ field, message }] }`. Mensagens em português, com acentos.
- **Anti-objetivos (testar):**
  - guia não verificado não entra em destino nem em roteiro, nem chamando a API direto;
  - dono de agência não decide pedido de roteiro de outra agência;
  - comprovante de guia nunca fica acessível a quem não é da equipe.
- Notificação ou e-mail nunca quebram a operação principal (`void fn(...).catch(() => {})`, como no plano 2).
- "Sair" fica bloqueado com reserva futura, com a mensagem exata `Você tem reservas pendentes, fale com o admin`.
- Equipe = `SUPER_ADMIN` ou `PLATFORM_ADMIN` (`isPlatformStaff`). Dono de agência = `ADMIN`. Guia = `CONDUTOR`.
- Next.js 16.2 tem mudanças incompatíveis: ler `apps/web/node_modules/next/dist/docs/` antes de escrever código web.
- `pnpm` não está no PATH: usar `npx` em `apps/api` e `apps/web`. Não há banco local: a migração é gerada offline com `npx prisma migrate diff --from-schema <cópia> --to-schema prisma/schema.prisma --script`, e o SQL é ajustado à mão onde o plano mandar.
- **Nunca rodar `git commit`, `git add` nem `git stash`.** O usuário commita manualmente.
- Baseline: 7 falhas pré-existentes na API (self-service repay, `expiry.job` ×2, `uploads.routes` ×4) e erros de tsc em `testimonials.test.ts`. Não piorar.

## Decisões deste plano (do Claude)

- **Tenant do guia.** Todo guia novo é criado no tenant `independente`. O vínculo com agência ou associação fica numa `GuideAffiliation` com status `PENDING`. Ao confirmar, `User.tenantId` passa a ser o da agência e o guia recebe uma notificação pedindo para entrar de novo, porque o token antigo aponta para o tenant anterior. Na recusa, ele continua autônomo.
- **Associação.** Vira o enum `TenantType { AGENCIA, ASSOCIACAO }` em `Tenant.type`, com padrão `AGENCIA`. O cadastro de operadora ganha a escolha do tipo.
- **Uma porta só.** Saem `POST /auth/register-independent` e o ramo `CONDUTOR` de `POST /tenants/:slug/auth/register`, para não sobrar caminho que crie guia sem comprovante. O ramo `CLIENTE` continua. Na web, `/onboarding` → "Sou guia" e `/[slug]/cadastro` redirecionam para `/cadastro/guia`.
- **Comprovante.**
  - Formatos JPEG, PNG, WebP ou PDF, até 10 MB.
  - Chave `credentials/{randomUUID()}.{ext}`, gravada em `GuideProfile.credentialDocKey`.
  - Nenhuma rota devolve a URL pública. A equipe vê o arquivo por `GET /platform/guides/:userId/credential`, que lê do R2 e repassa o conteúdo.
  - Na web, imagens são comprimidas no navegador até no máximo 1600 px no lado maior, em JPEG com qualidade 0,8.
  - Se a conexão cair, o formulário mantém os dados e mostra "Tentar de novo".
- **Quem verifica guia:** só a equipe. As rotas `PATCH /tenants/:slug/admin/guides/:id/approve|reject` saem. `/[slug]/admin/guias` passa a mostrar os pedidos de vínculo com a agência.
- **Motivos de recusa do comprovante:**
  - `ILEGIVEL` → `Documento ilegível`;
  - `VENCIDO` → `Documento vencido`;
  - `NOME_DIFERENTE` → `Nome diferente do documento`;
  - `OUTRO` → texto obrigatório.
  
  O que é gravado em `User.rejectionReason` é o rótulo, ou o texto no caso de `OUTRO`.
- **Recusa de vínculo e de pedido de roteiro:** motivo em texto livre, de 3 a 300 caracteres.
- **Quem decide pedido de roteiro:**
  - a equipe;
  - o `ADMIN` do tenant dono do roteiro;
  - o próprio condutor do roteiro, se o tenant do roteiro for `independente`.
- **"Reserva futura do guia".** É uma `Booking` com `status` `PENDING` ou `CONFIRMED`, cujo `slot.startsAt` é posterior a agora, em que `slot.guideId` é o `GuideProfile` do guia, ou `slot.guideId` é nulo e `package.conductorId` é o usuário. Para destino, o roteiro também precisa ter `package.tenant.destinationId` igual ao destino. Para roteiro, a reserva precisa ser daquele roteiro.
- **Página oficial do roteiro para o botão:** `/destinos/[destination-slug]/roteiros/[id]`. O plano 4 unifica as duas páginas de roteiro.
- **Fora deste plano:**
  - roteiro de guia autônomo continua sem destino (`TourPackage` não ganha `destinationId`);
  - a saída com transferência, multa ou devolução é o projeto 3, adiado;
  - a remoção da edição de destino pelo guia fica para o plano 4.

## Catálogo de eventos novos ou alterados

| `type` | Para quem | `title` | `body` | `link` | `actionKey` |
|---|---|---|---|---|---|
| `guide.registered` (alterado) | só a equipe | `Guia aguardando verificação` | `{guideName} enviou cadastro` | `/super-admin/guias` | `guide-verification:{userId}` |
| `guide.affiliation-requested` | ADMINs do tenant declarado | `Guia quer se vincular à sua agência` | `{guideName} declarou atuar com {tenantName}` | `/{tenantSlug}/admin/guias` | `guide-affiliation:{affiliationId}` |
| `guide.affiliation-accepted` | o guia | `Vínculo confirmado` | `{tenantName} confirmou seu vínculo. Entre de novo para ver o painel da agência.` | `/guia/status` | — |
| `guide.affiliation-rejected` | o guia | `Vínculo não confirmado` | `{tenantName}: {reason}` | `/guia/status` | — |
| `destination.guide-joined` | ADMINs do tenant do guia (exceto `independente`) | `Guia passou a atuar em {destinationTitle}` | `{guideName}` | `/destinos/{destinationSlug}` | — |
| `destination.guide-left` | idem | `Guia deixou de atuar em {destinationTitle}` | `{guideName}` | `/destinos/{destinationSlug}` | — |
| `package.guide-requested` | quem decide (ADMINs do tenant do roteiro, ou o condutor se o tenant for `independente`) + equipe, exceto o próprio guia | `Pedido para atuar em roteiro` | `{guideName} · {packageName}` | `/pendencias?package={packageId}` (a web lê o `packageId` daqui para montar a ação) | `package-request:{packageGuideId}` |
| `package.request-accepted` | o guia | `Pedido aceito` | `Você agora atua em {packageName}` | `/{guideTenantSlug}/painel/perfil` | — |
| `package.request-rejected` | o guia | `Pedido recusado` | `{packageName}: {reason}` | `/{guideTenantSlug}/painel/perfil` | — |
| `package.guide-joined` (existe; agora dispara no **aceite**) | ADMINs do tenant do roteiro, exceto o guia | como hoje | como hoje | como hoje | — |
| `package.guide-left` | idem | `Guia saiu do roteiro` | `{guideName} · {packageName}` | `/{tenantSlug}/painel/roteiros/{packageId}` | — |

Toda decisão (aprovar ou recusar guia, vínculo ou pedido) chama `resolveAction(actionKey, nomeDeQuemDecidiu)`, que já existe.

## Review Focus

1. **Guia não verificado chamando a API direto.** `POST /destinations/:slug/guides/me` e `POST /packages/:id/guides/me` com guia `PENDING` devem responder 403 `Disponível após verificação`. Testes nas Tasks 4 e 5.
2. **Dono de outra agência decidindo pedido.** `PATCH /packages/:id/guide-requests/:packageGuideId/accept` por um `ADMIN` de outro tenant deve responder 403 e não alterar nada. Teste na Task 5.
3. **Comprovante exposto.** `GET /platform/guides/:userId/credential` com token de `ADMIN`, `CONDUTOR` ou sem token deve responder 403 ou 401. Nenhuma resposta de nenhuma rota contém `credentialDocKey`. Testes nas Tasks 2 e 3.
4. **Sair com reserva só no passado ou cancelada.** O guia consegue sair (204). Com reserva `CONFIRMED` futura, recebe 409 com a mensagem exata e a lista das reservas. Testes nas Tasks 4 e 5.
5. **Clique duplo em entrar ou pedir.** Repetir `POST` de destino ou de roteiro não cria linha duplicada. Destino responde 200 se já estava dentro. Roteiro com pedido `PENDING` responde 200 com o estado atual, e com `ACCEPTED` responde 200 sem mudar nada. Testes nas Tasks 4 e 5.

---

### Task 1: Modelo de dados e migração

**Files:**
- Modify: `apps/api/prisma/schema.prisma`, `apps/api/prisma/seed.ts`
- Create: `apps/api/prisma/migrations/20261028000003_guide_signup_membership/migration.sql`
- Modify (leitores de `cadastur` e de `PackageGuide.active`): `apps/api/src/modules/auth/auth.routes.ts`, `apps/api/src/modules/packages/packages.routes.ts`, `apps/api/src/modules/guides/guides.routes.ts`, além de qualquer outro que `grep -rn "cadastur\|packageGuide\|PackageGuide" apps/api/src apps/web` encontrar

**Interfaces:**
- Produces (Prisma):
  - `enum TenantType { AGENCIA ASSOCIACAO }`; `Tenant.type TenantType @default(AGENCIA)`.
  - `enum CredentialType { ICMBIO CADASTUR }`. `GuideProfile` ganha:
    - `credentialType CredentialType?`
    - `credentialNumber String?`
    - `credentialDocKey String?`
    - `credentialSubmittedAt DateTime?`
    
    e **perde** `cadastur`.
  - `enum PackageGuideStatus { PENDING ACCEPTED REJECTED LEFT }`. `PackageGuide` ganha:
    - `status PackageGuideStatus @default(PENDING)`
    - `rejectionReason String?`
    - `decidedAt DateTime?`
    - `updatedAt DateTime @updatedAt`
    
    e **perde** `active`.
  - `model GuideDestination { id String @id @default(cuid()); guideId String; destinationId String; createdAt DateTime @default(now()); guide GuideProfile @relation(fields:[guideId], references:[id], onDelete: Cascade); destination Destination @relation(fields:[destinationId], references:[id], onDelete: Cascade); @@unique([guideId, destinationId]); @@index([destinationId]) }`
  - `enum AffiliationStatus { PENDING ACCEPTED REJECTED }`. `model GuideAffiliation { id String @id @default(cuid()); guideId String @unique; tenantId String; status AffiliationStatus @default(PENDING); rejectionReason String?; createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; guide GuideProfile @relation(fields:[guideId], references:[id], onDelete: Cascade); tenant Tenant @relation(fields:[tenantId], references:[id]); @@index([tenantId, status]) }`
  - Relações inversas: `GuideProfile.destinations`, `GuideProfile.affiliation`, `Destination.guides`, `Tenant.affiliations`.

- [ ] **Step 1:** Copiar o `schema.prisma` atual para o scratchpad, editar o schema e gerar o SQL com `migrate diff` (Global Constraints).
- [ ] **Step 2: Ajustar o SQL à mão para não perder dados.** O SQL final precisa, nesta ordem:
  1. Criar os enums e as colunas novas, com `PackageGuide.status` ainda permitindo o padrão.
  2. Rodar `UPDATE "PackageGuide" SET "status" = CASE WHEN "active" THEN 'ACCEPTED' ELSE 'LEFT' END::"PackageGuideStatus", "decidedAt" = "createdAt";`.
  3. Rodar `UPDATE "GuideProfile" SET "credentialType" = 'CADASTUR', "credentialNumber" = "cadastur", "credentialSubmittedAt" = "createdAt" WHERE "cadastur" IS NOT NULL;`.
  4. Rodar `INSERT INTO "GuideDestination" ("id","guideId","destinationId","createdAt") SELECT gen_random_uuid()::text, gp."id", t."destinationId", now() FROM "GuideProfile" gp JOIN "User" u ON u."id" = gp."userId" JOIN "Tenant" t ON t."id" = u."tenantId" WHERE t."destinationId" IS NOT NULL ON CONFLICT DO NOTHING;`.
  5. Só então os `DROP COLUMN` de `active` e de `cadastur`.
  
  Nada de `DROP TABLE`. Arquivo em UTF-8 sem BOM, gravado via bash.
- [ ] **Step 3: Atualizar os leitores.**
  - Onde se lia `active: true` em `PackageGuide`, passa a valer `status: 'ACCEPTED'`.
  - A criação de roteiro cria `PackageGuide` com `status: 'ACCEPTED', decidedAt: new Date()`.
  - Quem lia `cadastur` passa a ler `credentialNumber`.
  - `GET /packages/:id/guides` filtra `status: 'ACCEPTED'` **e** `guide.user.approvalStatus: 'APPROVED'`.
  - Teste novo em `packages.routes` (ou no arquivo de teste de pacotes existente): o `findMany` desse GET recebe `where: { packageId, status: 'ACCEPTED', guide: { user: { approvalStatus: 'APPROVED' } } }`.
- [ ] **Step 4: Seed.** Guias criados pelo seed, se existirem, ficam `approvalStatus: 'APPROVED'`, com `credentialType: 'CADASTUR'` e `credentialNumber` de exemplo (`'00000000000-0'`), e com `GuideDestination` para o destino do tenant deles. Tenants do seed recebem `type`.
- [ ] **Step 5: Verificar.** Rodar `npx prisma generate`. Em seguida, `npx vitest run` em `apps/api` deve mostrar só o baseline, e `npx tsc --noEmit` em `apps/api` e `apps/web` não deve ter erros novos.
- [ ] **Step 6:** Deixar a árvore pronta para o usuário commitar.

---

### Task 2: Cadastro único de guia (API) + armazenamento privado do comprovante

**Files:**
- Create: `apps/api/src/modules/guide-signup/credential.storage.ts`, `apps/api/src/modules/guide-signup/guide-signup.routes.ts`, `apps/api/src/modules/guide-signup/__tests__/guide-signup.routes.test.ts`
- Modify: `apps/api/src/modules/auth/auth.routes.ts` (remover `register-independent` e o ramo `CONDUTOR`), `apps/api/src/modules/tenants/tenants.routes.ts` (`type` no signup + busca), `apps/api/src/modules/notifications/guide-events.ts`, `apps/api/src/app.ts`
- Test: os testes de `auth` e `tenants` que cobrem as rotas alteradas

**Interfaces:**
- Produces:
  - `credential.storage.ts`:
    - `CREDENTIAL_MIME = ['image/jpeg','image/png','image/webp','application/pdf']`, `CREDENTIAL_MAX_BYTES = 10 * 1024 * 1024`.
    - `putCredential(buffer: Buffer, mime: string): Promise<string>`, que devolve a chave `credentials/{uuid}.{jpg|png|webp|pdf}`.
    - `getCredential(key: string): Promise<{ body: Buffer; contentType: string }>`.
    
    Usa `getR2Client()` e `getR2Bucket()` de `shared/config/r2.ts`, com `PutObjectCommand` e `GetObjectCommand`.
  - `POST /auth/register-guide` (público, multipart, rate limit `{ max: 10, timeWindow: '1 minute' }`). Campos:
    - `name` (1–120), `email`, `password` (≥ 8), `cpf` (`/^\d{11}$/`);
    - `kind` (`AUTONOMO`|`ASSOCIACAO`|`AGENCIA`); `tenantId` (obrigatório se `kind` ≠ `AUTONOMO`);
    - `credentialType` (`ICMBIO`|`CADASTUR`); `credentialNumber` (opcional, 1–60);
    - arquivo `file` (obrigatório).
    
    Respostas:
    - 201 `{ message: 'Cadastro enviado. Aguarde a verificação.' }`;
    - 409 `E-mail já cadastrado` ou `CPF já cadastrado`;
    - 400 `Envie o comprovante em JPEG, PNG, WebP ou PDF` ou `O comprovante deve ter até 10 MB`;
    - 404 `Agência não encontrada` (quando `tenantId` não existe, não está aprovado, é o `independente` ou tem `type` diferente do `kind`).
  - `POST /guides/me/credential` (`authenticate`, só `CONDUTOR`, multipart). Recebe `credentialType`, `credentialNumber?` e `file`. Troca o comprovante e marca `approvalStatus: 'PENDING'`, `rejectionReason: null`, `credentialSubmittedAt: now`. Chama `notifyGuideRegistered` de novo. Responde 200 `{ message: 'Comprovante reenviado. Aguarde a verificação.' }`. Guia já `APPROVED` recebe 409 `Seu cadastro já foi aprovado`.
  - `GET /guides/me` (`authenticate`, só `CONDUTOR`) → `{ approvalStatus, rejectionReason, credentialType, credentialNumber, credentialSubmittedAt, tenantSlug, profile: { bio, photoUrl, especialidades, regioes, portfolioPhotos }, affiliation: { id, tenantName, tenantType, status, rejectionReason } | null }`. **Sem** `credentialDocKey`.
  - `GET /tenants/search?q=` (público, `q` com 2 a 60 caracteres) → `{ tenants: [{ id, name, slug, type }] }`. No máximo 10, só `approvalStatus: 'APPROVED'`, exclui `slug: 'independente'`, `name contains q mode insensitive`, ordenado por nome.
  - `POST /tenants/signup` aceita `type?: 'AGENCIA'|'ASSOCIACAO'` (padrão `AGENCIA`).
  - `guide-events.ts`:
    - `notifyGuideRegistered` passa a notificar **só a equipe**, com `link: '/super-admin/guias'`.
    - Novo `notifyAffiliationRequested(log, affiliationId)`: ADMINs do tenant, texto do Catálogo.

- [ ] **Step 1: Testes (falhando)**, com storage, prisma e eventos mockados:
  - Cadastro autônomo válido:
    - cria `User` com `role: 'CONDUTOR'`, `tenantId` do `independente` (fazer find-or-create igual ao código removido), `email` em minúsculas e `cpf` com hash;
    - cria `GuideProfile` com `credentialType`, `credentialNumber`, `credentialDocKey`, retornado de `putCredential`, e `credentialSubmittedAt`;
    - chama `notifyGuideRegistered`;
    - não cria afiliação;
    - responde 201.
  - `kind: 'AGENCIA'` com `tenantId` válido cria `GuideAffiliation { status: 'PENDING' }` e chama `notifyAffiliationRequested`.
  - `kind: 'ASSOCIACAO'` com tenant `type: 'AGENCIA'` → 404 `Agência não encontrada`.
  - Arquivo `text/plain` → 400 com a mensagem exata, e `putCredential` não é chamado. **(Review Focus 3)**
  - Arquivo acima de 10 MB → 400 `O comprovante deve ter até 10 MB`.
  - Sem arquivo → 400 `Dados inválidos` com `field: 'file'`.
  - E-mail duplicado (P2002 em `email`) → 409 `E-mail já cadastrado`.
  - `POST /auth/register-independent` → 404 (a rota deixou de existir).
  - `POST /tenants/:slug/auth/register` com `role: 'CONDUTOR'` → 400. Com `CLIENTE`, segue 201.
  - `GET /guides/me` → o corpo não tem a chave `credentialDocKey` (`expect(JSON.stringify(body)).not.toContain('credentialDocKey')`). **(Review Focus 3)**
  - `POST /guides/me/credential` com guia `REJECTED` → 200, `user.update` com `{ approvalStatus: 'PENDING', rejectionReason: null }`. Com guia `APPROVED` → 409.
  - `GET /tenants/search?q=ca` → `findMany` com `where: { approvalStatus: 'APPROVED', slug: { not: 'independente' }, name: { contains: 'ca', mode: 'insensitive' } }`, `take: 10`. `q=a` → 400.
- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3: Implementar.** Ver como `@fastify/multipart` já está registrado (`uploads.routes.ts`) e seguir o mesmo uso. O limite de tamanho é verificado pelo buffer. O `putCredential` acontece **antes** da transação. Se a transação falhar, o arquivo fica órfão no R2, o que é aceitável. Cria `User`, `GuideProfile` e, se houver, `GuideAffiliation` numa transação.
- [ ] **Step 4:** Rodar e ver passar. Suíte completa só com o baseline. `npx tsc --noEmit`.
- [ ] **Step 5:** Deixar a árvore pronta para o usuário commitar.

---

### Task 3: Verificação de guias pela equipe e vínculo com agência (API)

**Files:**
- Create: `apps/api/src/modules/guide-signup/platform-guides.routes.ts`, `apps/api/src/modules/guide-signup/affiliations.routes.ts`, e testes correspondentes em `__tests__/`
- Modify: `apps/api/src/modules/guides/guides.routes.ts` (remover `approve` e `reject` de `/tenants/:slug/admin/guides`), `apps/api/src/modules/notifications/guide-events.ts`, `apps/api/src/app.ts`

**Interfaces:**
- Consumes: `getCredential` (Task 2); `notifyGuideDecision(log, guideUserId, decision, deciderUserId)` e `resolveAction` (plano 2); o e-mail de guia aprovado e o de guia recusado que já existem.
- Produces (todas `[authenticate, authorize(['SUPER_ADMIN'])]`, o que admite `PLATFORM_ADMIN`):
  - `GET /platform/guides?status=PENDING|APPROVED|REJECTED` (padrão `PENDING`) → `{ guides: [{ userId, name, email, approvalStatus, rejectionReason, credentialType, credentialNumber, credentialSubmittedAt, hasDocument: boolean, affiliation: { tenantName, status } | null }] }`. Ordenado por `credentialSubmittedAt asc`.
  - `GET /platform/guides/:userId/credential` → corpo do arquivo com `Content-Type` do R2 e `Cache-Control: private, no-store`. Sem documento → 404 `Comprovante não encontrado`.
  - `PATCH /platform/guides/:userId/approve` → 200 `{ message: 'Guia aprovado com sucesso' }`. Envia o e-mail de aprovação e chama `notifyGuideDecision(..., { approved: true }, request.user.sub)`.
  - `PATCH /platform/guides/:userId/reject` com body `{ reasonCode: 'ILEGIVEL'|'VENCIDO'|'NOME_DIFERENTE'|'OUTRO', text?: string }` (`text` obrigatório, de 3 a 300 caracteres, se `OUTRO`) → 200 `{ message: 'Guia rejeitado' }`. Grava o rótulo (Decisões) em `rejectionReason`, envia o e-mail de recusa e chama `notifyGuideDecision`.
  - Afiliações (`authenticate`; permitido para a equipe ou para o `ADMIN` cujo `tenantId` é o da afiliação, senão 403 `Acesso negado`):
    - `GET /tenants/:slug/admin/affiliations?status=PENDING` → `{ affiliations: [{ id, status, createdAt, guide: { userId, name, email, approvalStatus } }] }`, do tenant do slug;
    - `PATCH /affiliations/:id/accept` → numa transação, a afiliação vira `ACCEPTED` e `User.tenantId` passa a ser o `tenantId` da afiliação. Depois, `resolveAction('guide-affiliation:{id}', nome)` e notificação `guide.affiliation-accepted`. 200 `{ message: 'Vínculo confirmado' }`;
    - `PATCH /affiliations/:id/reject` com `{ reason }` (3–300) → `REJECTED` com o motivo, `resolveAction` e `guide.affiliation-rejected`. 200 `{ message: 'Vínculo recusado' }`;
    - afiliação que não está `PENDING` → 409 `Pedido já decidido`.
  - `guide-events.ts` ganha `notifyAffiliationDecision(log, affiliationId, deciderUserId)`, que lê o status atual para escolher o evento.

- [ ] **Step 1: Testes (falhando):**
  - `GET /platform/guides` com token de `ADMIN` → 403; com `PLATFORM_ADMIN` → 200. O `select` do Prisma não inclui `credentialDocKey`; `hasDocument` vem de `credentialDocKey != null`.
  - `GET /platform/guides/u1/credential`: sem token → 401; `ADMIN` → 403; `CONDUTOR` → 403; `SUPER_ADMIN` → 200 com `content-type: application/pdf` (mock de `getCredential`) e `cache-control: private, no-store`. **(Review Focus 3)**
  - Reject com `{ reasonCode: 'VENCIDO' }` → `user.update` com `rejectionReason: 'Documento vencido', approvalStatus: 'REJECTED'`. Com `{ reasonCode: 'OUTRO' }` sem `text` → 400.
  - Approve chama `notifyGuideDecision` com `request.user.sub`.
  - Accept de afiliação por `ADMIN` do tenant certo → `$transaction` com `guideAffiliation.update({ status: 'ACCEPTED' })` e `user.update({ data: { tenantId } })`. Por `ADMIN` de outro tenant → 403, sem `update`. Afiliação já `ACCEPTED` → 409.
  - `PATCH /tenants/capivara/admin/guides/g1/approve` → 404 (a rota saiu).
- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3: Implementar.** Para repassar o arquivo: `reply.header('Content-Type', ...).header('Cache-Control', 'private, no-store').send(body)`.
- [ ] **Step 4:** Rodar e ver passar. Suíte completa só com o baseline. `npx tsc --noEmit`.
- [ ] **Step 5:** Deixar a árvore pronta para o usuário commitar.

---

### Task 4: Entrar e sair de destino (API)

**Files:**
- Create: `apps/api/src/modules/memberships/future-bookings.ts`, `apps/api/src/modules/memberships/destination-membership.routes.ts`, e testes em `apps/api/src/modules/memberships/__tests__/`
- Modify: `apps/api/src/modules/destinations/destinations.routes.ts` (as listagens públicas de guias passam a usar `GuideDestination`), `apps/api/src/modules/notifications/guide-events.ts`, `apps/api/src/app.ts`

**Interfaces:**
- Produces:
  - `future-bookings.ts`:
    - `findGuideFutureBookings(scope: { userId: string; guideProfileId: string; destinationId?: string; packageId?: string }): Promise<Array<{ id: string; startsAt: Date; packageName: string; status: 'PENDING' | 'CONFIRMED' }>>`, com a regra em Decisões. Exige `destinationId` ou `packageId`.
    - `type MembershipBooking = { id: string; startsAt: string; packageName: string }` para as respostas.
  - `GET /destinations/:slug/membership` (`authenticate`) → `{ state: 'NOT_GUIDE' | 'UNVERIFIED' | 'OUT' | 'IN' | 'IN_WITH_BOOKINGS', bookings: MembershipBooking[] }`. `NOT_GUIDE` vale para qualquer papel que não seja `CONDUTOR`; `UNVERIFIED` para `approvalStatus` diferente de `APPROVED`. Destino inexistente ou não aprovado → 404 `Destino não encontrado`.
  - `POST /destinations/:slug/guides/me` (`authenticate`, só `CONDUTOR`):
    - guia não aprovado → 403 `Disponível após verificação`;
    - já dentro → 200 `{ state: 'IN' }`;
    - senão cria `GuideDestination`, responde 201 `{ state: 'IN' }` e chama `notifyDestinationMembership(log, userId, destinationId, 'joined')`.
  - `DELETE /destinations/:slug/guides/me`:
    - fora → 204;
    - com reservas futuras → 409 `{ message: 'Você tem reservas pendentes, fale com o admin', bookings: MembershipBooking[] }`;
    - senão apaga a linha, responde 204 e chama `notifyDestinationMembership(..., 'left')`.
  - `guide-events.ts`: `notifyDestinationMembership(log, guideUserId, destinationId, kind: 'joined' | 'left')`, com os textos do Catálogo. Não notifica se o tenant do guia for `independente`.
  - `GET /destinations/:slug/guides` e `/destinations/:slug/guides/:guideId` passam a filtrar `destinations: { some: { destinationId: destination.id } }` em vez de `user.tenant.destinationId`, mantendo `role: 'CONDUTOR', approvalStatus: 'APPROVED'`.

- [ ] **Step 1: Testes (falhando):**
  - `findGuideFutureBookings` monta o `where` com:
    - `status: { in: ['PENDING','CONFIRMED'] }`;
    - `slot.startsAt.gt` igual a agora (usar `vi.useFakeTimers` com `vi.setSystemTime`);
    - o `OR` `[{ slot: { guideId } }, { slot: { guideId: null, package: { conductorId: userId } } }]`;
    - `slot.package.tenant.destinationId` quando há `destinationId`, ou `slot.packageId` quando há `packageId`.
  - `POST` com guia `PENDING` → 403 `Disponível após verificação`, sem `guideDestination.create`. Com token de `CLIENTE` → 403. **(Review Focus 1)**
  - `POST` aprovado → 201 e `notifyDestinationMembership` chamado com `'joined'`. Repetindo com a linha já existente → 200 e nenhum `create`. **(Review Focus 5)**
  - `DELETE` com `findGuideFutureBookings` mockado retornando 1 reserva → 409 com a mensagem exata e `bookings[0].packageName`, sem `delete`. Retornando `[]` → 204 e `delete`. **(Review Focus 4)**
  - `GET membership` mapeia corretamente os cinco estados, um caso por estado.
  - `GET /destinations/:slug/guides` → `findMany` com `where` contendo `destinations: { some: { destinationId } }`.
- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4:** Rodar e ver passar. Suíte completa só com o baseline. `npx tsc --noEmit`.
- [ ] **Step 5:** Deixar a árvore pronta para o usuário commitar.

---

### Task 5: Pedir para entrar e sair de roteiro (API)

**Files:**
- Create: `apps/api/src/modules/memberships/package-membership.routes.ts`, com teste em `__tests__/`
- Modify: `apps/api/src/modules/packages/packages.routes.ts` (remover `POST /tenants/:slug/packages/:id/guides/me`), `apps/api/src/modules/notifications/guide-events.ts`, `apps/api/src/app.ts`

**Interfaces:**
- Consumes: `findGuideFutureBookings` e `MembershipBooking` (Task 4); `notifyGuideJoinedPackage` (existente).
- Produces:
  - `canDecidePackageRequest(user: { sub: string; role: string; tenantId: string }, pkg: { tenantId: string; conductorId: string | null; tenant: { slug: string } }): boolean`. Exportada, com a regra em Decisões.
  - `GET /packages/:id/membership` (`authenticate`) → `{ state: 'NOT_GUIDE' | 'UNVERIFIED' | 'CONDUCTOR' | 'OUT' | 'PENDING' | 'REJECTED' | 'IN' | 'IN_WITH_BOOKINGS', ownerName: string, rejectionReason: string | null, bookings: MembershipBooking[] }`.
    - `CONDUCTOR`: o guia é o condutor do roteiro. Ele não pede nem sai pelo botão.
    - `ownerName`: nome do tenant do roteiro, ou nome do condutor se o tenant for `independente`.
    - `LEFT` aparece como `OUT`.
  - `POST /packages/:id/guides/me` (só `CONDUTOR`):
    - não aprovado → 403 `Disponível após verificação`;
    - condutor → 409 `Você é o guia responsável por este roteiro`;
    - `PENDING` → 200 `{ state: 'PENDING' }`;
    - `ACCEPTED` → 200 `{ state: 'IN' }`;
    - inexistente, `REJECTED` ou `LEFT` → upsert para `PENDING` (`rejectionReason: null, decidedAt: null`), responde 201 `{ state: 'PENDING' }` e chama `notifyPackageRequest(log, packageGuideId)`.
  - `DELETE /packages/:id/guides/me`:
    - `PENDING` → vira `LEFT` (cancelar pedido), `resolveAction('package-request:{id}', guideName)`, 204;
    - `ACCEPTED` sem reservas futuras do roteiro → `LEFT`, 204, `notifyPackageLeft`;
    - `ACCEPTED` com reservas → 409 com a mensagem exata e `bookings`;
    - outros casos → 204.
  - `PATCH /packages/:id/guide-requests/:packageGuideId/accept` e `.../reject` (`reject` com `{ reason }`, de 3 a 300):
    - sem permissão (`canDecidePackageRequest` falso e não é equipe) → 403 `Acesso negado`;
    - pedido que não está `PENDING` → 409 `Pedido já decidido`.
    
    `accept`: `ACCEPTED`, `decidedAt`, `resolveAction`, `package.request-accepted` para o guia e `notifyGuideJoinedPackage`. `reject`: `REJECTED` com o motivo, `resolveAction` e `package.request-rejected`. Ambos respondem 200 `{ message: 'Pedido aceito' }` ou `{ message: 'Pedido recusado' }`.
  - `guide-events.ts`: `notifyPackageRequest(log, packageGuideId)`, `notifyPackageDecision(log, packageGuideId, deciderUserId)` e `notifyPackageLeft(log, packageGuideId)`, com os textos do Catálogo.

- [ ] **Step 1: Testes (falhando):**
  - `canDecidePackageRequest`:
    - `ADMIN` do mesmo tenant → true;
    - `ADMIN` de outro → false;
    - `CONDUTOR` condutor de roteiro em `independente` → true;
    - `CONDUTOR` condutor de roteiro de agência → false;
    - `PLATFORM_ADMIN` → true.
  - `POST` com guia `PENDING` → 403, sem upsert. **(Review Focus 1)**
  - `POST` com pedido já `PENDING` → 200 `{ state: 'PENDING' }`, sem upsert nem notificação. **(Review Focus 5)**
  - `POST` após `REJECTED` → upsert com `status: 'PENDING', rejectionReason: null` e `notifyPackageRequest` chamado.
  - `PATCH accept` por `ADMIN` de outro tenant → 403, sem `update`. **(Review Focus 2)**
  - `PATCH accept` pelo dono → `update` com `status: 'ACCEPTED'`, e `resolveAction('package-request:pg1', <nome>)` chamado.
  - `PATCH reject` sem `reason` → 400.
  - `DELETE` com `ACCEPTED` e reserva futura → 409 com a mensagem exata. Sem reserva → 204 e `status: 'LEFT'`. **(Review Focus 4)**
  - `POST /tenants/capivara/packages/p1/guides/me` → 404 (a rota saiu).
- [ ] **Step 2:** Rodar e ver falhar.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4:** Rodar e ver passar. Suíte completa só com o baseline. `npx tsc --noEmit`.
- [ ] **Step 5:** Deixar a árvore pronta para o usuário commitar.

---

### Task 6: Cadastro único na web

**Files:**
- Modify (reescrever): `apps/web/app/cadastro/guia/page.tsx`
- Create: `apps/web/app/api/auth/register-guide/route.ts`, `apps/web/app/api/tenants/search/route.ts`, `apps/web/lib/compress-image.ts`
- Delete: `apps/web/app/api/auth/register-independent/route.ts`
- Modify: `apps/web/app/onboarding/page.tsx` (o passo "Sou guia" vira link para `/cadastro/guia`; o formulário de operadora ganha o tipo Agência/Associação), `apps/web/app/[slug]/cadastro/page.tsx` (passa a redirecionar para `/cadastro/guia`), `apps/web/app/api/tenants/signup/route.ts` (se filtrar campos, repassar `type`)

**Interfaces:**
- Consumes: `POST /auth/register-guide`, `GET /tenants/search` (Task 2).
- Produces: `compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<File>`, que devolve o próprio arquivo se não for imagem ou se já for menor que 300 KB.

- [ ] **Step 1:** Ler as docs do Next citadas nas Global Constraints, em especial route handlers com `formData` e `redirect`.
- [ ] **Step 2: Route handlers.**
  - `register-guide` repassa o `formData` sem autenticação para `${API_URL}/auth/register-guide` e devolve status e corpo da API.
  - `tenants/search` repassa `?q=`.
- [ ] **Step 3: Página `/cadastro/guia`**, com três passos numa página:
  1. **"Como você trabalha?"**: Autônomo / Associação / Agência.
  2. **"Qual agência?"** ou **"Qual associação?"** (pulado se Autônomo): campo de busca por nome, com debounce de 300 ms, mínimo de 2 letras, lista de até 10 resultados filtrada pelo tipo escolhido, e o texto "Não encontrou? Cadastre-se como autônomo e peça o vínculo depois." (o vínculo depois fica fora deste plano; o texto só orienta).
  3. **"Seus dados e comprovante"**:
     - nome, e-mail, CPF, senha;
     - ICMBio / Cadastur;
     - número (opcional, com o texto "se houver");
     - arquivo com `accept="image/*,application/pdf"` e `capture="environment"` (abre a câmera no celular);
     - pré-visualização da imagem.
  
  Ao enviar: comprimir a imagem com `compressImage`; validar no cliente o limite de 10 MB e o tipo, com as mesmas mensagens da API; enviar `FormData`. Em erro de rede (`fetch` lança), manter tudo preenchido e mostrar `Não foi possível enviar. Verifique sua conexão.` com o botão **Tentar de novo**. Em 201, chamar `signIn('credentials', { email, password, redirect: false })` e `router.push('/guia/status')`.
  
  Corrigir o link "Entrar", que deve apontar para `/login`.
- [ ] **Step 4: Redirecionamentos.**
  - `/[slug]/cadastro` vira server component com `redirect('/cadastro/guia')`.
  - Em `/onboarding`, o cartão "Sou guia" leva para `/cadastro/guia`, e o passo antigo que pedia slug é removido.
  - O formulário de operadora ganha um seletor `Agência` / `Associação`, enviado como `type`.
- [ ] **Step 5: Verificar.** `npx tsc --noEmit` e eslint sem erros nos arquivos tocados.
- [ ] **Step 6:** Deixar a árvore pronta para o usuário commitar.

---

### Task 7: Status do guia, perfil enquanto pendente e "Meus destinos e roteiros" (web + 1 rota de API)

**Files:**
- Create: `apps/web/app/guia/status/page.tsx` (+ um client component), `apps/web/app/api/guides/me/credential/route.ts`
- Modify: `apps/web/app/login/page.tsx` e `apps/web/app/[slug]/login/page.tsx` (redirect pós-login do guia), `apps/web/app/[slug]/(painel)/painel/perfil/page.tsx`, `apps/web/middleware.ts` (`/guia/:path*` exige login)
- Modify (API): `apps/api/src/modules/memberships/` + teste. Adiciona `GET /guides/me/memberships`.

**Interfaces:**
- Consumes: `GET /guides/me` e `POST /guides/me/credential` (Task 2); `PATCH /tenants/:slug/guides/me/profile` (existente).
- Produces (API): `GET /guides/me/memberships` (só `CONDUTOR`) → `{ destinations: [{ slug, title }], packages: [{ id, name, destinationSlug: string | null, state: 'PENDING' | 'REJECTED' | 'IN', rejectionReason: string | null }] }`. `LEFT` não aparece. Teste: o `findMany` de `packageGuide` filtra `status: { in: ['PENDING','REJECTED','ACCEPTED'] }` e mapeia `ACCEPTED` para `IN`.

- [ ] **Step 1: API.** Teste falhando, implementação e teste passando, como acima.
- [ ] **Step 2: Página `/guia/status`**, em client component que chama `/api/proxy?path=/guides/me`. Estados:
  - `PENDING`: `Em análise desde {DD/MM}` (de `credentialSubmittedAt`, fuso `America/Sao_Paulo`), mais o texto `Enquanto isso, complete seu perfil para aparecer no site assim que for aprovado.` e o botão **Completar perfil** (para `/{tenantSlug}/painel/perfil`).
  - `REJECTED`: `Seu comprovante não foi aceito: {rejectionReason}`, mais o formulário de reenvio já preenchido com tipo e número, novo arquivo e o botão **Reenviar comprovante**. Ele chama o route handler `app/api/guides/me/credential/route.ts`, que repassa o `formData` com o token, como `app/api/uploads/photos/route.ts` faz. Reaproveita `compressImage` e o mesmo comportamento de **Tentar de novo**. Em sucesso, volta para `PENDING`.
  - `APPROVED`: `Você é um guia verificado ✓` e o link **Ir para o painel**.
  - Afiliação, se houver: `{tenantName}: vínculo não confirmado` (`PENDING`), `vínculo confirmado` (`ACCEPTED`) ou `vínculo recusado: {motivo}` (`REJECTED`).
- [ ] **Step 3: Login.** Depois de `signIn`, se o papel for `CONDUTOR` e não houver `callbackUrl` seguro, buscar `/api/proxy?path=/guides/me`. Se `approvalStatus` não for `APPROVED`, ir para `/guia/status`; senão, seguir a regra atual. Atenção: o proxy só aceita prefixos permitidos. Esta task roda antes da Task 8, que amplia o proxy, então ela mesma acrescenta `^/guides/me(/|$)` ao `ALLOWED_PATH` de `app/api/proxy/route.ts`, mantendo a normalização.
- [ ] **Step 4: Perfil.**
  - `painel/perfil` passa a carregar os dados de `/api/proxy?path=/guides/me` (campo `profile`), em vez da lista pública que só traz aprovados.
  - Ganha a seção **Meus destinos e roteiros**, que lista `GET /guides/me/memberships` com os selos `Aguardando aprovação` (`PENDING`), `Recusado: {motivo}` (`REJECTED`) e `Você atua aqui ✓` (`IN`), cada um com link para a página pública.
  - O `proxy` também precisa aceitar `/guides/me/memberships`, o que o prefixo `^/guides/me(/|$)` já cobre.
- [ ] **Step 5: Verificar.** `npx tsc --noEmit` em `apps/web` e `apps/api`, a suíte da API só com o baseline e eslint nos arquivos tocados.
- [ ] **Step 6:** Deixar a árvore pronta para o usuário commitar.

---

### Task 8: Telas de decisão (equipe e agência) e Aprovar/Recusar nas notificações

**Files:**
- Create: `apps/web/app/super-admin/guias/page.tsx` (+ client), `apps/web/app/api/platform/guides/[userId]/credential/route.ts`, `apps/web/lib/notification-actions.ts`, `apps/web/src/components/notifications/RejectReasonDialog.tsx`
- Modify: `apps/web/app/super-admin/SuperAdminNav.tsx` (item "Guias"), `apps/web/app/[slug]/(admin)/admin/guias/page.tsx` (vira "Pedidos de vínculo"), `apps/web/src/components/layout/NotificationBell.tsx`, `apps/web/app/pendencias/PendenciasList.tsx`, `apps/web/app/api/proxy/route.ts`

**Interfaces:**
- Consumes: as rotas das Tasks 3 e 5.
- Produces: `notification-actions.ts`:
  - `type RejectInput = { reasonCode: 'ILEGIVEL' | 'VENCIDO' | 'NOME_DIFERENTE' | 'OUTRO'; text?: string } | { reason: string }`;
  - `type NotificationAction = { approve: () => Promise<void>; reject: (input: RejectInput) => Promise<void>; rejectKind: 'guide-codes' | 'free-text' }`;
  - `actionFor(actionKey: string, link: string | null): NotificationAction | null`, que cobre os prefixos:
    - `guide-verification:{userId}` → `/platform/guides/{userId}/approve|reject` (`guide-codes`);
    - `guide-affiliation:{id}` → `/affiliations/{id}/accept|reject` (`free-text`);
    - `package-request:{pgId}` → `/packages/{packageId}/guide-requests/{pgId}/accept|reject` (`free-text`), com o `packageId` lido do `?package=` do `link`. Sem ele, devolve `null`.
  
  Todas as chamadas passam por `/api/proxy?path=...` com `PATCH`.

- [ ] **Step 1: Proxy.** O `ALLOWED_PATH` passa a aceitar também:
  - `^/platform/guides(/|$|\?)`;
  - `^/affiliations/[^/]+/(accept|reject)$`;
  - `^/packages/[^/]+/(membership|guides/me|guide-requests/[^/]+/(accept|reject))$`;
  - `^/destinations/[^/]+/(membership|guides/me)$`.
  
  A normalização de path continua. Escrever a regex como uma alternância única e manter a rejeição de `/notificationsX` (prefixos exatos com `(\/|$)`).
- [ ] **Step 2: `/super-admin/guias`.**
  - Abas Pendentes, Aprovados e Recusados (`GET /platform/guides?status=`).
  - Cada guia mostra nome, e-mail, tipo e número do comprovante, "Enviado em DD/MM", vínculo declarado e o botão **Ver comprovante**. Ele abre `/api/platform/guides/{userId}/credential` numa aba; esse route handler repassa o arquivo com o token e o `Content-Type`.
  - Botões **Aprovar** e **Recusar** (este abre o `RejectReasonDialog` com os quatro códigos e o texto para "Outro").
  - Estado vazio: `Nenhuma pendência`.
  - O item "Guias" aparece no `SuperAdminNav` para toda a equipe.
- [ ] **Step 3: `/[slug]/admin/guias`.** Passa a listar `GET /tenants/{slug}/admin/affiliations?status=PENDING`, com **Confirmar vínculo** e **Recusar** (motivo livre). O texto do topo é `Guias que declararam atuar com sua agência`. Vazio: `Nenhuma pendência`.
- [ ] **Step 4: Ações nas notificações.** No `NotificationBell` e na `PendenciasList`, item com `actionKey`, sem `resolvedAt` e com `actionFor(...)` não nulo mostra **Aprovar** e **Recusar**. Recusar abre o `RejectReasonDialog` no modo certo. Depois de agir, a lista e o resumo são recarregados. Erro 409 vira o aviso `Este pedido já foi decidido.` e também recarrega.
- [ ] **Step 5: Verificar.** `npx tsc --noEmit` e eslint nos arquivos tocados.
- [ ] **Step 6:** Deixar a árvore pronta para o usuário commitar.

---

### Task 9: Botões entrar/sair nas páginas públicas

**Files:**
- Create: `apps/web/src/components/membership/DestinationMembershipButton.tsx`, `apps/web/src/components/membership/PackageMembershipButton.tsx`
- Modify: `apps/web/app/destinos/[destination-slug]/page.tsx` (botão na área `roteiros-cta` ou numa seção logo acima), `apps/web/app/destinos/[destination-slug]/roteiros/[id]/page.tsx` (botão no `<header>`, abaixo do subtítulo)

**Interfaces:**
- Consumes: `GET|POST|DELETE /destinations/:slug/(membership|guides/me)` e `GET|POST|DELETE /packages/:id/(membership|guides/me)` via `/api/proxy`.

- [ ] **Step 1: Componentes client.** Usam `useSession()`. Sem sessão, ou com estado `NOT_GUIDE`, `return null` e nenhum fetch (visitante não vê nada). Textos exatos da tabela da spec:

  | Estado | Destino | Roteiro |
  |---|---|---|
  | `UNVERIFIED` | botão desabilitado `Disponível após verificação` | idem |
  | `OUT` | `Quero atuar neste destino` | `Quero atuar neste roteiro` |
  | `PENDING` | — | `Pedido enviado · aguardando {ownerName}` + **Cancelar pedido** |
  | `REJECTED` | — | `Pedido recusado: {rejectionReason}` + **Pedir de novo** |
  | `IN` | `Você atua aqui ✓` + **Sair** | `Você atua aqui ✓` + **Sair** |
  | `IN_WITH_BOOKINGS` | `Você atua aqui ✓`, **Sair** desabilitado, `Você tem reservas pendentes, fale com o admin` e a lista `DD/MM · {packageName}` | idem |
  | `CONDUCTOR` | — | `Você é o guia responsável por este roteiro` (sem botão) |

  - **Sair** e **Cancelar pedido** pedem confirmação (`window.confirm`).
  - Depois de cada ação, o estado é recarregado de `membership`.
  - Uma resposta 409 com `bookings` atualiza para `IN_WITH_BOOKINGS`.
  - Botão desabilitado durante a chamada (evita o clique duplo da Review Focus 5).
- [ ] **Step 2:** Encaixar nas duas páginas, que são server components e renderizam o client component. Seguir o estilo visual das páginas, com variáveis CSS `--ochre` e `--stone-*`.
- [ ] **Step 3: Verificar.** `npx tsc --noEmit` e eslint nos arquivos tocados.
- [ ] **Step 4: Verificação manual (para o usuário, com banco):**
  1. Cadastrar um guia autônomo com foto do comprovante.
  2. Entrar e ver "Em análise".
  3. Como admin, ver o comprovante e aprovar pelo sininho.
  4. Como guia, entrar num destino.
  5. Pedir um roteiro de agência.
  6. Como dono da agência, aceitar pela notificação.
  7. Como guia, ver `Você atua aqui ✓` nas duas páginas e em "Meus destinos e roteiros".
- [ ] **Step 5:** Deixar a árvore pronta para o usuário commitar.
