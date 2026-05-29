# Phase 11: Frontend Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-28
**Phase:** 11-frontend-polish
**Areas discussed:** Back button, ConversionAnchor waitlist, Migração de estilos, Flash branco

---

## Back button — como implementar universalmente

| Option | Description | Selected |
|--------|-------------|----------|
| href fixo por página | Cada página passa `backHref` explícito. Previsível, funciona sem JS. | |
| router.back() browser history | Componente client-side genérico com `useRouter`. | ✓ |
| router.back() com fallback para href | Tenta history.back(), fallback para href padrão. | |

**User's choice:** `router.back()` browser history

| Option | Description | Selected |
|--------|-------------|----------|
| Página de detalhe de roteiro | /{slug}/roteiros/{id} → back para /{slug}/roteiros | ✓ |
| Página de detalhe de destino | /destinos/{dest-slug} → back para /destinos | ✓ |
| Checkout e minha reserva | /{slug}/checkout e /{slug}/minha-reserva | ✓ |
| Painel do condutor (todas as sub-páginas) | Sub-páginas do painel | ✓ |

**User's choice:** Todos os 4 tipos de página

| Option | Description | Selected |
|--------|-------------|----------|
| Dentro do nav existente | Back no canto esquerdo do header | |
| Acima do conteúdo, fora do nav | Primeiro elemento abaixo do header | ✓ |
| Claude decide | Qualquer posição que faça sentido | |

**User's choice:** Acima do conteúdo, fora do nav

---

## ConversionAnchor — endpoint de waitlist

| Option | Description | Selected |
|--------|-------------|----------|
| Persistir no banco (criar endpoint API) | POST /tenants/:slug/waitlist | |
| Só enviar email de confirmação (sem persistir) | Server Action + Resend, sem banco | ✓ |
| Claude decide | Abordagem mais pragmática para MVP | |

**User's choice:** Sem persistência — Server Action + Resend

| Option | Description | Selected |
|--------|-------------|----------|
| Email para o usuário + notificação interna | Resend para usuário + admin email | ✓ |
| Só mostrar mensagem de sucesso | Sem envio de email | |

**User's choice:** Email para usuário + notificação interna

---

## Migração de estilos — destino dos `<style>` JSX

| Option | Description | Selected |
|--------|-------------|----------|
| Manter os `<style>` JSX, substituir hex restantes por tokens | In-place, mínimo de mudança | ✓ |
| Migrar para CSS Modules (.module.css) | Refatoração maior | |
| Claude decide | Abordagem mais simples | |

**User's choice:** Manter `<style>` JSX, substituir hex → tokens

| Option | Description | Selected |
|--------|-------------|----------|
| Converter para className + classes em globals.css | Centralizado, reutilizável | |
| Converter para className + Tailwind utilities | Tailwind para PublicNav e BookingForm | ✓ |
| Converter para `<style>` JSX com tokens | Consistência com ConversionAnchor | |

**User's choice:** className + Tailwind utilities (para inline styles existentes)

| Option | Description | Selected |
|--------|-------------|----------|
| Deletar /destinos/teste | Não é rota de produção | ✓ |
| Manter mas corrigir brand | Substituir referências Serra da Capivara | |
| Claude decide | Avaliar pelo conteúdo | |

**User's choice:** Deletar `apps/web/app/destinos/teste/page.tsx`

---

## Flash branco entre rotas — abordagem técnica

| Option | Description | Selected |
|--------|-------------|----------|
| Background root correto + loading.tsx | Sem deps extras, solução estável | ✓ |
| Next.js View Transitions API (experimental) | `<ViewTransition>`, unstable_ flag | |
| Claude decide | Abordagem mais estável | |

**User's choice:** Background root correto + `loading.tsx` simples

---

## Claude's Discretion

- Texto exato do email de confirmação da waitlist
- Quais rotas específicas precisam de `loading.tsx`
- Correções pontuais de font-size e font-family (AUDIT-04 e AUDIT-05)

## Deferred Ideas

- Next.js View Transitions API — para v1.3 quando estabilizar
- CSS Modules — migração mais profunda dos `<style>` JSX
- Persistência de waitlist no banco
