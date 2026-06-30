# CAPI — Especificação Canônica do MVP

**Versão:** 2.0
**Data:** 2026-06-30
**Substitui:** `.planning/REQ-REVIEW.md` · `.planning/REQUIREMENTS.md` · `.planning/milestones/v2.0-REQUIREMENTS.md`
**Stack:** Fastify 5 + Prisma 7 + PostgreSQL · Next.js 16.2 + React 19 · Railway · pnpm + Turborepo

---

## Produto

Marketplace de guias de turismo: turista encontra, compara e reserva passeios com pagamento PIX integrado. Guia publica roteiros, gerencia agenda e recebe reservas — sem WhatsApp, sem dinheiro em espécie.

**Atores:**

| Ator | Roles | Responsabilidade |
|------|-------|-----------------|
| Guia (Tenant) | ADMIN, ATENDENTE, CONDUTOR | Cria conta, publica roteiros, gerencia agenda, aprova/recusa reservas |
| Turista | CLIENTE | Navega, reserva e paga via PIX |
| SuperAdmin | — | Aprova/rejeita operadoras; gerencia plataforma |

## Legenda

| Status | Significado |
|--------|------------|
| ✅ | Implementado |
| ⚠️ | Parcial — existe fase planejada, não executada |
| ❌ | Pendente — sem fase; precisa ser criada |
| 🔜 | Pós-MVP — fora do v2.0 por decisão de escopo |

---

## 1. RF — Requisitos Funcionais

### RF-01 — Cadastro e Perfil do Guia

| ID | Requisito | Status | Observação |
|----|-----------|--------|------------|
| RF-01.1 | Guia cria perfil com destino, roteiros, foto e descrição | ✅ | Phase 14 — upload R2, lista de experiências, dados do tenant |
| RF-01.2 | Editor de roteiro com imagens e lista de experiências | ✅ | Upload via R2/Cloudflare |
| RF-01.3 | Campo de itinerário sequencial (passo a passo) no modelo de roteiro | ❌ | Modelo `Package` tem descrição livre; campo estruturado dia-a-dia ausente do schema |
| RF-01.4 | Turista visualiza e seleciona roteiros no marketplace | ✅ | Listagem pública com filtro APPROVED |

### RF-02 — Agenda e Disponibilidade

| ID | Requisito | Status | Observação |
|----|-----------|--------|------------|
| RF-02.1 | Guia cria, edita e remove slots de data/hora no painel | ✅ | Modelo `DepartureSlot` — v1.0 |
| RF-02.2 | Sistema rejeita criação de slot com data no passado | ✅ | DATA-04 — validação backend + feedback frontend |
| RF-02.3 | Prevenção de overbooking com lock pessimista no slot | ⚠️ | Phase 16 PAY-01 — `FOR UPDATE` durante criação de booking |

### RF-03 — Fluxo de Reserva

| ID | Requisito | Status | Observação |
|----|-----------|--------|------------|
| RF-03.1 | Turista seleciona destino e vê guias disponíveis | ✅ | Marketplace v1.0 |
| RF-03.2 | Turista escolhe guia, roteiro e data; envia reserva | ✅ | Fluxo de booking v1.0 |
| RF-03.3 | Sistema bloqueia reserva para tenant não-APPROVED | ✅ | Phase 20 — guard client-side + API `/api/tenants/[slug]/status` |
| RF-03.4 | Guia recebe email de nova reserva e aprova/recusa via painel | ✅ | Email via Resend + ações no painel |
| RF-03.5 | Aprovação gera QR code PIX via Mercado Pago | ✅ | Integração MP ativa |
| RF-03.6 | Criação de booking + chamada MP em `prisma.$transaction` atômica | ⚠️ | Phase 16 PAY-01/02 — falha no MP pode criar booking órfão hoje |
| RF-03.7 | Cancelamento de reserva libera `bookedCount` do slot atomicamente | ⚠️ | Phase 16 DATA-01 — deve ocorrer em `$transaction` |
| RF-03.8 | Booking PENDING expirado marcado como EXPIRED pelo job (horário) | ⚠️ | Phase 19 OPS-01 — cron atual `* * * * *` (deve ser `0 * * * *`) |
| RF-03.9 | Webhook Mercado Pago confirma pagamento com idempotência | ✅ | Phase 17 SEC-04 — deduplicação por `idempotencyKey` implementada |
| RF-03.10 | Email confirmatório enviado a turista e guia após pagamento PIX | ✅ | NOTIF-01–04 via Resend — confirmação, aprovação, cancelamento, expiração |

### RF-04 — Pós-Reserva

| ID | Requisito | Status | Observação |
|----|-----------|--------|------------|
| RF-04.1 | Turista acessa link "/minha-reserva" com status atualizado da reserva | ⚠️ | Phase 18 UX-03 — link planejado, não implementado |
| RF-04.2 | Email de lembrete ao guia próximo à data do passeio | ❌ | Sem fase planejada — job de reminder não existe |

### RF-05 — Feedback Pós-Viagem

| ID | Requisito | Status | Observação |
|----|-----------|--------|------------|
| RF-05.1 | Sistema de avaliações com estrelas e comentários | 🔜 | Sem dados reais para calibrar — implementar após PMF |

---

## 2. SEC — Segurança e Acesso

| ID | Requisito | Status | Observação |
|----|-----------|--------|------------|
| SEC-01 | RBAC com roles ADMIN, ATENDENTE, CONDUTOR, CLIENTE | ✅ | Middleware em todos os endpoints privados |
| SEC-02 | JWT com expiração configurada (`expiresIn: '7d'`) | ⚠️ | Phase 21 INFRA-03 — JWT sem expiresIn hoje |
| SEC-03 | Todo tráfego via HTTPS (TLS Railway) | ✅ | TLS obrigatório no Railway |
| SEC-04 | Isolamento de dados por `tenantId` em todos os handlers | ✅ | Phase 17 SEC-03 — handlers verificam pertencimento antes de agir |
| SEC-05 | CORS configurável via `CORS_ORIGIN` (não hardcoded) | ✅ | Phase 1 |
| SEC-06 | Validação de input com Zod em todas as rotas | ✅ | Phase 1 |
| SEC-07 | Helmet registrado no servidor Fastify | ✅ | Phase 1 |
| SEC-08 | Webhook MP valida assinatura + idempotency key | ✅ | Phase 17 |
| SEC-09 | `bookingId` validado como UUID antes de `router.push` | ❌ | Tourist Flow CR-01 — open redirect via bookingId não validado |
| SEC-10 | Campo `pax` tem limite máximo igual à capacidade do slot no backend | ❌ | Tourist Flow WR-02 — sem bound máximo; bypass de capacidade possível |
| SEC-11 | URL de foto do guia validada antes de renderizar em `<img src>` | ❌ | Tourist Flow WR-04 — URL externa sem validação; risco de XSS/SSRF |
| SEC-12 | `MP_ACCESS_TOKEN` validado no startup da API | ⚠️ | Phase 21 INFRA-02 — token ausente causa uso silencioso de mock em produção |

---

## 3. LGPD — Proteção de Dados

| ID | Requisito | Status | Observação |
|----|-----------|--------|------------|
| LGPD-01 | Checkbox de aceite com link para política de privacidade no cadastro | ❌ | LGPD Art. 7 — ausente; risco legal antes de qualquer usuário real |
| LGPD-02 | Registro de consentimento no banco (timestamp, IP, texto aceito) | ❌ | Complemento obrigatório do LGPD-01 |
| LGPD-03 | Endpoint de exclusão de dados a pedido do usuário | ❌ | LGPD Art. 18 (direito ao esquecimento) — sem implementação |
| LGPD-04 | CPF armazenado como HMAC-SHA256 com `ANONYMIZATION_SALT` | ✅ | v1.1 — único campo de PII protegido |
| LGPD-05 | `ANONYMIZATION_SALT` ≥ 32 chars validado no startup | ⚠️ | Phase 21 INFRA-02 — validação de env vars incompleta |
| LGPD-06 | Nome, email e telefone: avaliar necessidade de proteção adicional | ❌ | Campos em plaintext; auditoria formal de minimização não realizada |

---

## 4. INFRA — Infraestrutura e Operações

| ID | Requisito | Status | Observação |
|----|-----------|--------|------------|
| INFRA-01 | Endpoint `/health` com probe `SELECT 1` para Railway | ⚠️ | Phase 21 INFRA-04 — health check sem teste de banco hoje |
| INFRA-02 | Env vars críticas validadas no startup (R2, Resend, MP, JWT, Salt) | ⚠️ | Phase 21 INFRA-02 — R2_BUCKET_NAME, RESEND_API_KEY, MP_ACCESS_TOKEN não validados |
| INFRA-03 | `ioredis` removido do `package.json` (sem cache no MVP) | ⚠️ | Phase 21 INFRA-01 — dependência ociosa |
| INFRA-04 | Correlation ID (`X-Request-ID`) propagado em toda requisição | ⚠️ | Phase 21 INFRA-06 |
| INFRA-05 | Logs JSON com `reqId`, nível, serviço e timestamp em toda rota | ⚠️ | Phase 21 INFRA-06 — Fastify gera JSON; campos completos a configurar |
| INFRA-06 | Erros incluem stack trace + contexto via Sentry (input, transação ID) | ⚠️ | Sentry ativo desde v1.1; contexto padronizado a adicionar |
| INFRA-07 | Query logging com tempo de execução (`prisma log: ['query']`) | ⚠️ | Inserir na Phase 21 — custo zero, visibilidade imediata |
| INFRA-08 | Testes E2E dos 3 fluxos críticos integrados ao CI/CD | ⚠️ | Phase 23 QA-01 — Playwright; bloqueia deploy se falha |
| INFRA-09 | Segredos em variáveis de ambiente protegidas do Railway | ✅ | Railway env vars com acesso controlado |

---

## 5. ARQ — Arquitetura e Integrações

| ID | Requisito | Status | Observação |
|----|-----------|--------|------------|
| ARQ-01 | API monolítica modular (Fastify) com módulos independentes | ✅ | `modules/` auth, bookings, packages, tenants, destinations |
| ARQ-02 | PostgreSQL + Prisma 7; `tenantId` em todas as entidades | ✅ | Schema único com discriminação por coluna |
| ARQ-03 | Queries sempre filtradas pelo tenant do usuário autenticado | ✅ | Phase 17 SEC-03 |
| ARQ-04 | Endpoints críticos com idempotência (bookings, webhooks) | ⚠️ | Bookings e webhook OK; login e aprovação sem verificação formal |
| ARQ-05 | PIX gerado via Mercado Pago após aprovação | ✅ | Integração MP ativa |
| ARQ-06 | Booking + PIX em `$transaction` atômica (falha MP → zero persistência) | ⚠️ | Phase 16 — hoje não atômico |
| ARQ-07 | Email transacional em todo o ciclo de reserva (Resend) | ✅ | Confirmação, aprovação, cancelamento, expiração |
| ARQ-08 | Email com retry e backoff exponencial (3 tentativas: 500ms/1s/2s) | ⚠️ | Phase 22 EMAIL-01 — hoje fire-and-forget; falha silenciosa |
| ARQ-09 | Registro de transações financeiras com valor, comissão e timestamp MP | ⚠️ | Bookings existem; campos de auditoria financeira não formalizados |

---

## 6. UX — Frontend e Experiência

| ID | Requisito | Status | Observação |
|----|-----------|--------|------------|
| UX-01 | Design mobile-first com `100dvh`, `clamp()`, touch targets 44px | ✅ | Phase 11–13 — tokens CSS implementados |
| UX-02 | Painel do guia com SidebarNav (Reservas, Locais, Roteiros, Config) | ✅ | Phase 11–14 |
| UX-03 | Homepage com 6 destinos APPROVED ordenados por data de criação | ✅ | Phase 20 |
| UX-04 | Mensagem clara ao turista ao tentar reservar operadora não-APPROVED | ✅ | Phase 20 |
| UX-05 | Login/cadastro com validação inline de erros | ✅ | Phase 12 |
| UX-06 | Perfil do guia com foto (R2) e descrição editáveis | ✅ | Phase 14 |
| UX-07 | Paginação funcional nas listas do super-admin ("Carregar mais") | ✅ | Phase 20 |
| UX-08 | QR code PIX renderizado visualmente (SVG) na tela de confirmação | ⚠️ | Phase 18 UX-02 — hoje apenas código alfanumérico |
| UX-09 | Countdown regressivo do PIX em MM:SS na tela de confirmação | ⚠️ | Phase 18 UX-01 |
| UX-10 | Link "/minha-reserva" exibido após confirmação com `bookingId` | ⚠️ | Phase 18 UX-03 |
| UX-11 | BookingForm protegido contra double-submit (botão desabilitado + `aria-busy`) | ⚠️ | Phase 18 UX-04 |
| UX-12 | CPF não exibido em texto plano após envio (campo limpo ou mascarado) | ⚠️ | Phase 18 UX-05 |
| UX-13 | `setLoading(false)` chamado em todos os paths, incluindo sucesso | ❌ | Tourist Flow WR-03 — loading trava na tela após submit bem-sucedido |
| UX-14 | Painel do guia responsivo no mobile | ⚠️ | Phase 13 MOB |
| UX-15 | Toaster global centralizado no super-admin (sem toasts inline) | ⚠️ | Phase 19 OPS-04 |
| UX-16 | Motivo de rejeição de destino visível ao guia no painel | ⚠️ | Phase 19 OPS-05 — badge com data e motivo no `PainelDestinationCard` |

---

## Resumo de Status

| Categoria | ✅ | ⚠️ | ❌ | 🔜 | Total |
|-----------|----|----|----|----|-------|
| RF — Funcionais | 12 | 5 | 2 | 1 | 20 |
| SEC — Segurança | 7 | 2 | 3 | 0 | 12 |
| LGPD — Dados | 1 | 1 | 4 | 0 | 6 |
| INFRA — Operações | 1 | 8 | 0 | 0 | 9 |
| ARQ — Arquitetura | 5 | 4 | 0 | 0 | 9 |
| UX — Frontend | 7 | 8 | 1 | 0 | 16 |
| **Total** | **33** | **28** | **10** | **1** | **72** |

> **Para entrar em produção com usuários reais:**
> - 10 itens ❌: precisam de fase nova — LGPD-01/02/03/06, SEC-09/10/11, RF-01.3, RF-04.2, UX-13
> - 28 itens ⚠️: têm fase planejada — executar Phases 13, 16, 18, 19, 21, 22, 23
> - **Bloqueadores críticos sem fase:** LGPD-01/02/03 (risco legal Art. 7 e 18) e SEC-09/10/11 (segurança do fluxo turista)

---

## Fora de Escopo — v2.0

| Item | Justificativa |
|------|---------------|
| Integração com cartão de crédito | Pós-PMF — PIX suficiente no volume inicial |
| Sistema de avaliações (RF-05) | Sem dados reais para calibrar modelo de reputação |
| WhatsApp Business API | Volume inicial não justifica complexidade de integração |
| Cache Redis/Memcached | Volume atual não exige; `ioredis` sendo removido |
| Retenção automática de comissão | Repasse manual aceitável no início |
| Multi-guia por roteiro | Validar demanda antes de aumentar complexidade |
| Verificação de email no signup | Adicionar após validar volume de cadastros falsos |
| Documentação Swagger/OpenAPI | Código legível; onboarding não é gargalo atual |

---

## Backlog — Próximas Versões

### P1 — Bloqueador de receita ou risco legal

*O produto não deve receber usuários reais sem resolver esses itens.*

| # | Item | Fase Sugerida | Esforço | IDs |
|---|------|---------------|---------|-----|
| 1 | Checkbox de aceite + link para política de privacidade no onboarding | Nova fase — LGPD Compliance | M | LGPD-01, LGPD-02 |
| 2 | Endpoint de exclusão de dados a pedido (direito ao esquecimento) | Nova fase — LGPD Compliance | M | LGPD-03 |
| 3 | Validar `bookingId` como UUID antes de `router.push` | Inserir na Phase 18 | S | SEC-09 |
| 4 | Campo `pax` com limite máximo igual à capacidade do slot no backend | Inserir na Phase 16 | S | SEC-10 |
| 5 | URL de foto do guia validada antes de renderizar (allowlist de domínios) | Inserir na Phase 21 | S | SEC-11 |
| 6 | Booking + PIX em `$transaction` atômica | Phase 16 | M | ARQ-06, RF-03.6 |
| 7 | Email com retry e backoff exponencial (`sendEmailWithRetry`) | Phase 22 | S | ARQ-08 |

### P2 — Qualidade de produto

*Impacto direto na experiência do usuário — entram no v2.0 se houver tempo.*

| # | Item | Fase Sugerida | Esforço | IDs |
|---|------|---------------|---------|-----|
| 8 | QR code PIX visual (SVG via `react-qr-code`) | Phase 18 | S | UX-08 |
| 9 | Countdown PIX MM:SS com mensagem de expiração ao zerar | Phase 18 | S | UX-09 |
| 10 | Double-submit protection no BookingForm | Phase 18 | S | UX-11 |
| 11 | CPF mascarado/limpo após envio do formulário | Phase 18 | S | UX-12 |
| 12 | `setLoading(false)` corrigido no path de sucesso do BookingForm | Inserir na Phase 18 | XS | UX-13 |
| 13 | Job de expiração ajustado para `0 * * * *` (horário, não por minuto) | Phase 19 | S | RF-03.8 |
| 14 | Upload de foto retorna 503 descritivo quando variáveis R2 estão ausentes | Phase 19 | S | — |
| 15 | Falha de email capturada com `await` e logada no Sentry | Phase 19 | S | — |
| 16 | Painel mobile responsivo com melhorias de layout | Phase 13 | M | UX-14 |
| 17 | Toaster global no super-admin (remover toasts inline) | Phase 19 | S | UX-15 |
| 18 | Motivo de rejeição de destino visível ao guia | Phase 19 | S | UX-16 |
| 19 | Testes E2E dos 3 fluxos críticos no CI/CD (Playwright) | Phase 23 | M | INFRA-08 |
| 20 | Email de lembrete ao guia próximo à data do passeio | Nova fase | M | RF-04.2 |

### P3 — Maturidade técnica

*Sem urgência operacional — entram após v2.0 estabilizado.*

| # | Item | Fase Sugerida | Esforço | IDs |
|---|------|---------------|---------|-----|
| 21 | Health check `/health` com `SELECT 1` (probe de banco) | Phase 21 | XS | INFRA-01 |
| 22 | Validação completa de env vars no startup (R2, Resend, MP, Salt) | Phase 21 | S | INFRA-02, SEC-12 |
| 23 | Remover `ioredis` do `package.json` | Phase 21 | XS | INFRA-03 |
| 24 | JWT configurado com `expiresIn: '7d'` | Phase 21 | XS | SEC-02 |
| 25 | Correlation ID (`X-Request-ID`) + logs JSON completos por rota | Phase 21 | S | INFRA-04, INFRA-05 |
| 26 | Query logging com tempo de execução (`prisma log: ['query']`) | Phase 21 | XS | INFRA-07 |
| 27 | Auditoria de minimização de PII (avaliar nome/email/telefone) | Nova fase — LGPD | M | LGPD-06 |
| 28 | Audit log de acesso a dados pessoais | Nova fase — LGPD | M | — |
| 29 | Campos `duration`, `difficulty`, `ageGroup` no modelo `Package` | Backlog | M | RF-01.3 (dep.) |
| 30 | Filtros de roteiro no marketplace (depende do item 29) | Backlog | M | — |

### Pós-MVP (v3.0+)

| Item | Justificativa |
|------|---------------|
| Sistema de avaliações + reputação do guia | Implementar após PMF com dados reais |
| WhatsApp Business API + opt-in LGPD | Volume inicial não justifica |
| Retenção automática de comissão | Repasse manual suficiente no início |
| Cache Redis/Memcached | Avaliar com métricas de produção |
| Push notifications web | Email suficiente no volume inicial |
| Mapa interativo na página de roteiro | Não é bloqueador de conversão |
| OpenTelemetry/Jaeger (tracing distribuído) | Sentry + Railway logs suficientes para MVP |
| Prometheus/Grafana (métricas de performance) | Avaliar após crescimento de tráfego |
| Blue/green deployment / rollback automático | Railway não suporta nativamente; reinicialização manual é aceitável |
| Cofre de segredos com rotação periódica | Railway env vars suficientes para MVP |
