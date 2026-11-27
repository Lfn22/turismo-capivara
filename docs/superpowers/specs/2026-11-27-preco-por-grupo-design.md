# Preço por grupo e guias por reserva — Design

Origem: reunião CAPI de 26/11/2026 (anotações em caderno) + conversa de 27/11/2026.

## Intenção (o porquê)

Na prática os passeios são vendidos para **grupos** (famílias, amigos, agências), não para pessoas avulsas. Cada guia conduz **até 8 pessoas**. A plataforma hoje cobra `preço × pessoas` e trata o horário como vagas compartilhadas entre desconhecidos — isso não reflete o negócio e confunde guia e turista. A plataforma precisa deixar explícito, em todas as telas, que:

- o valor é **por grupo/reserva** (até 8 pessoas por guia), e não muda se o grupo for menor;
- grupos acima de 8 precisam de **mais um guia**, com um **acréscimo** definido pelo guia;
- o turista pode declarar que o grupo é **privativo** (fechado).

## Decisões tomadas com o usuário

1. **Preço por grupo.** Família de 4 paga o mesmo valor que um grupo de 8.
2. **1 reserva = o horário inteiro.** Ao ser reservado, o horário fecha (sem venda de vagas restantes para outros).
3. **1 guia a cada 8 pessoas.** `guias = ceil(pessoas / 8)`.
4. **Guia extra = acréscimo próprio (opção B).** O guia define, por roteiro, o "acréscimo por guia extra". Total = `valor do grupo + acréscimo × (guias − 1)`.
5. **"Privativo" é só declaração.** Checkbox na reserva ("Somos um grupo fechado, não queremos dividir"), exibida ao guia. Não altera preço nem vagas.
6. **Abordagem A — guia responsável + equipe.** Ao abrir um horário, o guia informa quantos guias consegue levar (ele indica colegas, de preferência da mesma agência). O turista reserva até `guias × 8` pessoas. Pagamento e repasse vão para o guia responsável, que acerta com os colegas. A plataforma **não** registra quem são os guias extras.

## Abordagens consideradas

|                                  | Como                                                                     | Trade-off                                                            | Escolha                                          |
| -------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------ |
| **A. Guia responsável + equipe** | Horário tem `maxGuides`; reserva paga acréscimos; repasse ao responsável | Mexe pouco em banco/pagamentos; plataforma não sabe quem é o 2º guia | ✅ escolhida — entrega já e evolui para B depois |
| B. Vários guias por reserva      | Reserva ocupa N horários de guias diferentes; repasse dividido           | Modelo completo, mas muda relação reserva↔horário, PIX e repasses    | adiada                                           |
| C. Grupos >8 viram orçamento     | Pedido manual confirmado pela agência                                    | Fluxo novo, perde reserva imediata                                   | descartada                                       |

Também descartado: modalidade "compartilhado" com preço por pessoa — o usuário considerou complicar demais.

## Objetivos

- Guia cria roteiro informando **valor do grupo (até 8 pessoas)** e **acréscimo por guia extra** (opcional).
- Guia abre horários informando **quantos guias** estarão disponíveis naquele horário.
- Turista vê "R$ X por grupo · até 8 pessoas por guia", escolhe o número de pessoas e vê o cálculo detalhado antes de pagar.
- Cobrança PIX (inclusive "pagar de novo") usa o novo cálculo.
- Guia/painel vê na reserva: pessoas, guias necessários, privativo sim/não.
- Na tela de criação de roteiro, já dá para **adicionar fotos e destaques** (anotação 1 da reunião).

## Não-objetivos

- Registrar/nomear os guias extras, dividir repasse entre guias (abordagem B).
- Modalidade compartilhada / venda de vagas avulsas.
- Translado, aprovação de roteiros pela organização, botão "quero atuar" em Meus roteiros, botão duplicado da agenda, fotos sem direitos autorais, mapa — são outros itens da reunião, tratados em designs/tarefas separados.

## Anti-objetivos (falha mesmo que "funcione")

- Qualquer tela pública ou de checkout ainda dizer "por pessoa" ou multiplicar por pessoas.
- Valor cobrado no Mercado Pago diferente do mostrado ao turista.
- Dois grupos conseguirem reservar o mesmo horário (overbooking) — manter `prisma.$transaction` e a trava atual.
- Roteiros existentes passarem a cobrar um valor errado silenciosamente após a migração.

## Restrições

- Stack existente: Fastify 5 + Prisma 7 + Zod (API), Next.js 16 (Web). Validação Zod em todas as rotas.
- Dinheiro em centavos via `apps/api/src/shared/utils/money.ts` (sem float).
- Mensagens de erro em português.
- O usuário faz todos os commits manualmente.

## Como funciona hoje (o que muda)

- `TourPackage.price` = preço por pessoa; `TourPackage.capacity` até 100.
- `DepartureSlot.capacity` / `booked` = vagas compartilhadas; `minCapacity`.
- `booking.service.ts:218` e `routes/repay.route.ts:86` cobram `lineTotal(price, pax)`.
- `Payout` já é por guia e por reserva (guia do horário) — continua igual.
- Formulários: `painel/roteiros/novo/page.tsx`, `super-admin/roteiros/novo/NovoRoteiroClient.tsx`, `painel/disponibilidade/page.tsx`.
- Textos "por pessoa": `PackageCard.tsx`, `ui/capi/Cards.tsx`, `ui/capi/Booking.tsx`, `(public)/roteiros/[packageId]/page.tsx`, `(public)/guias/[guideId]/page.tsx`, `painel/roteiros/page.tsx`, `painel/reservas/page.tsx`, `super-admin/roteiros/RoteirosClient.tsx`.

## Design

### Dados (Prisma)

- `TourPackage.price` passa a significar **valor do grupo** (1 guia, até 8 pessoas). Mantém o nome da coluna para reduzir churn; documentar no schema.
- Novo `TourPackage.extraGuidePrice Decimal? @db.Decimal(10,2)` — acréscimo por guia extra. `null` ⇒ roteiro não aceita grupos acima de 8 (só 1 guia).
- `TourPackage.capacity` deixa de ser editável; fica como 8 (constante `GROUP_SIZE_PER_GUIDE = 8` compartilhada).
- Novo `DepartureSlot.maxGuides Int @default(1)`. `capacity` do horário passa a ser derivado: `maxGuides × 8` (gravado no create/update para manter as consultas atuais).
- Novo `Booking.guides Int @default(1)` e `Booking.isPrivate Boolean @default(false)`.

### Cálculo (API)

- Nova função pura em `money.ts`: `groupTotal(groupPrice, extraGuidePrice, pax)` → `guides = ceil(pax/8)`; total em centavos = `groupPrice + extraGuidePrice × (guides − 1)`. Testada isoladamente.
- `booking.service` e `repay.route` usam essa função; `Booking.guides` gravado na criação.
- Validação na reserva (dentro da transação):
  - `pax ≤ slot.maxGuides × 8`, senão `SLOT_GUIDES_INSUFFICIENT` (mensagem em PT).
  - `guides > 1` exige `extraGuidePrice` não nulo, senão `GROUP_TOO_LARGE`.
  - Horário precisa estar sem reservas ativas (`booked = 0`); ao reservar, `booked = pax` e status `FULL`. Cancelamento/expiração devolve o horário para `OPEN` com `booked = 0` (comportamento atual de decremento já cobre isso).
- `minCapacity` deixa de ter sentido para o turista; mantido no banco, removido dos formulários (default 1).

### Telas

- **Criar roteiro (painel e super-admin):** "Valor do grupo (até 8 pessoas)" + "Acréscimo por guia extra (opcional)" com dica ("deixe vazio se você não atende grupos acima de 8"). Remove "Capacidade máxima". Adiciona seção **Fotos** (upload, reutilizando o fluxo/endpoint de upload já usado na edição de roteiro) e **Destaques** (lista de textos curtos). Remove o texto "Fotos e experiências você adiciona depois".
- **Agenda (disponibilidade):** campo "vagas" vira "Guias neste horário" (1 a 5), com texto "até N pessoas". Lista de horários mostra "Reservado · 6 pessoas · 1 guia" ou "Livre · até 16 pessoas".
- **Página pública do roteiro / widget de reserva:** "R$ X por grupo · até 8 pessoas por guia"; se houver acréscimo: "+ R$ Y por guia extra (grupos acima de 8)". Seletor de pessoas limitado ao horário escolhido. Resumo do cálculo: "12 pessoas → 2 guias · R$ X + R$ Y = R$ Z". Checkbox "Grupo privativo (somos um grupo fechado)".
- **Cards e listagens:** "por pessoa" → "por grupo".
- **Painel → Reservas / detalhes:** mostra pessoas, guias e selo "Privativo".

### Valor gravado na reserva _(decisão do Claude)_

- Novo `Booking.amount Decimal? @db.Decimal(10,2)`: valor cobrado, gravado na criação. "Pagar de novo" cobra `amount` (não recalcula). Relatórios e dashboard (`reports.routes.ts`, `dashboard.routes.ts`) usam `amount` quando presente; reservas antigas sem `amount` mantêm o cálculo antigo (`price × pax`) para não reescrever o histórico.
- Reservas antigas expiradas sem `amount` não podem ser pagas de novo (`BOOKING_LEGACY_REPAY` — turista faz nova reserva).

### Busca e filtros _(decisão do Claude)_

- `min_price`/`max_price` e ordenação usam o **valor do grupo** (coluna `price`). A vitrine mostra "a partir de R$ X por grupo"; o total com guia extra aparece só no widget de reserva, com o cálculo detalhado — assim não há divergência entre vitrine e checkout.
- Filtro de pessoas: horário serve se `booked = 0` e `pessoas ≤ (extraGuidePrice ? maxGuides : 1) × 8`.

### Migração de dados

- `extraGuidePrice = null` em todos os roteiros ⇒ todos começam aceitando só 1 guia (até 8 pessoas). Horários existentes: `maxGuides = 1`; os sem reservas ficam com `capacity = 8`.
- Horários com reservas ativas no modelo antigo ficam como estão (legado); só aceitam nova reserva quando voltarem a `booked = 0`.
- Valores de `price` existentes: **não há roteiros reais em produção** (confirmado pelo usuário em 27/11/2026 — dados são de teste/seed). Nenhuma conversão no banco; apenas o seed é atualizado para valores de grupo coerentes (ex.: R$ 600 por grupo, acréscimo R$ 400).

### Fora de escopo descoberto

- Pagamento é só PIX hoje (não há fluxo de cartão); este design cobre só PIX + "pagar de novo".
- O modelo `Payout` existe mas nenhum código cria repasses; o repasse ao guia responsável fica para o projeto de pagamentos.

## Deixado ao builder

- Componentes exatos de upload de fotos e de lista de destaques (reusar o que existe).
- Limite superior de guias por horário (proposta: 5).
- Nomes finais de códigos de erro e textos de ajuda.
- Ajuste de testes existentes que assumem preço por pessoa/vagas compartilhadas.
