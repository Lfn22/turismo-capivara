# Phase 6: Interface do Turista - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Interface pública para turistas encontrarem um guia, verem disponibilidade, reservarem e pagarem via PIX (Mercado Pago). Sem autenticação — guest checkout completo.

Telas: Listagem de guias por destino → Perfil do guia (slots) → Formulário de reserva → Redirect MP → Confirmação.

Não inclui: busca por texto, filtros avançados, comparação de guias, reviews, login do turista.

</domain>

<decisions>
## Implementation Decisions

### Legacy pages
- **D-01:** Remover `apps/web/src/app/roteiros/` e `apps/web/src/app/reservar/` — Phase 6 substitui completamente. Sem rotas duplicadas.

### Booking state — persistência entre telas
- **D-02:** Slot selecionado é passado via URL params: `/[slug]/reservar?slotId=xxx&packageId=yyy`. Zero estado client-side, SSR-friendly, link compartilhável.
- **D-03:** Rota do formulário de booking: `/[slug]/reservar` (dentro do route group público do tenant, consistente com `/[slug]/guias/`).

### Confirmation page
- **D-04:** Após retorno do Mercado Pago, a página `/[slug]/confirmacao?bookingId=xxx` faz GET real ao booking para exibir dados completos (nome do roteiro, data/hora, guia, status).
- **D-05:** Proteção sem login: o endpoint público de GET booking exige `?email=xxx` como query param — só retorna se bater com o `customerEmail` gravado na reserva. Sem expor dados de terceiros.
- **D-06:** URL de return configurada na preference do Mercado Pago: `/[slug]/confirmacao?bookingId=xxx`.

### API gaps a criar
- **D-07:** Criar `GET /tenants/:slug/packages/:id/slots` — público, sem auth. Retorna apenas slots com `status=OPEN` e `date >= hoje`. Campos: `slotId, date, spotsAvailable`. Necessário para o SlotPicker.
- **D-08:** Criar `GET /tenants/:slug/bookings/:id` — público com verificação por email (`?email=xxx`). Retorna dados não-sensíveis (sem CPF, sem telefone). Necessário para a página de confirmação.

### Route structure
- **D-09:** Rotas públicas do turista dentro de `/[slug]/` com novo route group `(public)`:
  ```
  app/[slug]/
  ├── (public)/
  │   ├── layout.tsx          ← PublicNav, sem auth guard
  │   ├── guias/
  │   │   ├── page.tsx        ← listagem
  │   │   └── [guideId]/
  │   │       └── page.tsx    ← perfil + SlotPicker
  │   ├── reservar/
  │   │   └── page.tsx        ← BookingForm (lê slotId+packageId da URL)
  │   └── confirmacao/
  │       └── page.tsx        ← ConfirmationCard (lê bookingId+email da URL)
  └── (painel)/               ← existente (Phase 5)
  └── (admin)/                ← existente (Phase 5)
  ```

### Claude's Discretion
- Implementação de loading skeletons nas páginas RSC
- Tratamento de erro quando bookingId/email não batem na confirmação (redirecionar ou mostrar mensagem)
- Estrutura interna dos novos componentes (GuideCard, SlotPicker, BookingForm, ConfirmationCard, PublicNav)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap e requisitos
- `.planning/ROADMAP.md` §Phase 6 — goal, telas, deferred, success criteria
- `.planning/REQUIREMENTS.md` §DISC-01, BOOK-01, BOOK-02, PAY-01 — requirements mapeados para esta fase

### UI Design Contract (OBRIGATÓRIO)
- `.planning/phases/06-interface-do-turista/06-UI-SPEC.md` — design system completo: cores, tipografia, espaçamento, inventory de componentes, contrato por tela, copywriting, estados de interação. Agentes DEVEM ler antes de implementar qualquer componente.

### Prior phase context (padrões estabelecidos)
- `.planning/phases/05-painel-do-guia/05-CONTEXT.md` — estrutura de rotas `/[slug]/`, RSC fetch pattern, next-auth, react-calendar
- `.planning/phases/04-motor-de-pagamento/04-CONTEXT.md` — Mercado Pago, payment_url, webhook, HMAC

### Código existente relevante
- `apps/api/src/modules/guides/guides.routes.ts` — GET /guides (público) e GET /guides/:id (público) já implementados
- `apps/api/src/modules/packages/packages.routes.ts` — GET /packages e GET /packages/:id públicos; POST/PATCH/DELETE slots requerem auth
- `apps/api/src/modules/bookings/bookings.routes.ts` — POST /bookings é público (guest checkout); GET /bookings requer auth (precisa de novo endpoint público)
- `apps/web/src/app/reservar/page.tsx` — BookingForm pattern e error banner a extrair (antes de deletar)
- `apps/web/src/app/roteiros/page.tsx` — PublicNav pattern e estilos a extrair (antes de deletar)
- `apps/web/src/components/ui/StatusBadge.tsx` — reutilizar na página de confirmação

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StatusBadge` (`components/ui/StatusBadge.tsx`) — reutilizar na confirmação para mostrar status da reserva
- `Modal` (`components/ui/Modal.tsx`) — não necessário no fluxo público do Phase 6
- `BookingForm` pattern — extrair de `app/reservar/page.tsx` antes de deletar o arquivo
- `PublicNav` pattern — extrair de `app/roteiros/page.tsx` antes de deletar o arquivo
- `GET /tenants/:slug/guides` e `GET /tenants/:slug/guides/:id` — endpoints já públicos, prontos para uso
- `GET /tenants/:slug/packages` e `GET /tenants/:slug/packages/:id` — já públicos (retornam roteiros do guia com preço, nome, dificuldade)
- `POST /tenants/:slug/bookings` — já público (guest checkout), retorna `paymentUrl`

### Established Patterns
- Rotas escopadas por tenant: `/tenants/:slug/resource` no backend; `/[slug]/...` no frontend
- RSC fetch: cada page.tsx busca seus próprios dados, sem estado global compartilhado
- Erros em português: `{ message, errors }` — tratar nos formulários
- `use(params)` para Client Components com dynamic params no Next.js 16
- `customerName`, `customerEmail`, `customerPhone`, `customerCpf` — campos obrigatórios no POST /bookings

### Integration Points
- `params.slug` (Next.js) → passado para todos os fetches da API como tenant slug
- `?slotId=xxx&packageId=yyy` (URL params) → lidos pelo BookingForm em `/[slug]/reservar`
- `?bookingId=xxx` (URL params do redirect MP) → lido pela ConfirmationCard em `/[slug]/confirmacao`
- `paymentUrl` retornado pelo POST /bookings → `window.location.href = paymentUrl` para redirect ao MP

</code_context>

<specifics>
## Specific Ideas

- SlotPicker: chip buttons com borda `--ochre` ao selecionar (conforme UI-SPEC)
- Confirmação: mensagem "Reserva confirmada. Você receberá contato do guia." como copy principal
- PublicNav: fundo stone-900, nome do tenant à esquerda, link de volta à direita (conforme UI-SPEC)

</specifics>

<deferred>
## Deferred Ideas

- Busca por texto e filtros avançados — pós-MVP
- Comparação de guias lado a lado — pós-MVP
- Login/conta do turista — fora do escopo
- PAY-02: cartão de crédito via Mercado Pago — pós-MVP
- Reviews e avaliações (TRUST-v2-01) — v2
- Multi-guia por roteiro — pós-MVP

</deferred>

---

*Phase: 06-interface-do-turista*
*Context gathered: 2026-05-13*
