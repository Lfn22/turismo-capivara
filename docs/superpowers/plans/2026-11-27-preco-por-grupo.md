# Preço por grupo e guias por reserva — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o modelo "preço por pessoa + vagas compartilhadas" por "valor por grupo (até 8 pessoas por guia) + acréscimo por guia extra", com reserva privativa declarada, em API e Web.

**Architecture:** `TourPackage.price` passa a ser o valor do grupo; `extraGuidePrice` (nullable) é o acréscimo por guia extra. Cada `DepartureSlot` declara `maxGuides` (1–5) e `capacity = maxGuides × 8`; uma reserva ocupa o horário inteiro (`FULL`). A reserva grava `guides`, `isPrivate` e `amount` (valor cobrado), que "pagar de novo", relatórios e dashboard passam a usar. Uma função pura `groupTotal` em `money.ts` é a única fonte do cálculo.

**Tech Stack:** Fastify 5 + Prisma 7 + Zod + Vitest (apps/api); Next.js 16.2 + React 19 + Vitest (apps/web); pnpm via `corepack pnpm`.

**Spec:** `docs/superpowers/specs/2026-11-27-preco-por-grupo-design.md`

## Global Constraints

- `GROUP_SIZE_PER_GUIDE = 8`; `guides = ceil(pax / 8)`; total = `price + extraGuidePrice × (guides − 1)`.
- `extraGuidePrice = null` ⇒ roteiro aceita só 1 guia (máx. 8 pessoas).
- `maxGuides` por horário: inteiro 1–5, default 1.
- Dinheiro sempre em centavos via `apps/api/src/shared/utils/money.ts` (nunca `Number(price) * x`).
- Erros em português; códigos novos: `SLOT_GUIDES_INSUFFICIENT`, `GROUP_TOO_LARGE`, `BOOKING_LEGACY_REPAY`.
- Validação Zod em toda rota alterada; reserva dentro de `prisma.$transaction` com `FOR UPDATE` (já existente).
- Nenhuma tela pública/checkout diz "por pessoa"; o texto padrão é "por grupo · até 8 pessoas por guia".
- Só PIX. Cartão e repasses (`Payout`) fora de escopo.
- **Commits: o usuário faz todos manualmente.** Nos passos "Commit", pare, mostre `git status`/diff resumido e sugira a mensagem — não rode `git commit`.
- Há mudanças não commitadas do usuário em `booking.service.ts`, `public.route.ts`, `search.route.ts`, `bookings-create.test.ts`, `guides.routes.ts`, `notifications.service.ts` e mapas. Edite por cima, nunca reverta/stashe.
- Web: Next 16 tem mudanças de API — consulte `apps/web/node_modules/next/dist/docs/` antes de usar APIs do Next que não aparecem já no arquivo editado.

## Review Focus

1. **Horário já reservado recebendo segunda reserva** (dois grupos ao mesmo tempo, ou um legado com `booked > 0`) → deve falhar com `Slot indisponível`, nunca somar. Teste na Task 4.
2. **Exatamente 8 / 9 / 16 / 17 pessoas** (fronteiras de guia) → 8 = 1 guia; 9 = 2; 16 = 2; 17 = 3 (rejeitado se `maxGuides = 2`). Testes nas Tasks 1 e 4.
3. **Reserva expirada e paga de novo após o guia mudar `extraGuidePrice`** → cobra o `amount` gravado, não recalcula. Teste na Task 5.
4. **Guia reduz `maxGuides` de um horário já reservado para menos guias que a reserva precisa** → `PATCH` rejeitado (422). Teste na Task 3.
5. **Turista escolhe 12 pessoas e depois troca para um horário de 1 guia** → o seletor do formulário limita ao máximo do horário e o resumo recalcula. Teste na Task 10.

---

### Task 1: Schema, migração e cálculo `groupTotal`

**Files:**

- Modify: `apps/api/prisma/schema.prisma` (`TourPackage`, `DepartureSlot`, `Booking`)
- Create: `apps/api/prisma/migrations/20261127000000_group_pricing/migration.sql`
- Modify: `apps/api/src/shared/utils/money.ts`
- Test: `apps/api/src/shared/utils/money.test.ts`
- Modify: `apps/api/src/__tests__/booking-price.test.ts` (reescrever para o novo modelo)

**Interfaces:**

- Produces:
  - `export const GROUP_SIZE_PER_GUIDE = 8` (em `money.ts`)
  - `export function guidesFor(pax: number): number` → `Math.ceil(pax / 8)`
  - `export function groupTotal(groupPrice: unknown, extraGuidePrice: unknown | null, pax: number): number` → reais com 2 casas exatas; lança `Error('GROUP_TOO_LARGE')` se `guidesFor(pax) > 1` e `extraGuidePrice == null`.
  - Prisma: `TourPackage.extraGuidePrice Decimal? @db.Decimal(10,2)`; `DepartureSlot.maxGuides Int @default(1)`; `Booking.guides Int @default(1)`, `Booking.isPrivate Boolean @default(false)`, `Booking.amount Decimal? @db.Decimal(10,2)`. Comentário no schema: `price = valor do grupo (1 guia, até 8 pessoas)`.

- [ ] **Step 1: Testes que falham** em `money.test.ts`:

```ts
describe('groupTotal', () => {
  it('cobra o valor do grupo para 1 a 8 pessoas', () => {
    expect(groupTotal('600.00', '400.00', 1)).toBe(600)
    expect(groupTotal('600.00', '400.00', 8)).toBe(600)
  })
  it('soma um acréscimo por guia extra', () => {
    expect(groupTotal('600.00', '400.00', 9)).toBe(1000)
    expect(groupTotal('600.00', '400.00', 16)).toBe(1000)
    expect(groupTotal('600.00', '400.00', 17)).toBe(1400)
  })
  it('sem acréscimo definido, grupo acima de 8 é recusado', () => {
    expect(() => groupTotal('600.00', null, 9)).toThrow('GROUP_TOO_LARGE')
    expect(groupTotal('600.00', null, 8)).toBe(600)
  })
  it('é exato em centavos', () => {
    expect(groupTotal('199.90', '0.10', 9)).toBe(200)
  })
})
describe('guidesFor', () => {
  it.each([
    [1, 1],
    [8, 1],
    [9, 2],
    [16, 2],
    [17, 3],
  ])('%i pessoas → %i guias', (pax, g) => expect(guidesFor(pax)).toBe(g))
})
```

Reescreva `booking-price.test.ts` para testar `groupTotal` com os mesmos valores do spec (família de 4 = valor do grupo; 12 pessoas = grupo + 1 acréscimo), removendo as asserções de `price * pax`.

- [ ] **Step 2:** `corepack pnpm --filter @turismo/api test -- money booking-price` → FAIL (`groupTotal` não existe).
- [ ] **Step 3:** Implementar em `money.ts` usando `toCents`/`fromCents`.
- [ ] **Step 4:** Alterar `schema.prisma` e escrever `migration.sql` à mão (padrão das migrations existentes): `ADD COLUMN` dos 5 campos; `UPDATE "DepartureSlot" SET capacity = 8, "maxGuides" = 1 WHERE booked = 0;`; `UPDATE "TourPackage" SET capacity = 8;`. Rodar `corepack pnpm --filter @turismo/api exec prisma generate`.
- [ ] **Step 5:** Testes do Step 2 → PASS; `corepack pnpm --filter @turismo/api typecheck` → sem erros novos.
- [ ] **Step 6: Commit** (usuário) — sugestão: `feat(api): modelo de preço por grupo (schema + groupTotal)`.

---

### Task 2: API de roteiro aceita `extraGuidePrice`, capacidade fixa em 8

**Files:**

- Modify: `apps/api/src/modules/packages/routes/crud.route.ts` (`createPackageBodySchema` ~l.41, listagem `manage/packages`, create/update)
- Modify: `apps/api/src/modules/packages/routes/public.route.ts` (select/serialização do roteiro e dos slots)
- Modify: `apps/api/src/modules/packages/routes/search.route.ts` (serialização)
- Test: teste de rota de pacotes existente mais próximo (procure `crud.route` em `apps/api/src/**/__tests__` ou `*.test.ts`; se não houver, crie `apps/api/src/modules/packages/routes/crud.route.test.ts` seguindo `search.route.test.ts`)

**Interfaces:**

- Consumes: `GROUP_SIZE_PER_GUIDE` (Task 1).
- Produces:
  - Body de criação: `price: number > 0` (valor do grupo), `extraGuidePrice?: number | null` (≥ 0), `capacity` **removido** do schema obrigatório (aceito e ignorado se vier, para não quebrar clientes antigos); o banco grava `capacity: 8`.
  - Respostas (manage, público, busca) incluem `extraGuidePrice: number | null` e, nos slots públicos, `maxGuides: number`, `available: boolean` (`booked === 0 && status === 'OPEN'`), `maxPax: number` (`(extraGuidePrice != null ? maxGuides : 1) × 8`).

- [ ] **Step 1: Testes que falham:** POST sem `capacity` com `price: 600, extraGuidePrice: 400` → 201 e `prisma.tourPackage.create` chamado com `capacity: 8, extraGuidePrice: 400`; POST com `extraGuidePrice: -1` → 400 com mensagem em PT; GET público de roteiro com `extraGuidePrice: null` e slot `maxGuides: 3` → slot com `maxPax: 8`.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar → PASS; `typecheck` ok.
- [ ] **Step 5: Commit** (usuário) — `feat(api): roteiro com valor do grupo e acréscimo por guia extra`.

---

### Task 3: API de horários usa `maxGuides`

**Files:**

- Modify: `apps/api/src/modules/packages/routes/slots.route.ts` (`createSlotBodySchema` ~l.45, `batchSlotBodySchema` ~l.56, `updateSlotBodySchema` ~l.82, handlers de create/batch/update e listagens/calendário)
- Test: teste existente de slots (procure `slots` em `apps/api/src/**/*.test.ts`); se não houver, crie `apps/api/src/modules/packages/routes/slots.route.test.ts`

**Interfaces:**

- Produces: bodies aceitam `maxGuides: number` (int 1–5, default 1) no lugar de `capacity`; `minCapacity` deixa de ser exigido (default 1). Handler grava `capacity = maxGuides × 8`. Respostas de slot incluem `maxGuides`.

- [ ] **Step 1: Testes que falham:**
  - create com `maxGuides: 2` → `departureSlot.create` com `capacity: 16, maxGuides: 2`.
  - batch sem `maxGuides` → `capacity: 8, maxGuides: 1`.
  - `maxGuides: 6` → 400 "Máximo de 5 guias por horário".
  - update `maxGuides: 1` num slot com `booked: 12` → 422 "Este horário já tem uma reserva que precisa de 2 guias".
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar (no update, comparar `guidesFor(row.booked)` com o novo `maxGuides` dentro da transação que já faz `SELECT ... FOR UPDATE`).
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5: Commit** (usuário) — `feat(api): horário informa quantos guias atendem`.

---

### Task 4: Criar reserva — grupo inteiro, guias, privativo e valor gravado

**Files:**

- Modify: `apps/api/src/modules/bookings/routes/create.route.ts` (`createBookingBodySchema` ~l.21, idempotência `sameRequest` ~l.146, resposta)
- Modify: `apps/api/src/modules/bookings/booking.service.ts` (query `FOR UPDATE` ~l.92, validação ~l.129, update do slot ~l.135, `booking.create`, `pkg` select ~l.200, `createPixPayment` ~l.218)
- Modify: GET público da reserva (`self-service.route.ts` / rota usada por `CheckoutClient`) para incluir `guides`, `isPrivate`, `amount`
- Test: `apps/api/src/__tests__/bookings-create.test.ts`

**Interfaces:**

- Consumes: `groupTotal`, `guidesFor` (Task 1); `slot.maxGuides`, `tp."extraGuidePrice"`, `tp.price`.
- Produces: body aceita `isPrivate?: boolean` (default false); `CreateBookingInput.isPrivate: boolean`; `Booking` criada com `guides`, `isPrivate`, `amount`; resposta da reserva inclui esses três campos.

Regras (dentro da transação, após as checagens atuais de status/publicação):

- `slot.booked > 0` → `AppError('Slot indisponível', 400)`.
- `guidesFor(pax) > 1 && extraGuidePrice == null` → `AppError('Este roteiro atende grupos de até 8 pessoas', 400, 'GROUP_TOO_LARGE')` (use a assinatura de `AppError` que o projeto já usa para código; se não tiver código, só a mensagem).
- `guidesFor(pax) > slot.maxGuides` → `AppError('Este horário não tem guias suficientes para N pessoas', 400, 'SLOT_GUIDES_INSUFFICIENT')`.
- Slot: `booked = pax`, `status = 'FULL'`.
- `amount = groupTotal(price, extraGuidePrice, pax)` calculado **dentro** da transação (preço lido junto no `SELECT`) e o mesmo valor passado a `createPixPayment` — não reler `pkg.price` depois.
- `releaseBooking` continua decrementando `pax` e reabrindo para `OPEN`.

- [ ] **Step 1: Testes que falham** (estendendo os mocks de `$queryRaw` existentes com `maxGuides`, `price`, `extraGuidePrice`):
  - 4 pessoas, `price 600` → `createPixPayment` com `transactionAmount: 600`; `booking.create` com `guides: 1, amount: 600, isPrivate: false`; slot atualizado com `booked: 4, status: 'FULL'`.
  - 12 pessoas, `maxGuides 2`, `extraGuidePrice 400` → `transactionAmount: 1000`, `guides: 2`.
  - 17 pessoas, `maxGuides 2` → 400 `SLOT_GUIDES_INSUFFICIENT`.
  - 9 pessoas, `extraGuidePrice null` → 400 `GROUP_TOO_LARGE`.
  - slot com `booked: 3` (status `OPEN`, legado) → 400 "Slot indisponível".
  - `isPrivate: true` → gravado.
  - Ajuste os testes antigos de "capacidade insuficiente" para o novo comportamento.
- [ ] **Step 2:** `corepack pnpm --filter @turismo/api test -- bookings-create` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar a suíte inteira da API → PASS (corrigir outros testes que assumiam vagas compartilhadas).
- [ ] **Step 5: Commit** (usuário) — `feat(api): reserva ocupa o horário e cobra por grupo`.

---

### Task 5: "Pagar de novo" cobra o valor gravado

**Files:**

- Modify: `apps/api/src/modules/bookings/routes/repay.route.ts` (~l.86 e a transação com `FOR UPDATE` logo abaixo)
- Test: teste existente de repay (procure `repay` em `apps/api/src/**/*.test.ts`); senão crie `apps/api/src/modules/bookings/routes/repay.route.test.ts`

**Interfaces:**

- Consumes: `Booking.amount`, `Booking.guides`.

Regras: `booking.amount == null` → `AppError('Esta reserva é anterior ao novo modelo de preço. Faça uma nova reserva.', 422, 'BOOKING_LEGACY_REPAY')` antes de chamar o Mercado Pago. `transactionAmount = Number(booking.amount)`. Na transação: exigir `booked === 0` e `status === 'OPEN'`; gravar `booked = pax`, `status = 'FULL'`.

- [ ] **Step 1: Testes que falham:** reserva expirada com `amount: 1000`, roteiro hoje com `price 800` → MP chamado com `1000`; `amount: null` → 422 sem chamada ao MP; slot com `booked: 2` → 422 "Slot indisponível para novo pagamento".
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar; remover import de `lineTotal` se ficar sem uso.
- [ ] **Step 4:** Rodar → PASS.
- [ ] **Step 5: Commit** (usuário) — `fix(api): novo pagamento cobra o valor original da reserva`.

---

### Task 6: Relatórios, dashboard e filtros de busca

**Files:**

- Modify: `apps/api/src/modules/reports/reports.routes.ts` (l.58, 71, 93, 112)
- Modify: `apps/api/src/modules/dashboard/dashboard.routes.ts` (l.62, 97-98)
- Modify: `apps/api/src/modules/packages/routes/public.route.ts` (filtro `minAvailable` l.82-96)
- Create: `export function bookingRevenueCents(b: { amount: unknown | null; pax: number; slot: { package: { price: unknown } } }): number` em `money.ts` → `amount != null ? toCents(amount) : toCents(price) * pax`
- Test: `money.test.ts`, `apps/api/src/__tests__/dashboard.test.ts`, `search.route.test.ts`

- [ ] **Step 1: Testes que falham:** `bookingRevenueCents` com `amount '1000.00'` → 100000; com `amount null, price '150', pax 3` → 45000. Dashboard com uma reserva nova (`amount 600`, `pax 4`) soma 600, não 2400. `minAvailable=12`: SQL passa a exigir `booked = 0 AND (CASE WHEN tp."extraGuidePrice" IS NULL THEN 1 ELSE ds."maxGuides" END) * 8 >= 12` (ajuste o `$queryRaw` para juntar `TourPackage`); teste asserta o slot elegível/inelegível conforme o padrão atual do arquivo de teste.
- [ ] **Step 2:** Rodar → FAIL.
- [ ] **Step 3:** Implementar (relatórios/dashboard selecionam `amount` e usam `bookingRevenueCents`). `min_price`/`max_price`/ordenação **continuam** em `price` (valor do grupo) — sem mudança.
- [ ] **Step 4:** Rodar suíte da API → PASS.
- [ ] **Step 5: Commit** (usuário) — `fix(api): receita usa valor gravado; filtro de pessoas por guias`.

---

### Task 7: Seed com valores de grupo

**Files:**

- Modify: `apps/api/prisma/seed.ts` (l.45-46, 129-130, 151, 331-377)

- [ ] **Step 1:** Trocar `price` por valores de grupo (ex.: 600 / 800 / 1100), adicionar `extraGuidePrice` (ex.: 400 / 500 / null em um roteiro para exercitar "só até 8"), `capacity: 8`, e slots com `maxGuides` (1 ou 2) e `capacity = maxGuides × 8`.
- [ ] **Step 2:** `corepack pnpm --filter @turismo/api typecheck` → ok. (Não rodar o seed contra produção.)
- [ ] **Step 3: Commit** (usuário) — `chore(api): seed com preço por grupo`.

---

### Task 8: Web — criar roteiro (painel e super-admin) com grupo, fotos e destaques

**Files:**

- Modify: `apps/web/app/[slug]/(painel)/painel/roteiros/novo/page.tsx`
- Modify: `apps/web/app/super-admin/roteiros/novo/NovoRoteiroClient.tsx`
- Reuse: `apps/web/src/components/ui/PhotoUploadArea.tsx` (`photos`, `onAdd(file)`, `onRemove(url)`, `maxPhotos`); upload igual a `PackageEditor.tsx:122-133` (`compressImage` + `POST /api/uploads/photos?folder=packages`) — extrair essa função para `apps/web/src/lib/upload-package-photo.ts` (`export async function uploadPackagePhoto(file: File): Promise<string>`) e usá-la nos três lugares.
- Test: `apps/web/app/[slug]/(painel)/painel/roteiros/novo/page.test.tsx` (criar, seguindo `disponibilidade/page.test.tsx`)

Campos (copy fixa):

- "Valor do grupo (R$)" — hint "Vale para 1 guia e até 8 pessoas. O valor não muda se o grupo for menor."
- "Acréscimo por guia extra (R$)" — opcional — hint "Cobrado a cada 8 pessoas a mais. Deixe vazio se você não atende grupos acima de 8."
- Remove "Capacidade máxima"; card "Grupo e dificuldade" vira "Dificuldade".
- Novo card "Fotos" (até 5) e card "Destaques" (lista de textos, 5–200 caracteres, até 10, botão "Adicionar destaque").
- `PageHeader.description` → "Preencha as informações do roteiro. Você pode ajustar tudo depois."
- POST envia `price`, `extraGuidePrice` (null se vazio), `photos`, `highlights`; não envia `capacity`.

- [ ] **Step 1: Teste que falha:** preencher nome, descrição, valor 600, acréscimo vazio, duração 4 → `fetch` chamado com body contendo `price: 600, extraGuidePrice: null, photos: [], highlights: []` e sem `capacity`; o texto "Capacidade máxima" não existe; o texto "por pessoa" não existe.
- [ ] **Step 2:** `corepack pnpm --filter @turismo/web test -- roteiros/novo` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar → PASS; `corepack pnpm --filter @turismo/web typecheck` ok.
- [ ] **Step 5: Commit** (usuário) — `feat(web): criar roteiro com valor do grupo, fotos e destaques`.

---

### Task 9: Web — agenda com "guias neste horário"

**Files:**

- Modify: `apps/web/app/[slug]/(painel)/painel/disponibilidade/page.tsx` (tipo l.28, envio l.242, subtitle l.333, formulário ~l.674 `slot-min-capacity`)
- Test: `apps/web/app/[slug]/(painel)/painel/disponibilidade/page.test.tsx`

Copy: campo "Guias neste horário" (select 1–5) com ajuda "Até {n × 8} pessoas. Indique colegas da sua agência para os guias extras."; remove campos de vagas e mínimo; item da lista: livre → "Livre · até {maxGuides × 8} pessoas"; reservado → "Reservado · {booked} pessoas · {ceil(booked/8)} guia(s)".

- [ ] **Step 1: Testes que falham:** escolher 2 guias e salvar → body com `maxGuides: 2` e sem `capacity`/`minCapacity`; slot `{ booked: 0, maxGuides: 2 }` renderiza "Livre · até 16 pessoas"; slot `{ booked: 6, maxGuides: 1 }` renderiza "Reservado · 6 pessoas · 1 guia".
- [ ] **Step 2:** Rodar → FAIL. **Step 3:** Implementar. **Step 4:** Rodar → PASS.
- [ ] **Step 5: Commit** (usuário) — `feat(web): agenda informa guias por horário`.

---

### Task 10: Web — reserva com cálculo do grupo e "privativo"

**Files:**

- Modify: `apps/web/src/components/ui/BookingForm.tsx` (`PAX_MAX` l.12, estado, envio l.83-89, seletor l.117-157)
- Create: `apps/web/src/lib/group-price.ts` — `export const GROUP_SIZE_PER_GUIDE = 8`; `export function guidesFor(pax: number): number`; `export function groupTotalCents(groupPriceCents: number, extraGuidePriceCents: number | null, pax: number): number | null` (null quando precisa de guia extra e não há acréscimo). Mesmas regras da Task 1.
- Test: `apps/web/src/lib/group-price.test.ts`, `apps/web/src/components/ui/__tests__/BookingForm.test.tsx`

**Interfaces:**

- Consumes: resposta pública do roteiro (Task 2): `price`, `extraGuidePrice`, `slots[].{id, maxGuides, maxPax, available}`. `BookingForm` busca o roteiro pela mesma rota pública que `roteiros/[packageId]/page.tsx` usa e localiza o slot por `slotId`.

Comportamento/copy:

- Seletor de pessoas: 1 até `slot.maxPax`.
- Resumo: "{pax} pessoas · {guides} guia(s)" e linhas "Valor do grupo (até 8 pessoas) R$ X" + (se guides > 1) "Guia extra × {guides − 1} R$ Y" + "Total R$ Z".
- Checkbox "Grupo privativo — somos um grupo fechado e não queremos dividir o passeio"; enviado como `isPrivate`.
- Se `!slot.available` → `Alert` "Este horário já foi reservado. Escolha outro horário." e botão desabilitado.

- [ ] **Step 1: Testes que falham:** `group-price.test.ts` com os mesmos casos da Task 1 (em centavos). `BookingForm`: com `price 600, extraGuidePrice 400, maxPax 16` → incrementar até 12 mostra "2 guias" e "R$ 1.000,00"; botão + desabilitado em 16; com `maxPax 8` o + desabilita em 8; marcar privativo → body com `isPrivate: true`.
- [ ] **Step 2:** Rodar → FAIL. **Step 3:** Implementar. **Step 4:** Rodar → PASS.
- [ ] **Step 5: Commit** (usuário) — `feat(web): reserva mostra cálculo por grupo e opção privativa`.

---

### Task 11: Web — textos "por grupo" e exibição da reserva

**Files:**

- Modify (trocar "por pessoa"/"/pessoa" por "por grupo"/"/grupo"; onde houver espaço, "até 8 pessoas por guia"):
  `apps/web/src/components/ui/PackageCard.tsx`, `apps/web/src/components/ui/capi/Cards.tsx`, `apps/web/src/components/ui/capi/Booking.tsx` (default `unit="/grupo"` em `BookingBar`), `apps/web/app/[slug]/(public)/roteiros/[packageId]/page.tsx` (+ linha "+ R$ Y por guia extra (grupos acima de 8)" quando `extraGuidePrice` existir), `apps/web/app/[slug]/(public)/guias/[guideId]/page.tsx`, `apps/web/app/[slug]/(painel)/painel/roteiros/page.tsx`, `apps/web/app/super-admin/roteiros/RoteirosClient.tsx`
- Modify (mostrar guias e selo "Privativo"): `apps/web/app/[slug]/(painel)/painel/reservas/page.tsx`, `apps/web/src/components/ui/CheckoutClient.tsx` (l.376: "{pax} pessoas · {guides} guia(s)"), `apps/web/src/components/turista/BookingCard.tsx`
- Test: testes existentes desses componentes (`reservas/page.test.tsx`, `CheckoutClient.test.tsx`) + um teste em `PackageCard`

- [ ] **Step 1: Testes que falham:** `reservas/page.test.tsx` — reserva `{ pax: 12, guides: 2, isPrivate: true }` mostra "12 pessoas · 2 guias" e "Privativo"; `CheckoutClient` mostra "2 guias"; `PackageCard` não contém "pessoa" no preço e contém "grupo".
- [ ] **Step 2:** Rodar → FAIL. **Step 3:** Implementar. **Step 4:** `corepack pnpm --filter @turismo/web test` e `typecheck` → PASS.
- [ ] **Step 5:** `grep -rn "por pessoa\|/pessoa" apps/web/app apps/web/src --include=*.tsx` → nenhum resultado em telas de preço (resultados em textos não relacionados a preço são aceitáveis; listar para o usuário).
- [ ] **Step 6: Commit** (usuário) — `feat(web): preço por grupo em todas as telas`.

---

### Task 12: Verificação de ponta a ponta

- [ ] **Step 1:** `corepack pnpm turbo run typecheck test` → tudo verde.
- [ ] **Step 2:** Subir o app (skill `run`), entrar como guia de seed: criar roteiro com valor 600 + acréscimo 400 e uma foto; abrir horário com 2 guias; como turista, reservar 12 pessoas marcando privativo → checkout mostra R$ 1.000,00; painel de reservas mostra "12 pessoas · 2 guias · Privativo"; o horário some como disponível.
- [ ] **Step 3:** Relatar ao usuário o resultado e a lista de mudanças para ele commitar.
