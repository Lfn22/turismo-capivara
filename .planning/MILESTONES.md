# MILESTONES.md — Turismo Capivara

History of shipped milestones. Each entry links to archived roadmap and requirements.

---

## v1.1 Launch Readiness — 2026-05-26

**Status:** ✅ Shipped
**Phases:** 7–10 (4 phases, 13 plans)
**Requirements:** 13/13 satisfied
**Timeline:** 2026-05-16 → 2026-05-26 (10 days)
**Tag:** `v1.1`

**Delivered:** API pronta para usuários reais — rate limiting, Sentry, onboarding autônomo de operadoras, expiração automática de bookings, emails transacionais em todo o ciclo, e self-service do turista sem conta.

**Key Accomplishments:**
1. Rate limiting global (429 + Retry-After) e Sentry com contexto tenant/usuário ativos em produção
2. Operadoras se registram autonomamente via `/onboarding` com CNPJ — sem intervenção manual do dev
3. CPF migrado de plaintext para HMAC-SHA256 em todos os bookings (LGPD compliant)
4. Expiração automática de bookings não pagos via fastify-cron com advisory lock PostgreSQL
5. Emails transacionais em todo o ciclo: booking criado, PIX confirmado, expirado, guia aprovado
6. Turista consulta e cancela reserva em `/minha-reserva` via email+código, sem conta/login

**Tech Debt (non-blocking):**
- `getResend()` duplicado em `tenants.routes.ts` (linhas 43–49) — import cosmético pendente
- 3 verificações humanas E2E pendentes em staging/prod (onboarding flow, Resend emails, SUPER_ADMIN session)
- `Tenant.whatsapp` — confirmar migration aplicada em produção

**Archive:**
- [v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)
- [v1.1-REQUIREMENTS.md](milestones/v1.1-REQUIREMENTS.md)

---

## v1.0 MVP — 2026-05-13

**Status:** ✅ Shipped
**Phases:** 1–6 (6 phases)
**Requirements:** 26/26 satisfied

**Delivered:** Marketplace funcional com auth multi-tenant, guias verificados, roteiros com slots, discovery/filtros, reservas com anti-overbooking, e pagamento PIX via Mercado Pago com webhook.
