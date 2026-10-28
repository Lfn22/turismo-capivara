# Hierarquia, Modo Edição, Cadastro de Guias e Notificações — Design

**Data:** 2026-10-28
**Escopo:** Projetos 1 + 2 + Notificações (entregues juntos). Projeto 3 (saída de guia com reservas) fica para depois.

## Intenção e porquê

Hoje toda operação de plataforma passa pelo `SUPER_ADMIN`, a edição de destinos está espalhada em três telas com regras diferentes (`/super-admin/destinos`, `/[slug]/painel/destinos`, `/[slug]/painel/destino`) e todo guia precisa pertencer a uma operadora presa a um único destino. O objetivo é **facilitar o cadastro de guias e o acesso dentro da plataforma**:

- a equipe da plataforma edita o conteúdo "andando" pelo site público, sem caçar a tela certa;
- o guia se cadastra sozinho, independentemente de agência, e escolhe onde atua com um botão;
- todo mundo fica sabendo do que precisa de ação por um sistema de notificações.

## Objetivos

### 1. Hierarquia de papéis

| Papel | Pode |
|---|---|
| **Superadmin** | Tudo. **Exclusivo:** adicionar e remover admins. |
| **Admin** (equipe da plataforma — papel novo) | Mesmo poder do superadmin em todo o resto: criar/editar/excluir destinos e roteiros de qualquer agência, aprovar guias, aprovar agências, aprovar pedidos de guia em roteiros. Não mexe em admins. |
| **Dono de agência ou associação** | Tudo até editar roteiros **da própria agência/associação**, aceitar/recusar guias nos próprios roteiros. **Continua editando a página do destino ligado à sua agência** (escopo A-1 de hoje). Não cria nem exclui destinos e não edita destinos de outras agências. |
| **Guia verificado** | Entrar/sair de destinos e pedir para entrar/sair de roteiros. Editar o próprio perfil. **Continua criando e editando os próprios roteiros** (e a agenda deles), como hoje. |
| **Turista** | Como hoje (reservar, consultar reserva), mais notificações quando logado. |

- O `ADMIN` atual (que é administrador de operadora) corresponde ao **dono de agência**. O builder escolhe a nomenclatura no código (ex.: renomear `ADMIN` → `AGENCY_OWNER` e criar `PLATFORM_ADMIN`, ou manter `ADMIN` como dono e criar papel novo para equipe).
- **Não há usuários reais:** guias, destinos e roteiros existentes são **dados de demonstração (mock)**. A migração pode ser direta e o seed pode ser refeito para a nova estrutura — sem campanha de reverificação nem avisos a usuários existentes. Os guias do seed já entram como verificados, com comprovante de exemplo.
- **`ATENDENTE` é removido** (enum, middleware, layout do painel, rotas e testes que o citam).
- **Associação** *(decisão do Claude)*: é uma agência com outro rótulo (ex.: tipo `AGENCIA` | `ASSOCIACAO` no `Tenant`), mesmo cadastro, mesma aprovação e mesmos poderes.
- **Guia editando página de destino** *(decisão do Claude)*: hoje `CONDUTOR` pode editar a página do destino da sua operadora; isso **sai** — destino é editado por superadmin, admin e dono da agência ligada. Como só há dados mock, ninguém perde acesso real.
- Superadmin ganha um lugar para listar, adicionar e remover admins (pode ser no painel `/super-admin` existente).

### 2. Modo edição no site público (opção A escolhida)

- Superadmin, admin e dono de agência, quando logados, veem no topo do site uma **chave "Modo edição"** (desligada por padrão).
- Com a chave **ligada**, as seções editáveis da página ganham contorno e botões **✏️ Editar**, **🗑️ Excluir** e **＋ Novo** — em destinos, roteiros e demais seções de conteúdo das páginas públicas.
- Com a chave **desligada**, a pessoa vê o site exatamente como um turista.
- O dono de agência vê controles nos **roteiros da própria agência** e na **página do destino ligado à agência**; demais conteúdos aparecem sem controles. O guia verificado também tem a chave, com controles só nos **próprios roteiros**.
- Edição acontece **na própria página** (painel lateral ou formulário sobreposto — escolha do builder), sem redirecionar para o painel.
- Excluir sempre pede confirmação.
- A permissão é **sempre verificada no servidor**; a chave só controla o que aparece na tela.

### 3. Rotas

- Todo mundo navega pelo mesmo site público (`/destinos/...`, roteiros, guias). O que muda por papel é o que dá para editar.
- **Os painéis existentes permanecem** (`/super-admin/*`, `/[slug]/painel/*`, `/[slug]/admin/*`). Melhoria dos painéis é trabalho futuro, fora deste escopo.

### 4. Cadastro de guia

- O guia se cadastra **sozinho**, em uma de três situações: **autônomo**, **ligado a uma associação** ou **empregado de uma agência**. Pertencer a uma agência deixa de ser obrigatório.
- **Único item obrigatório de qualificação:** comprovante do **ICMBio ou do Cadastur** (upload de documento + número, quando houver).
- Guia novo fica **pendente**. Superadmin ou admin confere o comprovante e aprova/recusa (com motivo). Só após aprovação ele é **guia verificado**: aparece no site e vê os botões de entrar.
- Guia ligado a agência/associação: o vínculo com a agência é declarado no cadastro; como esse vínculo é confirmado fica a cargo do builder (sugestão: o dono da agência confirma, via notificação).

### 5. Guia entra/sai de destinos e roteiros

- **Destino:** botão **"Quero atuar neste destino"** / **"Sair deste destino"** na página do destino. Guia verificado **entra na hora**. Um guia pode atuar em **vários destinos**.
- **Roteiro:** botão **"Quero atuar neste roteiro"** / **"Sair deste roteiro"**. O pedido fica **pendente** até o superadmin, um admin ou o dono da agência do roteiro aceitar ou recusar. *(Decisão do Claude:)* em roteiro criado por guia autônomo, quem aceita é o guia criador (além de superadmin/admin).
- **Saída com reservas futuras:** enquanto o projeto 3 não existir, "Sair" fica **bloqueado** se o guia tem reserva futura naquele destino/roteiro, com a mensagem "Você tem reservas pendentes, fale com o admin".
- Hoje o vínculo guia↔destino é indireto (`User.tenantId` → `Tenant.destinationId`, um destino só). Será preciso um vínculo direto guia↔destino. Guia↔roteiro já existe (`PackageGuide`) e precisa ganhar o estado pendente/aceito/recusado.

### 6. Sistema de notificações

- **Sininho no topo do site** para qualquer usuário logado (turista, guia, dono de agência, admin, superadmin), com contador de não lidas.
- Clicar abre a lista; cada notificação leva direto para onde a pessoa age (ex.: tela de aprovação do pedido).
- Notificações importantes também vão por **e-mail** (Resend, já usado no projeto).
- Eventos mínimos deste escopo:
  - guia novo aguardando verificação → admins e superadmin;
  - comprovante aprovado/recusado → guia;
  - guia pediu para entrar em roteiro → dono da agência do roteiro + admins;
  - pedido de roteiro aceito/recusado → guia;
  - guia entrou/saiu de destino ou roteiro → dono da agência envolvida (se houver);
  - eventos de reserva que hoje já geram e-mail (criada, PIX confirmado, expirada, cancelada) → também no sininho para turista logado e para o guia/agência.
- O sistema deve ser **genérico** o bastante para receber novos tipos de evento sem retrabalho (o projeto 3 vai usá-lo).
- Turista que reserva sem conta (guest checkout) continua recebendo só e-mail.
- *(Decisão do Claude:)* a reserva passa a guardar o usuário (`Booking.userId`, opcional) quando feita logado; o sininho do turista mostra só essas. **Não** casar reservas por e-mail — sem verificação de e-mail, isso exporia reservas de terceiros (LGPD).

## Requisitos de UX (revisão de 2026-10-28)

Resultado de revisão UX contra o código atual + pesquisa de padrões (edição inline em CMS, onboarding com documento, central de notificações). Itens confirmados no código estão marcados com ✔.

### Edição sem quebrar a página
- ✔ Hoje `updateDestination()` (`destinations.service.ts`) devolve destino APROVADO para PENDENTE quando quem edita não é `ADMIN`, e as rotas públicas só mostram APROVADO — a página sumiria para todos após uma edição inline. *(Decisão do Claude:)* **edições de quem tem permissão publicam direto** (superadmin, admin, dono de agência no destino ligado, guia nos próprios roteiros). A moderação continua valendo só para **criar destino novo**.

### Encontrar o modo edição
- ✔ Hoje o login manda cada papel para um painel (`login/page.tsx`) e as páginas públicas não têm cabeçalho de usuário logado.
- **Cabeçalho logado único** em todas as páginas públicas: sininho, menu do usuário e chave "Modo edição".
- Após login, voltar para a página de onde a pessoa veio (quando houver); senão, painel como hoje.
- Nos painéis, cada card de roteiro/destino ganha **"Ver e editar no site"**, abrindo a página pública já com o modo edição ligado.
- A chave fica ligada durante a navegação na sessão e tem saída clara ("Sair do modo edição"); avisar antes de sair com alterações não salvas.
- Com a chave ligada, uma faixa de uma linha diz o que a pessoa pode editar ("Você pode editar: página de [Destino] e roteiros da [Agência]"). Tocar numa seção sem permissão mostra um aviso discreto ("Roteiro de outra agência") em vez de silêncio.

### Celular primeiro
- No celular, com a chave ligada, a barra fixa "Reservar" é substituída por uma barra "Modo edição · Sair".
- Cada seção tem **um** botão ✏️ que abre uma folha (bottom sheet) com o formulário; **Excluir fica dentro da folha**, nunca ao lado de Editar.
- **Excluir = arquivar** (`active=false`) com toast "Desfazer". Exclusão definitiva de destino exige digitar o nome.

### Rascunho, oculto e pendente
- No modo edição, itens ocultos/rascunho/aguardando aprovação aparecem no lugar, acinzentados, com selo **Rascunho / Oculto / Aguardando aprovação**. Visitantes nunca os veem.
- **"＋ Novo roteiro"** cria um rascunho com passo explícito **"Publicar"**.

### Cadastro de guia — uma porta só
- ✔ Hoje há três entradas conflitantes (`/cadastro/guia`, `/onboarding` → "Sou Guia" pedindo slug, `/[slug]/cadastro`) e o link "Entrar" de `/cadastro/guia` aponta para `/auth/login`, que não existe.
- **Um único cadastro:** escolher Autônomo / Associação / Agência → se não autônomo, **buscar a agência pelo nome** (não por slug) → comprovante.
- Comprovante: escolher ICMBio ou Cadastur, número + **foto pela câmera do celular** ou PDF; compressão da imagem e nova tentativa se a conexão cair.
- As outras duas entradas redirecionam para o cadastro único.
- **Login precisa funcionar sem agência** (guia autônomo, turista com conta). Hoje o login encontra o tenant pelo e-mail.

### Guia pendente e recusado
- Guia pendente **consegue entrar** e cai numa página de status: "Em análise desde DD/MM".
- Enquanto espera, pode completar o perfil (foto, bio, especialidades), para aparecer no site assim que for aprovado.
- Recusa: admin escolhe motivo de uma lista (ilegível, vencido, nome diferente do documento, outro + texto). O guia vê o motivo, o formulário vem preenchido e há **"Reenviar comprovante"**, que volta para a fila.
- Vínculo com agência aparece como "não confirmado" até o dono aceitar.

### Estados dos botões entrar/sair
| Situação | Destino | Roteiro |
|---|---|---|
| Não verificado | "Disponível após verificação" (desabilitado) | idem |
| Verificado, fora | Quero atuar neste destino | Quero atuar neste roteiro |
| Pedido enviado | — | "Pedido enviado · aguardando [agência]" + Cancelar pedido |
| Recusado | — | "Pedido recusado: [motivo]" + Pedir de novo |
| Dentro | "Você atua aqui ✓" + Sair | "Você atua aqui ✓" + Sair |
| Dentro com reserva futura | Sair desabilitado + "Você tem reservas pendentes, fale com o admin" + lista das reservas | idem |

- No perfil do guia, uma lista **"Meus destinos e roteiros"** com esses mesmos estados.

### Notificações que levam à ação
- Pedidos (guia a verificar, pedido de roteiro, vínculo com agência) têm **Aprovar / Recusar direto na notificação**; recusar abre a lista de motivos.
- Uma tela **"Pendências"** por papel junta tudo que espera ação. Hoje não existe tela para alguns desses itens (ex.: admin verificar guias, pedidos de roteiro).
- O contador do sininho conta **não lidas**. Pendências têm um selo próprio que só some quando alguém age.
- Quando um admin resolve um pedido, ele some da lista dos outros admins ("Aprovado por Fulana").
- Eventos repetidos são agrupados. Por e-mail vão as decisões para o guia e um **resumo diário** para admins (não um e-mail por evento).
- Estados vazios por papel (guia: "Nenhuma novidade. Complete seu perfil para ser encontrado"; admin: "Nenhuma pendência").

### Uma regra, um editor
- Existem duas páginas públicas de roteiro (`/destinos/[slug]/roteiros/[id]` e `/[slug]/roteiros/[packageId]`). Escolher uma como oficial e redirecionar a outra.
- O "Editar" dos painéis abre **o mesmo componente de edição** do modo edição, para que painel e site sigam as mesmas regras.
- Remover "Locais" do menu do guia no painel (guia não edita destino). Esconder o link "Painel" para turistas.

## Não-objetivos

- Fluxo de saída de guia com reservas (transferência, multa, devolução) — **projeto 3**.
- Reformar ou remover painéis existentes.
- WhatsApp, push no celular, SMS.
- Mudanças em pagamento/PIX.

## Anti-objetivos (seria fracasso mesmo funcionando)

- Dono de agência conseguir editar destino ou roteiro de outra agência (inclusive via chamada direta à API).
- Admin conseguir criar ou remover admins.
- Guia não verificado aparecer no site ou conseguir entrar em destino/roteiro.
- Visitante comum vendo qualquer vestígio do modo edição.
- Guia ou dono de agência perder poder que este documento mantém (guia: criar/editar os próprios roteiros; dono: editar a página do destino da sua agência).

## Restrições

- Stack existente: Fastify 5 + Prisma 7 + PostgreSQL (API), Next.js 16.2 + React 19 (web), pnpm + Turborepo, Railway.
- Convenções do `CLAUDE.md`: validação Zod em toda rota, mensagens de erro em português, multi-tenant por slug, `prisma.$transaction` onde houver concorrência.
- Preservar as proteções de segurança já documentadas no código (ex.: comentários A-1/A-2 em `destinations.routes.ts` sobre escopo de tenant e moderação).
- O usuário faz todos os commits manualmente.

## Deixado para o builder

- Nomes dos papéis no código e estratégia de migração (respeitando os anti-objetivos).
- Como representar guia autônomo, dado que `User.tenantId` é obrigatório hoje.
- Modelagem do vínculo guia↔destino e do estado do pedido em `PackageGuide`.
- Formato do editor inline (painel lateral vs. modal) e quais seções de página são editáveis além de destinos e roteiros.
- Modelo de dados e entrega das notificações (polling vs. tempo real).
- Ordem de entrega interna (sugestão: hierarquia → notificações → cadastro de guia → entrar/sair → modo edição).
