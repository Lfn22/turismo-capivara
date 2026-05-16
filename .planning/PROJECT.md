# Turismo Capivara

## Current Milestone: v1.1 Launch Readiness

**Goal:** Remover todos os bloqueadores de receita e estabilizar o produto para operar com clientes reais.

**Target features:**
- Onboarding self-service da operadora (criação de tenant via UI + API)
- Expiração automática de bookings PENDING (cron — liberar slots abandonados)
- Notificações transacionais por email via Resend (booking criado, confirmado, guia aprovado)
- "Minha reserva" — turista recupera booking por email sem criar conta
- Rate limiting em rotas de auth e endpoints públicos
- CPF do turista hasheado no Booking (LGPD — V-01)
- Monitoramento de erros em produção (Sentry)
- Índices de banco de dados + validação de minCapacity em bookings
- Correção do middleware Web: slug ↔ tenantId cross-check

## What This Is

Um marketplace de turismo onde guias publicam roteiros com seus próprios preços e turistas comparam guias para o mesmo roteiro antes de reservar e pagar online. Hotéis e restaurantes têm vitrines de exposição vinculadas a roteiros. A plataforma cobre múltiplas regiões, com operadoras podendo agregar guias sob sua marca.

## Core Value

Turista encontra, compara e reserva um guia para seu roteiro desejado — tudo em um único fluxo com pagamento integrado.

## Requirements

### Validated

- ✓ Autenticação com JWT e autorização por role — existente
- ✓ Modelo de operadora (tenant) com slug único — existente
- ✓ Sistema de bookings com slots de disponibilidade — existente
- ✓ API Fastify 5 + Prisma 7 + PostgreSQL — existente
- ✓ Frontend Next.js 16 + React 19 — existente
- ✓ Deploy via Railway com variáveis de ambiente — existente

### Active

- [ ] Guia cria roteiro com título, descrição, região (tag) e preço
- [ ] Mesmo roteiro pode ser oferecido por múltiplos guias com preços diferentes
- [ ] Turista compara guias disponíveis para um roteiro e escolha um
- [ ] Turista reserva vaga e paga online (Mercado Pago ou Stripe)
- [ ] Guia requer aprovação de admin antes de publicar roteiros
- [ ] Hotel/restaurante tem página de vitrine (display-only) com foto, info e link externo
- [ ] Vitrines podem ser vinculadas a roteiros como sugestões do guia
- [ ] Regiões funcionam como tags/filtros — turista filtra marketplace por destino
- [ ] Operadora pode ter grupo de guias vinculados sob sua marca
- [ ] Plataforma cobra comissão % por reserva confirmada
- [ ] Guia pode assinar plano premium para aparecer no topo das listas

### Out of Scope

- Reserva de hotel/restaurante dentro da plataforma — foco é vitrine, integração de booking é v2
- Perfil público do guia com avaliações visíveis — v2, fora do MVP
- Sistema de avaliações mútuas (turista ↔ guia) — v2
- Admin regional com painel próprio por região — região é só filtro/tag, sem hierarquia
- White-label / multi-tenant por marketplace — uma plataforma, múltiplas regiões

## Context

**Codebase existente:** Monorepo pnpm + Turborepo com dois apps — `apps/api` (Fastify 5, Prisma 7) e `apps/web` (Next.js 16.2). A estrutura atual foi construída com modelo de operadora (tenant) centralizado, com `tenantSlug` de "serra-viva" hardcoded em 5+ arquivos do frontend — precisa ser desacoplado para marketplace multi-região.

**Débitos técnicos prioritários que afetam o marketplace:**
- Nenhuma validação de input no servidor (sem Zod/AJV) — risco de dados inválidos em pagamentos
- Endpoints de booking sem autenticação — crítico para marketplace com pagamentos
- CORS hardcoded para localhost:3000 — bloqueia produção
- `@fastify/helmet` instalado mas não registrado
- Redis declarado mas sem uso — pode ser usado para sessões/cache de busca

**Modelo de monetização:**
- Período de testes gratuito (duração a definir)
- Comissão % por reserva confirmada (% a definir)
- Assinatura premium: guia paga mensalidade para aparecer no topo das listagens
- Freemium: listagem gratuita, destaques e features extras pagos

## Constraints

- **Stack:** Manter Fastify + Prisma + Next.js — reaproveitamento do código existente
- **Pagamento:** Gateway para Brasil (Mercado Pago preferencial, Stripe como alternativa)
- **Deploy:** Railway — manter configuração de deploy existente
- **Tenant slug:** "serra-viva" hardcoded no frontend deve ser removido antes de lançar marketplace multi-região
- **Segurança:** 6 vulnerabilidades de alta severidade no codebase atual devem ser corrigidas antes de habilitar pagamentos

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Reaproveitar base Fastify + Prisma | Codebase existente com modelos de auth, tenant e booking já parcialmente funcionais | — Pending |
| Regiões como tags, não entidades administrativas | Simplicidade para MVP — evita hierarquia de permissões regionais | — Pending |
| Multi-guia por roteiro (competição de preço) | Diferencial do marketplace — turista compara, guia compete por qualidade/preço | — Pending |
| Vitrines de hotel/restaurante sem booking | Reduz escopo do MVP sem perder o valor de descoberta local | — Pending |
| Aprovação de guia pelo admin | Controle de qualidade e prevenção de fraude antes de receber pagamentos | — Pending |

## Evolution

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

---
*Last updated: 2026-04-17 após inicialização do projeto*
