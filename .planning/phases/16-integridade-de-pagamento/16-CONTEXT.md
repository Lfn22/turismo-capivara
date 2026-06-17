# Phase 16: Integridade de Pagamento — Context

**Gathered:** 2026-06-17
**Status:** Ready for planning
**Source:** Auditoria de produto end-to-end (2026-06-17)

<domain>
## Phase Boundary

Corrigir os 5 pontos de quebra críticos no fluxo de pagamento e criação de booking que impedem operação real com clientes. Nenhuma nova feature — apenas correções cirúrgicas nos arquivos identificados.

</domain>

<decisions>
## Implementation Decisions

### PAY-01 — MP_ACCESS_TOKEN obrigatório em produção
- **Arquivo:** `apps/api/src/services/payment.service.ts`
- **Decisão:** Se `process.env.MP_ACCESS_TOKEN` estiver ausente E `NODE_ENV === 'production'`, lançar `new AppError('Serviço de pagamento temporariamente indisponível', 503)`. NUNCA retornar mock silenciosamente em produção.
- **Dev/test:** Mock permanece quando `NODE_ENV !== 'production'` e token ausente.

### PAY-02 — PIX criado antes do INSERT do booking
- **Arquivo:** `apps/api/src/modules/bookings/bookings.routes.ts` (handler POST /bookings)
- **Decisão:** Reordenar o fluxo: (1) validar slot/capacidade, (2) chamar `createPixPayment()`, (3) só então `prisma.$transaction` para criar o Booking com o `paymentId`/`qrCode` já em mãos. Se PIX falhar → retornar 502 sem criar booking.

### PAY-03 — Polling de status no checkout
- **Arquivo:** `apps/web/src/components/ui/CheckoutClient.tsx`
- **Decisão:** Adicionar `useEffect` com `setInterval` de 5000ms que chama `GET /api/[slug]/bookings/[id]/status` (ou rota equivalente existente). Quando `status === 'CONFIRMED'`, mostrar feedback de sucesso e parar o polling. Limpar interval no `return` do useEffect.

### PAY-04 — Validação real de CPF
- **Arquivos:** `apps/api/src/modules/bookings/bookings.routes.ts` (Zod schema) + `apps/web/src/components/ui/BookingForm.tsx` (feedback imediato)
- **Decisão:** Implementar algoritmo de dígitos verificadores do CPF. No backend: refinar `z.string().regex(/^\d{11}$/)` com `.refine(isValidCPF, 'CPF inválido')`. No frontend: validar antes do submit e mostrar erro inline.
- **Algoritmo:** Calcular dígito 1 (primeiros 9 dígitos × pesos 10..2) e dígito 2 (primeiros 10 × pesos 11..2). Resto mod 11 < 2 → dígito = 0, senão 11 - resto.

### DATA-03 — Lock pessimista no slot (anti-overbooking)
- **Arquivo:** `apps/api/src/modules/bookings/bookings.routes.ts`
- **Decisão:** Dentro do `prisma.$transaction`, usar `prisma.$queryRaw` para `SELECT id, "bookedCount", capacity FROM slots WHERE id = ${slotId} FOR UPDATE` antes de verificar disponibilidade e criar o booking. Isso garante serialização em requisições simultâneas.

### Claude's Discretion
- Estrutura exata da rota de status para polling (verificar se `/api/[slug]/bookings/[id]/status` já existe ou criar)
- Tratamento de erro e feedback visual no polling (ex: mostrar "Aguardando confirmação..." durante poll)
- Número máximo de tentativas de poll antes de exibir mensagem de timeout

</decisions>

<canonical_refs>
## Canonical References

### Backend — pagamento e bookings
- `apps/api/src/services/payment.service.ts` — lógica de criação de PIX (mock vs prod)
- `apps/api/src/modules/bookings/bookings.routes.ts` — handler de criação de booking, Zod schema
- `apps/api/src/shared/errors/AppError.ts` — padrão de erros da API

### Frontend — checkout
- `apps/web/src/components/ui/CheckoutClient.tsx` — exibe QR code, recebe bookingId como prop
- `apps/web/src/components/ui/BookingForm.tsx` — formulário de reserva, validação de campos
- `apps/web/app/[slug]/(public)/confirmacao/page.tsx` — página de confirmação (RSC wrapper)

### Referência de padrões
- `apps/api/prisma/schema.prisma` — enum BookingStatus, modelo Slot e Booking
- `apps/web/app/api/[slug]/bookings/route.ts` — proxy Next.js → API (verificar se rota de status existe)

</canonical_refs>

<specifics>
## Specific Ideas

- CPF de todos zeros (`00000000000`) deve falhar mesmo passando no regex — algoritmo detecta
- Polling deve parar automaticamente em estados terminais: CONFIRMED, CANCELLED, EXPIRED
- Se booking já está em estado terminal quando página carrega, não iniciar polling
- Mensagem de 503 do PAY-01 deve ser amigável ao turista, não técnica

</specifics>

<deferred>
## Deferred Ideas

- Link "minha reserva" na confirmação → Phase 18 (UX-03)
- QR Code visual → Phase 18 (UX-02)
- Countdown do PIX → Phase 18 (UX-01)
- Proteção de PII na confirmação → Phase 18 (UX-05)

</deferred>

---

*Phase: 16-integridade-de-pagamento*
*Context gathered: 2026-06-17 via auditoria de produto*
