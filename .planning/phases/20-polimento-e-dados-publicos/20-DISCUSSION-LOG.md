# Phase 20: Polimento e Dados Públicos - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-29
**Phase:** 20-polimento-e-dados-publicos
**Areas discussed:** Home destinos, Paginação super-admin, Erro operadora PENDING, Terminologia POL-04

---

## Home: quantidade de destinos

| Option | Description | Selected |
|--------|-------------|----------|
| 6 destinos | Grid 3×2 desktop / 2×3 mobile, muda slice(0,3) → slice(0,6) | ✓ |
| Todos os aprovados | Sem limite, risco de home longa demais | |
| 8 destinos | Grid 4×2 desktop | |

**User's choice:** 6 destinos
**Notes:** Confirmou recomendação sem ressalvas.

---

## Home: ordenação

| Option | Description | Selected |
|--------|-------------|----------|
| Mais recentes primeiro | createdAt DESC — simples, sem lógica extra | ✓ |
| Alfabético por título | A-Z previsível | |
| Claude decide | Abordagem mais simples | |

**User's choice:** Mais recentes primeiro
**Notes:** —

---

## Paginação super-admin: modelo

| Option | Description | Selected |
|--------|-------------|----------|
| Carregar mais | Botão no final, append no state, simples | ✓ |
| Paginada numerada | Botões 1 2 3, troca lista inteira | |

**User's choice:** Carregar mais

---

## Paginação super-admin: limite por lote

| Option | Description | Selected |
|--------|-------------|----------|
| 20 por lote | Razoável para listas de aprovação | ✓ |
| 50 por lote | Mantém limite atual | |
| 10 por lote | Mais granular | |

**User's choice:** 20 por lote

---

## Erro operadora PENDING: onde exibir

| Option | Description | Selected |
|--------|-------------|----------|
| Página de erro inline | No lugar do formulário, sem interromper com modal | ✓ |
| Toast + bloqueia botão | Botão desabilitado + tooltip | |
| Redirect para /destinos | Redirect imediato com mensagem | |

**User's choice:** Página de erro inline

---

## Erro operadora PENDING: mensagem

| Option | Description | Selected |
|--------|-------------|----------|
| Mensagem genérica | "Este roteiro não está disponível para reservas no momento." | ✓ |
| Mensagem específica | Expõe que está em aprovação | |

**User's choice:** Mensagem genérica

---

## Terminologia POL-04

| Option | Description | Selected |
|--------|-------------|----------|
| "Destinos" → "Locais" no nav | Simples, sem conflito com /destinos público | ✓ |
| "Destinos" → "Meus Locais" | Com prefixo possessivo | |
| Adicionar "Meu Destino" ao nav | Dois itens parecidos, mais confusão | |

**User's choice:** Renomear "Destinos" → "Locais"

---

## Claude's Discretion

- Estilo do botão "Carregar mais"
- Tratamento de lista vazia após último lote

## Deferred Ideas

- Facilidade para adicionar fotos — fora do escopo da Phase 20, fase futura
- Facilidade para editar roteiros — idem, fase futura
