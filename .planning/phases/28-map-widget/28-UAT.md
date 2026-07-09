---
status: testing
phase: 28-map-widget
source: [28-01-SUMMARY.md, 28-02-SUMMARY.md, 28-03-SUMMARY.md]
started: 2026-07-08T19:58:00-03:00
updated: 2026-07-08T21:05:00-03:00
---

## Current Test

number: 2
name: Widget de mapa aparece na página do destino
expected: |
  Acessar /destinos/[slug] de um destino com lat/lng definidos.
  Mapa MapLibre GL aparece entre o hero e o conteúdo editorial, altura ~400px.
awaiting: user response

## Tests

### 1. Servidor de desenvolvimento rodando
expected: pnpm dev inicia sem erros, app acessível em localhost:3000
result: issue
reported: "ssr: false not allowed in Server Components — fix aplicado: MapWidgetClient.tsx wrapper criado"
severity: major

### 2. Widget de mapa aparece na página do destino
expected: Acessar /destinos/[slug] de um destino com lat/lng definidos — mapa MapLibre GL aparece entre o hero e o conteúdo editorial, altura ~400px
result: [pending]

### 3. MAPTILER_KEY ausente no Network tab
expected: DevTools → Network → filtrar por "tiles" — requests vão para /api/tiles/... sem parâmetro key= visível na URL
result: [pending]

### 4. Marcadores aparecem no mapa
expected: Parceiros com lat/lng aparecem como marcadores cor ochre (#9C6318); POIs do Overpass como marcadores cinza (#6B7280)
result: [pending]

### 5. Widget oculto quando destino não tem coordenadas
expected: Acessar /destinos/[slug] de um destino SEM lat/lng — nenhum mapa aparece, página carrega normalmente
result: [pending]

### 6. Skeleton de loading visível
expected: Ao carregar a página, "Carregando mapa..." aparece brevemente antes do mapa renderizar
result: [pending]

### 7. Controles de navegação ocultos em mobile
expected: Em viewport ≤768px (DevTools mobile), os botões +/− do mapa ficam ocultos
result: [pending]

## Summary

total: 7
passed: 0
issues: 1
pending: 6
skipped: 0
blocked: 0

## Gaps

- truth: "pnpm dev inicia sem erros, app acessível em localhost:3000"
  status: failed
  reason: "User reported: ssr: false not allowed in Server Components"
  severity: major
  test: 1
  root_cause: "dynamic({ ssr: false }) usado em Server Component — movido para MapWidgetClient.tsx wrapper com use client"
  artifacts:
    - path: "apps/web/src/components/ui/MapWidgetClient.tsx"
      issue: "criado como wrapper client component"
  missing: []
