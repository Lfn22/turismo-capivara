---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: MVP
status: ready_to_execute
stopped_at: Completed 03-02-PLAN.md — POST/PUT/DELETE package endpoints with ownership + hasMinimumReached on GET
last_updated: "2026-04-30T11:48:00Z"
last_activity: 2026-04-30
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 3
  completed_plans: 2
  percent: 39
---

# STATE.md — Turismo Capivara

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-17)

**Core value:** Guia de turismo publica roteiros e gerencia reservas digitalmente. Turista encontra, reserva e paga com PIX — sem WhatsApp, sem dinheiro em espécie.
**Current focus:** Phase 3 — Roteiros e Disponibilidade

## Current Position

Phase: 3 de 6 (Roteiros e Disponibilidade)
Plan: 2 de 3 executados (03-01 schema + 03-02 package CRUD completos)
Status: Em execução — 03-03 (slot CRUD) pendente
Last activity: 2026-04-30

## Decisões estratégicas

- **Beachhead:** Serra da Capivara (PI) como destino inicial — UNESCO, sem digitalização, guias dependem de WhatsApp
- **Modelo de negócio:** Comissão 3–5% por reserva, não assinatura mensal
- **Parceiro institucional alvo:** FUMDHAM / SETUR-PI — abordar após MVP com dados reais
- **Multi-tenant:** cada destino/operador é um tenant isolado por slug — arquitetura já implementada
- **Motor de reserva:** trava transacional anti-overbooking já existe (POST /bookings com prisma.$transaction)
- **Pagamento:** apenas PIX (Mercado Pago) no MVP — cartão de crédito é pós-MVP
- **Discovery:** listagem simples por destino no MVP — busca avançada e comparação são pós-MVP
- **Guest checkout:** turista não precisa criar conta para reservar (Phase 6)

## Decisões técnicas

- Zod v4: `ZodError.issues` (não `.errors`) — todos os catch blocks usam `err.issues.map()`
- LGPD: booking rows preservados após anonimização do usuário (histórico transacional via customerEmail)
- `ANONYMIZATION_SALT` obrigatório no Railway — fallback de dev intencional
- Rotas escopadas por tenant: padrão `/tenants/:slug/resource` com helper `parseParams`
- Aprovação de guia: `authenticate + authorize([Role.ADMIN])` — padrão já estabelecido
- conductorId always set from JWT.sub — never from request body (T-03-02-02 mitigation)
- Soft-delete via active=false — packages remain in DB for historical booking integrity

## Fase 2 — Contexto de execução

Dois planos já escritos (não executados):
- `02-01-PLAN.md`: extensão do schema Prisma (approvalStatus, cpf, bio, photo, specialties, regions, rejectionReason ao User)
- `02-02-PLAN.md`: POST /auth/register diferenciando CLIENTE vs CONDUTOR

Planos ainda a escrever para completar a Fase 2:
- Admin: GET + PATCH de aprovação de guias
- Perfil público: GET /tenants/:slug/guides e GET /tenants/:slug/guides/:id
- Perfil próprio: PUT /tenants/:slug/guides/me

## Performance histórica

| Phase | Plans | Tempo total | Média/plano |
|-------|-------|-------------|-------------|
| 1. Security Hardening | 4 | ~17min | ~4min |
| 2. Cadastro de Guias (parcial) | 1 | ~3min | ~3min |

## Pós-MVP (deferred)

- Busca por texto e filtros avançados
- Comparação de guias lado a lado
- Multi-guia por roteiro
- Reviews e avaliações
- Cartão de crédito
- Vitrines de parceiros (hotéis, restaurantes)
- Relatórios institucionais (FUMDHAM / SETUR-PI)
- Notificações automáticas por email/WhatsApp

## Session Continuity

Last session: 2026-04-30T11:48:00Z
Stopped at: Completed 03-02-PLAN.md — POST/PUT/DELETE package endpoints with ownership + hasMinimumReached on GET
Resume file: None
