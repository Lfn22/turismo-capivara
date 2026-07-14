---
status: partial
phase: 28-map-widget
source: [28-01-SUMMARY.md, 28-02-SUMMARY.md, 28-03-SUMMARY.md]
started: 2026-07-08T19:58:00-03:00
updated: 2026-07-14T08:11:00-03:00
---

## Current Test

[testing complete]

## Tests

### 1. Servidor de desenvolvimento rodando
expected: pnpm dev inicia sem erros, app acessível em localhost:3000
result: issue
reported: "ssr: false not allowed in Server Components — fix aplicado: MapWidgetClient.tsx wrapper criado"
severity: major

### 2. Widget de mapa aparece na página do destino
expected: Acessar /destinos/[slug] de um destino com lat/lng definidos — mapa MapLibre GL aparece entre o hero e o conteúdo editorial, altura ~400px
result: issue
reported: "continua tudo igual a antes — widget não aparece na página"
severity: major

### 3. MAPTILER_KEY ausente no Network tab
expected: DevTools → Network → filtrar por "tiles" — requests vão para /api/tiles/... sem parâmetro key= visível na URL
result: skipped
reason: mapa não está renderizando (Test 2 issue) — sem requests de tiles para verificar

### 4. Marcadores aparecem no mapa
expected: Parceiros com lat/lng aparecem como marcadores cor ochre (#9C6318); POIs do Overpass como marcadores cinza (#6B7280)
result: skipped
reason: bloqueado por Test 2 — mapa não renderiza

### 5. Widget oculto quando destino não tem coordenadas
expected: Acessar /destinos/[slug] de um destino SEM lat/lng — nenhum mapa aparece, página carrega normalmente
result: pass

### 6. Skeleton de loading visível
expected: Ao carregar a página, "Carregando mapa..." aparece brevemente antes do mapa renderizar
result: skipped
reason: bloqueado por Test 2 — mapa não renderiza

### 7. Controles de navegação ocultos em mobile
expected: Em viewport ≤768px (DevTools mobile), os botões +/− do mapa ficam ocultos
result: skipped
reason: bloqueado por Test 2 — mapa não renderiza

## Summary

total: 7
passed: 1
issues: 2
pending: 0
skipped: 4
blocked: 0

## Gaps

- truth: "Mapa MapLibre GL aparece entre o hero e o conteúdo editorial em /destinos/[slug] com lat/lng"
  status: failed
  reason: "User reported: continua tudo igual a antes — widget não aparece na página"
  severity: major
  test: 2
  root_cause: ""
  artifacts: []
  missing: []

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
