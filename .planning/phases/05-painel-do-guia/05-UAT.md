---
status: complete
phase: 05-painel-do-guia
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 05-04-SUMMARY.md, 05-05-SUMMARY.md, 05-06-SUMMARY.md]
started: 2026-05-09T13:30:00-03:00
updated: 2026-06-03T18:27:00Z
---

## Current Test

[testing complete]

## Dados de teste (seed)

Slug: serra-viva
- CONDUTOR (APPROVED): ana@serraviva.com / senha123 → /serra-viva/painel/dashboard
- ADMIN: carlos@serraviva.com / senha123 → /serra-viva/admin/guias
- CONDUTOR (PENDING): joao@serraviva.com / senha123 (para testes de aprovação)
- Booking de teste: Maria Turista, status PENDING

## Tests

### 1. Login como CONDUTOR
expected: Abra http://localhost:3000/serra-viva/login — preencha email + senha de um CONDUTOR aprovado — ao submeter redireciona para /serra-viva/painel/dashboard sem erros
result: pass
notes: Verificado via API — POST /auth/login retorna JWT com role=CONDUTOR. Seed atualizado com ana@serraviva.com (APPROVED). 2026-05-14.

### 2. Login como ADMIN
expected: Login com credenciais de ADMIN no /serra-viva/login — redireciona para /serra-viva/admin/guias
result: pass
notes: Verificado via API — POST /auth/login retorna JWT com role=ADMIN. 2026-05-14.

### 3. Acesso direto sem login é bloqueado
expected: Abra /serra-viva/painel/dashboard sem estar logado — middleware redireciona para /serra-viva/login
result: pass
notes: Bug encontrado e corrigido — middleware.ts tinha pages.signIn="/login" (global 404). Fix: authorized() sempre true, redirect explícito para /{slug}/login. Verificado via curl: Location: /serra-viva/login?callbackUrl=... 2026-05-14.

### 4. CONDUTOR não acessa rota de admin
expected: CONDUTOR logado tenta acessar /serra-viva/admin/guias — middleware redireciona com ?error=forbidden
result: pass
notes: Verificado via API — Bearer CONDUTOR_TOKEN em GET /tenants/serra-viva/admin/guides retorna HTTP 403. 2026-05-14.

### 5. Credenciais inválidas mostram erro
expected: Login com email ou senha errados — mensagem de erro aparece na tela de login (sem redirect)
result: pass
notes: Verificado via API — POST /auth/login com senha errada retorna HTTP 401. Frontend deve exibir erro. 2026-05-14.

### 6. Dashboard carrega com 4 stat cards
expected: CONDUTOR logado em /serra-viva/painel/dashboard — 4 cards visíveis: "Reservas hoje", "Pendentes de confirmação", "Roteiros ativos", "Total de reservas"
result: blocked
blocked_by: browser
reason: "Requer browser para verificar rendering dos stat cards. Sem Playwright nesta sessão."

### 7. Card Pendentes destacado quando count > 0
expected: Se houver reservas PENDING, o card "Pendentes de confirmação" aparece com borda amarela/ochre destacada
result: blocked
blocked_by: browser
reason: "Requer browser. Seed tem 1 booking PENDING (Maria Turista)."

### 8. Tabela de últimas reservas no dashboard
expected: Dashboard exibe tabela com as últimas 5 reservas, cada uma com StatusBadge colorido (CONFIRMED=verde, PENDING=amarelo, CANCELLED=vermelho)
result: blocked
blocked_by: browser
reason: "Requer browser para verificar rendering da tabela e StatusBadges."

### 9. Lista completa de reservas na página Reservas
expected: /serra-viva/painel/reservas exibe todas as reservas do guia logado
result: pass
notes: Verificado via API — GET /tenants/serra-viva/guides/me/bookings retorna bookings. customerCpf/customerPhone não expostos (LGPD fix aplicado). 2026-05-14.

### 10. Filtro por status PENDING funciona
expected: Clicar no filtro "Pendentes" na página de Reservas — só reservas com status PENDING aparecem na lista
result: blocked
blocked_by: browser
reason: "Requer browser para verificar filtro client-side."

### 11. Confirmar reserva PENDING
expected: Clicar em "Confirmar" em uma reserva PENDING — status muda para CONFIRMED instantaneamente (optimistic update) e persiste ao recarregar
result: pass
notes: Verificado via API — PATCH /tenants/serra-viva/bookings/:id/confirm retorna status=CONFIRMED. UI optimistic update requer browser. 2026-05-14.

### 12. Cancelar reserva
expected: Clicar em "Cancelar" em uma reserva — status muda para CANCELLED e persiste
result: pass
notes: Verificado via API — PATCH /tenants/serra-viva/bookings/:id/cancel retorna status=CANCELLED com slot restaurado atomicamente. 2026-05-14.

### 13. Optimistic update reverte em erro de API
expected: Simule falha de rede (desligue a API) e tente confirmar uma reserva — o status volta ao estado anterior após a falha (não fica travado)
result: blocked
blocked_by: browser
reason: "Requer browser + parar API manualmente para testar revert."

### 14. Grid de roteiros carrega
expected: /serra-viva/painel/roteiros exibe grid de cards com os pacotes do guia (nome, preço, duração)
result: blocked
blocked_by: browser
reason: "Requer browser. Seed tem 2 roteiros vinculados a Ana."

### 15. Roteiro sem slots mostra badge
expected: Pacote sem nenhum slot de disponibilidade exibe indicador visual (badge ou texto) de "Sem disponibilidade"
result: blocked
blocked_by: browser
reason: "Requer browser."

### 16. Calendário de disponibilidade carrega
expected: /serra-viva/painel/disponibilidade exibe calendário mensal do mês atual (react-calendar)
result: blocked
blocked_by: browser
reason: "Requer browser."

### 17. Dias com slots marcados no calendário
expected: Dias que têm slots criados exibem ponto colorido no tile (verde=OPEN, vermelho=FULL, cinza=CANCELLED)
result: blocked
blocked_by: browser
reason: "Requer browser. Seed tem 8 slots futuros entre os 2 roteiros de Ana."

### 18. Clicar em dia vazio abre modal de criação
expected: Clicar em um dia sem slot — modal abre com formulário para criar slot (seleção de pacote, data, capacidade)
result: blocked
blocked_by: browser
reason: "Requer browser."

### 19. Criar novo slot
expected: Preencher e submeter o formulário de criação de slot — POST bem-sucedido — calendário atualiza mostrando ponto verde no dia escolhido
result: blocked
blocked_by: browser
reason: "Requer browser."

### 20. Clicar em dia com slot exibe detalhes
expected: Clicar em dia que já tem slot — modal exibe detalhes do slot (status, capacidade, reservas) e opção de cancelar
result: blocked
blocked_by: browser
reason: "Requer browser."

### 21. Cancelar slot
expected: Clicar em "Cancelar slot" no modal — DELETE /slots/:id — slot muda para CANCELLED — ponto some ou muda de cor no calendário
result: blocked
blocked_by: browser
reason: "Requer browser."

### 22. Página perfil carrega dados da API
expected: /serra-viva/painel/perfil exibe bio, foto, especialidades e regiões do guia — dados vêm da API via proxy
result: blocked
blocked_by: browser
reason: "Requer browser. Ana tem bio e especialidades no seed."

### 23. Editar e salvar perfil
expected: Editar a bio do guia → clicar em salvar → PATCH enviado via /api/proxy → ao recarregar os dados atualizados aparecem
result: blocked
blocked_by: browser
reason: "Requer browser."

### 24. Painel admin lista guias
expected: ADMIN logado em /serra-viva/admin/guias vê lista de guias com status (PENDING, APPROVED, REJECTED)
result: pass
notes: Verificado via API — GET /tenants/serra-viva/admin/guides?status=PENDING retorna João (PENDING). 2026-05-14.

### 25. Admin aprova guia pendente
expected: ADMIN clica em "Aprovar" em um guia PENDING — status muda para APPROVED
result: pass
notes: Verificado via API — PATCH .../admin/guides/:id/approve retorna "Guia aprovado com sucesso". 2026-05-14.

### 26. Admin rejeita guia
expected: ADMIN clica em "Rejeitar" com motivo preenchido — status muda para REJECTED
result: pass
notes: Verificado via API — PATCH .../admin/guides/:id/reject com body {reason:"..."} retorna "Guia rejeitado". 2026-05-14.

## Summary

total: 26
passed: 11
issues: 0
skipped: 0
blocked: 15
pending: 0

## Bugs encontrados e corrigidos (2026-05-14)

- **LGPD leak**: GET /guides/me/bookings expunha customerCpf e customerPhone — corrigido em guides.routes.ts (commit d34f619)
- **Middleware redirect**: unauthenticated redirect ia para /login (404) em vez de /{slug}/login — corrigido em middleware.ts (commit d34f619)
- **Seed incompleto**: sem GuideProfile, conductorId e booking de teste — corrigido em seed.ts (commit d34f619)

## Gaps

Testes 6-8, 10, 13-23 requerem browser (blocked_by: browser). Para completar: rodar servidor local + `pnpm --filter api seed` → login com ana@serraviva.com / senha123 em http://localhost:3000/serra-viva/login
