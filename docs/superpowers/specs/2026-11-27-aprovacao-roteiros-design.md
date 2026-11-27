# Aprovação de roteiros pela equipe da plataforma — Design

Origem: reunião CAPI de 26/11/2026 ("ver a questão de solicitar a inclusão do roteiro para a organização do site, pois da forma que está qualquer guia pode criar o roteiro que quiser e alterar ou arquivar também") + conversa de 27/11/2026.

## Intenção (o porquê)

Hoje um guia verificado cria, publica, altera (inclusive preço) e arquiva roteiros sem ninguém revisar. A organização do site quer controlar o que entra e muda no catálogo publicado por guias, sem tirar roteiros do ar à toa.

## Decisões tomadas com o usuário

1. **Quem aprova:** a equipe da plataforma (SUPER_ADMIN / platform staff), no super-admin — mesmo padrão já usado para destinos e guias. _(proposto pelo Claude, não contestado)_
2. **O que passa por aprovação (opção B):**
   - **Entrada no ar** de roteiro novo: o guia envia; o roteiro fica "Aguardando aprovação" (fora do ar) até a equipe aprovar → publicado. Recusa com motivo.
   - **Alterações importantes** em roteiro no ar: nome, descrição, valor do grupo (`price`) e acréscimo por guia extra (`extraGuidePrice`) viram "alteração pendente"; o turista continua vendo a versão aprovada até a equipe aprovar.
   - **Arquivar** vira pedido; ao aprovar, vale a regra atual (cancela datas futuras e estorna reservas).
   - **Continua livre para o guia:** fotos, destaques, abrir/fechar horários (agenda), duração/dificuldade _(ver "decisões do Claude")_.
3. **Quem precisa de aprovação (opção B):** **só guias (CONDUTOR)**. ADMIN de operadora e equipe da plataforma continuam publicando/editando/arquivando direto.
4. **Como guardar (abordagem A):** tabela de pedidos.

## Abordagens consideradas

|                          | Como                                                                                                       | Trade-off                                               | Escolha    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------- |
| **A. Tabela de pedidos** | `PackageChangeRequest` (tipo, mudanças propostas, status, quem decidiu, motivo); aprovar aplica no roteiro | Um fluxo e uma tela para os 3 tipos; histórico          | ✅         |
| B. Campos no roteiro     | status + mudanças pendentes + "arquivar pedido em" no `TourPackage`                                        | Menos código no início; casos misturados; sem histórico | descartada |
| C. Cópia rascunho        | 2ª versão do roteiro que substitui a original                                                              | Horários/reservas/guias presos à linha original         | descartada |

## Objetivos

- Guia não consegue colocar no ar, alterar campos importantes, nem arquivar/despublicar um roteiro sem aprovação da equipe.
- Equipe vê uma fila única de pedidos (super-admin → Roteiros e /pendencias), com o "antes → depois" das alterações, e aprova ou recusa com motivo.
- Guia vê o estado de cada roteiro no painel ("Aguardando aprovação", "Alteração pendente", "Arquivamento pendente", "Recusado: motivo") e recebe notificação da decisão.
- Nada que já está publicado sai do ar com a mudança.

## Não-objetivos

- Aprovação para ADMIN de operadora.
- Aprovação de fotos, destaques, horários.
- Edição pela equipe dentro do pedido (aprova/recusa como veio; a equipe pode editar o roteiro direto pelos caminhos atuais se quiser).
- Histórico/diff de versões além do registro do pedido.

## Anti-objetivos

- Roteiro publicado sumir para o turista enquanto uma alteração aguarda.
- Guia contornar a aprovação por outro caminho de escrita (PUT, PATCH do modo edição, publish/unpublish/restore, DELETE).
- Aprovar alteração sobrescrever mudanças feitas depois por ADMIN/equipe sem aviso.
- Reservas existentes mudarem de valor por causa de uma alteração aprovada (já garantido: a reserva grava `amount`).

## Restrições

- Fastify 5 + Prisma 7 + Zod; Next.js 16. Erros em português. Testes Vitest no padrão atual (Prisma mockado).
- Arquivar continua usando `cancelFutureSlots` (cancela + estorna).
- O usuário faz todos os commits.

## Como funciona hoje (o que muda)

- `apps/api/src/shared/auth/edit-permissions.ts`: `canEditPackage` (CONDUTOR edita os seus), `canCreatePackageIn`, `isUnverifiedGuide`.
- `apps/api/src/modules/packages/routes/crud.route.ts`: POST cria rascunho (`publishedAt: null`); PUT `/tenants/:slug/packages/:id` edita; DELETE arquiva (cancela futuras + `active: false`); PATCH (fotos/destaques); POST `/publish`, `/unpublish` (tira do ar e cancela futuras), `/restore`.
- `apps/api/src/modules/edit/edit.routes.ts` e `PackageEditor.tsx` (modo edição no site) usam esses mesmos endpoints.
- Notificações: `notifications.service.ts` (`notify`, `resolveAction`, `platformStaffIds`); `/pendencias` lista ações pendentes por `actionKey`.
- Super-admin já tem `app/super-admin/roteiros`.

## Design

### Dados

Nova tabela `PackageChangeRequest`:

- `id`, `packageId` (FK TourPackage), `requestedById` (User), `type` enum `PUBLISH | UPDATE | UNPUBLISH | ARCHIVE`, `changes Json?` (só UPDATE: `{ campo: { from, to } }` para `name, description, price, extraGuidePrice`), `status` enum `PENDING | APPROVED | REJECTED | CANCELLED`, `decidedById?`, `decidedAt?`, `rejectionReason?`, `createdAt`, `updatedAt`.
- Índices: `(status, createdAt)`, `(packageId, status)`.
- Regra: **no máximo um pedido PENDING por roteiro** (verificado em transação). Se o guia editar de novo com um UPDATE pendente, o mesmo pedido é atualizado (merge das mudanças). Um PUBLISH pendente absorve edições (o roteiro ainda não está no ar, então edição vai direto ao rascunho — ver abaixo).

Roteiros existentes: nenhuma migração de dados; publicados seguem publicados.

### Regras por ação do guia (CONDUTOR)

| Ação                                           | Roteiro em rascunho (nunca publicado)       | Roteiro publicado                             |
| ---------------------------------------------- | ------------------------------------------- | --------------------------------------------- |
| Criar                                          | cria rascunho (igual hoje)                  | —                                             |
| Editar nome/descrição/preço/acréscimo          | aplica direto no rascunho                   | cria/atualiza pedido UPDATE; roteiro não muda |
| Editar fotos/destaques/duração/dificuldade     | direto                                      | direto                                        |
| Publicar (`/publish`)                          | cria pedido PUBLISH (não publica)           | —                                             |
| Despublicar (`/unpublish`) / Arquivar (DELETE) | rascunho: arquivar direto (nada no ar)      | cria pedido UNPUBLISH / ARCHIVE (não executa) |
| Restaurar (`/restore`)                         | volta como rascunho; publicar exige PUBLISH | —                                             |
| Abrir/fechar horários                          | só em roteiro publicado (igual hoje)        | livre                                         |

Respostas da API ao guia nesses casos: `202` com `{ requestId, status: 'PENDING', type }` e mensagem em PT ("Enviado para aprovação da equipe").

ADMIN e platform staff: comportamento atual, sem pedidos.

### Decisão da equipe

- `GET /admin/package-requests?status=PENDING` (platform staff): lista com roteiro, guia, tenant/destino, tipo, e para UPDATE o "antes → depois" (valores atuais do roteiro × `changes`).
- `POST /admin/package-requests/:id/approve`: em transação, aplica — PUBLISH: `publishedAt = now`; UPDATE: aplica `changes` ao roteiro; ARCHIVE: `cancelFutureSlots` + `active: false` (mesma lógica do DELETE atual). Marca APPROVED.
- `POST /admin/package-requests/:id/reject` `{ reason }` (obrigatório, 5–500 chars): marca REJECTED.
- Guia pode cancelar o próprio pedido pendente: `DELETE /tenants/:slug/packages/:id/request` → CANCELLED.
- Conflito: se, entre o pedido e a aprovação, o roteiro teve um campo do `changes` alterado por ADMIN/equipe (`updatedAt` do roteiro > `updatedAt` do pedido e valor atual ≠ valor de referência guardado), a aprovação aplica mesmo assim mas a tela de revisão mostra o valor atual. _(Decisão do Claude: guardar em `changes` também o valor "antes" de cada campo para exibir e detectar.)_

### Notificações

- Pedido criado → `notify` para `platformStaffIds()` com `actionKey = package-request:<id>` (aparece em /pendencias).
- Decisão → `resolveAction(actionKey)` + `notify` ao guia ("Seu roteiro X foi aprovado" / "recusado: motivo"), link para o painel.

### Telas

- **Painel → Meus roteiros:** selo de estado por roteiro: "Aguardando aprovação", "Alteração pendente", "Arquivamento pendente", "Recusado — motivo" (último pedido recusado, até nova ação). Botão "Cancelar pedido" quando pendente. Botão "Enviar para aprovação" no lugar de "Publicar" para guia.
- **Editores (painel e modo edição `PackageEditor`):** ao salvar campos importantes de roteiro publicado, aviso "Alterações em nome, descrição e valores passam pela aprovação da equipe. O roteiro continua no ar com a versão atual até lá." e, após salvar, toast "Enviado para aprovação".
- **Super-admin → Roteiros:** aba/filtro "Pedidos pendentes" com cada pedido: tipo, roteiro, guia, destino, "antes → depois" (UPDATE), botões Aprovar / Recusar (com motivo).
- **/pendencias:** já lista via `actionKey`; o link leva ao pedido no super-admin.

## Decisões do Claude (podem ser corrigidas)

- Duração e dificuldade ficam livres (não citadas como "importantes"); só nome, descrição, valor do grupo e acréscimo exigem aprovação.
- Despublicar é tratado como arquivar (também tira do ar e cancela reservas futuras) → pedido ARCHIVE.
- Arquivar rascunho nunca publicado é direto (não afeta o catálogo).
- Restaurar roteiro arquivado volta como rascunho; para ir ao ar, novo PUBLISH.
- Um pedido pendente por roteiro; nova edição atualiza o pedido existente.
- Recusa exige motivo.

## Regras complementares (decisões do Claude após revisão do builder)

1. **Tipos de pedido:** `PUBLISH | UPDATE | UNPUBLISH | ARCHIVE`. Despublicar e arquivar mantêm os efeitos atuais: aprovar UNPUBLISH = lógica atual do `/unpublish` (cancela futuras, `publishedAt = null` → rascunho); aprovar ARCHIVE = lógica atual do DELETE (cancela futuras, `active = false`). Selos: "Despublicação pendente" / "Arquivamento pendente".
2. **Restaurar (guia):** `/restore` feito por CONDUTOR reativa (`active = true`) e zera `publishedAt` → rascunho; voltar ao ar exige novo PUBLISH (reaprovação completa). ADMIN e equipe: comportamento atual.
3. **Um pedido pendente por roteiro:** UPDATE sobre UPDATE pendente → merge no mesmo pedido. Qualquer outra combinação (ex.: pedir ARCHIVE com UPDATE pendente, editar campo importante com UNPUBLISH/ARCHIVE pendente) → `409` "Já existe um pedido pendente para este roteiro. Cancele-o para fazer outro." Roteiro arquivado (`active = false`) ou rascunho: edições vão direto (não está no catálogo).
4. **Guia não verificado:** o bloqueio atual (`isUnverifiedGuide` → 403) continua valendo na criação do pedido PUBLISH. A aprovação não rechecá o guia (a equipe decide).
5. **PUT com campos mistos (roteiro publicado, guia):** campos livres aplicados direto; campos importantes (`name`, `description`, `price`, `extraGuidePrice`) que **diferem** do valor atual vão para o pedido UPDATE. Resposta `200` com o roteiro no estado atual (aprovado) + `pendingRequest: { id, type, changes } | null`. Se nada importante mudou, nenhum pedido é criado. `extraGuidePrice: null` em `changes` significa "remover o acréscimo".
6. **`changes` guarda antes e depois:** `{ campo: { from, to } }`. Detecção de conflito na revisão compara o valor atual do roteiro com `from` (não usa `updatedAt`); se diferente, a tela mostra o valor atual com destaque. A aprovação aplica `to` mesmo assim.
7. **Aprovação após perda de autoridade** (guia trocado, suspenso, destino arquivado): a aprovação aplica; a equipe decide.
8. **Auditoria de caminhos de escrita:** o plano inclui uma tarefa para localizar toda rota alcançável por CONDUTOR que escreva `name`, `description`, `price`, `extraGuidePrice`, `publishedAt` ou `active` de `TourPackage` (crud, edit, guides, memberships, slots…) e cobri-las com o mesmo bloqueio, com teste.

## Deixado ao builder

- Nomes exatos de componentes/rotas web; layout do "antes → depois".
- Como reaproveitar a seção Roteiros do super-admin (aba vs filtro).
- Mensagens de notificação exatas (em PT, curtas).
