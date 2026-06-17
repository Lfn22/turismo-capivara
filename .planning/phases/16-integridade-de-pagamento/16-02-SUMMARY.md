---
phase: "16-integridade-de-pagamento"
plan: "02"
subsystem: "api/bookings"
tags: [cpf-validation, pessimistic-lock, payment-integrity, zod]
dependency_graph:
  requires: ["16-01"]
  provides: ["cpf-algorithm-validation", "select-for-update-confirmed"]
  affects: ["apps/api/src/modules/bookings/bookings.routes.ts"]
tech_stack:
  added: []
  patterns: ["zod-refine", "cpf-digit-verification", "pessimistic-lock-confirmation"]
key_files:
  created: []
  modified:
    - apps/api/src/modules/bookings/bookings.routes.ts
decisions:
  - "Função isValidCPF implementada no próprio arquivo (não extraída para util) — escopo único"
  - "Task 2 resultou em confirmação sem alteração — FOR UPDATE já estava correto após 16-01"
metrics:
  duration: "15min"
  completed: "2026-06-17"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
requirements:
  - PAY-04
  - DATA-03
---

# Phase 16 Plan 02: Validação CPF + Confirmação FOR UPDATE Summary

CPF real digit-verification algorithm via `isValidCPF()` + `.refine()` no Zod schema; SELECT FOR UPDATE confirmado na transação de lock (já correto após 16-01).

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Algoritmo CPF no Zod schema (PAY-04) | a589a25 | Implementado |
| 2 | Confirmar SELECT FOR UPDATE na tx de slot (DATA-03) | a589a25 | Confirmado — sem alteração necessária |

## What Was Done

**Task 1 — isValidCPF + refine (PAY-04)**

Adicionado antes do `createBookingBodySchema`:

```typescript
function isValidCPF(cpf: string): boolean {
  if (/^(\d)\1{10}$/.test(cpf)) return false  // rejeita sequências uniformes
  // ... algoritmo dígitos verificadores
}
```

Campo `customerCpf` alterado de:
```typescript
customerCpf: z.string().regex(/^\d{11}$/, ...)
```
para:
```typescript
customerCpf: z.string()
  .regex(/^\d{11}$/, { message: 'CPF deve conter 11 dígitos numéricos' })
  .refine(isValidCPF, { message: 'CPF inválido' }),
```

**Task 2 — FOR UPDATE confirmado (DATA-03)**

`grep -n "FOR UPDATE\|queryRaw"` confirmou que o lock está em `tx.$queryRaw` (linha 131), dentro da única transação do handler POST (a que faz lock + increment + cria booking). Nenhuma alteração foi necessária.

## Deviations from Plan

### Task 2 — Confirmação sem alteração

**Task 2** foi planejada como "verificar e corrigir se necessário". O `FOR UPDATE` já estava correto em `tx.$queryRaw` dentro da transação principal. Resultado: zero alterações de código para DATA-03 — apenas confirmação documental.

Sem outras deviações — plano executado conforme especificado.

## Success Criteria Verification

- [x] CPF `11111111111` retornaria 400 com "CPF inválido" — sequência uniforme rejeitada por `/^(\d)\1{10}$/`
- [x] CPF `12345678909` passaria validação — dígitos verificadores corretos
- [x] `FOR UPDATE` em `tx.$queryRaw` na primeira (e única) transação do handler POST
- [x] TypeScript limpo em `bookings.routes.ts` (erros no worktree são de ambiente — node_modules ausentes; check no projeto principal: zero erros em bookings.routes.ts)

## Known Stubs

Nenhum.

## Threat Flags

Nenhum — nenhuma nova superfície de segurança introduzida.

## Self-Check: PASSED

- Arquivo modificado: `apps/api/src/modules/bookings/bookings.routes.ts` — existe
- Commit `a589a25` existe com 30 inserções, 1 deleção
- `isValidCPF` presente na linha 16
- `.refine(isValidCPF, ...)` presente na linha 50
- `FOR UPDATE` em `tx.$queryRaw` linha 131 (confirmado, não alterado)
