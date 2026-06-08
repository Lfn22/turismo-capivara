# Phase 14: Gestão de Conteúdo — Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Guia publica destinos (nome, descrição, região, foto de capa) no painel → admin aprova → destino aparece na página pública `/destinos`. Guia também enriquece roteiros existentes com galeria de fotos e lista de experiências → publicação imediata na página pública do roteiro.

**In scope:**
- DEST-01: Criação de destino com nome, descrição, estado (select)
- DEST-02: Upload de foto de capa + galeria via Cloudflare R2
- DEST-03: Fluxo de aprovação via super-admin — destino PENDING → APPROVED → visível no marketplace
- DEST-04: Guia edita/deleta apenas os destinos que criou (ownership check)
- ROT-01: Upload de galeria de fotos em roteiro existente (até 5 fotos, R2)
- ROT-02: Lista de experiências do roteiro como bullets simples (String[])
- ROT-03: Fotos e experiências aparecem na página pública do roteiro (publicação imediata)

**Out of scope:**
- Aprovação de enriquecimento de roteiros (ROT publica direto)
- Notificações por email de aprovação/rejeição
- Upload de vídeo
- Perfil público do guia com avaliações

</domain>

<decisions>
## Implementation Decisions

### Armazenamento de Fotos (DEST-02, ROT-01)

- **D-01:** Serviço de storage: **Cloudflare R2** — zero egress fees, API compatível com S3, integra com CDN Cloudflare.
- **D-02:** Limite de **5 fotos** por destino e por roteiro. Aplicar validação no backend antes do upload.
- **D-03:** Upload direto pelo painel do guia (não URL externa). Guia seleciona arquivo, sistema faz upload para R2 e salva URL no banco.
- **D-04:** O model `Destination` já usa `photos: String[]` (URLs) — manter essa estrutura. R2 gera URLs públicas permanentes.

### Fluxo de Aprovação de Destinos (DEST-03)

- **D-05:** Adicionar campo `approvalStatus` ao model `Destination` com enum **PENDING | APPROVED | REJECTED**. Migration necessária.
- **D-06:** Destino criado entra como **PENDING** automaticamente. Só destinos `APPROVED` aparecem no marketplace (`/destinos`).
- **D-07:** Interface de aprovação: nova seção `/super-admin/destinos` no super-admin panel existente. Lista destinos PENDING com ações Aprovar/Rejeitar.
- **D-08:** Guia vê o status do seu destino no painel (badge PENDENTE / APROVADO / REJEITADO). Sem email de notificação por ora.
- **D-09:** O campo `active: Boolean` existente pode ser descontinuado em favor de `approvalStatus` para destinos gerenciados por guias. Planner decide melhor estratégia de migração.

### Formulário de Criação/Edição de Destino (DEST-01, DEST-04)

- **D-10:** Campo de região: **select de estados brasileiros** (26 estados + DF). Mapeia para o campo `state: String` já existente no schema.
- **D-11:** UX: **formulário único** em uma página. Não usar wizard/steps — padrão do painel existente.
- **D-12:** Na lista de destinos do painel, o guia vê **todos os destinos do tenant** (não apenas os seus próprios). Mas botões Editar/Deletar aparecem **apenas nos destinos que ele criou** (`createdById === currentUser.id`).
- **D-13:** Cards na lista: **thumbnail da foto de capa** + título + estado (UF) + badge de `approvalStatus`.
- **D-14:** Schema: adicionar `createdById: String` (FK → User) ao model `Destination` para controle de ownership. Migration necessária.
- **D-15:** Slug do destino: gerado automaticamente a partir do título (Claude decide a lógica de slugify).

### Enriquecimento de Roteiro (ROT-01, ROT-02, ROT-03)

- **D-16:** O guia acessa galeria e experiências **dentro da página do roteiro no painel** — não em aba separada.
- **D-17:** Experiências/highlights do roteiro: **lista de bullets simples** armazenada como `String[]` (mesmo padrão de `highlights` em `Destination`). Guia digita texto livre, uma experiência por linha/input.
- **D-18:** Enriquecimento de roteiro **não requer aprovação** — fotos e experiências publicam imediatamente na página pública.
- **D-19:** O model de Package/Itinerary (roteiro) pode precisar de campos `photos: String[]` e `highlights: String[]` se não existirem. Researcher confirmar schema atual.
- **D-20:** Limite de 5 fotos por roteiro (mesmo limite de destino — D-02).

### Claude's Discretion

- Estratégia de slugify para destinos (título → slug único)
- Ordem de exibição das fotos na galeria (ordem de upload)
- Tamanho máximo de arquivo por upload (sugestão: 5MB)
- Formatos aceitos de imagem (sugestão: JPEG, PNG, WebP)
- Exibição de thumbnail no painel: lazy loading ou eager

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements desta fase
- `.planning/REQUIREMENTS.md` — seções DEST-01 a DEST-04, ROT-01 a ROT-03

### Schema e model existente
- `apps/api/prisma/schema.prisma` — model `Destination` (campos existentes), model `Tenant`, model `User` (roles)
- `apps/api/src/modules/destinations/destinations.routes.ts` — rotas GET existentes (base para novas rotas POST/PATCH/DELETE)
- `apps/api/src/modules/tenants/tenants.routes.ts` — padrão de rotas por tenant

### Super-admin panel (referência para nova seção de destinos)
- `apps/web/src/app/super-admin/` — estrutura do super-admin panel existente

### Painel do guia (referência para nova página de destinos)
- `apps/web/src/app/[slug]/(painel)/` — estrutura e padrões do painel

### Auth e roles
- `apps/api/src/shared/middlewares/authenticate.ts` — decorator de auth
- `apps/api/src/shared/middlewares/authorize.ts` — decorator de roles

### Contexto de fases anteriores
- `.planning/phases/13-painel-mobile-feedback/13-CONTEXT.md` — decisões de UI/UX do painel (toast, dialog, empty states, mobile-first)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Destination` model: já tem `photos: String[]`, `highlights: String[]`, `heroImageUrl`, `state` — base sólida, só adicionar `approvalStatus` e `createdById`
- GET /destinations + GET /destinations/:slug: rotas públicas existentes — nova lógica filtra por `approvalStatus: APPROVED`
- Toast global (Phase 13): usar para feedback de upload, aprovação, erro
- Dialog de confirmação (Phase 13): usar para confirmar delete de destino
- Super-admin panel: estrutura navegável em `/super-admin/` — adicionar tab/seção `/super-admin/destinos`

### Established Patterns
- `String[]` para listas simples (highlights, photos) — padrão já estabelecido no schema
- `fastify.authenticate` + `fastify.authorize` para proteção de rotas
- Slug-based tenant routing (`[slug]`) em todas as páginas do painel
- Mobile-first: toda UI do painel usa `100dvh`, layout responsivo (Phase 13)
- Empty states: ícone + texto + botão de ação (Phase 13 FEEDBACK-02/03)

### Integration Points
- Nova rota POST /tenants/:slug/destinations — guia cria destino (requer auth + CONDUTOR/ADMIN role)
- Nova rota PATCH /tenants/:slug/destinations/:id — guia edita (ownership check)
- Nova rota DELETE /tenants/:slug/destinations/:id — guia deleta (ownership check)
- Nova rota PATCH /destinations/:id/approve — super-admin aprova/rejeita
- Upload: endpoint separado para R2 (pre-signed URL ou proxy via API)
- Package model: verificar se tem `photos[]` e `highlights[]`, adicionar se necessário

</code_context>

<specifics>
## Specific Ideas

- Badge visual de status (PENDENTE / APROVADO / REJEITADO) deve ser claro na lista do painel — guia não pode ficar confuso sobre por que o destino não aparece no marketplace
- Fluxo esperado do guia: acessa "Destinos" no painel → clica "+ Novo Destino" → preenche form → faz upload da foto → salva → vê badge "PENDENTE" → aguarda aprovação do super-admin

</specifics>

<deferred>
## Deferred Ideas

- Email de notificação de aprovação/rejeição — mencionado, defer para v2
- Motivo de rejeição enviado ao guia — manter simples por ora
- Drag & drop para reordenar fotos da galeria — defer para v2
- Destino com múltiplas regiões/tags — defer, estados BR é suficiente para MVP
- Upload de vídeo — explicitamente out of scope (REQUIREMENTS.md)
- Avaliações de destinos — v2 pós-MVP

</deferred>

---

*Phase: 14-gestao-de-conteudo*
*Context gathered: 2026-06-08*
