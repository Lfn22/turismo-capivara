# Área do Turista — Sub-projeto 1

> Cadastro, login, dashboard `/minha-conta/` com viagens, favoritos, avaliações e perfil.
> Chat real-time (Sub-projeto 2) será especificado separadamente.

## Decisões de Design

| Decisão         | Escolha                                         | Motivo                                                     |
| --------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| Auth            | Email/senha (existente)                         | API já tem register CLIENTE + NextAuth CredentialsProvider |
| Layout          | Mobile-first, bottom nav → sidebar desktop      | Turista acessa mais pelo celular                           |
| Rota            | `/minha-conta/` global (independente de tenant) | Turista pode ter reservas em múltiplos operadores          |
| Abordagem       | Dashboard próprio, desacoplado do painel guia   | Sem risco de quebrar painel existente                      |
| Funcionalidades | Viagens + Favoritos + Avaliações + Perfil       | Escopo completo do MVP turista                             |

## Estrutura de Rotas

### Web (`apps/web/app/(turista)/minha-conta/`)

```
/cadastro                  → registro de turista (nome, email, senha)
/login                     → login global (já existe parcialmente em /:slug/login)

/minha-conta/              → redirect para /minha-conta/viagens
/minha-conta/viagens       → lista de reservas (próximas + passadas)
/minha-conta/viagens/[id]  → detalhe da reserva (voucher, QR, guia, mapa)
/minha-conta/favoritos     → roteiros e destinos salvos
/minha-conta/avaliacoes    → avaliações pendentes + feitas
/minha-conta/perfil        → editar nome, foto, telefone, email, senha
```

### API (`apps/api/src/modules/me/`)

Todos os endpoints são autenticados e restritos ao role `CLIENTE`. Usam `request.user.id` para escopo — sem dependência de tenant na URL.

| Método   | Rota                | Descrição                                                 | Response                                    |
| -------- | ------------------- | --------------------------------------------------------- | ------------------------------------------- |
| `GET`    | `/me/bookings`      | Reservas do usuário (cross-tenant, cursor pagination)     | `{ data: Booking[], hasMore, nextCursor }`  |
| `GET`    | `/me/bookings/:id`  | Detalhe completo da reserva                               | `Booking` com slot, package, guide, voucher |
| `POST`   | `/me/reviews`       | Criar avaliação (booking COMPLETED, sem review existente) | `Review`                                    |
| `GET`    | `/me/reviews`       | Avaliações feitas pelo turista                            | `{ data: Review[], hasMore, nextCursor }`   |
| `GET`    | `/me/favorites`     | Favoritos do turista                                      | `{ data: Favorite[], hasMore, nextCursor }` |
| `POST`   | `/me/favorites`     | Adicionar favorito (packageId ou destinationId)           | `Favorite`                                  |
| `DELETE` | `/me/favorites/:id` | Remover favorito                                          | `204`                                       |
| `GET`    | `/me/profile`       | Dados do perfil                                           | `Profile`                                   |
| `PATCH`  | `/me/profile`       | Atualizar nome, foto, telefone                            | `Profile`                                   |

## Schema Prisma

### Novo model: `Favorite`

```prisma
model Favorite {
  id            String       @id @default(cuid())
  userId        String
  packageId     String?
  destinationId String?
  createdAt     DateTime     @default(now())

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  package     TourPackage? @relation(fields: [packageId], references: [id], onDelete: Cascade)
  destination Destination? @relation(fields: [destinationId], references: [id], onDelete: Cascade)

  @@unique([userId, packageId])
  @@unique([userId, destinationId])
  @@index([userId])
}
```

**Relações a adicionar nos models existentes:**

- `User` → `favorites Favorite[]`
- `TourPackage` → `favorites Favorite[]`
- `Destination` → `favorites Favorite[]`

### Alterações existentes

Nenhuma alteração em models existentes além das relações acima. `Booking.userId` já existe (nullable). `Review` já existe com `bookingId` unique.

## Layout e Navegação

### `TuristaLayout` (route group `(turista)`)

```
┌─────────────────────────────────────┐
│  CAPI logo          [Avatar ▾]      │  ← TuristaTopNav
├─────────────────────────────────────┤
│                                     │
│         Conteúdo da página          │
│                                     │
├─────────────────────────────────────┤
│  🗺️ Viagens  ❤️ Favoritos  🔍 Explorar  👤 Perfil │  ← BottomNav (mobile)
└─────────────────────────────────────┘
```

**Desktop (≥1024px):** bottom nav transforma em sidebar à esquerda.

```
┌──────────┬──────────────────────────┐
│ CAPI     │  TuristaTopNav (avatar)  │
├──────────┤──────────────────────────┤
│ Viagens  │                          │
│ Favoritos│    Conteúdo da página    │
│ Explorar │                          │
│ Perfil   │                          │
└──────────┴──────────────────────────┘
```

**Componentes do layout:**

- `TuristaTopNav` — logo CAPI (link `/`) + avatar com dropdown (Perfil, Sair)
- `TuristaBottomNav` — 4 items fixos no bottom, highlight no item ativo
- `TuristaSidebar` — versão desktop do bottom nav, visível apenas em ≥1024px
- Middleware no layout: redirect para `/login` se não autenticado, redirect para `/:slug/painel` se role !== CLIENTE

## Páginas — Especificação

### `/cadastro` — Registro do Turista

**Formulário:**

- Nome completo (obrigatório)
- Email (obrigatório, validação formato)
- Senha (obrigatório, mínimo 8 caracteres)
- Confirmar senha
- Checkbox: aceitar termos de uso e política de privacidade
- Botão "Criar conta"
- Link: "Já tem conta? Entrar"

**Fluxo:**

1. Submit → `POST /tenants/capi/auth/register` com `role: "CLIENTE"`
2. Tenant `capi` é o tenant-plataforma para turistas (criado via seed)
3. Sucesso → auto-login via NextAuth → redirect `/minha-conta/viagens`
4. Erro (email duplicado) → mensagem inline

**Decisão — tenant plataforma:** Turistas registrados pela rota global pertencem ao tenant `capi`. Suas reservas linkam ao tenant do guia via `booking.tenantId`. Isso permite agregação cross-tenant no `/me/bookings`.

### `/login` — Login Global

**Formulário:**

- Email
- Senha
- Botão "Entrar"
- Links: "Esqueci a senha" (existente), "Criar conta" → `/cadastro`

**Fluxo:**

1. Submit → NextAuth CredentialsProvider → `POST /auth/login`
2. Sucesso + role CLIENTE → redirect `/minha-conta/viagens`
3. Sucesso + role CONDUTOR/ADMIN → redirect `/:slug/painel`
4. Erro → mensagem inline

### `/minha-conta/viagens` — Lista de Reservas

**Layout:**

- Tabs: "Próximas" | "Passadas"
- **Próximas** = status CONFIRMED, PENDING — ordenado por `slot.startsAt` ASC
- **Passadas** = status COMPLETED, CANCELLED, NO_SHOW, EXPIRED — ordenado por `slot.startsAt` DESC

**Card de viagem:**

- Thumbnail do roteiro (primeira foto)
- Nome do roteiro
- Data e horário (do DepartureSlot)
- Nome do guia
- Badge de status (cores por status)
- Clicável → `/minha-conta/viagens/[id]`

**Badge colors:**

- PENDING → amarelo
- CONFIRMED → verde
- COMPLETED → cinza
- CANCELLED → vermelho
- CHECKED_IN → azul
- NO_SHOW / EXPIRED → cinza escuro

**Empty state:** Ilustração + "Nenhuma viagem agendada" + botão "Explorar roteiros" → `/explorar`

**Paginação:** cursor-based, botão "Carregar mais"

### `/minha-conta/viagens/[id]` — Detalhe da Reserva

**Seções:**

1. **Header:** nome do roteiro + badge de status
2. **Info principal:** data/hora, duração, pax, dificuldade
3. **Guia:** foto, nome, link para perfil público
4. **Ponto de encontro:** nome + mini mapa (reutiliza MapWidgetClient)
5. **Voucher/QR:** exibe se status CONFIRMED (componente existente ou novo)
6. **Ações:**
   - Cancelar (se PENDING/CONFIRMED) — confirma com dialog
   - Avaliar (se COMPLETED e sem review) — form inline com 5 estrelas + textarea + submit
7. **Código da reserva:** exibe `booking.code`

### `/minha-conta/favoritos` — Favoritos

**Layout:**

- Grid responsivo de cards
- Reutiliza `PackageCard` para pacotes e cria `DestinationFavCard` para destinos
- Coração preenchido em cada card, clicável para remover (optimistic update)
- Tabs opcionais: "Roteiros" | "Destinos" (se ambos existirem)

**Empty state:** "Nenhum favorito salvo" + "Explore roteiros e destinos e salve os que mais gostar" + CTA

**Toggle favorito (usado em toda a app):**

- Componente `FavoriteButton` reutilizável
- Se autenticado: toggle via `POST/DELETE /me/favorites` com optimistic update
- Se não autenticado: redirect para `/login`

### `/minha-conta/avaliacoes` — Avaliações

**Layout:**

- Seção "Pendentes" no topo: cards de viagens COMPLETED sem review, com CTA "Avaliar"
- Seção "Minhas avaliações" abaixo: lista de reviews feitas
- Cada review mostra: nome do roteiro, estrelas, comentário, data

### `/minha-conta/perfil` — Perfil

**Seções:**

1. **Avatar:** upload de foto (reutiliza infra de upload existente se houver, senão Cloudinary)
2. **Dados pessoais:** nome, telefone — editáveis inline
3. **Email:** exibe email atual + botão "Alterar" (fluxo existente com confirmação)
4. **Senha:** botão "Alterar senha" → campos senha atual + nova senha + confirmar
5. **Conta:** botão "Sair" (logout)

## Autenticação e Segurança

- Todos os endpoints `/me/*` exigem JWT válido com `role: CLIENTE`
- Middleware Fastify: hook `onRequest` que verifica JWT e injeta `request.user`
- Favoritos validam ownership: só pode deletar favorito próprio
- Review valida: booking pertence ao usuário, status COMPLETED, sem review existente
- Booking detail valida: `booking.userId === request.user.id`

**Distinção `/auth/me` vs `/me/profile`:**

- `GET /auth/me` (existente) — retorna claims de auth: `{ id, role, tenantId, tenantSlug }`. Usado internamente pelo NextAuth para verificar sessão.
- `GET /me/profile` (novo) — retorna dados editáveis do perfil: `{ name, email, photoUrl, phone }`. Usado pela página de perfil do turista.
- `PATCH /me/profile` (novo) — atualiza campos editáveis. Não altera email/senha (fluxos separados existentes).

## Componentes Reutilizáveis

| Componente           | Descrição                                | Usado em                                 |
| -------------------- | ---------------------------------------- | ---------------------------------------- |
| `TuristaLayout`      | Layout com topnav + bottom nav / sidebar | Todas as páginas /minha-conta/           |
| `TuristaTopNav`      | Logo + avatar dropdown                   | Layout                                   |
| `TuristaBottomNav`   | Nav fixa mobile, 4 items                 | Layout (mobile)                          |
| `TuristaSidebar`     | Sidebar desktop                          | Layout (desktop)                         |
| `BookingCard`        | Card de reserva na lista                 | /viagens                                 |
| `BookingStatusBadge` | Badge colorido por status                | /viagens, /viagens/[id]                  |
| `FavoriteButton`     | Coração toggle, optimistic update        | /favoritos, PackageCard, DestinationCard |
| `ReviewForm`         | 5 estrelas + textarea + submit           | /viagens/[id], /avaliacoes               |
| `StarRating`         | Input de 1-5 estrelas                    | ReviewForm                               |
| `EmptyState`         | Ilustração + mensagem + CTA              | Todas as listas vazias                   |

## Seed Data

Criar tenant `capi` (slug: `capi`, name: `CAPI Plataforma`) no seed se não existir. Este é o tenant-plataforma para turistas registrados globalmente.

## Testes

**API (Vitest):**

- `/me/bookings` — lista paginada, filtra por userId, cross-tenant
- `/me/bookings/:id` — retorna detalhe, 404 se não pertence ao usuário
- `/me/favorites` — CRUD completo, unique constraints, 404 em delete de outro user
- `/me/reviews` — criação com validações (COMPLETED, sem review), listagem
- `/me/profile` — get e patch, validação de campos

**Web (Vitest + Testing Library):**

- `BookingCard` — renderiza info, badge de status correto
- `BookingStatusBadge` — cores por status
- `FavoriteButton` — toggle, estado loading, redirect se não auth
- `ReviewForm` — validação (estrelas obrigatórias), submit
- `StarRating` — interação de click, acessibilidade
- `TuristaBottomNav` — highlight item ativo, links corretos
- `EmptyState` — renderiza mensagem e CTA

## Fora de Escopo (Sub-projeto 2)

- Chat real-time com WebSocket (guia + suporte)
- Notificações push/in-app
- Sistema de mensagens no dashboard
