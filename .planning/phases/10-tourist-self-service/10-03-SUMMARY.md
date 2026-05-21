---
phase: 10
plan: "03"
subsystem: web/minha-reserva
tags: [self-service, frontend, next-js, react, pix, qr-code, state-machine]
dependency_graph:
  requires: [10-01, 10-02]
  provides: [minha-reserva-page, MinhaReservaClient, react-qr-code]
  affects: [apps/web/app/[slug]/(public)/minha-reserva/page.tsx, apps/web/src/components/ui/MinhaReservaClient.tsx]
tech_stack:
  added: [react-qr-code ^2.0.21]
  patterns: [4-state-machine, mobile-first-inline-styles, fetch-with-error-handling]
key_files:
  created:
    - apps/web/app/[slug]/(public)/minha-reserva/page.tsx
    - apps/web/src/components/ui/MinhaReservaClient.tsx
  modified:
    - apps/web/package.json
    - pnpm-lock.yaml
decisions:
  - "totalPrice omitido da interface BookingResult — campo não existe na resposta do lookup (removido em 10-02)"
  - "code enviado lowercase para API — API usa endsWith(code.toLowerCase()) no Prisma"
  - "Cancel modal: destructive button primeiro (thumb reach mobile), back button abaixo"
  - "NEXT_PUBLIC_API_URL com fallback http://localhost:3333 — mesmo padrão do CheckoutClient.tsx"
  - "TypeScript check ignora .next/dev/types erros — arquivos gerados pre-existentes, não relacionados ao código"
metrics:
  duration: "~15 minutos"
  completed: "2026-05-21"
  tasks_completed: 3
  files_created: 2
  files_modified: 2
requirements:
  - TOURIST-01
  - TOURIST-02
---

# Phase 10 Plan 03: Frontend — /[slug]/minha-reserva Page Summary

**One-liner:** Página de auto-serviço do turista com state machine LOOKUP/LOADING/RESULT/ERROR, QR code PIX via react-qr-code, 4 seções de status e modal de cancelamento.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | react-qr-code ^2.0.21 instalado em apps/web | cc351aa |
| 2 | minha-reserva/page.tsx — server wrapper thin | 8f57179 |
| 3 | MinhaReservaClient.tsx — state machine completo | 805663d |

## Implementation Details

### Route
`/[slug]/minha-reserva` — registrada em `apps/web/app/[slug]/(public)/minha-reserva/page.tsx` dentro do route group (public).

### State Machine
```
LOOKUP → (submit) → LOADING → (ok)    → RESULT
                             → (error) → ERROR
ERROR → (tentar novamente) → LOOKUP
RESULT/PENDING → (cancel click) → modal → (confirm) → RESULT/CANCELLED
RESULT/EXPIRED → (repay click)  → LOADING → RESULT/PENDING
RESULT/* → (nova consulta) → LOOKUP
```

### Status Sections
- **PENDING:** QR code SVG via react-qr-code + copia-e-cola monospace + botão copiar + cancelar reserva
- **CONFIRMED:** Banner verde + WhatsApp link (se tenantWhatsapp) + cancelar reserva
- **EXPIRED:** Banner laranja + botão "Gerar novo pagamento" (chama /repay)
- **CANCELLED:** Banner vermelho + WhatsApp suporte (se tenantWhatsapp)

### Cancel Modal
Implementado inline (sem Modal.tsx existente compatível). `role="dialog"`, `aria-modal="true"`, `autoFocus` no botão destructivo. Loading state desabilita ambos botões.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] totalPrice ausente na interface BookingResult**
- **Found during:** Task 3 (revisão da resposta do lookup — 10-02 SUMMARY indica remoção)
- **Issue:** A resposta do lookup não retorna totalPrice (campo não existe no modelo Booking); plan 10-03 incluía o campo no código de exemplo
- **Fix:** Removido totalPrice da interface BookingResult; linha "Total" removida das detail rows; pax exibido como substituto
- **Files modified:** MinhaReservaClient.tsx
- **Commit:** 805663d

**2. [Rule 2 - Missing critical] code enviado lowercase para API**
- **Found during:** Task 3 (análise do handler cancel-self/repay)
- **Issue:** API usa `id: { endsWith: code.toLowerCase() }` no Prisma; UI fazia uppercase no input. Enviar uppercase causaria 404
- **Fix:** `code.trim().toLowerCase()` adicionado em todos os fetch calls; input ainda exibe uppercase para UX
- **Files modified:** MinhaReservaClient.tsx
- **Commit:** 805663d

**3. [Rule 2 - Missing critical] Tratamento diferenciado para 429**
- **Found during:** Task 3 (UI-SPEC copywriting section)
- **Issue:** UI-SPEC especifica mensagem diferente para rate limit (429) vs outros erros
- **Fix:** Verificação explícita `res.status === 429` com mensagem "Muitas tentativas. Tente novamente em alguns minutos."
- **Files modified:** MinhaReservaClient.tsx
- **Commit:** 805663d

## Known Stubs

Nenhum. Todos os estados e flows estão implementados e conectados à API real.

## Threat Flags

Nenhum novo — ameaças cobertas pela threat_model do plano (T-10-06, T-10-07, T-10-08 todos aceitos).

## Self-Check: PASSED

- `apps/web/app/[slug]/(public)/minha-reserva/page.tsx` — EXISTS
- `apps/web/src/components/ui/MinhaReservaClient.tsx` — EXISTS
- `grep "react-qr-code" apps/web/package.json` — EXISTS (^2.0.21)
- Commit cc351aa — EXISTS
- Commit 8f57179 — EXISTS
- Commit 805663d — EXISTS
- TypeScript (src only): 0 erros
