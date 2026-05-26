# Roadmap — Turismo Capivara

## Milestones Concluídos

- **v1.0 MVP** (2026-05-13) — Auth multi-tenant, guias verificados, roteiros, discovery, reservas + PIX. Phases 1–6.
- **v1.1 Launch Readiness** (2026-05-26) — Rate limiting, Sentry, onboarding autônomo de operadoras, emails transacionais, expiração de bookings, self-service do turista. Phases 7–10. → [Arquivo](milestones/v1.1-ROADMAP.md)

---

## Próximo Milestone

A definir. Use `/gsd-new-milestone` para iniciar o ciclo de descoberta → requirements → roadmap.

**Candidatos do backlog:**
- Templates de email com design visual (NOTIF-05)
- Queue de email com retry via BullMQ/Redis (OPS-04)
- Verificação de email no signup (ONBOARD-04)
- Links de recuperação com token por email (TOURIST-03)
- Chave de idempotência em POST /bookings (SEC-06)
- Reviews e avaliações de guias
- Repasse automático ao guia
