# Plan 18-01 Summary

## Status: COMPLETE

## Changes Made
- `apps/web/src/components/ui/BookingForm.tsx` — removido `setLoading(false)` do caminho de sucesso (bug double-submit); adicionado spinner SVG inline com `aria-hidden="true"` e `animation: spin`; texto trocado para `Processando…` (U+2026); adicionado `aria-busy={loading}` no botão; estilos inline de flex para alinhar spinner + texto
- `apps/web/app/globals.css` — adicionado `@keyframes spin { to { transform: rotate(360deg); } }` para animar o spinner

## Must-Haves Verified
- [x] Clicking 'Confirmar reserva' twice rapidly fires exactly 1 POST — `disabled={loading}` + `setLoading(true)` no início do submit garantem que o botão fica inativo após 1º clique; `setLoading(false)` removido do caminho de sucesso, então não há janela para segundo clique
- [x] After 1st click, button is grey with SVG spinner and text 'Processando…' (U+2026) — `backgroundColor: 'var(--stone-400)'` quando `loading`, SVG com arco giratório, texto literal `Processando…`
- [x] On network error or non-2xx, button returns to ochre enabled state — catch ainda chama `setLoading(false)`, botão volta ao estado normal com `backgroundColor: 'var(--ochre)'`
- [x] On success, button stays disabled while router.push navigates — `setLoading(false)` removido do caminho de sucesso; botão permanece `disabled` e cinza durante a navegação

## Deviations from Plan
- **globals.css modificado (não previsto no plano):** A animação CSS `spin` não existia no projeto. Sem o `@keyframes spin`, o `style={{ animation: 'spin 0.75s linear infinite' }}` no SVG seria silenciosamente ignorado — o spinner não giraria. Adicionado `@keyframes spin` ao globals.css para que a animação funcione corretamente. Mudança mínima (3 linhas). [Rule 2 — funcionalidade crítica ausente]

## Commit
8c470d2
