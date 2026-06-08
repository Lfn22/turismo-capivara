# Phase 14: Gestão de Conteúdo — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-08
**Phase:** 14-gestao-de-conteudo
**Areas discussed:** Armazenamento de fotos, Fluxo de aprovação de admin, Formulário de criação de destino, Enriquecimento de roteiro

---

## Armazenamento de Fotos

| Option | Description | Selected |
|--------|-------------|----------|
| Upload para S3/Cloudflare R2 | Arquivo vai para bucket. Persistente, barato, CDN | ✓ |
| URL externa (guia cola link) | Zero infra nova. Links podem expirar. Má UX | |
| Local disk (Railway volume) | Não recomendado — efêmero, perda em redeploy | |

**Serviço S3:**

| Option | Description | Selected |
|--------|-------------|----------|
| Cloudflare R2 | Zero egress fees, CDN, API S3-compatível | ✓ |
| AWS S3 | Clássico, mais caro em egress | |

**Limite de fotos:**

| Option | Description | Selected |
|--------|-------------|----------|
| Até 5 fotos | Simples, suficiente para MVP | ✓ |
| Até 10 fotos | Mais visual, dobra custo de storage | |
| Sem limite | Requer guardrails futuros | |

**User's choice:** Cloudflare R2, upload direto, limite de 5 fotos por destino/roteiro.

---

## Fluxo de Aprovação de Admin

**Onde admin aprova:**

| Option | Description | Selected |
|--------|-------------|----------|
| Super-admin panel (/super-admin) | Nova seção /super-admin/destinos, centralizado | ✓ |
| Painel do tenant (admin local) | ADMIN da operadora aprova. Mais complexo | |

**Schema de aprovação:**

| Option | Description | Selected |
|--------|-------------|----------|
| Adicionar `approvalStatus` enum | PENDING/APPROVED/REJECTED. Rastreável | ✓ |
| Usar `active: Boolean` simples | Sem rastrear REJECTED ou pendentes | |

**Notificação ao guia:**

| Option | Description | Selected |
|--------|-------------|----------|
| Toast/status no painel sem email | Guia vê badge de status. Simples | ✓ |
| Email via Resend | Admin rejeita com razão, guia recebe email | |

**User's choice:** Super-admin panel, approvalStatus enum, status visível no painel sem email.

---

## Formulário de Criação de Destino

**Campo de região:**

| Option | Description | Selected |
|--------|-------------|----------|
| Select de estados brasileiros | 26 estados + DF, mapeia para `state: String` | ✓ |
| Tag livre (texto) | Flexível, difícil de filtrar | |
| Duas tags: estado + sub-região | Mais rico, novo campo no schema | |

**UX do formulário:**

| Option | Description | Selected |
|--------|-------------|----------|
| Tudo em uma página | Form único, padrão do painel | ✓ |
| Wizard em 2 etapas | Mais guiado, mais complexo | |

**Visibilidade na lista:**

| Option | Description | Selected |
|--------|-------------|----------|
| Apenas os que criou | Filtrado por `createdById` | |
| Todos do tenant | Colaborativo; edit/delete apenas os próprios | ✓ |

**Cards na lista:**

| Option | Description | Selected |
|--------|-------------|----------|
| Título + estado + status | Simples, fácil de scanear | |
| Thumb + título + status | Mais visual, thumbnail do R2 | ✓ |

**User's choice:** Estados BR, form único, todos do tenant, cards com thumb + status.

---

## Enriquecimento de Roteiro

**Acesso ao enriquecimento:**

| Option | Description | Selected |
|--------|-------------|----------|
| Dentro da página do roteiro | Seções: galeria + experiências na mesma página | ✓ |
| Aba separada no painel | Mais navegação, má UX mobile | |

**Formato de experiências:**

| Option | Description | Selected |
|--------|-------------|----------|
| Lista de bullets simples | String[], texto livre, um por linha | ✓ |
| Form estruturado por experiência | Nome, duração, inclusões. Sub-model complexo | |

**Aprovação para roteiro:**

| Option | Description | Selected |
|--------|-------------|----------|
| Não — publica direto | ROT-03 não menciona aprovação | ✓ |
| Sim — segue fluxo do destino | Mais controle, mais atrito | |

**User's choice:** Dentro da página do roteiro, bullets simples, publica direto sem aprovação.

---

## Claude's Discretion

- Estratégia de slugify para destinos (título → slug único)
- Tamanho máximo de arquivo (sugestão: 5MB)
- Formatos de imagem aceitos (sugestão: JPEG, PNG, WebP)
- Ordem de exibição das fotos (ordem de upload)
- Lazy loading de thumbnails no painel

## Deferred Ideas

- Email de notificação de aprovação/rejeição — defer para v2
- Motivo de rejeição enviado ao guia
- Drag & drop para reordenar fotos
- Múltiplas regiões/tags por destino
