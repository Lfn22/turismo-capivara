# Phase 6: Interface do Turista - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-13
**Phase:** 06-interface-do-turista
**Areas discussed:** Legacy pages, Booking state, Confirmação, API gaps

---

## Legacy Pages

| Option | Description | Selected |
|--------|-------------|----------|
| Remover | Deletar app/roteiros/ e app/reservar/ — Phase 6 substitui completamente | ✓ |
| Redirecionar | Manter arquivos com redirect para /[slug]/guias/ | |
| Manter em paralelo | Deixar ambas as rotas ativas temporariamente | |

**User's choice:** Remover  
**Notes:** Phase 6 substitui completamente. Sem risco de rotas duplicadas.

---

## Booking State

| Option | Description | Selected |
|--------|-------------|----------|
| URL params | slotId + packageId na query string: /[slug]/reservar?slotId=xxx&packageId=yyy | ✓ |
| localStorage | Salvar seleção em localStorage antes de navegar | |
| React Context | Estado global via Context/Provider | |

**User's choice:** URL params  
**Notes:** Zero estado client-side, SSR-friendly, link compartilhável.

| Option (rota) | Description | Selected |
|---------------|-------------|----------|
| /[slug]/reservar | Dentro do grupo público do tenant | ✓ |
| /[slug]/guias/[guideId]/reservar | Aninhado sob o perfil do guia | |

**User's choice:** /[slug]/reservar

---

## Confirmação

| Option | Description | Selected |
|--------|-------------|----------|
| Buscar booking real | GET /tenants/:slug/bookings/:id com bookingId da URL | ✓ |
| Estática com params | "Reserva confirmada." com dados da URL do redirect apenas | |

**User's choice:** Buscar booking real  
**Notes:** Mostra: nome do roteiro, data/hora, guia, status.

| Option (return URL) | Description | Selected |
|---------------------|-------------|----------|
| /[slug]/confirmacao?bookingId=xxx | URL própria controlada | ✓ |
| /[slug]/confirmacao?external_ref=xxx&status=xxx | Usar parâmetros do MP | |

**User's choice:** /[slug]/confirmacao?bookingId=xxx

---

## API Gaps

| Option (slots) | Description | Selected |
|----------------|-------------|----------|
| Só slots disponíveis | Filtrar OPEN + date >= hoje, retornar slotId/date/spotsAvailable | ✓ |
| Todos os slots | Retornar todos incluindo cheios/cancelados | |

**User's choice:** Só slots disponíveis (OPEN, futuros)

| Option (booking público) | Description | Selected |
|--------------------------|-------------|----------|
| bookingId + email | Requerer ?email=xxx — só retorna se bater com customerEmail | ✓ |
| bookingId aberto | GET público só com bookingId, campos não-sensíveis | |

**User's choice:** bookingId + email  
**Notes:** Privacidade básica sem login — turista precisa do email que usou na reserva.

---

## Claude's Discretion

- Implementação de loading skeletons
- Tratamento de erro quando bookingId/email não batem
- Estrutura interna dos novos componentes

## Deferred Ideas

- Busca/filtros avançados — pós-MVP
- Comparação de guias — pós-MVP
- Login do turista — fora do escopo
- Cartão de crédito (PAY-02) — pós-MVP
