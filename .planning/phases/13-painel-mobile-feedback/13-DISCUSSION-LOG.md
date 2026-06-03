# Phase 13: Painel Mobile + Feedback - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-03
**Phase:** 13-painel-mobile-feedback
**Areas discussed:** Toast global, Dialog e Sheet mobile, Layout mobile reservas, Empty states e ErrorBoundary

---

## Toast global

| Option | Description | Selected |
|--------|-------------|----------|
| Instalar Sonner | Biblioteca leve ~3kb, API simples, integra com Next.js App Router via `<Toaster />` no layout | ✓ |
| Implementar custom com CSS | Context + reducer + CSS animation, ~80 linhas de boilerplate, sem dependência nova | |

**User's choice:** Sonner
**Notes:** `top-right`, duração padrão 4s.

---

## Dialog e Sheet mobile

| Option | Description | Selected |
|--------|-------------|----------|
| Instalar @radix-ui/dialog | Acessível (aria, focus trap, Esc fecha). Em mobile vira slide-up sheet via CSS. | ✓ |
| Implementar com CSS puro | HTML div com position:fixed. Mesmo padrão de `showCancelModal` já existente no MinhaReservaClient. Sem acessibilidade de teclado. | |

**User's choice:** @radix-ui/react-dialog
**Notes:** Copy do dialog: "Cancelar esta reserva?" + "Esta ação não pode ser desfeita." + botões "Sim, cancelar" (vermelho) e "Voltar".

---

## Layout mobile — reservas

### Card design

| Option | Description | Selected |
|--------|-------------|----------|
| Card compacto com status badge | Nome · pax + status badge no canto, roteiro, data/hora, botões full-width abaixo | ✓ |
| Card expandido com todas as colunas | Cada coluna da tabela vira label:valor, mais informação, card mais alto | |

### Implementação responsiva

| Option | Description | Selected |
|--------|-------------|----------|
| CSS classes condicionais com Tailwind | `hidden sm:table` / `sm:hidden`, zero JS, sem hydration mismatch | ✓ |
| useMediaQuery hook JS | Hook que detecta largura, renderização condicional, risco de hydration mismatch em Next.js | |

**User's choice:** Card compacto + Tailwind responsive classes
**Notes:** Roteiros já usa grid, MOBILE-02 quase gratuito. Auditar touch targets 44px e font-size 16px em inputs.

---

## Empty states e ErrorBoundary

### Empty states

| Option | Description | Selected |
|--------|-------------|----------|
| Componente genérico EmptyState | `<EmptyState title, description, ctaLabel, ctaHref />` reutilizável em reservas e roteiros | ✓ |
| Inline em cada página | Texto simples com padding, adicionar apenas CTA ao existente | |

### ErrorBoundary placement

| Option | Description | Selected |
|--------|-------------|----------|
| Layout do painel (Recomendado) | `app/[slug]/(painel)/layout.tsx` — protege o painel sem afetar páginas públicas | ✓ |
| Layout raiz (app/layout.tsx) | Cobre toda a aplicação incluindo páginas públicas | |

**User's choice:** EmptyState genérico + ErrorBoundary no layout do painel

---

## Claude's Discretion

- Ordem dos botões nos cards mobile
- Placement do `<Toaster />` (layout do painel vs raiz)
- Dashboard table mobile (read-only, provavelmente `overflow-x-auto` é suficiente)

## Deferred Ideas

- Toast em páginas públicas — fora do escopo desta fase
- Notificações push para novas reservas — Phase 14+
