# Phase 13: Painel Mobile + Feedback - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Tornar o painel do guia completamente utilizável em celular — converter tabelas de reservas para card layout em < 768px, adicionar sistema de toast global, dialog de confirmação antes de cancelar reservas, empty states com CTA, e ErrorBoundary para erros inesperados de JS.

**Sem mudanças de API** — fase puramente frontend/Next.js.

**Requisitos desta fase:** MOBILE-01, MOBILE-02, MOBILE-03, MOBILE-04, MOBILE-05, FEEDBACK-01, FEEDBACK-02, FEEDBACK-03, FEEDBACK-04, FEEDBACK-05 (10 requirements)

</domain>

<decisions>
## Implementation Decisions

### Toast Global (FEEDBACK-01)

- **D-01:** Instalar **Sonner** (`npm install sonner`) como biblioteca de toast.
- **D-02:** Registrar `<Toaster position="top-right" richColors />` no layout do painel (ou layout raiz se necessário para cobrir todas as ações).
- **D-03:** Usar `toast.success()`, `toast.error()`, `toast.info()` em todas as ações de confirmar, cancelar e criar no painel.
- **D-04:** Duração padrão Sonner (4s). Não customizar.

### Dialog de Confirmação + Slide-up Sheet Mobile (FEEDBACK-05 + MOBILE-05)

- **D-05:** Instalar **`@radix-ui/react-dialog`** como primitivo acessível (aria, focus trap, Esc fecha).
- **D-06:** Criar componente `CancelDialog` reutilizável que usa Radix Dialog.
- **D-07:** Em desktop: modal centrado (comportamento padrão Radix). Em mobile (< 640px): slide-up bottom sheet via CSS — `bottom: 0; left: 0; right: 0; border-radius: 12px 12px 0 0; transform: translateY(100%); transition: transform 0.25s;` com `[data-state=open]` removendo o transform.
- **D-08:** Copy do dialog: título **"Cancelar esta reserva?"**, subtexto **"Esta ação não pode ser desfeita."**, botões **"Sim, cancelar"** (vermelho) e **"Voltar"**.
- **D-09:** `handleCancel()` na página de reservas NÃO dispara imediatamente — abre o `CancelDialog` primeiro. Somente após confirmação chama a API.

### Layout Mobile — Reservas (MOBILE-01)

- **D-10:** Implementar via CSS classes condicionais do Tailwind (sem `useMediaQuery`).
- **D-11:** Tabela recebe `className="hidden sm:table w-full"` — visível apenas em sm+.
- **D-12:** Adicionar lista de cards com `className="sm:hidden space-y-3"` acima/abaixo da tabela.
- **D-13:** Card de reserva compacto: **nome do turista · N pax** + status badge no canto | roteiro na segunda linha | data/hora na terceira linha | botões Confirmar/Cancelar full-width abaixo.
- **D-14:** Roteiros já usa grid de cards (`gridTemplateColumns: repeat(auto-fit, minmax(280px, 1fr))`). MOBILE-02 é satisfeito sem alteração na estrutura principal — apenas verificar touch targets e font-size.
- **D-15:** MOBILE-03 (touch target 44×44px): todos os botões e links interativos devem ter `minHeight: 44px` e `minWidth: 44px`. Auditar e corrigir onde faltar.
- **D-16:** MOBILE-04 (font-size 16px em inputs): auditar todos os `<input>` e `<select>` no painel e aplicar `fontSize: "16px"` para evitar zoom automático no iOS Safari.

### Empty States (FEEDBACK-02 + FEEDBACK-03)

- **D-17:** Criar componente genérico **`EmptyState`** em `apps/web/src/components/ui/EmptyState.tsx` usando inline styles (consistente com o padrão do projeto).
- **D-18:** Props: `title: string`, `description: string`, `ctaLabel?: string`, `ctaHref?: string`.
- **D-19:** Em "Minhas Reservas" (empty): título "Nenhuma reserva ainda", descrição "Compartilhe seu link para receber as primeiras reservas.", CTA "Copiar link" (copia a URL do painel para a área de transferência — sem navigation).
- **D-20:** Em "Meus Roteiros" (empty): título "Nenhum roteiro ainda", descrição "Crie seu primeiro roteiro para começar a receber reservas.", CTA "Criar roteiro" → link para `/[slug]/painel/roteiros/novo`.

### ErrorBoundary (FEEDBACK-04)

- **D-21:** Criar componente **`ErrorBoundary`** em `apps/web/src/components/ui/ErrorBoundary.tsx` como class component React (único caso onde class component é necessário — React não suporta ErrorBoundary funcional).
- **D-22:** Registrar no layout do painel: `app/[slug]/(painel)/layout.tsx` — protege todas as páginas do painel sem afetar páginas públicas.
- **D-23:** UI de fallback: mensagem "Algo deu errado." + botão **"Tentar novamente"** que chama `window.location.reload()`.

### Claude's Discretion

- Ordem dos botões nos cards mobile (Confirmar primeiro ou Cancelar primeiro) — Claude escolhe a ordem que minimize ação acidental.
- Se colocar o `<Toaster />` no layout do painel ou no `app/layout.tsx` raiz — Claude decide baseado no escopo necessário (ações de toast ocorrem apenas no painel autenticado).
- Dashboard page (`/painel/dashboard`) também tem tabela `<table>` de últimas reservas — Claude decide se aplica o mesmo padrão de cards mobile ou mantém como read-only simples (sem ações, provavelmente mantém tabela com `overflow-x-auto`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements desta fase
- `.planning/REQUIREMENTS.md` — seções MOBILE-01–05 e FEEDBACK-01–05

### Codebase — páginas a modificar
- `apps/web/app/[slug]/(painel)/painel/reservas/page.tsx` — tabela principal + handleCancel() sem dialog
- `apps/web/app/[slug]/(painel)/painel/roteiros/page.tsx` — cards grid, verificar touch targets
- `apps/web/app/[slug]/(painel)/painel/dashboard/page.tsx` — tabela read-only de últimas reservas
- `apps/web/app/[slug]/(painel)/painel/disponibilidade/page.tsx` — auditar inputs e touch targets
- `apps/web/app/[slug]/(painel)/painel/perfil/page.tsx` — auditar inputs

### Layout
- `apps/web/app/[slug]/(painel)/layout.tsx` — onde registrar ErrorBoundary e Toaster

### Componentes existentes relevantes
- `apps/web/src/components/ui/MinhaReservaClient.tsx` — tem padrão de modal com `showCancelModal` state (referência para o Dialog, mas NÃO reusar — é para turista, não guia)
- `apps/web/src/components/ui/BackButton.tsx` — padrão de componente inline-styles

### Next.js 16 (breaking changes)
- `apps/web/AGENTS.md` — lembrete: ler `node_modules/next/dist/docs/` antes de escrever código

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StatusBadge` component (`@/components/ui/StatusBadge`) — já usado em reservas e dashboard para exibir status
- `BackButton` — padrão de componente simples com inline styles
- CSS vars definidas: `--stone-50/100/200/300/400/500/700/800/900`, `--ochre` — usar em novos componentes

### Established Patterns
- **Inline styles** com CSS variables: padrão predominante no painel (não Tailwind utility classes nas páginas)
- **Tailwind** disponível e usado em globals.css — usar para classes responsivas (`hidden sm:table`, `sm:hidden`) que funcionam bem com Tailwind 4
- **Fetch pattern**: páginas do painel usam `/api/proxy?path=...` para chamadas autenticadas
- **Optimistic update**: `handleConfirm` e `handleCancel` em reservas.tsx já fazem optimistic update com rollback em erro
- **`actionError` state**: padrão atual de feedback de erro — será substituído por `toast.error()` após esta fase

### Integration Points
- `app/[slug]/(painel)/layout.tsx` — adicionar `<Toaster />` e `<ErrorBoundary>`
- `handleCancel()` em reservas.tsx — refatorar para abrir dialog antes de chamar a API
- Todos os `setActionError(...)` no painel — substituir por `toast.error(...)`
- Todos os `// success handling` implícitos — adicionar `toast.success(...)`

</code_context>

<specifics>
## Specific Ideas

- Card de reserva mobile deve ter status badge claramente visível no canto superior direito (PENDENTE em âmbar, CONFIRMADA em verde, etc.) — reutilizar as cores já definidas em STATUS_STYLES do MinhaReservaClient
- Slide-up sheet no mobile deve ter um "drag handle" visual (barra cinza no topo) para indicar que é deslizável
- Botão "Cancelar" nas ações de reserva deve ser destrutivo (vermelho) — manter `#DC2626` já usado no código atual

</specifics>

<deferred>
## Deferred Ideas

- Toast para ações em páginas públicas (fora do painel) — fora do escopo desta fase
- Animação de swipe para descarte de toast — nice-to-have, não requerido
- Notificações push para novas reservas — Phase 14 ou posterior

</deferred>

---

*Phase: 13-painel-mobile-feedback*
*Context gathered: 2026-06-03*
