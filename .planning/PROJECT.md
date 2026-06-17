# Turismo Capivara

## Current Milestone: v1.3 MVP Stability & Payment Integrity

**Goal:** Corrigir todos os pontos de quebra identificados na auditoria de produto antes de operar com clientes reais — pagamento atomicamente seguro, segurança multi-tenant, UX de checkout completa e confiabilidade operacional.

**Target features:**
- Integridade de pagamento — MP_ACCESS_TOKEN validado em produção, booking+PIX atômico, polling de status no checkout, CPF com algoritmo real
- Segurança multi-tenant — rate limit + token opaco no cancel-self, isolamento de tenant em confirm/cancel, deduplicação de webhook
- UX do checkout — countdown do PIX, QR code visual, link "minha reserva", loading state no formulário, sem PII exposta
- Anti-overbooking — lock pessimista no slot, liberação de capacidade no cancelamento, bloqueio de booking em tenant PENDING
- Confiabilidade operacional — job de expiração de PIX, validação de R2 no startup, e-mails com log, slots só no futuro
- Polimento final — home com mais destinos, filtro APPROVED público, badge de status nos destinos, toast global, terminologia clara
- UAT por sprint — cada fase termina com checklist de confirmação antes de avançar

<details>
<summary>v1.2 Milestone Context (arquivado)</summary>

**Goal:** Entregar um app mobile-first com login global sem slug, UI/estilos unificados, painel do guia totalmente responsivo, e gestão de conteúdo de roteiros e destinos.

Fases 11–15 completas. Ver [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md).
</details>

<details>
<summary>v1.1 Milestone Context (arquivado)</summary>

**Goal:** Remover todos os bloqueadores de receita e estabilizar o produto para operar com clientes reais.

Fases 7–10 completas. Auditoria: 13/13. Ver [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md).
</details>

---

## What This Is

Um marketplace de turismo onde guias publicam roteiros com seus próprios preços e turistas comparam guias para o mesmo roteiro antes de reservar e pagar online. Hotéis e restaurantes têm vitrines de exposição vinculadas a roteiros. A plataforma cobre múltiplas regiões, com operadoras podendo agregar guias sob sua marca.

## Core Value

Turista encontra, compara e reserva um guia para seu roteiro desejado — tudo em um único fluxo com pagamento integrado.

---

## Requirements

### Validated

- ✓ Autenticação com JWT e autorização por role — existente
- ✓ Modelo de operadora (tenant) com slug único — existente
- ✓ Sistema de bookings com slots de disponibilidade — existente
- ✓ API Fastify 5 + Prisma 7 + PostgreSQL — existente
- ✓ Frontend Next.js 16 + React 19 — existente
- ✓ Deploy via Railway com variáveis de ambiente — existente
- ✓ Rate limiting por IP (OPS-02) — v1.1 Phase 7: auth 20/min, booking 60/min, webhook isento
- ✓ Monitoramento de erros com Sentry (OPS-03) — v1.1 Phase 7: filtro AppError, contexto tenant/user
- ✓ Onboarding autônomo de operadora com CNPJ (ONBOARD-01–03) — v1.1 Phase 8
- ✓ CPF em Booking hasheado HMAC-SHA256 / LGPD (SEC-05) — v1.1 Phase 8
- ✓ Expiração automática de bookings não pagos (OPS-01) — v1.1 Phase 9
- ✓ Emails transacionais em todo o ciclo de reserva (NOTIF-01–04) — v1.1 Phase 9
- ✓ Self-service do turista via email+código, sem conta (TOURIST-01–02) — v1.1 Phase 10

### Active

- [ ] Guia cria roteiro com título, descrição, região (tag) e preço
- [ ] Mesmo roteiro pode ser oferecido por múltiplos guias com preços diferentes
- [ ] Turista compara guias disponíveis para um roteiro e escolhe um
- [ ] Turista reserva vaga e paga online (Mercado Pago ou Stripe)
- [ ] Guia requer aprovação de admin antes de publicar roteiros
- [ ] Hotel/restaurante tem página de vitrine (display-only) com foto, info e link externo
- [ ] Vitrines podem ser vinculadas a roteiros como sugestões do guia
- [ ] Regiões funcionam como tags/filtros — turista filtra marketplace por destino
- [ ] Operadora pode ter grupo de guias vinculados sob sua marca
- [ ] Plataforma cobra comissão % por reserva confirmada
- [ ] Guia pode assinar plano premium para aparecer no topo das listas
- [ ] Login global em /login sem slug — email lookup resolve a agência automaticamente
- [ ] Botão "Painel" na nav pública aponta para /login (não onboarding)
- [ ] Abaixo do form de login, botão "Cadastrar agência ou guia"
- [ ] Painel do guia totalmente responsivo — tabelas viram card layout em mobile
- [ ] Touch targets mínimos 44px e inputs 16px (evita zoom iOS) no painel
- [ ] Sistema de toast/notificação para feedback de todas as ações
- [ ] Empty states com CTA em todas as listas do painel (reservas, roteiros)
- [ ] Back button em todas as páginas exceto homepage
- [ ] Tokens CSS consolidados — nenhum hex hardcoded, tudo via globals.css
- [ ] Três paradigmas CSS (inline, BEM, Tailwind) unificados no sistema de tokens
- [ ] ErrorBoundary com mensagem útil e botão de retry
- [ ] Dialog de confirmação antes de cancelar reserva
- [ ] ConversionAnchor conecta na API real (não mais setTimeout fake)
- [ ] Links mortos removidos da navegação pública
- [ ] Nome "CAPI" unificado em todos os títulos e metadados do browser
- [ ] Guia pode criar novo destino com fotos e descrição (painel)
- [ ] Guia pode enriquecer roteiro existente com fotos e experiências (painel)

### Out of Scope

- Reserva de hotel/restaurante dentro da plataforma — foco é vitrine, integração de booking é v2
- Perfil público do guia com avaliações visíveis — v2, fora do MVP
- Sistema de avaliações mútuas (turista ↔ guia) — v2
- Admin regional com painel próprio por região — região é só filtro/tag, sem hierarquia
- White-label / multi-tenant por marketplace — uma plataforma, múltiplas regiões

---

## Context

**Codebase:** Monorepo pnpm + Turborepo com `apps/api` (Fastify 5, Prisma 7) e `apps/web` (Next.js 16.2). v1.1 entregou onboarding autônomo de tenants, automatização do ciclo de booking, e observabilidade em produção.

**Estado atual:** Plataforma operacional com segurança hardened — rate limiting, Sentry, LGPD-compliant. Pronta para primeiros usuários reais. UI/UX auditada (score 17/24) — v1.2 foca em elevar qualidade visual, experiência mobile do guia, e novos fluxos de login e gestão de conteúdo.

**Débitos técnicos pendentes (não-bloqueadores):**
- `getResend()` duplicado em `tenants.routes.ts` — cosmético (import de `shared/email.ts`)
- 3 verificações E2E humanas pendentes em staging/prod (onboarding flow, Resend emails, SUPER_ADMIN session)
- `Tenant.whatsapp` — confirmar migration aplicada em produção

**Modelo de monetização:**
- Período de testes gratuito (duração a definir)
- Comissão % por reserva confirmada (% a definir)
- Assinatura premium: guia paga mensalidade para aparecer no topo das listagens
- Freemium: listagem gratuita, destaques e features extras pagos

## Constraints

- **Stack:** Manter Fastify + Prisma + Next.js — reaproveitamento do código existente
- **Pagamento:** Gateway para Brasil (Mercado Pago preferencial, Stripe como alternativa)
- **Deploy:** Railway — manter configuração de deploy existente

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Reaproveitar base Fastify + Prisma | Codebase existente com modelos de auth, tenant e booking já parcialmente funcionais | ✓ Viável — v1.0 + v1.1 completos |
| Regiões como tags, não entidades administrativas | Simplicidade para MVP — evita hierarquia de permissões regionais | ✓ Validado |
| Multi-guia por roteiro (competição de preço) | Diferencial do marketplace — turista compara, guia compete por qualidade/preço | Pendente v1.2+ |
| Vitrines de hotel/restaurante sem booking | Reduz escopo do MVP sem perder o valor de descoberta local | Pendente v1.2+ |
| Aprovação de guia pelo admin | Controle de qualidade e prevenção de fraude antes de receber pagamentos | ✓ Validado |
| CPF hasheado em bookings (LGPD) | Compliance obrigatório — lookup por email+código funciona sem CPF plaintext | ✓ Validado em v1.1 |
| fastify-cron para expiração de bookings | Simplicidade — sem Redis/BullMQ para volume inicial | ✓ Validado em v1.1 |
| Self-service sem conta (email+código) | Reduz fricção do turista — não precisa criar conta para ver reserva | ✓ Validado em v1.1 |
| Login global sem slug (/login) | UX mobile-first — guia no celular não sabe o slug da sua agência | Definido em v1.2 |
| Destinos e roteiros com gestão de conteúdo | Guia precisa de controle total sobre seu produto sem depender de admin | Definido em v1.2 |

## Evolution

*Last updated: 2026-06-17 — v1.3 milestone started: MVP Stability & Payment Integrity*

Este documento evolui a cada transição de fase e marco de milestone.

**Após cada transição de fase** (via `/gsd-transition`):
1. Requirements invalidados? → Mover para Out of Scope com motivo
2. Requirements validados? → Mover para Validated com referência da fase
3. Novos requirements emergiram? → Adicionar em Active
4. Decisões a registrar? → Adicionar em Key Decisions
5. "What This Is" ainda preciso? → Atualizar se houver drift

**Após cada milestone** (via `/gsd-complete-milestone`):
1. Revisão completa de todas as seções
2. Core Value check — ainda é a prioridade certa?
3. Auditar Out of Scope — motivos ainda válidos?
4. Atualizar Context com estado atual
