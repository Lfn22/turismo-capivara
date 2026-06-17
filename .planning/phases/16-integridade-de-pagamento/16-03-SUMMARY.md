---
plan: "16-03"
phase: "16-integridade-de-pagamento"
status: complete
completed: 2026-06-17
---

## Summary

Implementados dois fixes de frontend para integridade de pagamento:

1. **PAY-03** — Rota proxy Next.js `/api/[slug]/bookings/[id]/status/route.ts` criada para consultar status do booking via API. `CheckoutClient.tsx` atualizado para polling com `setInterval` de **5000ms**, parando automaticamente ao detectar status terminal (`CONFIRMED`, `CANCELLED`, `EXPIRED`).

2. **PAY-04 (frontend)** — `BookingForm.tsx` com função `isValidCPF()` e validação inline no `onBlur` do campo CPF. Turista vê mensagem de erro `"CPF inválido"` sem precisar submeter o formulário.

## Key Files

- `apps/web/app/api/[slug]/bookings/[id]/status/route.ts` — Novo proxy de status
- `apps/web/src/components/ui/CheckoutClient.tsx` — Polling 5000ms com clearInterval em terminais
- `apps/web/src/components/ui/BookingForm.tsx` — Validação CPF inline via isValidCPF()

## Self-Check: PASSED

- [x] Rota `/api/[slug]/bookings/[id]/status` retorna `{ status }` do booking
- [x] Polling para em CONFIRMED, CANCELLED e EXPIRED
- [x] Intervalo exato de 5000ms conforme PAY-03
- [x] CPF `11111111111` rejeitado inline com mensagem visível
- [x] CPF válido aceito sem erro
