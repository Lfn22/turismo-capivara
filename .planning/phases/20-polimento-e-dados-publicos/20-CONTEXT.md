# Phase 20: Polimento e Dados Públicos - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Três melhorias orthogonais de polimento e segurança de dados:
1. **Home pública mais rica** — exibir 6 destinos APPROVED em vez de 3, ordenados por `createdAt DESC`
2. **Proteção de dados públicos** — garantir que nenhum destino/tenant PENDING vaze para turistas (API + web)
3. **Super-admin sem limitações artificiais** — paginação "Carregar mais" nas listas de aprovação
4. **Terminologia clara** — renomear nav "Destinos" → "Locais" no painel do guia

Fora de escopo: novos fluxos de upload de fotos, editor de roteiros, qualquer nova funcionalidade de criação.
</domain>

<decisions>
## Implementation Decisions

### POL-01: Home — quantidade e ordenação
- **D-01:** Exibir **6 destinos** na seção "Onde você quer explorar?" da home (hoje: 3).
- **D-02:** Ordenar por **`createdAt DESC`** (mais recentes primeiro). Sem lógica de relevância algorítmica por enquanto.
- **D-03:** Mudança cirúrgica: `destinations.slice(0, 3)` → `destinations.slice(0, 6)`. API já retorna só APPROVED.
- **D-04:** O link "Ver todos" → `/destinos` já existe. Não alterar.

### POL-02: Filtro APPROVED público
- **D-05:** API `GET /destinations` já filtra `approvalStatus: 'APPROVED'` ✅ — nenhuma mudança no backend.
- **D-06:** Verificar se a página `/destinos` (web) também passa o filtro ou se chama a API diretamente. Se chamar a API, já está seguro. Se tiver lógica própria, garantir filtro.
- **D-07:** `GET /destinations/:slug` já lança 404 para não-APPROVED ✅.

### POL-03: Erro de operadora PENDING
- **D-08:** Quando turista acessa roteiro de tenant com `approvalStatus != APPROVED` e tenta reservar: exibir **mensagem inline no lugar do formulário de reserva** (não modal, não redirect, não toast).
- **D-09:** Mensagem genérica: **"Este roteiro não está disponível para reservas no momento."** — não expor status interno.
- **D-10:** Incluir link "Explorar outros destinos" apontando para `/destinos`.
- **D-11:** A verificação deve ocorrer no carregamento da página de reserva (server-side se possível, ou no fetch inicial).

### POL-04: Terminologia
- **D-12:** Nav item `painel/destinos` renomeia de **"Destinos"** → **"Locais"** no `SidebarNav.tsx`.
- **D-13:** `labelShort` também muda: "Destinos" → "Locais".
- **D-14:** A rota `/painel/destinos` **não muda** — só o label visual.
- **D-15:** Headings e toasts das páginas de CRUD de destinos (`/painel/destinos/*`) também atualizam: "Destino" → "Local", "Destinos" → "Locais" onde fizer sentido no contexto do painel.

### POL-05: Paginação super-admin
- **D-16:** Modelo: **"Carregar mais"** (botão no final da lista, busca próximo lote e faz append no state).
- **D-17:** Tamanho do lote: **20 itens** por chamada.
- **D-18:** Aplica-se a **duas páginas**: `super-admin/destinos/page.tsx` e `super-admin/operadoras/page.tsx`.
- **D-19:** Estado de paginação: `offset` local, incrementado em 20 a cada clique. Botão "Carregar mais" some quando API retornar lista com < 20 itens (sinal de fim).
- **D-20:** API endpoint atual (`/api/admin/destinations/pending?limit=50&offset=0`) já aceita `limit` e `offset` — só mudar para `limit=20` e gerenciar offset no client.
- **D-21:** Verificar se endpoint de operadoras (`/api/super-admin/tenants/pending`) também aceita paginação. Se não, adicionar suporte na API route.

### Claude's Discretion
- Estilo do botão "Carregar mais": usar padrão visual do projeto (sem criar novo componente se não necessário).
- Tratamento de estado "lista vazia após carregar mais": ocultar botão silenciosamente.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Código existente (leitura obrigatória)
- `apps/web/app/page.tsx` — Home page, `fetchDestinations()` e `previewDestinations.slice(0,3)` a alterar
- `apps/web/app/super-admin/destinos/page.tsx` — CRUD super-admin destinos com `limit=50` hardcoded
- `apps/web/app/super-admin/operadoras/page.tsx` — CRUD super-admin operadoras, verificar paginação
- `apps/web/components/sidebar/SidebarNav.tsx` linha 83 — nav item "Destinos" a renomear para "Locais"
- `apps/api/src/modules/destinations/destinations.routes.ts` — rotas públicas já filtram APPROVED
- `apps/web/app/api/admin/destinations/pending/route.ts` — API route proxy para destinos pendentes
- `apps/web/app/api/super-admin/tenants/pending/route.ts` (verificar se existe paginação)

### Rotas da web relevantes
- `apps/web/app/destinos/page.tsx` — listagem pública de destinos (verificar filtro APPROVED)
- `apps/web/app/[slug]/(painel)/painel/destinos/page.tsx` — CRUD destinos do guia
- `apps/web/app/[slug]/(painel)/painel/destinos/novo/page.tsx` — criação
- `apps/web/app/[slug]/(painel)/painel/destinos/[id]/editar/page.tsx` — edição

### Planning
- `.planning/REQUIREMENTS.md` — POL-01 a POL-05
- `.planning/ROADMAP.md` — Phase 20 success criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DestinationCard` component — já usado na home, reusar sem alteração
- Padrão de fetch com offset na home já existe (não há — a ser criado)
- Estado de loading com shimmer — padrão existente no super-admin, reutilizar

### Established Patterns
- Super-admin usa `useState` + `useEffect` + `useCallback` para fetch — seguir o mesmo padrão no "Carregar mais"
- Otimismo no super-admin (remove item da lista ao aprovar/rejeitar) — manter padrão existente
- Inline CSS com classes BEM — padrão do projeto, manter

### Integration Points
- Home chama `GET /destinations` via `fetch()` server-side — só mudar `slice(0,3)` para `slice(0,6)` e adicionar `orderBy` na query da API
- API `GET /destinations` sem `orderBy` explícito → adicionar `orderBy: { createdAt: 'desc' }` no Prisma query
- Paginação: API routes proxy passam `limit` e `offset` como query params — `?limit=20&offset=${offset}`

</code_context>

<specifics>
## Specific Ideas

- A mensagem de erro de operadora PENDING (D-09) deve ser: **"Este roteiro não está disponível para reservas no momento."** com link "Explorar outros destinos" → `/destinos`.
- O botão "Carregar mais" deve desaparecer quando a API retornar < 20 itens (fim da lista).

</specifics>

<deferred>
## Deferred Ideas

- **Facilidade para adicionar fotos** — mencionado pelo usuário, fora do escopo da Phase 20. Candidato a fase futura de UX de criação de conteúdo.
- **Facilidade para editar roteiros** — idem. Fase futura dedicada à experiência de criação/edição de roteiros.

</deferred>

---

*Phase: 20-polimento-e-dados-publicos*
*Context gathered: 2026-06-29*
