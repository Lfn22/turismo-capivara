# CAPI — Marketplace de Turismo

*Atualizado em 2026-07-28*

## O que é

Marketplace de turismo onde guias publicam roteiros com seus próprios preços e turistas comparam guias para o mesmo roteiro antes de reservar e pagar online (PIX via Mercado Pago). A plataforma cobre múltiplas regiões/destinos, com operadoras (tenants) agregando guias sob sua marca.

**Nome público:** CAPI ("caminho entre quem explora e quem opera")

## Core Value

Turista encontra, compara e reserva um guia para seu roteiro desejado — tudo em um único fluxo com pagamento integrado.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| API | Fastify 5 + Prisma 7 + PostgreSQL |
| Web | Next.js 16.2 + React 19 + Tailwind CSS 4 |
| Pagamento | Mercado Pago (PIX) |
| Email | Resend |
| Storage | Cloudflare R2 (via AWS S3 SDK) |
| Monitoring | Sentry |
| Deploy API | Railway |
| Deploy Web | Vercel |
| Monorepo | pnpm + Turborepo |
| Node | >= 22.12.0 |

---

## Arquitetura

### Multi-tenant

Toda entidade pertence a um `Tenant` (operadora), isolado por `slug`. Destinos são entidades globais que tenants podem se vincular.

### Roles

`SUPER_ADMIN` · `ADMIN` · `ATENDENTE` · `CONDUTOR` (guia) · `CLIENTE` (turista)

### Database (12 models)

`Destination` · `Tenant` · `User` · `GuideProfile` · `TourPackage` · `DepartureSlot` · `Booking` · `Voucher` · `PackageGuide` · `Testimonial` · `PasswordResetToken` · `ProcessedWebhookEvent`

**Relações-chave:**
- `PackageGuide` — N:N entre `TourPackage` e `GuideProfile` (qualificação guia↔roteiro)
- `DepartureSlot.guideId` — guia atribuído por saída, com checagem de conflito de agenda
- `Booking` — pertence a `DepartureSlot` e `Tenant`, com pagamento PIX integrado
- `Destination ← Tenant` — múltiplos tenants por destino

### API (10 módulos)

| Módulo | Endpoints principais |
|--------|---------------------|
| auth | Login JWT, password reset, tenant lookup por email |
| bookings | Criar reserva (PIX), consultar, cancelar, repagar |
| packages | CRUD roteiros, criar slots, upload fotos |
| destinations | CRUD destinos, aprovar/rejeitar (SUPER_ADMIN) |
| guides | Perfil público, criar/editar perfil, aprovar/rejeitar |
| tenants | Signup operadora, aprovar/rejeitar |
| users | Criar, listar, editar usuários |
| uploads | Upload multipart para R2 (destinos, guias, roteiros) |
| webhooks | Webhook Mercado Pago (confirma pagamento) |
| dashboard | Stats super-admin |

### Web (39 páginas)

**Públicas:**
- `/` — Home com destinos
- `/destinos` — Galeria de destinos
- `/destinos/[slug]` — Detalhe do destino
- `/destinos/[slug]/roteiros` — Roteiros do destino
- `/destinos/[slug]/roteiros/[id]` — Detalhe do roteiro + guias qualificados
- `/destinos/[slug]/guias` — Guias do destino
- `/destinos/[slug]/guias/[id]` — Perfil do guia + roteiros
- `/explorar` — Página de exploração
- `/guias/[id]` — Perfil público do guia
- `/login` — Login global (sem slug)
- `/onboarding` — Cadastro de operadora
- `/cadastro/guia` — Cadastro de guia independente

**Tenant (público):**
- `/[slug]/roteiros` — Roteiros da operadora
- `/[slug]/roteiros/[id]` — Detalhe do roteiro
- `/[slug]/guias` — Guias da operadora
- `/[slug]/guias/[id]` — Perfil do guia
- `/[slug]/checkout` — Checkout de reserva
- `/[slug]/confirmacao` — Confirmação (PIX QR)
- `/[slug]/minha-reserva` — Consulta de reserva (self-service)

**Painel do guia/operadora:**
- `/[slug]/painel/dashboard` — Dashboard
- `/[slug]/painel/reservas` — Gestão de reservas
- `/[slug]/painel/roteiros` — Gestão de roteiros
- `/[slug]/painel/disponibilidade` — Gestão de slots
- `/[slug]/painel/destinos` — Gestão de destinos
- `/[slug]/painel/perfil` — Perfil do guia

**Super-admin:**
- `/super-admin/operadoras` — Gestão de operadoras
- `/super-admin/destinos` — Gestão de destinos

---

## O que está implementado

### Completo e em produção

- Auth JWT com roles e autorização por middleware
- Multi-tenant com slug único e isolamento de dados
- Login global `/login` sem slug (email lookup resolve tenant)
- Onboarding autônomo de operadora com CNPJ
- Sistema de bookings: criar → PIX → webhook → confirmar
- Idempotência em POST /bookings (dedup por idempotency key)
- Self-service do turista (consulta/cancela por email+código, sem conta)
- Expiração automática de bookings via fastify-cron
- Emails transacionais: criação, confirmação, cancelamento, expiração, aprovação de guia
- Rate limiting por IP (auth 20/min, booking 60/min)
- Sentry para monitoramento de erros
- CPF hasheado HMAC-SHA256 (LGPD compliance)
- Webhook Mercado Pago com dedup (ProcessedWebhookEvent)
- Upload de fotos para R2 (destinos, guias, roteiros)
- Brand CAPI unificada em títulos e metadados
- Navegação pública com BackButton, links funcionais
- Password reset por email
- Schema N:N (PackageGuide) — múltiplos guias por roteiro
- Conflito de agenda transacional em criação de slots
- Discovery cross-tenant: roteiros e guias por destino (API + frontend)
- Páginas públicas de discovery: `/destinos/[slug]/roteiros`, `/guias`
- Widget de mapa MapLibre + Overpass API com lazy load
- Perfil público do guia com portfólio e roteiros
- Gestão de destinos e roteiros no painel (criar, editar, fotos)
- Aprovação/rejeição de destinos, operadoras e guias (SUPER_ADMIN)
- Cadastro de guia independente (sem operadora)

### Pendente (v2.0 — débitos técnicos)

| Fase | Escopo | Status |
|------|--------|--------|
| 21 | Hardening de Infra — remover ioredis, validateEnv completo, JWT expiresIn, health check, request ID | Pendente |
| 22 | Confiabilidade de Email — `sendEmailWithRetry()` com backoff | Pendente |
| 16 | Integridade de Pagamento — PIX atômico, validação MP_ACCESS_TOKEN, lock de slot | Pendente |
| 19 | Confiabilidade Operacional — job expiração robusto, toast provider global, badge de status | Pendente |
| 18 | UX do Checkout — countdown PIX, QR visual, anti double-submit | Pendente |
| 13 | Painel Mobile + Feedback — card layout responsivo, touch targets 44px, empty states | Pendente |
| 20 | Polimento Público — home >=6 destinos, filtro APPROVED, paginação super-admin | Pendente |
| 23 | Qualidade — E2E Playwright, uptime alerts, backup, audit de auth | Pendente |

### Pendente (v2.1 — Multi-Guide & Discovery)

| Fase | Escopo | Status |
|------|--------|--------|
| 24 | Schema N:N + backfill | Completo (2026-07-04) |
| 25 | API discovery + conflito de agenda | Completo (2026-07-05) |
| 26 | Frontend discovery pages | Completo (2026-07-07) |
| 27 | Painel parceiro — criação de slot com seleção de guia | Pendente |
| 28 | Widget de mapa | Completo (2026-07-08) |

---

## Modelo de Monetização

- Comissão % por reserva confirmada (% a definir)
- Assinatura premium: guia paga mensalidade para destaque nas listagens
- Freemium: listagem gratuita, features extras pagos

## Constraints

- **Stack:** Manter Fastify + Prisma + Next.js — reaproveitar código existente
- **Pagamento:** Gateway BR (Mercado Pago preferencial, Stripe como alternativa futura)
- **Deploy:** Railway (API) + Vercel (Web)
- **IDs:** CUIDs (`cuid()`), nunca UUIDs
- **Mensagens de erro:** Português
- **UI:** Mobile-first (100dvh, clamp(), testar iOS Safari)

## Key Decisions

| Decisão | Motivo | Status |
|---------|--------|--------|
| Multi-tenant por slug | Operadoras isoladas, mas destinos compartilhados entre tenants | Validado |
| Regiões como tags, não entidades | Simplicidade — sem hierarquia de permissões regionais | Validado |
| CPF hasheado HMAC-SHA256 | LGPD compliance; lookup por email+código sem CPF plaintext | Validado |
| fastify-cron para expiração | Sem Redis/BullMQ para volume inicial | Validado |
| Self-service sem conta | Reduz fricção do turista — email+código para consultar reserva | Validado |
| Login global sem slug | UX mobile-first — guia no celular não sabe o slug | Validado |
| PackageGuide N:N | Múltiplos guias por roteiro com qualificação e preço independente | Validado |
| Conflito de agenda transacional | Checagem dentro da transação do POST /slots — sem race conditions | Validado |
| MapLibre + Overpass API | Mapa gratuito, sem vendor lock-in, POIs dinâmicos | Validado |
| Aprovação de guia por admin | Controle de qualidade antes de receber pagamentos | Validado |

## Out of Scope (MVP)

- Reserva de hotel/restaurante dentro da plataforma (foco é vitrine)
- Sistema de avaliações mútuas (turista ↔ guia)
- Admin regional com painel próprio por região
- White-label / multi-tenant por marketplace
- Repasse automático ao guia
- Integração com cartão de crédito
- Queue de email com BullMQ/Redis

---

## Backlog (pós-v2.0)

- Templates de email com design visual
- Verificação de email no signup
- Reviews e avaliações de guias
- Repasse automático ao guia via split payment
- Comparação de guias lado a lado
- Integração com cartão de crédito (Stripe)
- Vitrines de hotel/restaurante vinculadas a roteiros

## Evolution

Este documento é atualizado a cada transição de milestone ou mudança significativa de escopo.

**Roadmap detalhado:** `.planning/ROADMAP.md`
**Requirements:** `.planning/REQUIREMENTS.md`
**Milestones arquivados:** `.planning/milestones/`
