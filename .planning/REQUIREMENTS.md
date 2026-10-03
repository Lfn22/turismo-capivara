# Requirements — Turismo Capivara v3.0

> **Milestone:** v3.0 — Governança & Destinos Compartilhados
> **Status:** Active
> **Created:** 2026-09-06

## Remoção SUPER_ADMIN (ADMIN)

- [ ] **ADMIN-01**: Users com role SUPER_ADMIN são migrados para ADMIN antes da remoção do enum
- [ ] **ADMIN-02**: Enum Role não contém mais SUPER_ADMIN no schema Prisma
- [ ] **ADMIN-03**: authenticate.ts não tem mais bypass de cross-tenant check para SUPER_ADMIN
- [ ] **ADMIN-04**: Todas as rotas que usavam authorize(['SUPER_ADMIN']) são removidas ou ajustadas
- [ ] **ADMIN-05**: Páginas /super-admin/* e API proxy routes correspondentes são removidas do frontend

## Governança de Tenants (GOV)

- [ ] **GOV-01**: Dono da plataforma pode aprovar tenant pendente via POST protegido por API key (x-admin-key header)
- [ ] **GOV-02**: Dono pode rejeitar tenant pendente via POST protegido por API key, com motivo
- [ ] **GOV-03**: Após aprovação, código de confirmação de 6 dígitos é enviado por email ao admin do tenant
- [ ] **GOV-04**: Admin do tenant confirma cadastro via POST /tenants/confirm-email com slug + código
- [ ] **GOV-05**: Código de confirmação expira em 15 minutos; após 5 tentativas erradas, bloqueia por 15 minutos
- [ ] **GOV-06**: Login só funciona se tenant está APPROVED E confirmado (confirmedAt preenchido)
- [ ] **GOV-07**: Dono pode suspender tenant via POST protegido por API key; login do tenant fica bloqueado
- [ ] **GOV-08**: Tenant suspenso preserva todos os dados (LGPD); status muda para SUSPENDED
- [ ] **GOV-09**: API key é armazenada como hash SHA-256; comparação usa timingSafeEqual
- [ ] **GOV-10**: API key é exibida ao dono apenas uma vez no momento da criação
- [ ] **GOV-11**: Rota de aprovação/rejeição/suspensão tem rate limit agressivo (5 req/min)

## Audit Log (AUDIT)

- [ ] **AUDIT-01**: Toda ação via API key é registrada em tabela AuditLog imutável (sem UPDATE/DELETE)
- [ ] **AUDIT-02**: AuditLog registra: actorType, action, targetType, targetId, ipAddress, metadata JSON, timestamp
- [ ] **AUDIT-03**: AuditLog não armazena PII diretamente (sem nome, email, CPF no metadata)
- [ ] **AUDIT-04**: Dono pode consultar audit log via GET protegido por API key com filtros (action, date range)

## Destinos Compartilhados (DEST)

- [x] **DEST-01**: Relação Tenant↔Destination é N:M via tabela TenantDestination (substitui FK 1:1)
- [x] **DEST-02**: Dados existentes de Tenant.destinationId são migrados para TenantDestination antes de dropar a FK
- [ ] **DEST-03**: ADMIN pode vincular sua operadora a um destino existente via POST /destinations/:id/join
- [ ] **DEST-04**: ADMIN pode desvincular sua operadora de um destino via DELETE
- [ ] **DEST-05**: Destination criada por ADMIN fica APPROVED direto (sem necessidade de aprovação externa)
- [ ] **DEST-06**: Ao criar destino, sistema detecta duplicatas por slug normalizado + similaridade de nome
- [ ] **DEST-07**: Se duplicata detectada, retorna 409 com destinos similares existentes e opção de vincular
- [ ] **DEST-08**: Somente o criador (createdById) pode editar dados do destino; outros ADMINs só vinculam
- [ ] **DEST-09**: Soft delete no vínculo (TenantDestination.status → SUSPENDED), não no destino em si
- [x] **DEST-10**: TourPackage ganha campo destinationId para associar roteiro ao destino

## Vitrine Multi-Operadora (VIT)

- [ ] **VIT-01**: Página pública de destino (/destinos/[slug]) lista roteiros de TODAS as operadoras ativas vinculadas
- [ ] **VIT-02**: Turista pode filtrar roteiros por operadora, preço e dificuldade na página do destino
- [ ] **VIT-03**: Página do destino mostra seção com operadoras ativas naquele destino (nome, logo)

## Dashboard do Dono (DASH)

- [ ] **DASH-01**: GET /admin/dashboard retorna métricas cross-tenant protegido por API key
- [ ] **DASH-02**: Métricas incluem: total tenants (por status), total bookings (por status), total guias, total destinos
- [ ] **DASH-03**: Métricas incluem: receita total (bookings confirmados), top 5 destinos por bookings
- [ ] **DASH-04**: Dashboard é estritamente read-only — nenhum POST/PATCH/DELETE disponível
- [ ] **DASH-05**: Nenhum PII individual é exposto no dashboard (sem nomes de turistas, emails, CPFs)

---

## Deferred (fora do v3.0)

- Report system: ADMIN reporta conteúdo de outro ADMIN (flag system)
- Preço predatório: alerta automático se preço < 50% da média do destino
- Optimistic locking com campo version em Destination (conflito de edição)
- Cron cleanup de tenants PENDING com código expirado
- Status TERMINATED para tenant (remoção definitiva)
- Materialized views para dashboard se queries > 2s

## Out of Scope

- Painel web para o dono (toda interação via cURL/script)
- SUPER_ADMIN como role no sistema
- Deleção de tenant ou dados via API (apenas equipe técnica via SQL)
- Aprovação de destinos por entidade externa
- Geocoding por proximidade geográfica (< 10km) — usar apenas slug + similarity de nome

## Traceability

| REQ-ID | Phase | Plan | Status |
|--------|-------|------|--------|
| ADMIN-01 | Phase 30 | — | Pending |
| ADMIN-02 | Phase 30 | — | Pending |
| ADMIN-03 | Phase 30 | — | Pending |
| ADMIN-04 | Phase 30 | — | Pending |
| ADMIN-05 | Phase 30 | — | Pending |
| GOV-01 | Phase 32 | — | Pending |
| GOV-02 | Phase 32 | — | Pending |
| GOV-03 | Phase 32 | — | Pending |
| GOV-04 | Phase 32 | — | Pending |
| GOV-05 | Phase 32 | — | Pending |
| GOV-06 | Phase 32 | — | Pending |
| GOV-07 | Phase 32 | — | Pending |
| GOV-08 | Phase 32 | — | Pending |
| GOV-09 | Phase 31 | — | Pending |
| GOV-10 | Phase 31 | — | Pending |
| GOV-11 | Phase 31 | — | Pending |
| AUDIT-01 | Phase 31 | — | Pending |
| AUDIT-02 | Phase 31 | — | Pending |
| AUDIT-03 | Phase 31 | — | Pending |
| AUDIT-04 | Phase 31 | — | Pending |
| DEST-01 | Phase 29 | 29-01 | Done |
| DEST-02 | Phase 29 | 29-01 | Done |
| DEST-03 | Phase 33 | — | Pending |
| DEST-04 | Phase 33 | — | Pending |
| DEST-05 | Phase 33 | — | Pending |
| DEST-06 | Phase 33 | — | Pending |
| DEST-07 | Phase 33 | — | Pending |
| DEST-08 | Phase 33 | — | Pending |
| DEST-09 | Phase 33 | — | Pending |
| DEST-10 | Phase 29 | 29-01 | Done |
| VIT-01 | Phase 34 | — | Pending |
| VIT-02 | Phase 34 | — | Pending |
| VIT-03 | Phase 34 | — | Pending |
| DASH-01 | Phase 35 | — | Pending |
| DASH-02 | Phase 35 | — | Pending |
| DASH-03 | Phase 35 | — | Pending |
| DASH-04 | Phase 35 | — | Pending |
| DASH-05 | Phase 35 | — | Pending |

---

## Milestone v4.0 — Marketplace Funcional

### Fundamentos — Marca + Design System (MKT)

- [x] **MKT-01**: Design tokens (cores, espaçamentos, radii) centralizados em variáveis CSS/Tailwind
- [x] **MKT-02**: Tipografia Playfair Display + Source Sans 3 sem FOUT
- [ ] **MKT-03**: Header/footer persistentes com `<CapiLogo>` animado em todas as rotas
- [x] **MKT-04**: Favicon, manifest.json e og-image configurados
- [ ] **MKT-05**: `lib/format.ts` com formatação (moeda, data, telefone) + testes unitários

### Integridade de Dados e Conteúdo (MKT)

- [ ] **MKT-06**: Valores monetários formatados via lib/format (R$ X.XXX,XX)
- [ ] **MKT-07**: Datas formatadas em pt-BR via lib/format
- [ ] **MKT-08**: Destino duplicado corrigido via migração/seed
- [ ] **MKT-09**: Contagem de roteiros correta em cards e listagens
- [ ] **MKT-10**: Nenhuma URL crua visível em cards de roteiro ou perfis
- [ ] **MKT-11**: Copy sem placeholders, lorem ipsum ou textos em inglês nas páginas públicas
- [ ] **MKT-12**: Capitalização consistente em nomes de destinos e categorias
- [ ] **MKT-13**: Auditoria manual das 8 páginas públicas sem problemas

### Home Page Moderna (MKT)

- [ ] **MKT-14**: Hero animado com logo CAPI e tagline
- [ ] **MKT-15**: 5 seções: destaques, como funciona, guias, prova social, CTA final
- [ ] **MKT-16**: Header com link de login no topo
- [ ] **MKT-17**: Lighthouse mobile performance >= 85
- [ ] **MKT-18**: Layout testado em 360px, 768px e 1440px

### Funil de Reserva (MKT)

- [ ] **MKT-19**: Página de detalhe do roteiro com informações completas
- [ ] **MKT-20**: Fluxo de reserva funcional com Booking criado no banco
- [ ] **MKT-21**: Pagamento PIX integrado ou fallback WhatsApp
- [ ] **MKT-22**: Links corretos em cards de roteiro e perfis de guia
- [ ] **MKT-23**: E2E Playwright para fluxo home→detalhe→reserva passando em CI
- [ ] **MKT-24**: Primeira reserva de teste registrada em produção

### Páginas Internas (MKT)

- [ ] **MKT-25**: Páginas de destino, roteiros e guias com layout consistente
- [ ] **MKT-26**: Vocabulário padronizado (roteiro, destino, guia)
- [ ] **MKT-27**: Navegação sem dead-ends — reserva em <= 3 cliques de qualquer página
- [ ] **MKT-28**: Breadcrumbs ou navegação contextual em páginas internas

### SEO e Compartilhamento (MKT)

- [ ] **MKT-29**: Meta title, description e og:image únicos por página pública
- [ ] **MKT-30**: Sitemap.xml gerado automaticamente
- [ ] **MKT-31**: Schema.org JSON-LD (TouristAttraction, TravelAction)
- [ ] **MKT-32**: Rich Results Test sem erros para home, destino e roteiro
- [ ] **MKT-33**: Preview correto no WhatsApp (og:title + og:image)

## Traceability v4.0

| REQ-ID | Phase | Plan | Status |
|--------|-------|------|--------|
| MKT-01 | Phase 36 | — | Pending |
| MKT-02 | Phase 36 | — | Pending |
| MKT-03 | Phase 36 | — | Pending |
| MKT-04 | Phase 36 | — | Pending |
| MKT-05 | Phase 36 | — | Pending |
| MKT-06 | Phase 37 | — | Pending |
| MKT-07 | Phase 37 | — | Pending |
| MKT-08 | Phase 37 | — | Pending |
| MKT-09 | Phase 37 | — | Pending |
| MKT-10 | Phase 37 | — | Pending |
| MKT-11 | Phase 37 | — | Pending |
| MKT-12 | Phase 37 | — | Pending |
| MKT-13 | Phase 37 | — | Pending |
| MKT-14 | Phase 38 | — | Pending |
| MKT-15 | Phase 38 | — | Pending |
| MKT-16 | Phase 38 | — | Pending |
| MKT-17 | Phase 38 | — | Pending |
| MKT-18 | Phase 38 | — | Pending |
| MKT-19 | Phase 39 | — | Pending |
| MKT-20 | Phase 39 | — | Pending |
| MKT-21 | Phase 39 | — | Pending |
| MKT-22 | Phase 39 | — | Pending |
| MKT-23 | Phase 39 | — | Pending |
| MKT-24 | Phase 39 | — | Pending |
| MKT-25 | Phase 40 | — | Pending |
| MKT-26 | Phase 40 | — | Pending |
| MKT-27 | Phase 40 | — | Pending |
| MKT-28 | Phase 40 | — | Pending |
| MKT-29 | Phase 41 | — | Pending |
| MKT-30 | Phase 41 | — | Pending |
| MKT-31 | Phase 41 | — | Pending |
| MKT-32 | Phase 41 | — | Pending |
| MKT-33 | Phase 41 | — | Pending |