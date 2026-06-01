# Phase 12: Login Global - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-01
**Phase:** 12-login-global
**Areas discussed:** Fluxo de login, Email em múltiplos tenants, Forgot password, Visual do /login

---

## Fluxo de Login

| Option | Description | Selected |
|--------|-------------|----------|
| Dois passos | Passo 1: email → lookup → mostra agência. Passo 2: senha → login | ✓ |
| Passo único | Email + senha juntos, tenant resolvido silenciosamente | |

**User's choice:** Dois passos
**Notes:** Usuário confirma visualmente o nome da agência antes de inserir senha

---

| Option | Description | Selected |
|--------|-------------|----------|
| Link "Não é você?" | Link discreto no passo 2 para voltar ao passo 1 | ✓ |
| Botão Voltar | Usa o BackButton universal da Phase 11 | |

**User's choice:** Link "Não é você?"
**Notes:** Padrão Google/GitHub — mais familiar para usuários

---

| Option | Description | Selected |
|--------|-------------|----------|
| Nova rota na API (POST /auth/lookup-tenant) | Reutilizável, testável, API-first | ✓ |
| Server Action Next.js | Menos código mas quebra padrão API-first | |

**User's choice:** Nova rota na API
**Notes:** Mantém consistência com padrão Fastify do projeto

---

## Email em Múltiplos Tenants

| Option | Description | Selected |
|--------|-------------|----------|
| Bloquear na criação | Email único por plataforma — MVP | ✓ |
| Mostrar lista de agências | Suporta guias freelancers | |
| Usar o primeiro encontrado | Simples mas confuso | |

**User's choice:** Bloquear na criação
**Notes:** Escopo MVP — suporte a múltiplos tenants por email é pós-MVP

---

| Option | Description | Selected |
|--------|-------------|----------|
| Mensagem genérica | "Nenhuma conta encontrada" — sem revelar existência | ✓ |
| Mensagem específica | Sugere cadastro — revela enumeração | |

**User's choice:** Mensagem genérica
**Notes:** Consistente com padrão opaque 404 da Phase 10 (self-service)

---

## Forgot Password

| Option | Description | Selected |
|--------|-------------|----------|
| Tabela no banco (PasswordResetToken) | Revogável, padrão Prisma | ✓ |
| JWT assinado | Sem tabela nova, mas não revogável | |

**User's choice:** Tabela no banco
**Notes:** Token hasheado com bcryptjs (já instalado)

---

| Option | Description | Selected |
|--------|-------------|----------|
| 1 hora | Padrão da indústria | ✓ |
| 24 horas | Mais conveniente | |
| 30 minutos | Mais seguro | |

**User's choice:** 1 hora
**Notes:** Equilíbrio entre segurança e conveniência

---

| Option | Description | Selected |
|--------|-------------|----------|
| Redirecionar para /login | Fluxo limpo — usuário entra com nova senha | ✓ |
| Logar automaticamente | Mais rápido mas cria sessão sem confirmação consciente | |

**User's choice:** Redirecionar para /login

---

## Visual do /login

| Option | Description | Selected |
|--------|-------------|----------|
| Card centralizado | Mesmo estilo do /onboarding | ✓ |
| Tela full-height com split | Imagem + form — mais impactante | |

**User's choice:** Card centralizado
**Notes:** Consistência visual com /onboarding sem custo de novo design

---

## Claude's Discretion

- Transição entre passo 1 e passo 2 (animação/fade/slide)
- Copy do email de reset (português)
- Rate limit do /auth/lookup-tenant

## Deferred Ideas

- Suporte a múltiplos tenants por email (guia freelancer) — pós-MVP
- Auto-login após reset de senha — descartado para MVP
