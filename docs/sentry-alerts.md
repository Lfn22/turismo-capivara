# Sentry Alerts — CAPI

Configuração recomendada de alertas no dashboard do Sentry.

## Alertas de Erro

### 1. Error Spike
- **Condição:** Número de eventos > 10 em 5 minutos
- **Ação:** Email para equipe
- **Filtro:** Todos os projetos (API + Web)

### 2. New Issue
- **Condição:** Primeira ocorrência de um erro novo
- **Ação:** Email para equipe
- **Filtro:** Todos os projetos

### 3. Erro Crítico em Pagamento
- **Condição:** Erro com tag `module:bookings` ou `module:webhooks`
- **Ação:** Email imediato + Slack (se configurado)
- **Filtro:** Projeto API

## Alertas de Performance

### 4. Latência Alta
- **Condição:** P95 de transação > 3s por 5 minutos
- **Ação:** Email para equipe
- **Filtro:** Projeto API

### 5. Throughput Drop
- **Condição:** Número de transações cai > 50% vs média de 24h
- **Ação:** Email para equipe
- **Filtro:** Projeto API

## Como configurar

1. Acessar [sentry.io](https://sentry.io) → Projeto → Alerts
2. "Create Alert" → escolher tipo (Issue / Metric)
3. Configurar condições conforme acima
4. Definir ação (email, Slack, webhook)
5. Salvar

## Tags recomendadas no código

Adicionar tags via `Sentry.setTag()` nos handlers:
- `module`: bookings, webhooks, destinations, packages, guides
- `tenant`: slug do tenant
- `action`: create, cancel, confirm, approve, reject
