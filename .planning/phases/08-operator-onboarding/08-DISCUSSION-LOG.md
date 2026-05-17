# Phase 8: Operator Onboarding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 08-operator-onboarding
**Areas discussed:** Super-admin model, Slug validation UX, CPF migration (SEC-05), Approval notification

---

## Super-admin model

| Option | Description | Selected |
|--------|-------------|----------|
| Role SUPER_ADMIN no schema | Adiciona SUPER_ADMIN ao enum Role. authorize(['SUPER_ADMIN']) protege rotas. Criado via seed. | ✓ |
| Env var whitelist de emails | SUPER_ADMIN_EMAIL no .env. Sem mudança no schema. Simples mas rígido. | |

**User's choice:** Role SUPER_ADMIN no schema Prisma

| Option | Description | Selected |
|--------|-------------|----------|
| /super-admin/* (rota global) | Rota separada do dashboard, sem slug. Layout próprio. | ✓ |
| Integrado ao dashboard | Super-admin faz login como tenant especial 'system'. | |

**User's choice:** /super-admin/operadoras como rota global

---

## Slug validation UX

| Option | Description | Selected |
|--------|-------------|----------|
| Tempo real com debounce | Chama GET /api/tenants/check-slug após 500ms. Mostra ✅/❌ enquanto digita. | ✓ |
| Validação apenas no submit | Erro aparece só após submit. Simples mas frustrante. | |

**User's choice:** Tempo real com debounce 500ms

| Option | Description | Selected |
|--------|-------------|----------|
| Não — só mostrar erro | Operadora digita a própria alternativa. | ✓ |
| Sim — sugerir variações | Ex: 'capivara' → sugerir 'capivara2', 'capivara-tours'. | |

**User's choice:** Sem sugestões — apenas mostrar erro

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-gerado + editável | Nome → slug pré-preenchido via slugify (editável). | ✓ |
| Sempre manual | Operadora digita slug do zero. | |

**User's choice:** Auto-gerado a partir do nome + editável

---

## CPF migration (SEC-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Não — só dados de teste/seed | Sem bookings reais. Pode migrar sem preocupação. | ✓ |
| Sim — já temos bookings reais | Precisaria de dual-read cuidadoso. | |

**User's choice:** Sem bookings reais em produção

| Option | Description | Selected |
|--------|-------------|----------|
| Rename field + migration script | Renomeia customerCpf → customerCpfHash + SQL backfill. | ✓ |
| Apagar + recriar (corte limpo) | Drop + add, apaga dados de teste. | |

**User's choice:** Rename com migration script de backfill

| Option | Description | Selected |
|--------|-------------|----------|
| Sim — mesma CPF_SECRET | Reutiliza env var e hashCpf() existente. | ✓ |
| Chave separada (BOOKING_CPF_SECRET) | Isolamento de chaves, mais config. | |

**User's choice:** Mesma CPF_SECRET

---

## Approval notification

| Option | Description | Selected |
|--------|-------------|----------|
| Email via Resend agora | Antecipa parte da Phase 9. Operadora recebe feedback imediato. | ✓ |
| Só status no login — email na Phase 9 | Mais simples, UX inferior. | |
| Status via polling na página | /onboarding/aguardando com polling. Sem email. | |

**User's choice:** Email via Resend agora

| Option | Description | Selected |
|--------|-------------|----------|
| Email simples de texto | HTML básico via Resend. Sem React Email ainda. | ✓ |
| React Email template | Template visual agora. Mais trabalho no Phase 8. | |

**User's choice:** Email texto simples — React Email fica para Phase 9

---

## Claude's Discretion

- Checklist pós-signup: estático (3 itens fixos), sem polling ou estado no BD
- Rate limiting no POST /signup: 5 req/hora
- Resend API key: se ausente, logar warning e continuar (não quebrar fluxo)

## Deferred Ideas

- React Email templates visuais — Phase 9
- Verificação de email (ONBOARD-04) — v1.2
- CAPTCHA — v1.5 se necessário
