# Requirements — Turismo Capivara v1.3

**Milestone:** v1.3 MVP Stability & Payment Integrity
**Source:** Auditoria de produto end-to-end realizada em 2026-06-17
**Scope:** Correções críticas, segurança, UX de checkout, confiabilidade operacional e polimento final

---

## Active Requirements

### PAY — Integridade de Pagamento

- [ ] **PAY-01:** Sistema valida presença de `MP_ACCESS_TOKEN` no startup e retorna 503 ao turista se ausente em produção (nunca usa mock silenciosamente)
- [ ] **PAY-02:** Sistema cria o pagamento PIX antes de persistir o booking — se a chamada ao Mercado Pago falhar, nenhum booking é criado no banco
- [ ] **PAY-03:** Turista vê o status da reserva atualizar automaticamente na página de confirmação (polling a cada 5s) sem precisar recarregar a página
- [ ] **PAY-04:** Sistema rejeita CPF com dígitos verificadores inválidos antes de criar o booking ou chamar o gateway de pagamento

### SEC — Segurança Multi-tenant

- [ ] **SEC-01:** Endpoint `cancel-self` aplica rate limit de no máximo 3 tentativas por 15 minutos por IP
- [ ] **SEC-02:** Endpoint `cancel-self` usa token opaco e independente do `bookingId` para identificar reservas (não derivado do UUID)
- [ ] **SEC-03:** Handlers de confirmação e cancelamento de booking verificam que o booking pertence ao tenant do usuário logado antes de executar a ação
- [ ] **SEC-04:** Sistema persiste ID de cada evento de webhook processado e ignora reenvios duplicados dentro da mesma janela de tempo

### DATA — Integridade de Dados

- [ ] **DATA-01:** Cancelamento de reserva libera a capacidade do slot (decrementando `bookedCount`) em transação atômica junto com a mudança de status
- [ ] **DATA-02:** Sistema bloqueia criação de booking para tenant com `approvalStatus !== APPROVED` e retorna mensagem clara ao turista
- [ ] **DATA-03:** Sistema usa lock pessimista no slot durante criação de booking para prevenir overbooking em requisições simultâneas
- [ ] **DATA-04:** Sistema rejeita criação de slot com data no passado, com validação no backend e feedback no frontend

### UX — Checkout e Confirmação

- [ ] **UX-01:** Página de confirmação exibe countdown em tempo real do prazo de expiração do PIX (baseado em `expiresAt`)
- [ ] **UX-02:** Página de confirmação exibe QR Code visual gerado a partir do código copia-e-cola (componente `react-qr-code` já disponível no projeto)
- [ ] **UX-03:** Página de confirmação exibe link direto para a página "Consultar minha reserva" (`/minha-reserva`)
- [ ] **UX-04:** Formulário de booking desabilita o botão de submit imediatamente após o primeiro clique e exibe spinner de loading durante o processamento
- [ ] **UX-05:** Página de confirmação não exibe CPF completo, telefone ou outros dados PII sem autenticação do usuário

### OPS — Confiabilidade Operacional

- [ ] **OPS-01:** Job periódico (a cada hora) marca bookings `PENDING` com `expiresAt` anterior ao momento atual como `EXPIRED` e libera capacidade no slot associado
- [ ] **OPS-02:** Sistema valida presença das variáveis Cloudflare R2 no startup e retorna erro 503 descritivo ao tentar fazer upload se ausentes
- [ ] **OPS-03:** Falhas no envio de e-mail são capturadas com `await`, logadas no Sentry e não falham silenciosamente (sem `void sendEmail()`)
- [ ] **OPS-04:** Toast notifications são gerenciadas por um provider global reutilizável — sem reimplementação de estado inline por componente
- [ ] **OPS-05:** Painel do guia exibe badge de status (PENDENTE / APROVADO / REJEITADO) para cada destino criado, com data de submissão e motivo de rejeição se houver

### POL — Polimento e Dados Públicos

- [ ] **POL-01:** Home pública exibe mais de 3 destinos com ordenação por relevância e link "Ver todos" apontando para `/destinos`
- [ ] **POL-02:** Listagem pública de destinos filtra apenas registros com `approvalStatus = APPROVED` — destinos PENDING nunca visíveis ao turista
- [ ] **POL-03:** Sistema exibe mensagem de erro amigável ao turista ao tentar reservar roteiro de operadora não aprovada
- [ ] **POL-04:** Item de navegação "Destino" (singular — editor do tenant) recebe nomenclatura diferenciada para não confundir com "Destinos" (plural — CRUD Phase 14)
- [ ] **POL-05:** Listas de aprovação no super-admin têm paginação funcional (botão "Carregar mais" ou paginação numerada — não limitadas a 50 registros hardcoded)

---

## Future Requirements

*Deferred — revisitar no v1.4:*

- Aprovação individual de CONDUTOR (guia) pelo superadmin — endpoint existe no backend, UI não implementada
- Multi-guia por roteiro (competição de preço) — pendente desde v1.0
- Comparação de guias lado a lado
- Verificação de e-mail no signup (ONBOARD-04)
- Queue de e-mail com retry via BullMQ/Redis — pós-MVP

---

## Out of Scope

- Novas features de produto — este milestone é exclusivamente de correção e estabilização
- Refactor de arquitetura do monorepo
- Integração com cartão de crédito — pós-MVP confirmado
- Sistema de avaliações — pós-MVP confirmado
- White-label / multi-tenant marketplace — pós-MVP confirmado

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| PAY-01, PAY-02, PAY-03, PAY-04, DATA-03 | Phase 16 | ⏳ Pending |
| SEC-01, SEC-02, SEC-03, SEC-04, DATA-01, DATA-02, DATA-04 | Phase 17 | ⏳ Pending |
| UX-01, UX-02, UX-03, UX-04, UX-05 | Phase 18 | ⏳ Pending |
| OPS-01, OPS-02, OPS-03, OPS-04, OPS-05 | Phase 19 | ⏳ Pending |
| POL-01, POL-02, POL-03, POL-04, POL-05 | Phase 20 | ⏳ Pending |
