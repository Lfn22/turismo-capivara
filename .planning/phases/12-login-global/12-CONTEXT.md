# Phase 12: Login Global - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Criar um portal único `/login` onde qualquer usuário da plataforma (guia, admin, agência) acessa o sistema sem precisar conhecer o slug da sua operadora. O email digitado resolve automaticamente o tenant. Inclui fluxo completo de recuperação de senha por email.

**Escopo:**
- Página `/login` em Next.js (dois passos: email → agência → senha)
- Nova rota API: `POST /auth/lookup-tenant`
- Fluxo forgot/reset password (nova tabela DB + endpoints API + páginas Next.js)
- Atualização do botão "Painel" na `PublicNav`
- Links "Cadastrar agência" no form e "Já tem conta?" no onboarding

**Sem mudanças em:** lógica de booking, destinos, roteiros, painel do guia.

</domain>

<decisions>
## Implementation Decisions

### Fluxo de Login

- **D-01:** Fluxo em **dois passos** — Passo 1: usuário digita só o email; sistema faz lookup e exibe o nome da agência encontrada. Passo 2: usuário digita a senha e faz login.
- **D-02:** No passo 2, link discreto **"Não é você?"** permite voltar ao passo 1 para corrigir o email (padrão Google/GitHub).
- **D-03:** Lookup implementado via **nova rota API**: `POST /auth/lookup-tenant { email }` → `{ tenantName, tenantSlug }`. Sem Server Actions — mantém padrão API-first do projeto.
- **D-04:** Passo 2 reutiliza o `/auth/login` existente com o `tenantSlug` resolvido no passo 1. O `tenantSlug` não aparece na UI.

### Email em Múltiplos Tenants

- **D-05:** Email **único por plataforma** — duplicata bloqueada na criação de usuário. Usuário não pode ter conta em 2+ tenants (escopo MVP).
- **D-06:** Quando email não encontrado: mensagem **genérica** — "Nenhuma conta encontrada com esse email". Não revela se o email existe ou não (prevenção de enumeração, consistente com Phase 10).

### Forgot Password

- **D-07:** Token armazenado em **nova tabela `PasswordResetToken`** no banco (Prisma) com token hasheado (bcryptjs), `userId`, `expiresAt`, `usedAt`. Revogável.
- **D-08:** TTL do token: **1 hora**.
- **D-09:** Após reset bem-sucedido, redirecionar para **`/login`**. Usuário entra com a nova senha conscientemente — sem auto-login.

### Visual do /login

- **D-10:** Layout **card centralizado**, mesmo estilo do `/onboarding` — card branco no centro, fundo da marca CAPI. Consistência visual sem custo de novo design.

### Claude's Discretion

- Estrutura interna do card no passo 1 vs passo 2 (animação/transição entre passos): Claude decide abordagem (fade, slide, ou troca de conteúdo no mesmo container)
- Template do email de reset de senha: Claude escreve o copy em português
- Rate limiting no `/auth/lookup-tenant`: Claude aplica limite conservador (ex: 10/min por IP, consistente com padrão do projeto)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth (API)
- `apps/api/src/modules/auth/auth.routes.ts` — Endpoint `/auth/login` existente com `tenantSlug` obrigatório; novo `/auth/lookup-tenant` será adicionado aqui
- `apps/api/src/shared/email.ts` — `getResend()` helper para envio de emails — reutilizar para email de reset

### Frontend
- `apps/web/src/components/layout/PublicNav.tsx` — Botão "Painel" a ser atualizado para `/login`

### Design System
- `apps/web/src/app/globals.css` — Tokens CSS consolidados na Phase 11 — usar para estilizar `/login`
- `.planning/phases/11-frontend-polish/11-CONTEXT.md` — Decisões de brand CAPI e tokens CSS

### Requirements desta fase
- `.planning/REQUIREMENTS.md` §LOGIN-01–05 — Todos os critérios de aceite

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/modules/auth/auth.routes.ts` — `/auth/login` existente aceita `{ email, password, tenantSlug }`. O fluxo de dois passos passa o `tenantSlug` descoberto no passo 1.
- `apps/api/src/shared/email.ts` — `getResend()` já configurado com Resend SDK — reutilizar para email de reset de senha (fire-and-forget com `void`, padrão do projeto)
- `bcryptjs` — já instalado na API para hash de senhas; usar também para hash do token de reset
- `apps/web/src/components/layout/PublicNav.tsx` — componente existente a modificar (href do botão "Painel")
- Página `/onboarding` — referência visual para o card centralizado do `/login`

### Established Patterns
- Rate limiting via `@fastify/rate-limit` com config por rota — aplicar ao `/auth/lookup-tenant`
- `AppError` para erros de negócio (404 para email não encontrado)
- `prisma.$transaction` para operações que envolvem múltiplas tabelas (ex: criar token + invalidar anteriores)
- Zod schemas para validação em todas as rotas — obrigatório (Phase 1)
- Mensagens de erro em português

### Integration Points
- `PublicNav` — atualizar href do botão "Painel" para `/login`
- `/onboarding` — adicionar link "Já tem conta? → /login"
- Prisma schema — adicionar model `PasswordResetToken` + migration

</code_context>

<specifics>
## Specific Ideas

- Passo 2 da página `/login` mostra: nome da agência descoberta + campo senha + link "Não é você?" + link "Esqueceu a senha?"
- `/auth/lookup-tenant` retorna 404 com mensagem genérica quando email não encontrado (não revela existência do email)
- Emails duplicados são bloqueados na criação de usuário (constraint existente ou nova no schema)

</specifics>

<deferred>
## Deferred Ideas

- Suporte a múltiplos tenants por email (guia freelancer em 2+ agências) — escopo pós-MVP, Phase 13+
- Auto-login após reset de senha — decidido contra para MVP

</deferred>

---

*Phase: 12-login-global*
*Context gathered: 2026-06-01*
