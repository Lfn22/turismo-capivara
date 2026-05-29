# Phase 11: Frontend Polish - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Entregar um sistema visual coerente na interface pública e no painel: tokens CSS consolidados em todos os componentes, brand CAPI unificada em todas as páginas, navegação completa com back button universal, transições sem flash branco, e ConversionAnchor conectado à API real.

**Sem mudanças de API** — fase puramente frontend/Next.js.

**Requisitos desta fase:** NAV-01, NAV-02, STYLE-01–05, AUDIT-01–05 (12 requirements)

</domain>

<decisions>
## Implementation Decisions

### Back Button (NAV-01)

- **D-01:** Implementar via `router.back()` (browser history) — componente client-side genérico `<BackButton>` com `useRouter` do next/navigation
- **D-02:** Back button aparece em: páginas de detalhe de roteiro, páginas de detalhe de destino, checkout, minha-reserva, e todas as sub-páginas do painel do condutor
- **D-03:** Posicionado **acima do conteúdo, fora do nav** — primeiro elemento abaixo do header em cada página. Não modifica os navs existentes.

### ConversionAnchor — Waitlist (AUDIT-01)

- **D-04:** Sem persistência no banco. Usar **Next.js Server Action** que chama Resend para envio de email. Nenhum endpoint novo na API Fastify.
- **D-05:** Comportamento ao submeter: envia **email de confirmação para o usuário** + **notificação interna** (admin email configurado em variável de ambiente). O `setTimeout` fake é removido inteiramente.

### Migração de Estilos (STYLE-01–05)

- **D-06:** Componentes com `<style>` JSX (ConversionAnchor, StickyDestinationNav) — **manter o padrão BEM+style-tag**. Apenas substituir hex residuais (#fff, valores hardcoded) por tokens CSS existentes. Nenhuma migração de paradigma.
- **D-07:** Componentes com inline `React.CSSProperties` (PublicNav, BookingForm) — **converter para `className` + Tailwind utilities**. As hex values viram classes Tailwind semânticas (ex: `text-stone-900`, `bg-ochre`).
- **D-08:** `apps/web/app/destinos/teste/page.tsx` — **deletar** (página de teste, não é rota de produção).

### Flash Branco entre Rotas (NAV-02)

- **D-09:** Abordagem: **background root correto + `loading.tsx` simples**. Garantir que `<html>` e `<body>` em `apps/web/app/layout.tsx` tenham `backgroundColor` igual ao fundo do app (var(--stone-950) ou equivalente). Adicionar `loading.tsx` com fundo sólido para as rotas principais que causam flash. Sem dependências externas, sem View Transitions experimentais.

### Brand CAPI (AUDIT-03)

- **D-10:** `apps/web/app/layout.tsx` — `title: "Serra da Capivara — Patrimônio Mundial UNESCO"` → `"CAPI"`. Verificar todas as páginas com `export const metadata` para garantir consistência.

### Claude's Discretion

- Quais específicas rotas precisam de `loading.tsx` (identificar pelo flash real em navegação)
- Texto exato do email de confirmação da waitlist
- Se AUDIT-04 (font-size fallback) e AUDIT-05 (inputs herdam font-body) requerem alteração global em globals.css ou pontual por componente

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design Tokens e CSS
- `apps/web/app/globals.css` — Definição dos custom properties: --stone-*, --ochre, --ochre-dark, --font-display, --font-body. Referência para todos os tokens disponíveis.

### Componentes a Modificar
- `apps/web/src/components/ui/ConversionAnchor.tsx` — Waitlist form com TODO de endpoint falso. Alvo da D-04/D-05.
- `apps/web/src/components/layout/PublicNav.tsx` — Nav com inline styles e `backHref?` prop. Alvo da D-07.
- `apps/web/app/layout.tsx` — Root layout com metadata title errado. Alvo da D-10.

### Requirements desta fase
- `.planning/REQUIREMENTS.md` — Seções: Navegação (NAV-01–02), Unificação de Estilos (STYLE-01–05), UI/UX Audit Fixes (AUDIT-01–05)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PublicNav` — já tem `backHref?: string` prop, mas back button novo (D-03) vai acima do conteúdo, não dentro do nav
- `StickyDestinationNav` — usa BEM+`<style>` com tokens, tem `.snav__back` como back link parcial para destinos. Manter padrão.
- Resend já configurado em `apps/api/src/shared/email.ts` — mas Server Action no Next.js precisa de acesso direto ao Resend SDK no lado web

### Styling Paradigms (3 coexistentes)
1. **BEM + `<style>` JSX + tokens CSS** — ConversionAnchor, StickyDestinationNav → manter (D-06)
2. **Inline `React.CSSProperties` com hex** — PublicNav, BookingForm → Tailwind (D-07)
3. **Tailwind puro** — alguns componentes menores

### Integration Points
- `apps/web/app/layout.tsx` — root layout controla metadata global e background da página
- Server Actions ficam em `apps/web/app/actions/` (criar se não existir) ou colocated nos componentes
- `NEXT_PUBLIC_API_URL` disponível para Server Actions que precisam chamar a API

### Known Issues (do audit report)
- `dashboard/page.tsx` legacy stub deve ser deletado (STYLE-05)
- Font-size fallback inconsistente: `var(--font-display, Georgia, serif)` vs outros
- Inputs de formulários de onboarding sem `font-family: inherit`

</code_context>

<specifics>
## Specific Ideas

- Back button: `← Voltar` como link/botão acima do conteúdo, sem borda nem card, estilo discreto mas visível
- ConversionAnchor: remover o `setTimeout` fake completamente — não é fallback, é engano
- Varável de ambiente para email admin de notificação: `WAITLIST_NOTIFY_EMAIL`

</specifics>

<deferred>
## Deferred Ideas

- Next.js View Transitions API — interessante mas experimental; considerar em v1.3 quando estabilizar
- CSS Modules por componente — migração mais profunda dos `<style>` JSX; escopo desta fase é só tokens
- Persistência de waitlist no banco — pode ser Phase 14 ou backlog se o volume de leads aumentar

</deferred>

---

*Phase: 11-frontend-polish*
*Context gathered: 2026-05-28*
