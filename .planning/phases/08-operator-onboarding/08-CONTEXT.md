# Phase 8: Operator Onboarding - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Operadoras se registram sem intervenção manual do dev — formulário público cria Tenant + usuário ADMIN atomicamente; super-admin aprova/rejeita via painel central; operadora recebe email de notificação; CPF do turista no Booking é migrado para hash HMAC-SHA256 (LGPD SEC-05).

**Em escopo:**
- POST /api/tenants/signup — endpoint público (sem auth) cria Tenant + ADMIN atomicamente
- GET /api/tenants/check-slug — validação de slug disponível (público, sem auth)
- Tenant.approvalStatus — novo campo no schema (PENDING → APPROVED | REJECTED)
- Role SUPER_ADMIN — novo valor no enum Role do Prisma
- Página /onboarding — formulário público de cadastro de operadora
- Página /onboarding/aguardando — checklist pós-signup (status da aprovação)
- Painel /super-admin/operadoras — lista + aprovar/rejeitar operadoras (SUPER_ADMIN only)
- Email de aprovação/rejeição via Resend (template texto simples)
- Migração SEC-05: customerCpf → customerCpfHash no Booking

**Fora de escopo:**
- Verificação de email no signup (ONBOARD-04 — v1.2)
- CAPTCHA no signup
- Templates React Email (Phase 9)
- Multi-super-admin
- SSO/OAuth para operadoras

</domain>

<decisions>
## Implementation Decisions

### Super-admin model
- **D-01:** `SUPER_ADMIN` adicionado ao enum `Role` no Prisma schema. Protegido via `authorize(['SUPER_ADMIN'])` middleware existente.
- **D-02:** Super-admin criado via seed/migration — não via formulário público.
- **D-03:** Painel em `/super-admin/operadoras` — rota global da web app, sem slug no path. Layout próprio, separado de `/[slug]/(admin)/admin/`.
- **D-04:** `Tenant` model recebe campo `approvalStatus TenantApprovalStatus @default(PENDING)` + `rejectionReason String?`. Enum novo: `PENDING | APPROVED | REJECTED`.
- **D-05:** Tenants com `approvalStatus != APPROVED` não aparecem em listagens públicas.

### Slug validation UX
- **D-06:** Validação em tempo real com debounce de 500ms — chama `GET /api/tenants/check-slug?slug=xxx` enquanto o usuário digita.
- **D-07:** Slug é auto-gerado via slugify a partir do nome da operadora (ex: "Capivara Tours" → "capivara-tours"), pré-preenchido no campo slug e editável.
- **D-08:** Sem sugestões automáticas quando slug está ocupado — apenas feedback de erro (❌ Slug já em uso).

### CPF migration (SEC-05)
- **D-09:** Não há bookings reais em produção — apenas dados de teste/seed. Sem necessidade de dual-read.
- **D-10:** `customerCpf String?` é renomeado para `customerCpfHash String?` no schema Prisma. Prisma migration inclui SQL de backfill que aplica `hashCpf()` nos registros existentes antes de renomear.
- **D-11:** Reutiliza a env var `CPF_SECRET` e a função `hashCpf()` já implementada em `auth.routes.ts` (HMAC-SHA256). Extrair `hashCpf()` para utilitário compartilhado em `src/shared/utils/hash.ts`.
- **D-12:** Toda nova escrita de booking passa o CPF pelo `hashCpf()` antes de persistir. CPF nunca armazenado em plaintext após a migration.

### Approval notification
- **D-13:** Email enviado via Resend quando super-admin aprova ou rejeita uma operadora.
- **D-14:** Template texto simples (sem React Email — templates visuais ficam para Phase 9). Dois templates inline: `approval-email.ts` e `rejection-email.ts` em `apps/api/src/modules/tenants/emails/`.
- **D-15:** Rejeição inclui `rejectionReason` no corpo do email.

### Claude's Discretion
- Checklist pós-signup (/onboarding/aguardando): estático (3 itens fixos — completar perfil, criar guia, aguardar aprovação). Sem polling ou estado no BD — simples e suficiente.
- Configuração do Resend (API key via env var `RESEND_API_KEY`). Se ausente, logar warning e pular envio (não quebrar o fluxo de aprovação).
- Rate limiting no POST /signup: aplicar `config: { rateLimit: { max: 5, timeWindow: '1 hour' } }` (proteção básica contra spam).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap e requisitos
- `.planning/ROADMAP.md` §Phase 8 — Goal, success criteria, requirements list
- `.planning/REQUIREMENTS.md` §Onboarding (ONBOARD-01, ONBOARD-02, ONBOARD-03), §Segurança (SEC-05)

### Schema e auth existentes
- `apps/api/prisma/schema.prisma` — modelos Tenant, User, Booking, enum Role; campo customerCpf a migrar
- `apps/api/src/modules/auth/auth.routes.ts` — `hashCpf()` existente (HMAC-SHA256 + CPF_SECRET), padrão de registro de usuário
- `apps/api/src/modules/tenants/tenants.routes.ts` — padrão existente de tenant routes
- `apps/api/src/shared/middlewares/authenticate.ts` — middleware de auth JWT
- `apps/api/src/shared/middlewares/authorize.ts` — middleware de autorização por role

### Prior phase context (padrões estabelecidos)
- `.planning/phases/07-platform-hardening/07-CONTEXT.md` — rate limiting patterns, AppError, Railway trustProxy
- `.planning/phases/06-interface-do-turista/06-CONTEXT.md` — rota structure `/[slug]/...`, RSC fetch pattern, erros em português

### Web app estrutura
- `apps/web/app/[slug]/(admin)/admin/guias/page.tsx` — padrão do painel admin (referência de layout)
- `apps/web/app/[slug]/login/page.tsx` — padrão de página de auth (referência)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `hashCpf(cpf)` em `auth.routes.ts` — extrair para `src/shared/utils/hash.ts` e reutilizar em bookings e na migration
- `authenticate` + `authorize` middlewares em `src/shared/middlewares/` — reutilizar para rotas SUPER_ADMIN
- `AppError` em `src/shared/errors/AppError.ts` — padrão de erro com statusCode + message em português
- `GET /tenants/:slug` — endpoint público existente, serve de referência para o check-slug

### Established Patterns
- Rotas escopadas: `/tenants/:slug/resource` no backend; `/[slug]/...` no frontend (exceto `/super-admin/*` que é global)
- Zod schemas para validação de body/params em cada rota — manter padrão
- `prisma.$transaction` para operações atômicas (anti-overbooking pattern — aplicar no signup)
- RSC fetch: page.tsx busca seus próprios dados sem estado global
- Erros em português: `{ message, errors }` via AppError
- `use(params)` para Client Components com dynamic params no Next.js 16

### Integration Points
- `enum Role` no schema.prisma — adicionar `SUPER_ADMIN`
- `model Tenant` — adicionar `approvalStatus` + `rejectionReason`
- `model Booking` — renomear `customerCpf` → `customerCpfHash`
- `apps/api/src/app.ts` — registrar novas rotas de signup e check-slug
- `apps/web/app/` — novas páginas `/onboarding/` e `/super-admin/`

</code_context>

<specifics>
## Specific Ideas

- Signup form layout inspirado nos outros formulários existentes (email/senha com erro em português abaixo de cada campo)
- Super-admin panel: tabela simples com colunas Nome, Slug, Email, Data de cadastro, Status, Ações (Aprovar / Rejeitar)
- Rejeição abre modal com textarea obrigatório para motivo (mesmo padrão do modal de rejeição de guia em Phase 2)
- Checklist pós-signup: 3 itens estáticos com checkmarks visuais (não dinâmicos)

</specifics>

<deferred>
## Deferred Ideas

- React Email templates visuais para aprovação/rejeição — Phase 9 (todos os templates juntos)
- Verificação de email no signup (ONBOARD-04) — v1.2
- CAPTCHA no signup — monitorar; adicionar se spam > 10/dia (v1.5)
- Multi-super-admin — não há necessidade agora; env seed cobre

</deferred>

---

*Phase: 08-operator-onboarding*
*Context gathered: 2026-05-17*
