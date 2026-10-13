# PostHog Dashboards — CAPI

Configuração recomendada de dashboards e funnels no PostHog.

## Eventos rastreados

O frontend envia os seguintes eventos via PostHog SDK:

| Evento | Quando | Propriedades |
|--------|--------|-------------|
| `$pageview` | Cada página visitada | URL, referrer (automático) |
| `destination_viewed` | Página de destino aberta | destination_slug |
| `package_viewed` | Página de roteiro aberta | package_id, package_name, tenant_slug |
| `slot_selected` | Turista seleciona um slot | slot_id, package_id, date |
| `booking_started` | Formulário de reserva aberto | package_id, tenant_slug |
| `booking_submitted` | Reserva enviada (POST) | package_id, tenant_slug, pax |
| `booking_confirmed` | Página de confirmação | booking_id |
| `guide_viewed` | Perfil do guia aberto | guide_id, tenant_slug |

## Funnel de Conversão Principal

**Nome:** Jornada de Reserva

**Etapas:**
1. `$pageview` (filtro: URL contém `/destinos/`)
2. `package_viewed`
3. `slot_selected`
4. `booking_started`
5. `booking_submitted`
6. `booking_confirmed`

**Configuração no PostHog:**
1. Insights → New Insight → Funnel
2. Adicionar cada etapa como evento
3. Conversion window: 7 dias
4. Breakdown: por `tenant_slug` para comparar operadoras

## Dashboard: Métricas de Produto

### 1. Visitas por destino
- Tipo: Bar chart
- Evento: `destination_viewed`
- Breakdown: `destination_slug`
- Período: Últimos 30 dias

### 2. Taxa de conversão por roteiro
- Tipo: Funnel
- Eventos: `package_viewed` → `booking_submitted`
- Breakdown: `package_name`

### 3. Engajamento por dispositivo
- Tipo: Pie chart
- Evento: `$pageview`
- Breakdown: `$device_type`

### 4. Retenção semanal
- Tipo: Retention
- Evento inicial: `$pageview`
- Evento de retorno: `$pageview`
- Período: Semanal, últimas 8 semanas

### 5. Top guias visualizados
- Tipo: Table
- Evento: `guide_viewed`
- Breakdown: `guide_id`
- Contagem: Unique users

## Cohorts Recomendados

| Cohort | Definição |
|--------|-----------|
| Turistas engajados | Fizeram `booking_submitted` nos últimos 30 dias |
| Visitantes recorrentes | 3+ `$pageview` em 7 dias |
| Abandonaram reserva | `booking_started` sem `booking_submitted` em 24h |
| Mobile users | `$device_type` = Mobile |

## Como configurar

1. Acessar PostHog → projeto CAPI
2. Feature Flags: não necessário para MVP
3. Dashboards → New Dashboard → "CAPI — Produto"
4. Adicionar cada insight conforme acima
5. Compartilhar URL do dashboard com a equipe

## Eventos a adicionar no código

Alguns eventos acima podem não estar implementados ainda. Para adicionar:

```tsx
// No componente, importar:
import posthog from 'posthog-js'

// Capturar evento:
posthog.capture('slot_selected', {
  slot_id: slot.id,
  package_id: packageId,
  date: slot.startsAt,
})
```

Verificar quais eventos já estão implementados em:
- `apps/web/src/components/tracking/TrackView.tsx`
- `apps/web/src/components/ui/SlotPicker.tsx`
- `apps/web/src/components/ui/BookingForm.tsx`
