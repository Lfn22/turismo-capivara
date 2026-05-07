---
phase: "05-painel-do-guia"
plan: "05"
subsystem: "web/painel"
tags: ["react-calendar", "RSC", "client-component", "slots", "packages", "modal"]
dependency_graph:
  requires:
    - "05-02"  # NextAuth + middleware
    - "05-03"  # SidebarNav, Modal, apiFetch
  provides:
    - "roteiros/page.tsx — RSC grid de cards de pacotes do guia"
    - "disponibilidade/page.tsx — calendário react-calendar + modal de criação de slot"
  affects:
    - "apps/web/app/[slug]/(painel)/painel/"
tech_stack:
  added:
    - "react-calendar@6.0.1 — calendário mensal com tileContent para indicadores de slot"
  patterns:
    - "RSC com getServerSession + apiFetch para fetch de pacotes"
    - "Client Component com use(params) + useSession para disponibilidade"
    - "tileContent (não tileStyle) para coloração de tiles no react-calendar v6"
key_files:
  created:
    - "apps/web/app/[slug]/(painel)/painel/roteiros/page.tsx"
    - "apps/web/app/[slug]/(painel)/painel/disponibilidade/page.tsx"
  modified: []
decisions:
  - "react-calendar v6 não tem prop tileStyle — usou tileContent com div de ponto colorido"
  - "Disponibilidade carrega todos os slots de todos os packages no mount para colorir tiles"
  - "Token acessado via (session.user as any).token (confirmado no auth.ts — campo token)"
metrics:
  duration: "~20 min"
  completed: "2026-05-07"
  tasks_completed: 2
  files_created: 2
---

# Phase 05 Plan 05: Roteiros + Disponibilidade Summary

Roteiros (RSC grid de cards) e Disponibilidade (react-calendar com modal de slot) implementados e buildando sem erros.

## What Was Built

### Task 1 — roteiros/page.tsx (RSC)
- Server Component com `getServerSession` + `apiFetch` para listar pacotes
- Grid `auto-fill minmax(300px, 1fr)` de cards com: nome, badge de dificuldade (EASY/MODERATE/HARD/EXTREME), descrição truncada, preço em BRL, status ativo/inativo
- Botão "Novo Roteiro" → `/[slug]/painel/roteiros/novo` (placeholder)
- Link "Gerenciar Slots" em cada card → `/[slug]/painel/disponibilidade`
- Empty state com CTA para criar primeiro roteiro
- Erro de carregamento tratado graciosamente

### Task 2 — disponibilidade/page.tsx (Client Component)
- `use(params)` para unwrap de params no Client Component
- react-calendar com `tileContent` renderizando ponto colorido por dia:
  - Ochre = slots abertos disponíveis
  - Vermelho = slots lotados
  - Cinza = slots todos fechados
- Seleção de dia exibe painel lateral com lista de slots (hora de início, booked/capacity)
- Botão "Fechar Slot" → PATCH `/packages/:id/slots/:id/close` (atualiza estado local)
- Botão "Adicionar Slot" (visível ao selecionar dia) → abre Modal
- Modal com validação de campos obrigatórios:
  - Roteiro (select com packages carregados da API)
  - Horário início/fim (time inputs, valida fim > início)
  - Vagas (number, mínimo 1)
- POST `/packages/:id/slots` com `{startsAt, capacity}` — slot aparece na lista imediatamente

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] react-calendar v6 não tem prop `tileStyle`**
- **Found during:** Task 2 — ao ler o type definition `Calendar.d.ts`
- **Issue:** O plano especificava `tileStyle: ({ date }) => React.CSSProperties` mas a v6 não expõe essa prop (apenas `tileClassName`, `tileContent`, `tileDisabled`)
- **Fix:** Usado `tileContent` com `<div>` de 6px circular como indicador de cor dentro do tile
- **Files modified:** `disponibilidade/page.tsx`
- **Commit:** 0b78298

## Known Stubs

- `roteiros/novo` — Link do botão "Novo Roteiro" leva a rota não criada (404 esperado). Previsto pelo plano: "placeholder page — just navigate, no actual form needed"

## Threat Flags

Nenhuma superfície nova além do mapeado no threat_model do plano.

## Self-Check: PASSED

- `apps/web/app/[slug]/(painel)/painel/roteiros/page.tsx` — FOUND
- `apps/web/app/[slug]/(painel)/painel/disponibilidade/page.tsx` — FOUND
- Commit 83b8c0c (roteiros) — FOUND
- Commit 0b78298 (disponibilidade) — FOUND
- `pnpm --filter @turismo/web build` — exit 0, ambas as rotas listadas como ƒ (Dynamic)
