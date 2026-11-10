# Captura de Leads, Meta Pixel e Link do Guia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar à campanha de validação os três pré-requisitos de produto: o turista deixa interesse (nome + WhatsApp) salvo no banco com UTMs, o Meta Pixel mede PageView/Lead, e cada guia aprovado tem um link de divulgação com UTM.

**Architecture:** Novo módulo de API `leads` (modelo Prisma `Lead`, rota pública `POST /leads` com Zod + rate limit, e-mail para a equipe via Resend). No web: utilitário de UTM persistido em `sessionStorage` desde a primeira página, componente `LeadForm` nas páginas de destino e de roteiro sem datas, `MetaPixel` carregado só com consentimento de cookies (mesma regra do PostHog), e card "Seu link de divulgação" no painel do guia.

**Tech Stack:** Fastify 5 + Prisma 7 + Zod + Vitest (API); Next.js 16.2 + React 19 + Vitest/Testing Library (web); Resend; PostHog; Meta Pixel (`fbevents.js`).

**Spec:** `docs/marketing/2026-11-10-campanha-validacao-capi-design.md` (§7 e §8)

## Global Constraints

- **Commits:** o usuário faz todos os commits manualmente. Nenhum passo deste plano roda `git commit`; ao fim de cada task, pare e informe os arquivos alterados.
- Mensagens de erro e textos de UI em **português**.
- Toda rota valida payload com **Zod** via `parseBody` (`apps/api/src/shared/utils/zod-error`).
- LGPD: captura exige consentimento explícito (`consent: true`) com link para `/politica-privacidade`; Pixel e PostHog só carregam com `localStorage['capi-cookie-consent'] === 'accepted'`.
- Copy do lead (sucesso): **"Recebemos! A equipe CAPI vai te chamar no WhatsApp em até 24 h."**
- UTM do guia: `utm_source=guia&utm_medium=social&utm_campaign=<guideProfile.id>`.
- `apps/web/AGENTS.md`: Next.js 16 tem mudanças — consultar `node_modules/next/dist/docs/` antes de usar API do Next que não esteja já usada no repositório (ex.: `next/script`).
- Variáveis novas: `LEAD_NOTIFY_EMAIL` (API) e `NEXT_PUBLIC_META_PIXEL_ID` (web) — documentar nos `.env.example`.

## Review Focus

- **Destino inexistente ou inativo no `POST /leads`** → 404 "Destino não encontrado", nada gravado. (teste na Task 1)
- **Falha do Resend / variável ausente** → o lead é gravado e a resposta é 201 mesmo assim; o e-mail nunca derruba a requisição. (teste na Task 1)
- **Turista chega por anúncio em `/destinos/x?utm_...` e só converte depois de navegar para um roteiro** → o lead leva as UTMs da página de entrada. (teste na Task 2)
- **Usuário recusou cookies** → Pixel não carrega e `trackPixel` não lança. (teste na Task 3)
- **Duplo clique em "Enviar"** → um só POST. (teste na Task 4)

---

### Task 1: API — modelo `Lead` e `POST /leads`

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (novo model no fim do arquivo)
- Create: `apps/api/prisma/migrations/20261110000000_lead/migration.sql` (gerar com `pnpm --filter api exec prisma migrate dev --name lead --create-only` e renomear a pasta para este nome se necessário)
- Create: `apps/api/src/shared/validation/whatsapp.ts` (mover `whatsappSchema` de `apps/api/src/modules/tenants/tenant-settings.routes.ts:21-29` para cá, exportado; atualizar o import lá)
- Create: `apps/api/src/modules/leads/leads.routes.ts`
- Create: `apps/api/src/modules/leads/lead-notify.ts`
- Modify: `apps/api/src/app.ts` (registrar `leadsRoutes` junto dos demais, ~linha 169)
- Modify: `apps/api/.env.example` (`LEAD_NOTIFY_EMAIL=`)
- Test: `apps/api/src/modules/leads/__tests__/leads.routes.test.ts`

**Interfaces:**
- Produces (HTTP): `POST /leads` body `{ name: string; whatsapp: string; destinationSlug: string; packageId?: string; travelMonth?: string /* "AAAA-MM" */; consent: true; utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string; utmTerm?: string }` → `201 { id: string }`; `400` Zod; `404 { message: 'Destino não encontrado' }`; rate limit `{ max: 10, timeWindow: '1 minute' }`.
- Produces: `notifyLeadCreated(log: FastifyBaseLogger, lead: Lead & { destinationTitle: string }): Promise<void>` — nunca lança.

Model:

```prisma
model Lead {
  id              String   @id @default(cuid())
  name            String
  whatsapp        String
  destinationSlug String
  packageId       String?
  travelMonth     String?
  consent         Boolean
  utmSource       String?
  utmMedium       String?
  utmCampaign     String?
  utmContent      String?
  utmTerm         String?
  createdAt       DateTime @default(now())

  @@index([destinationSlug])
  @@index([createdAt])
}
```

(Lead é entidade da plataforma, sem `tenantId` — destinos são globais.)

- [ ] **Step 1: Escrever os testes que falham** (padrão de mock de `../../../database` e `buildApp` de `apps/api/src/modules/guide-signup/__tests__/guide-signup.routes.test.ts`; mock de `../lead-notify`):
  - `cria lead válido → 201 com id` — `destination.findUnique` resolve `{ id: 'd1', title: 'Serra da Capivara' }`; `lead.create` recebe `data` com `name`, `whatsapp: '(89) 99999-0000'`, `destinationSlug: 'serra-da-capivara'`, `utmSource: 'meta'`, `consent: true`; `notifyLeadCreated` chamado 1×.
  - `consent false → 400` e `lead.create` não chamado.
  - `whatsapp '123' → 400`.
  - `travelMonth '2026-13' → 400`; `'2026-12'` aceito.
  - `destino inexistente → 404 'Destino não encontrado'`, `lead.create` não chamado (busca com `where: { slug, active: true }`).
  - `utmSource com 101 caracteres → 400` (limite 100 em cada utm*).
  - `notifyLeadCreated rejeita → ainda 201` (Review Focus).
- [ ] **Step 2:** `pnpm --filter api test -- leads` → FAIL (módulo não existe).
- [ ] **Step 3:** Adicionar o model, gerar a migration, rodar `pnpm --filter api exec prisma generate`.
- [ ] **Step 4:** Mover `whatsappSchema` para `shared/validation/whatsapp.ts`; implementar `leadsRoutes(app: FastifyInstance)` com o schema Zod (`name` trim 2–80, `consent: z.literal(true, { message: 'Consentimento obrigatório' })`, `travelMonth` regex `/^\d{4}-(0[1-9]|1[0-2])$/`). Chamar `notifyLeadCreated` sem `await` bloqueante de erro (envolva em `.catch` ou confie no "nunca lança" + teste).
- [ ] **Step 5:** Implementar `notifyLeadCreated`: se `getResend()` for null ou `LEAD_NOTIFY_EMAIL` vazio, retorna; senão envia e-mail `subject: Novo lead: <nome> — <destinationTitle>` com nome, WhatsApp, destino, roteiro, mês e UTMs; `catch` → `log.warn`.
- [ ] **Step 6:** `pnpm --filter api test` → PASS (todos, incluindo os de `tenant-settings` após mover o schema). `pnpm --filter api exec tsc --noEmit` sem erros.
- [ ] **Step 7:** Parar e listar os arquivos para o usuário commitar.

### Task 2: Web — UTMs persistidas desde a entrada

**Files:**
- Create: `apps/web/src/lib/utm.ts`
- Create: `apps/web/src/components/tracking/UtmCapture.tsx`
- Modify: `apps/web/app/layout.tsx` (renderizar `<UtmCapture />` dentro do `<Suspense>` existente, ao lado do `PostHogProvider`)
- Test: `apps/web/src/lib/utm.test.ts`

**Interfaces:**
- Produces: `type Utm = { utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string; utmTerm?: string }` (o kit de tráfego pago usa `utm_term` para separar os públicos A/B/R)
- Produces: `parseUtm(search: string): Utm` (puro; ignora vazios; corta em 100 caracteres)
- Produces: `saveUtm(utm: Utm): void` — grava em `sessionStorage['capi-utm']` só se `utm` tiver ao menos `utmSource` (última origem com UTM vence); try/catch silencioso.
- Produces: `loadUtm(): Utm` — `{}` se ausente ou se o storage lançar.

- [ ] **Step 1: Testes que falham:** `parseUtm('?utm_source=meta&utm_campaign=validacao-capivara')` → `{ utmSource: 'meta', utmCampaign: 'validacao-capivara' }`; `parseUtm('')` → `{}`; valor de 150 chars → 100 chars; `saveUtm({ utmSource:'meta' })` e depois `saveUtm({})` → `loadUtm()` ainda `{ utmSource:'meta' }` (navegação sem UTM não apaga a origem — Review Focus); `sessionStorage.getItem` lançando → `loadUtm()` retorna `{}`.
- [ ] **Step 2:** `pnpm --filter web test -- utm` → FAIL.
- [ ] **Step 3:** Implementar `utm.ts` e `UtmCapture` (client; `useSearchParams` + `useEffect` → `saveUtm(parseUtm(searchParams.toString()))`; retorna `null`).
- [ ] **Step 4:** `pnpm --filter web test -- utm` → PASS.
- [ ] **Step 5:** Parar e listar arquivos.

### Task 3: Web — Meta Pixel com consentimento

**Files:**
- Create: `apps/web/src/lib/meta-pixel.ts`
- Create: `apps/web/src/components/tracking/MetaPixel.tsx`
- Modify: `apps/web/app/layout.tsx` (renderizar `<MetaPixel />` dentro do mesmo `<Suspense>`)
- Modify: `apps/web/.env.example` (`NEXT_PUBLIC_META_PIXEL_ID=`)
- Modify: `apps/web/next.config.ts` **somente se** houver CSP configurada (hoje não há) — liberar `connect.facebook.net` e `www.facebook.com`.
- Test: `apps/web/src/lib/meta-pixel.test.ts`

**Interfaces:**
- Produces: `initMetaPixel(pixelId: string): void` — injeta o snippet oficial `fbevents.js` uma única vez e chama `fbq('init', pixelId)`.
- Produces: `trackPixel(event: 'PageView' | 'Lead', params?: Record<string, unknown>): void` — no-op se `window.fbq` não existir.
- `MetaPixel` (client): se `NEXT_PUBLIC_META_PIXEL_ID` existe e consentimento `accepted` → `initMetaPixel`; em toda mudança de `pathname` → `trackPixel('PageView')`.

- [ ] **Step 1: Testes que falham:** `trackPixel('Lead')` sem `window.fbq` não lança; com `window.fbq = vi.fn()` chama `fbq('track', 'Lead', undefined)`; `initMetaPixel('123')` 2× injeta um único `<script src*="fbevents.js">` e chama `fbq('init','123')`; render de `<MetaPixel />` com consentimento `rejected` não injeta script (Review Focus).
- [ ] **Step 2:** `pnpm --filter web test -- meta-pixel` → FAIL.
- [ ] **Step 3:** Implementar (o stub de fila do `fbq` do snippet oficial é necessário para os eventos disparados antes do script carregar).
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** Parar e listar arquivos.

### Task 4: Web — `LeadForm` e onde ele aparece

**Files:**
- Create: `apps/web/src/components/leads/LeadForm.tsx`
- Modify: `apps/web/app/destinos/[destination-slug]/page.tsx` — nova `<section id="quero-ir" className="dest__section">` logo **antes** da seção "6. CTA — Roteiros" (~linha 307), título `Quer conhecer {destination.title}?` e subtítulo `Deixe seu contato e a gente te ajuda a montar a viagem com um guia de lá.`
- Modify: `apps/web/app/[slug]/(public)/roteiros/[packageId]/page.tsx:332-337` — quando `!hasSlots`, trocar o `EmptyState` "Nenhuma data disponível" por `<LeadForm destinationSlug={destinationSlug} packageId={pkg.id} compact heading="Me avise quando abrir data" />` (se `destinationSlug` for vazio, manter o `EmptyState`).
- Test: `apps/web/src/components/leads/LeadForm.test.tsx`

**Interfaces:**
- Consumes: `POST /leads` (Task 1) via `api()` de `apps/web/src/lib/api.ts`; `loadUtm()` (Task 2); `trackPixel` (Task 3); `normalizeWhatsapp` de `apps/web/src/lib/whatsapp.ts`; `posthog` de `apps/web/src/lib/posthog.ts`; `Input`, `Select`, `Button`, `Alert` de `@/src/components/ui/capi`.
- Produces: `LeadForm(props: { destinationSlug: string; packageId?: string; heading?: string; compact?: boolean }): JSX.Element` (client).

Campos: Nome (obrigatório), WhatsApp (obrigatório, `normalizeWhatsapp`), "Quando pretende ir?" (`Select` opcional com os próximos 12 meses, valor `AAAA-MM`, rótulo `dezembro de 2026`), checkbox de consentimento "Autorizo a CAPI a me chamar no WhatsApp sobre esta viagem. [Política de privacidade]" (obrigatório). Botão "Quero ir".

- [ ] **Step 1: Testes que falham** (mock de `@/src/lib/api`, `posthog`, `meta-pixel`):
  - envio válido chama `api('/leads', { method: 'POST', body: { name, whatsapp, destinationSlug: 'serra-da-capivara', packageId: undefined, travelMonth: undefined, consent: true, utmSource: 'meta' } })` com `sessionStorage['capi-utm']` pré-setado;
  - após sucesso mostra o texto exato da copy de sucesso e chama `posthog.capture('lead_created', expect.objectContaining({ destinationSlug: 'serra-da-capivara', utmSource: 'meta' }))` e `trackPixel('Lead', expect.anything())`;
  - sem consentimento: não chama `api`, mostra erro "Marque a autorização para continuar.";
  - WhatsApp `123`: mostra o erro de `normalizeWhatsapp`;
  - API rejeita: mostra `Alert` "Não foi possível enviar agora. Tente de novo em instantes." e mantém os dados;
  - dois cliques rápidos em "Quero ir" → `api` chamado 1× (Review Focus).
- [ ] **Step 2:** `pnpm --filter web test -- LeadForm` → FAIL.
- [ ] **Step 3:** Implementar `LeadForm`; inserir nas duas páginas.
- [ ] **Step 4:** PASS; `pnpm --filter web exec tsc --noEmit` sem erros.
- [ ] **Step 5:** Parar e listar arquivos.

### Task 5: Web — link de divulgação no painel do guia

**Files:**
- Create: `apps/web/src/lib/share-link.ts`
- Modify: `apps/web/app/[slug]/(painel)/painel/perfil/page.tsx` — card "Seu link de divulgação" visível quando `profile` carregado e `profile.user.approvalStatus === 'APPROVED'` (se o campo não existir em `GuideProfileData`, exibir sempre que `profile` existir), com o link em `<Input readOnly>` e botão "Copiar link" (`navigator.clipboard.writeText`, feedback "Link copiado!"). Texto de apoio: "Use este link no seu Instagram, WhatsApp e status. Assim a gente sabe quantas pessoas você trouxe."
- Test: `apps/web/src/lib/share-link.test.ts`

**Interfaces:**
- Produces: `guideShareUrl(origin: string, guideProfileId: string): string` → `${origin}/guias/${id}?utm_source=guia&utm_medium=social&utm_campaign=${id}` (sem barra dupla se `origin` terminar em `/`).

- [ ] **Step 1: Teste que falha:** `guideShareUrl('https://capi.app', 'gp1')` → `'https://capi.app/guias/gp1?utm_source=guia&utm_medium=social&utm_campaign=gp1'`; `guideShareUrl('https://capi.app/', 'gp1')` → mesmo resultado.
- [ ] **Step 2:** FAIL → **Step 3:** implementar + card → **Step 4:** PASS.
- [ ] **Step 5:** Parar e listar arquivos.

### Task 6: Verificação ponta a ponta

- [ ] `pnpm --filter api test` e `pnpm --filter web test` → todos PASS.
- [ ] `pnpm --filter api exec tsc --noEmit` e `pnpm --filter web exec tsc --noEmit` → sem erros; `pnpm --filter web build` → sucesso.
- [ ] Subir API + web localmente; abrir `/destinos/<slug>?utm_source=meta&utm_campaign=teste`, navegar para um roteiro sem datas, enviar o `LeadForm` → linha em `Lead` com `utmSource='meta'`; e-mail aparece no log (ou chega, se `RESEND_API_KEY`/`LEAD_NOTIFY_EMAIL` setados).
- [ ] Com consentimento aceito e `NEXT_PUBLIC_META_PIXEL_ID` de teste: Meta Pixel Helper mostra `PageView` e `Lead`. Com consentimento recusado: nenhum request para `facebook.net`.
- [ ] Painel do guia: link copiado abre o perfil público com as UTMs.
- [ ] Lembrar o usuário: configurar `LEAD_NOTIFY_EMAIL` (Railway), `NEXT_PUBLIC_META_PIXEL_ID` e conferir `NEXT_PUBLIC_POSTHOG_KEY` (Vercel); rodar a migration no deploy (já é feita no `preDeployCommand`).

---

**Fora do escopo (anotado):** `apps/web/app/actions/waitlist.ts` continua órfão (não é usado por nenhuma tela) — não remover sem pedido do usuário. Tela de listagem de leads no painel: não agora; a equipe opera pelo e-mail + WhatsApp e conta M3 direto no banco.
