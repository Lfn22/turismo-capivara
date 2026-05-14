---
status: partial
phase: 04-motor-de-pagamento
source: [04-VERIFICATION.md]
started: 2026-05-05T20:00:00Z
updated: 2026-05-14T12:58:00Z
---

## Current Test

[aguardando verificação humana]

## Tests

### 1. Live PIX flow — POST /bookings retorna paymentUrl + qrCode
expected: POST /tenants/:slug/bookings com customerCpf retorna 201 com paymentUrl e qrCode (sandbox MP)
result: [pending]

### 2. Webhook confirma booking — PENDING→CONFIRMED
expected: MP dispara webhook → booking muda para CONFIRMED (requer servidor rodando + sandbox)
result: [pending]

### 3. Rejeição de assinatura inválida
expected: x-signature inválido retorna 400 (requer servidor rodando)
result: [pending]

### 4. [BUG CR-01] Compensação não-atômica vazamento de slot
expected: bookings.routes.ts:127-138 — se booking.delete OK mas slot.update falha, capacidade vaza. Correção: envolver em $transaction
result: [fixed] — ambos os caminhos de compensação (package not found + MP failure) envolvem booking.delete + slot.update em prisma.$transaction. Verificado 2026-05-14.

### 5. [BUG CR-02] customerCpf exposto na resposta — violação LGPD
expected: bookings.routes.ts:151 — `...updatedBooking` spread expõe customerCpf na resposta POST. Correção: seleção explícita de campos
result: [fixed] — resposta POST usa seleção explícita de campos (id, customerName, customerEmail, pax, status, paymentId, paymentUrl, expiresAt, qrCode). customerCpf e customerPhone ausentes. Verificado 2026-05-14.

## Summary

total: 5
passed: 2
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
