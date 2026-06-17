---
phase: "16-integridade-de-pagamento"
plan: "01"
subsystem: "payment"
tags: [payment, integrity, mercadopago, booking, pix]
dependency_graph:
  requires: []
  provides: [PAY-01-guard, PAY-02-atomic-booking]
  affects: [apps/api/src/services/payment.service.ts, apps/api/src/modules/bookings/bookings.routes.ts]
tech_stack:
  added: []
  patterns: [guard-clause, saga-compensation, atomic-create]
key_files:
  modified:
    - apps/api/src/services/payment.service.ts
    - apps/api/src/modules/bookings/bookings.routes.ts
decisions:
  - "Guard NODE_ENV=production antes do mock: lanca AppError 503 ao inves de retornar PIX falso"
  - "booking.create movido para apos createPixPayment: booking nunca existe sem paymentId no banco"
  - "Alias updatedBooking=booking mantido para evitar tocar no codigo de emails/reply"
metrics:
  duration: "15m"
  completed: "2026-06-17"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 16 Plan 01: Guard de Producao e Atomicidade do Booking com PIX Summary

Guard de producao em payment.service.ts + reordenacao do fluxo de criacao de booking para que o INSERT no banco sempre inclua paymentId/qrCode obtidos do Mercado Pago.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Guard de producao em payment.service.ts (PAY-01) | ce83c2a | apps/api/src/services/payment.service.ts |
| 2 | Reordenar fluxo PIX-antes-booking (PAY-02) | 00930c1 | apps/api/src/modules/bookings/bookings.routes.ts |

## What Was Built

**PAY-01:** Em `attemptCreatePayment`, adicionado guard dentro do bloco `if (!token)`: quando `NODE_ENV === 'production'` lanca `AppError('Servico de pagamento temporariamente indisponivel', 503)`. Mock PIX continua disponivel em dev/test.

**PAY-02:** Reestruturado o handler `POST /tenants/:slug/bookings`:
- Tx 1: apenas lock do slot + validacao + increment de `booked` (sem criar booking)
- Pkg lookup fora da tx (igual ao anterior)
- `createPixPayment()` com rollback de slot em caso de falha (sem booking para deletar)
- Tx 2: `booking.create` com `paymentId`, `paymentUrl`, `qrCode`, `expiresAt` ja preenchidos no INSERT

Booking nunca existe no banco sem dados de pagamento PIX validos.

## Deviations from Plan

Nenhuma — plano executado exatamente como especificado.

## Known Stubs

Nenhum.

## Threat Flags

Nenhuma superficie nova introduzida.

## Self-Check: PASSED

- [x] `ce83c2a` existe: `git log --oneline | grep ce83c2a` — confirmado
- [x] `00930c1` existe: `git log --oneline | grep 00930c1` — confirmado
- [x] `payment.service.ts` contem `NODE_ENV.*production` — confirmado (linha 32)
- [x] `bookings.routes.ts` tem `booking.create` apos `createPixPayment` — confirmado (linhas 170, 194)
- [x] `paymentId: paymentResult.paymentId` no create — confirmado (linha 206)
- [x] Sem `prisma.booking.update` com paymentId no fluxo de criacao — confirmado
