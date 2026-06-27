---
phase: 19-confiabilidade-operacional
plan: "04"
subsystem: destinations-ui
tags: [ops-05, frontend, badge, rejection-reason, painel]
dependency_graph:
  requires: [19-03]
  provides: [PainelDestinationCard-status-meta]
  affects: [PainelDestinationCard, PainelDestination-interface]
tech_stack:
  added: []
  patterns: [css-in-jsx, conditional-render, status-badge-map]
key_files:
  created: []
  modified:
    - apps/web/src/components/ui/PainelDestinationCard.tsx
decisions:
  - "Badge inline no body (pdcard__meta) adicionado sem remover badge overlay no thumb — ambos coexistem, cada um com propósito distinto (overlay: visível na imagem; inline: no corpo com data e motivo)"
  - "showStatus controla ambos overlay e bloco meta — comportamento consistente"
metrics:
  duration: "~3 min"
  completed: "2026-06-26"
  tasks_completed: 1
  files_modified: 1
---

# Phase 19 Plan 04: OPS-05 Frontend — Badge, Data e Motivo de Rejeição no PainelDestinationCard

Interface `PainelDestination` estendida com `createdAt` e `rejectionReason`; card exibe badge de status com cores semânticas, data de submissão formatada em pt-BR e motivo de rejeição condicional.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Atualizar PainelDestination interface e renderizar metadados de status | 6edd711 | PainelDestinationCard.tsx |

## What Was Built

- `createdAt: string` e `rejectionReason: string | null` adicionados à interface `PainelDestination`
- Mapa `STATUS_BADGE` com labels e CSS classes para PENDING, APPROVED, REJECTED
- CSS classes: `.pdcard__meta`, `.pdcard__status-badge` + 3 variantes com cores da UI-SPEC:
  - PENDING: `#92400e` (amber escuro)
  - APPROVED: `#166534` (verde escuro)
  - REJECTED: `#991b1b` (vermelho escuro)
- `.pdcard__submitted-at`: "Enviado em dd/MM/yyyy" via `toLocaleDateString('pt-BR')`
- `.pdcard__rejection-reason`: "Motivo: ..." condicional (`approvalStatus === 'REJECTED' && rejectionReason`)
- Badge overlay no thumb (`DestinationStatusBadge`) preservado sem alteração

## Deviations from Plan

Nenhum — plano executado exatamente como escrito.

## Known Stubs

Nenhum. Os campos `createdAt` e `rejectionReason` são fornecidos pela API (plano 03) e renderizados diretamente.

## Threat Flags

Nenhum. T-19-10 e T-19-11 aceitos no threat model: `rejectionReason` é dado intencional do admin para o guia; React escapa strings JSX automaticamente (sem XSS).

## Self-Check

- [x] `createdAt: string` na interface PainelDestination — FOUND (linha 12)
- [x] `rejectionReason: string | null` na interface — FOUND (linha 13)
- [x] `.pdcard__status-badge` com `border-radius: 9999px` — FOUND (linha 143)
- [x] `#92400e` (PENDING) — FOUND (linha 153)
- [x] `#166534` (APPROVED) — FOUND (linha 158)
- [x] `#991b1b` (REJECTED) — FOUND (linhas 163, 174)
- [x] `toLocaleDateString('pt-BR')` — FOUND (linha 210)
- [x] `Motivo:` prefixo — FOUND (linha 214)
- [x] exibição condicional `destination.rejectionReason &&` — FOUND (linha 212)
- [x] commit 6edd711 — FOUND

## Self-Check: PASSED
