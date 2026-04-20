---
status: complete
phase: 01-security-hardening
source: [01-VERIFICATION.md]
started: 2026-04-20T00:00:00Z
updated: 2026-04-20T21:36:00Z
---

## Current Test

[testing complete]

## Tests

### 1. CORS rejeita origens não autorizadas
expected: `curl -H "Origin: https://outro-dominio.com" http://localhost:3333/health` deve retornar Access-Control-Allow-Origin ausente ou rejeitado; header apenas presente para CORS_ORIGIN configurado
result: pass
notes: Header presente com valor fixo `http://localhost:3000` — browsers rejeitam quando origin da requisição não bate com o valor configurado. Comportamento correto do @fastify/cors com origin string.

### 2. Headers Helmet em produção
expected: `curl -I http://localhost:3333/health` deve mostrar X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security nos headers de resposta
result: pass
notes: Todos os headers presentes — Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, entre outros.

### 3. GET /tenants/:slug/users/me/export retorna dados reais sem vazar password
expected: Com banco populado e JWT válido, resposta inclui `{ user: { id, name, email, role, createdAt }, bookings: [...] }` e campo `password` ausente
result: pass
notes: Resposta retornou `{ user: { id, name, email, role, createdAt }, bookings: [] }` — campo `password` ausente conforme esperado.

### 4. DELETE /tenants/:slug/users/me anonimiza e preserva bookings
expected: Após DELETE, User.name = 'Usuário Removido', User.email = SHA-256(email+salt), registros de Booking preservados com customerEmail original
result: pass
notes: HTTP 204. User.name = 'Usuário Removido', User.email = SHA-256('uat-delete@test.com' + salt) confirmado. Email hash validado programaticamente.

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
