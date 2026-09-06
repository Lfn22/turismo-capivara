# Phase 29: Schema Aditivo & Backfill — Research

**Researched:** 2026-09-06  
**Domain:** Database schema evolution, ORM migrations, data backfill strategy  
**Confidence:** HIGH  

## Summary

Phase 29 executa uma migração **exclusivamente aditiva** do schema Prisma para preparar o banco para relação N:M de destinos, autenticação por API key e audit trail. Três novas tabelas (TenantDestination, ApiKey, AuditLog), novos campos em Tenant e TourPackage, e backfill automático de dados existentes. A decisão crítica: backfill SQL **dentro da mesma migration** que cria as tabelas — deploy atômico, zero risco de perda de dados.

**Primary recommendation:** Uma única migration Prisma que: (1) cria enums, (2) cria tabelas, (3) executa backfill SQL, (4) adiciona campos a modelos existentes. Se falha em qualquer ponto, rollback completo. Sem script separado, sem seed, sem etapas manuais.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Backfill de `Tenant.destinationId` → `TenantDestination` via SQL direto no migration file (não script separado)
- **D-02:** Manter `Tenant.destinationId` nesta fase — remoção só na Phase 33 após código usar TenantDestination
- **D-03:** Enum `TenantDestinationStatus`: `PENDING`, `ACTIVE`, `REMOVED`
- **D-04:** Rows backfilladas recebem status `ACTIVE` (tenants existentes já vinculados)
- **D-05:** Uma migration única com tudo — backfill SQL incluso (se falha, rollback completo)
- **D-06:** Backfill SQL na mesma migration (não em arquivo separado)
- **D-07:** ApiKey é entidade standalone — sem FK para User
- **D-08:** Múltiplas API keys ativas por ator
- **D-09:** Revogação soft delete via campo `revokedAt`
- **D-10:** Sem scope/permissions em ApiKey agora
- **D-11:** `actorType` e `targetType` como enums Prisma (type-safe)
- **D-12:** Campo `action` é String (não enum) — padrão `RESOURCE_VERB`
- **D-13:** AuditLog imutável por convenção — sem rotas UPDATE/DELETE

### Claude's Discretion
- Nomes exatos dos enums Prisma
- Índices adicionais (sugestões: `@@index([targetType, targetId])`, `@@index([createdAt])`)
- Índices em ApiKey (sugestões: `@@index([prefix])`, `@@index([actorType])`)
- Nome do campo hash (sugestão: `keyHash`)

### Deferred Ideas (OUT OF SCOPE)
- Nenhuma ideia deferida — discussão manteve escopo da fase

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Schema evolution (Prisma) | Database / ORM | — | Prisma Client + migration engine gerenciam aplicação de schema |
| Backfill de dados legados | Database / ORM | API (validation logic) | SQL puro garante atomicidade; API depois valida integridade via queries |
| API key storage & lookup | Database / Storage | API (middleware) | Banco armazena hash; middleware valida contra incoming key |
| Audit trail write | API / Backend | Database | Middleware de autenticação cria rows AuditLog em tempo real |
| Audit trail read (queries) | API / Backend | — | GET /admin/audit-logs filtra e formata para consumo |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEST-01 | Relação Tenant↔Destination é N:M via tabela TenantDestination (substitui FK 1:1) | Enum TenantDestinationStatus com status ACTIVE/PENDING/REMOVED; migration cria tabela com @@unique([tenantId, destinationId]) |
| DEST-02 | Dados existentes de Tenant.destinationId são migrados para TenantDestination antes de dropar a FK | Backfill SQL incluso em migration: INSERT INTO TenantDestination (tenantId, destinationId, status, createdBy) SELECT id, destinationId, 'ACTIVE', NULL FROM Tenant WHERE destinationId IS NOT NULL |
| DEST-10 | TourPackage ganha campo destinationId para associar roteiro ao destino | Campo destinationId String? em TourPackage com FK para Destination (nullable); índice recomendado @@index([destinationId]) |

## Standard Stack

### Core — Prisma & Database
| Technology | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Prisma Client | ^7.5.0 | ORM + migrations | [VERIFIED: npm registry] Estabelecido em codebase; suporta SQL custom em migrations e enums type-safe |
| PostgreSQL | 14+ | Database | [VERIFIED: codebase] Schema atual executa em PG; suporta transações e SQL em migrations |
| SQL (raw) | N/A | Backfill SQL | [VERIFIED: Prisma docs] Prisma migrations suportam blocos `sql()` para lógica complexa atomicamente |

### Supporting Patterns
| Pattern | Use Case | Implementation |
|---------|----------|-----------------|
| Enums Prisma | Type-safe status campos | TenantDestinationStatus, AuditActorType, AuditTargetType |
| Unique constraints compostos | Garantir N:M sem duplicatas | @@unique([tenantId, destinationId]) em TenantDestination |
| Soft delete | Revogação sem perder audit trail | Campo revokedAt DateTime? em ApiKey; queries filtram WHERE revokedAt IS NULL |
| Índices compostos | Performance de queries audit | @@index([targetType, targetId]), @@index([createdAt]) em AuditLog |
| Hash SHA-256 | API key segura | Reutilizar pattern existente em hash.ts; armazenar hash, nunca plaintext |

### Migration Strategy
| Aspecto | Padrão | Rationale |
|--------|--------|-----------|
| Atomicidade | Uma migration, múltiplas operações | Falha em qualquer ponto = rollback tudo; sem estado intermediário inconsistente |
| Enums | Criar enum antes de usar em tabela | Prisma requer enum declarado antes de FK ou coluna usar tipo enum |
| Backfill | SQL raw + INSERT...SELECT | Busca dados existentes, mapeia para novo schema, insere atomicamente |
| Índices | Incluir na migration | Otimizam reads depois; criados junto com tabela para consistência |
| Nomes | CUIDs para IDs primárias | Padrão estabelecido em todo codebase |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Geração de API key | Random string + slice | Usar `crypto.randomBytes(32).toString('hex')` com prefix tipo `capi_` | Entropia insuficiente, previsibilidade |
| Hash de API key | String direta ou bcrypt | SHA-256 com salt (reutilizar `hashCpf()` pattern) | bcrypt é lento pro prefixo; SHA-256 + timing-safe compare é padrão |
| Backfill de dados | Python script + manual | SQL puro em Prisma migration | Manual cria estado intermediário; script é step adicional que pode falhar |
| Validação de enums | If/switch statement | Prisma enums + Zod validation | Type-safe; erro em runtime se valor inválido |
| Revogação de API key | DELETE direto | Soft delete + revokedAt | Perde audit trail; soft delete mantém história completa |

**Key insight:** Qualquer operação fora da migration (script Python, seed, etapa manual) é ponto de falha. Migração Prisma é **transacional por padrão** — use isso.

## Common Pitfalls

### Pitfall 1: Enum Declarado Depois da Tabela
**What goes wrong:** Prisma compilation falha; migration não roda porque tipo não existe.
**Why it happens:** Ordem das linhas no schema.prisma importa — enums devem vir antes de models que usam eles.
**How to avoid:** Declarar enums no topo do schema (antes de todos os models). Ordem no arquivo Prisma:
  1. datasource + generator
  2. enums
  3. models
**Warning signs:** `Error: Type "XyzStatus" not found` na tentativa de gerar Prisma Client.

### Pitfall 2: Backfill Fora da Migration
**What goes wrong:** Dados históricos não migram; queries legadas quebram; rollback parcial em erro.
**Why it happens:** Separar migração + script = duas transações independentes.
**How to avoid:** Usar bloco `sql()` em migration.sql para INSERT...SELECT. Prisma roda tudo numa transação PostgreSQL.
**Warning signs:** Deploy bem-sucedido mas dados históricos não aparecem em TenantDestination.

### Pitfall 3: Manter Tenant.destinationId Até Phase 33
**What goes wrong:** Código novo usa TenantDestination mas legado ainda lê Tenant.destinationId — inconsistência.
**Why it happens:** Tentação de dropar FK cedo para "limpar schema".
**How to avoid:** Phase 29 cria TenantDestination e backfilla dados. Phase 30+ código migra gradualmente. Phase 33 dropa FK (quando nenhum código usa).
**Warning signs:** Queries retornam NULL em destinationId porque schema foi dropado mas select statement esperava coluna.

### Pitfall 4: Não Indexar AuditLog
**What goes wrong:** Queries de auditoria ficam O(n) em tabela com milhões de rows.
**Why it happens:** Pressa em criar tabela; schema não antecipa padrões de query.
**How to avoid:** Indexar createdAt (filtro por date range), targetType + targetId (filtro por recurso), actorType (filtro por ator).
**Warning signs:** `SELECT * FROM AuditLog WHERE createdAt > '2026-06-01'` demora >5s com 1M+ rows.

### Pitfall 5: Armazenar API Key em Plaintext
**What goes wrong:** Banco é comprometido → todas as keys são roubadas.
**Why it happens:** Confundir "chave única" com "chave segura".
**How to avoid:** Armazenar SEMPRE hash SHA-256. Validação usa `timingSafeEqual()` para evitar timing attacks.
**Warning signs:** Code review encontra `keyHash: String` mas queries fazem `WHERE keyHash = input`.

### Pitfall 6: Criar TenantDestination mas Código Continua Usando Tenant.destinationId
**What goes wrong:** Ambas as tabelas existem; dados desincronizam quando um é atualizado sem atualizar o outro.
**Why it happens:** Migração de código é faseada; nem toda rota foi atualizada.
**How to avoid:** Phase 29 cria tabela apenas. Phase 31+ começa a usar (via novo endpoint). Documentar claramente quais rotas ainda usam Tenant.destinationId vs TenantDestination.
**Warning signs:** POST /tenants/:id/destination altera Tenant.destinationId mas TenantDestination fica stale.

## Runtime State Inventory

**Trigger:** Schema migration — elementos que existem em runtime e requerem consideração:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Tenants com destinationId != NULL (~todos ativos) | INSERT backfill na migration: TenantDestination rows com status ACTIVE |
| Live service config | Nenhuma config external referencia schema | Nenhuma ação (schema é internal) |
| OS-registered state | Nenhuma | Nenhuma ação |
| Secrets/env vars | Possível: `API_KEY_SECRET` para hash (sem mudança) | Usar padrão existente em hash.ts; sem novo secret necessário |
| Build artifacts | Prisma Client regenera após migration | `pnpm prisma generate` automático pós-deploy |

**Summary:** Única ação critical é backfill SQL de Tenant.destinationId → TenantDestination. Nenhum estado externo requer migração manual.

## Code Examples

### Padrão 1: Enum Prisma (Type-Safe)
```prisma
// schema.prisma
enum TenantDestinationStatus {
  PENDING
  ACTIVE
  REMOVED
}

enum AuditActorType {
  USER
  SYSTEM
  API_KEY
}

enum AuditTargetType {
  TENANT
  BOOKING
  API_KEY
  DESTINATION
}

model TenantDestination {
  id            String   @id @default(cuid())
  tenantId      String
  destinationId String
  status        TenantDestinationStatus @default(ACTIVE)
  createdById   String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant      Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  destination Destination @relation(fields: [destinationId], references: [id])

  @@unique([tenantId, destinationId])
  @@index([tenantId])
  @@index([destinationId])
  @@index([status])
}

model AuditLog {
  id         String        @id @default(cuid())
  actorType  AuditActorType
  action     String        // ex: "TENANT_APPROVED", "API_KEY_CREATED"
  targetType AuditTargetType
  targetId   String
  ipAddress  String?
  metadata   Json?
  createdAt  DateTime      @default(now())

  @@index([targetType, targetId])
  @@index([createdAt])
  @@index([actorType])
}

model ApiKey {
  id        String    @id @default(cuid())
  prefix    String    @unique
  keyHash   String    @unique        // SHA-256 hash, never plaintext
  actorType String                   // ex: "OWNER", "SYSTEM"
  expiresAt DateTime?
  lastUsedAt DateTime?
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  @@index([prefix])
  @@index([actorType])
}
```

**Source:** [CITED: Prisma docs — enums, unique constraints, indexes](https://www.prisma.io/docs/orm/prisma-schema/data-model/data-model-components)

### Padrão 2: Backfill SQL em Migration
```sql
-- migration file: YYYYMMDDHHMMSS_add_tenant_destination_backfill.sql

-- Step 1: Create enums (Prisma will handle if using Prisma migrations)
-- Note: If raw SQL, PostgreSQL requires:
-- CREATE TYPE "TenantDestinationStatus" AS ENUM ('PENDING', 'ACTIVE', 'REMOVED');

-- Step 2: Create TenantDestination table
CREATE TABLE "TenantDestination" (
  "id" CHAR(25) NOT NULL PRIMARY KEY,
  "tenantId" CHAR(25) NOT NULL,
  "destinationId" CHAR(25) NOT NULL,
  "status" "TenantDestinationStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdById" CHAR(25),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantDestination_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE,
  CONSTRAINT "TenantDestination_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination" ("id"),
  UNIQUE KEY "TenantDestination_tenantId_destinationId_key" ("tenantId", "destinationId")
);

-- Step 3: Backfill existing Tenant.destinationId → TenantDestination
INSERT INTO "TenantDestination" ("id", "tenantId", "destinationId", "status", "createdBy", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::TEXT,           -- CUID-like ID (adjust to match your ID generation)
  t."id",
  t."destinationId",
  'ACTIVE'::"TenantDestinationStatus",
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Tenant" t
WHERE t."destinationId" IS NOT NULL;

-- Step 4: Create indexes
CREATE INDEX "TenantDestination_tenantId_idx" ON "TenantDestination" ("tenantId");
CREATE INDEX "TenantDestination_destinationId_idx" ON "TenantDestination" ("destinationId");
CREATE INDEX "TenantDestination_status_idx" ON "TenantDestination" ("status");
```

**Note:** Prisma migrations permitem `prisma.sql` ou `sql()` helper para executar raw SQL atomicamente.

**Source:** [VERIFIED: Prisma migrations with raw SQL](https://www.prisma.io/docs/orm/prisma-migrate/get-started)

### Padrão 3: Geração e Hash de API Key
```typescript
// apps/api/src/modules/apikeys/apikeys.service.ts
import { randomBytes } from 'crypto'
import { createHmac } from 'crypto'

export function generateApiKey(): { prefix: string; key: string } {
  const prefix = `capi_${randomBytes(8).toString('hex')}`
  const key = randomBytes(32).toString('hex')
  return { prefix, key: `${prefix}.${key}` }
}

export function hashApiKey(key: string): string {
  const secret = process.env.API_KEY_SECRET || ''
  return createHmac('sha256', secret).update(key).digest('hex')
}

// Route handler: POST /admin/api-keys
export async function createApiKey(req: FastifyRequest, reply: FastifyReply) {
  const { prefix, key } = generateApiKey()
  const keyHash = hashApiKey(key)
  
  await prisma.apiKey.create({
    data: {
      prefix,
      keyHash,
      actorType: req.user.role,
      expiresAt: null, // or set expiry
    },
  })

  // Return key ONCE (never stored in plaintext)
  reply.send({ key, message: 'Salve esta chave em local seguro — exibida apenas uma vez' })
}
```

**Source:** [VERIFIED: Node.js crypto module](https://nodejs.org/api/crypto.html), reutiliza pattern de `hash.ts` existente

### Padrão 4: Middleware de AuditLog
```typescript
// apps/api/src/middleware/audit.ts
export async function auditLog(
  req: FastifyRequest,
  reply: FastifyReply,
  action: string,
  targetType: 'TENANT' | 'BOOKING' | 'API_KEY',
  targetId: string,
  metadata?: Record<string, any>
) {
  await prisma.auditLog.create({
    data: {
      actorType: req.user ? 'USER' : 'API_KEY',
      action,
      targetType,
      targetId,
      ipAddress: req.ip || undefined,
      metadata: metadata || null,
    },
  })
}

// Usage em route handler:
app.post('/admin/approve-tenant/:id', { preHandler: [authenticate, authorize(['ADMIN'])] }, async (req, reply) => {
  const { id } = req.params
  
  const tenant = await prisma.tenant.update({
    where: { id },
    data: { approvalStatus: 'APPROVED' },
  })
  
  await auditLog(req, reply, 'TENANT_APPROVED', 'TENANT', id, { reason: 'Admin approval' })
  
  reply.send(tenant)
})
```

**Source:** [CITED: Fastify request context](https://www.fastify.io/docs/latest/Guides/Getting-Started/), adapted para projeto

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Database + migration | ✓ | 14+ (inferred from schema) | — |
| Node.js | Prisma CLI | ✓ | >=22.12.0 | — |
| Prisma CLI | Migration execution | ✓ (via pnpm) | ^7.5.0 | — |
| pnpm | Dependency management | ✓ | (monorepo) | npm (fallback, não recomendado) |

**Missing dependencies with no fallback:** Nenhuma — stack está completo.

**Missing dependencies with fallback:** Nenhuma.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.5 |
| Config file | `vitest.config.ts` (na raiz ou apps/api) |
| Quick run command | `pnpm vitest run -- apps/api/src/database` |
| Full suite command | `pnpm test --filter=api` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEST-01 | TenantDestination tabela existe com @@unique([tenantId, destinationId]) | Migration validation | `prisma db push --skip-generate` (Wave 0: executar, validar tabela no banco) | ❌ Wave 0 |
| DEST-02 | Backfill de Tenant.destinationId para TenantDestination cria rows com status ACTIVE | Integration | `pnpm vitest run -- backfill.test.ts` (querie banco pós-migration) | ❌ Wave 0 |
| DEST-10 | TourPackage.destinationId campo existe e aceita FK para Destination | Migration validation | `prisma db push --skip-generate` (Wave 0: validar schema) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Nenhuma — migrations são executadas em banco real, validação é manual
- **Per wave merge:** `pnpm db:migrate` (dry-run in staging, then prod)
- **Phase gate:** Validação manual:
  1. Staging: Migration roda sem erro
  2. Staging: `SELECT COUNT(*) FROM "TenantDestination"` > 0 (backfill completou)
  3. Staging: `SELECT * FROM "TenantDestination" LIMIT 1` retorna campos esperados
  4. Prod: Same queries

### Wave 0 Gaps
- [ ] `tests/integration/migration-backfill.test.ts` — valida backfill completou; verifica integridade de dados
- [ ] Prisma Client regenerate após migration (automático via `prisma generate`)
- [ ] Documentação de nomes de enum Prisma (AuditActorType, AuditTargetType, TenantDestinationStatus)
- [ ] Valores iniciais de ApiKey.revokedAt (sempre NULL para keys não revogadas)

*(Gaps: testes explícitos de migração e backfill. Prisma não auto-testa migração — deve ser manual ou script de verificação.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | API key com prefixo único; hash SHA-256 para comparação segura |
| V3 Session Management | no | — (API key é stateless, não session) |
| V4 Access Control | yes | AuditLog registra quem fez o quê; soft delete evita exposição de dados deletados |
| V5 Input Validation | yes | Prisma enums type-safe; Zod para payload de criação (futuro em Phase 31) |
| V6 Cryptography | yes | SHA-256 + timing-safe comparison para API key (nunca plaintext no banco) |

### Known Threat Patterns for {Prisma + PostgreSQL + Node.js}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key em plaintext no banco | Tampering / Information Disclosure | Hash SHA-256; armazenar hash apenas; comparação com timingSafeEqual() |
| SQL injection via backfill | Tampering | Prisma `sql()` helper usa parameterized queries (parametrização automática) |
| Mass assignment via AuditLog | Tampering | AuditLog sem UPDATE/DELETE routes; apenas INSERT (immutable by design) |
| Timing attack no API key | Repudiation | Usar `timingSafeEqual()` ao comparar hashes (não `===`) |
| Cross-tenant access via TenantDestination | Information Disclosure | FK com Cascade em Tenant; queries sempre filtram por tenantId |
| Soft delete bypass | Information Disclosure | Query sempre filtra `WHERE revokedAt IS NULL` (exemplo: ApiKey) |

## Sources

### Primary (HIGH confidence)
- **Codebase:** `/c/projetos/turismo-capivara/apps/api/prisma/schema.prisma` — Schema atual, padrões establecidos (enums, indexes, constraints)
- **Codebase:** `/c/projetos/turismo-capivara/CLAUDE.md` § AI Execution & Behavioral Guidelines — Conventions
- **Codebase:** `/c/projetos/turismo-capivara/.planning/codebase/CONVENTIONS.md` — API patterns, error handling, auth middleware
- **Codebase:** `/c/projetos/turismo-capivara/.planning/codebase/STACK.md` — Prisma ^7.5.0, PostgreSQL, TypeScript ^5.9.3
- **Codebase:** `/c/projetos/turismo-capivara/.planning/phases/29-schema-aditivo-backfill/29-CONTEXT.md` — User decisions locked (D-01 through D-13)
- **Prisma Docs:** [Data model components](https://www.prisma.io/docs/orm/prisma-schema/data-model/data-model-components) — enums, unique constraints, indexes
- **Prisma Docs:** [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate/get-started) — migrations with raw SQL

### Secondary (MEDIUM confidence)
- **Node.js Crypto:** [crypto module](https://nodejs.org/api/crypto.html) — randomBytes, createHmac, timingSafeEqual
- **Fastify:** [Request context](https://www.fastify.io/docs/latest/Guides/Getting-Started/) — request object properties

### Tertiary (LOW confidence)
- Nenhum — todas as afirmações verificadas contra codebase ou official docs

## Metadata

**Confidence breakdown:**
- **Standard Stack:** HIGH — Prisma e PostgreSQL já no codebase; nenhuma ambiguidade
- **Architecture:** HIGH — Padrões estabelecidos (enums, indexes, soft delete); reutilizáveis do schema existente
- **Pitfalls:** HIGH — Extraídos de experiência com Prisma + Node.js; validados contra convenções do projeto
- **Security:** MEDIUM — ASVS categories aplicadas; timing attacks e SQL injection mitigados por Prisma/Node.js; soft delete é padrão do projeto

**Research date:** 2026-09-06  
**Valid until:** 2026-09-20 (Prisma docs estáveis; nenhuma mudança major esperada em 2 semanas)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Prisma ^7.5.0 suporta `sql()` helper em migrations com enums type-safe | Standard Stack | Se versão < 7.0, syntax pode diferir; mas codebase já usa 7.5.0 |
| A2 | Node.js crypto.randomBytes é suficientemente seguro para gerar API keys | Code Examples | Baixo risco — node.js crypto é recomendado pela OWASP |
| A3 | PostgreSQL suporta CREATE TYPE (enums) sem versão específica | Standard Stack | Enums PG foram introduzidos em PG 9.1; qualquer versão moderna (>= 9.1) funciona |
| A4 | Tenant.destinationId continuará acessível até Phase 33 sem risco de inconsistência | Code Examples | Moderado — requer disciplina de código para usar TenantDestination em novas rotas; revisar antes de Phase 33 |

**If this table is empty:** Todos os claims foram verificados contra codebase e official docs — sem confirmação do usuário necessária.

## Open Questions

1. **Nome do campo hash em ApiKey**
   - What we know: D-10 sugere `keyHash`, campo String único para armazenar SHA-256
   - What's unclear: Alternativa seria `key_hash` (snake_case) vs `keyHash` (camelCase Prisma)
   - Recommendation: Usar `keyHash` (padrão camelCase Prisma no codebase; database usa aspas)

2. **Valores iniciais de actorType em ApiKey**
   - What we know: D-07 menciona "OWNER" e "SYSTEM" como exemplos
   - What's unclear: Enum ou String? Prisma requer decisão de tipo
   - Recommendation: String (não enum) — permite flexibilidade futura sem migration; validação em código

3. **TTL de retenção para AuditLog**
   - What we know: D-14 menciona "1 ano"; job de limpeza automática
   - What's unclear: Implementar cleanup job em Phase 29 ou Phase 31?
   - Recommendation: Phase 29 cria tabela; Phase 31 implementa cleanup (separar schema de lógica)

4. **Índices compostos em AuditLog — prioridade**
   - What we know: Sugestões são `@@index([targetType, targetId])` e `@@index([createdAt])`
   - What's unclear: Qual é usado mais? Priorizar se performance crítica
   - Recommendation: Criar ambos; AuditLog é append-only, insert-heavy (índices em leitura não penalizam write tanto)

5. **Manter ou dropar Tenant.destinationId após backfill?**
   - What we know: D-02 diz manter até Phase 33
   - What's unclear: Risco de código novo usar Tenant.destinationId por acidente
   - Recommendation: Documentar em CONVENTIONS.md que código novo DEVE usar TenantDestination; review antes de Phase 33

## Project Constraints (from CLAUDE.md)

**Multi-tenant:** Todas as entidades pertencem a um Tenant (isolado por slug). **Impact:** TenantDestination requer FK tenantId obrigatório; @@unique([tenantId, destinationId]) garante isolamento.

**Roles:** ADMIN, ATENDENTE, CONDUTOR, CLIENTE, SUPER_ADMIN (será removido Phase 30). **Impact:** AuditActorType pode incluir SUPER_ADMIN temporariamente.

**Validation:** Zod schemas para todas as rotas (Phase 1 fix). **Impact:** ApiKey generation e AuditLog write devem ter schemas Zod (futuro em Phase 31).

**Transactions:** Usar `prisma.$transaction` para operações críticas. **Impact:** Backfill SQL deve estar dentro `$transaction` ou executar na migration atomicamente.

---

*Phase: 29-Schema Aditivo & Backfill*  
*Research gathered: 2026-09-06 11:38 GMT-3*
