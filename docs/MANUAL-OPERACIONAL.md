# CAPI — Manual Operacional

**Versão:** 2.1 · **Atualizado:** 2026-07-15

---

## Visão Geral

O CAPI é um marketplace de guias de turismo onde turistas encontram, comparam e reservam roteiros com pagamento PIX integrado. A plataforma opera em modelo **multi-tenant**: cada operadora (agência ou guia independente) tem seu próprio espaço isolado identificado por um **slug** único.

### Hierarquia de Papéis

| Papel | Quem é | O que pode fazer |
|-------|--------|-----------------|
| `SUPER_ADMIN` | Equipe CAPI | Aprovar/rejeitar operadoras e destinos; acesso total à plataforma |
| `ADMIN` | Dono da operadora | Gerenciar guias, roteiros e slots da sua operadora |
| `CONDUTOR` | Guia de turismo | Criar roteiros, slots e gerenciar seu perfil (requer aprovação do ADMIN) |
| `CLIENTE` | Turista | Fazer reservas (sem conta obrigatória — guest checkout) |

---

## Parte 1 — SUPER_ADMIN

### 1.1 Acesso ao Painel

O Super-Admin não passa pelo fluxo de cadastro público. A conta é provisionada diretamente no banco de dados pela equipe técnica com `role = SUPER_ADMIN`.

**Acesso:** `/login` → digite o e-mail → sistema detecta a operadora automaticamente → painel super-admin.

**Painel:** `/super-admin/operadoras`

---

### 1.2 Aprovar ou Rejeitar Operadoras

Toda nova operadora cadastrada chega com status **PENDENTE** e fica bloqueada até aprovação.

**Para ver pendentes:**
- Acesse `/super-admin/operadoras`
- A lista exibe: nome, slug, CNPJ, e-mail do admin, data do cadastro

**Para aprovar:**
1. Clique em **Aprovar** na linha da operadora
2. Status muda para `APPROVED`
3. O sistema envia e-mail automático ao admin da operadora avisando que foi aprovada
4. A operadora passa a funcionar normalmente

**Para rejeitar:**
1. Clique em **Rejeitar**
2. Informe o **motivo da rejeição** (obrigatório, até 500 caracteres)
3. Status muda para `REJECTED`
4. O admin da operadora recebe e-mail com o motivo

> **Regra:** Uma operadora só pode ser processada uma vez (PENDING → APPROVED ou REJECTED). Não é possível reverter pela UI.

---

### 1.3 Aprovar ou Rejeitar Destinos

Destinos são localizações geográficas (ex: "Parque Nacional Serra da Capivara") criadas por condutores ou admins. Também precisam de aprovação antes de aparecer publicamente.

**Para ver destinos pendentes:**
- Acesse `/super-admin/destinos` (ou endpoint `GET /admin/destinations/pending`)
- A lista exibe: nome, estado, criado por, data

**Para aprovar:**
1. Clique em **Aprovar**
2. O destino passa a aparecer na listagem pública em `/destinos`

**Para rejeitar:**
1. Clique em **Rejeitar**
2. Informe o motivo
3. O criador pode ver o motivo e submeter novamente (após editar e reenviar para aprovação)

> **Atenção:** Um destino aprovado **não pode ser editado por guias**. Apenas o SUPER_ADMIN pode modificar um destino aprovado.

---

## Parte 2 — ADMIN (Operadora)

### 2.1 Cadastro da Operadora

O cadastro é feito diretamente pelo dono da operadora, sem depender de convite.

**Passos:**

1. Acesse `/onboarding` (ou clique em "Cadastrar agência ou guia" na página de login)
2. Preencha:
   - **Nome da operadora** — nome público que os turistas verão
   - **Slug** — identificador único na URL (ex: `minha-agencia` → `/minha-agencia/roteiros`). Apenas letras minúsculas, números e hífens. Use o botão de verificação de disponibilidade antes de salvar.
   - **CNPJ** — 14 dígitos (apenas números ou com formatação)
   - **E-mail** — será o login do admin
   - **Senha** — mínimo 8 caracteres
3. Clique em **Cadastrar**
4. Aguarde a aprovação do Super-Admin (você receberá um e-mail quando aprovado)

**Após aprovação:**
- Acesse `/login`
- Digite seu e-mail → sistema detecta sua operadora automaticamente
- Você será redirecionado para `/{seu-slug}/painel`

---

### 2.2 Configurar o Perfil da Operadora

Após o primeiro login:
- Acesse as configurações da operadora (`/{slug}/configuracoes` ou painel)
- Adicione **WhatsApp** para contato dos turistas

---

### 2.3 Adicionar Destinos

Antes de criar roteiros, é necessário vincular um **Destino** à operadora. O destino representa o local físico onde os passeios acontecem.

**Como criar um novo destino:**

1. No painel, vá em **Destinos → Novo Destino**
2. Preencha:
   - **Nome** — entre 3 e 100 caracteres (ex: "Parque Nacional Serra da Capivara")
   - **Descrição** — entre 10 e 1000 caracteres. Explique o local para o turista.
   - **Estado** — selecione a UF (sigla de dois dígitos)
   - **Fotos** — até 5 URLs de imagens do destino
   - **Destaques** — até 10 itens de texto (ex: "Pinturas rupestres de 12.000 anos"). Cada item: 5 a 200 caracteres.
3. Clique em **Enviar para aprovação**
4. Status: **PENDENTE** — aguarde o Super-Admin aprovar
5. Após aprovação, o destino aparece em `/destinos` e pode ser associado à operadora

> O campo **slug do destino** é gerado automaticamente a partir do nome.
> A **latitude e longitude** podem ser adicionadas para ativar o mapa interativo na página do destino.

---

### 2.4 Gerenciar Condutores (Guias)

**Convidar ou divulgar o link de cadastro:**
- O link de cadastro para condutores é: `/{seu-slug}/cadastro` (registro com `role=CONDUTOR`)
- Passe o link para os guias que farão parte da sua operadora

**Aprovar um Condutor:**
1. Vá em **Painel → Condutores → Pendentes**
2. Veja nome, e-mail e CPF (mascarado) do candidato
3. Clique em **Aprovar** — o guia recebe e-mail de confirmação e passa a poder criar roteiros e slots
4. Para rejeitar, clique em **Rejeitar** e informe o motivo

> **Importante:** Um condutor não aprovado (`PENDING`) não consegue criar slots mesmo que já tenha acesso ao painel.

---

### 2.5 Criar Roteiros (Pacotes de Turismo)

O Admin pode criar roteiros diretamente, além dos condutores.

**Como criar um roteiro:**

1. Vá em **Roteiros → Novo Roteiro**
2. Preencha:
   - **Nome** — nome do passeio/roteiro
   - **Descrição** — detalhes do que o turista vai viver
   - **Duração** — em minutos (ex: `240` para 4 horas)
   - **Duração mínima (horas)** e **máxima (horas)** — faixas usadas para conflito de agenda
   - **Buffer** — tempo em minutos entre passeios do mesmo guia (descanso/deslocamento)
   - **Preço** — valor em R$ (ex: `150.00`)
   - **Dificuldade** — `EASY`, `MODERATE` ou `HARD`
   - **Capacidade** — número máximo de participantes por slot
   - **Fotos** — até 5 URLs de fotos do roteiro
   - **Destaques** — pontos fortes do roteiro
3. Clique em **Criar Roteiro**

---

### 2.6 Qualificar Guias para Roteiros

Para que um condutor possa guiar um roteiro específico, ele precisa ser **qualificado** (vinculado ao roteiro via `PackageGuide`).

**Como qualificar:**
1. Abra o roteiro → aba **Guias Qualificados**
2. Selecione o condutor aprovado da lista
3. Clique em **Adicionar Guia**
4. Para remover a qualificação, clique em **Desativar** — isso **não** cancela slots já abertos

---

### 2.7 Criar Slots (Datas de Saída)

Slots são as instâncias específicas de um roteiro (data, hora e guia responsável).

**Como criar um slot:**

1. Abra o roteiro → aba **Slots** → **Novo Slot**
2. Preencha:
   - **Data e hora de início** — selecione a data e hora de partida
   - **Capacidade máxima** — quantas pessoas podem reservar
   - **Capacidade mínima** — mínimo para o passeio sair (ex: 4 pessoas). Abaixo deste número o passeio pode ser cancelado.
   - **Guia responsável** — selecione entre os guias qualificados para este roteiro
3. Clique em **Criar Slot**

> **Conflito de agenda:** O sistema verifica automaticamente se o guia selecionado tem outro slot ativo sobreposto (considerando duração + buffer). Se houver conflito, o sistema exibe o nome do guia, o roteiro conflitante e os horários de início e fim — e bloqueia a criação.

---

### 2.8 Cancelar um Slot

1. Abra o roteiro → aba **Slots**
2. Clique no slot → **Cancelar Slot**
3. Todas as reservas **PENDENTES** do slot são canceladas automaticamente
4. Reservas já **CONFIRMADAS** devem ser tratadas manualmente (reembolso via Mercado Pago)

---

### 2.9 Ver Reservas

**Visão geral das reservas da operadora:**
- Painel → **Reservas** (ou `GET /tenants/:slug/bookings` autenticado)
- Filtros por status: PENDING, CONFIRMED, CANCELLED, etc.

**Cada reserva exibe:**
- Nome e e-mail do turista
- Telefone de contato
- Número de participantes (pax)
- Status do pagamento
- Voucher gerado (código único)

---

## Parte 3 — CONDUTOR (Guia)

### 3.1 Cadastro do Condutor

1. Acesse o link fornecido pela operadora: `/{slug-da-operadora}/cadastro`
   - Alternativamente: acesse a página inicial da operadora e clique em **Seja um guia**
2. Selecione **Quero ser guia/condutor**
3. Preencha:
   - **Nome completo**
   - **E-mail**
   - **Senha** — mínimo 8 caracteres
   - **CPF** — 11 dígitos numéricos (sem pontos ou traços). O CPF é armazenado de forma hasheada (LGPD).
4. Clique em **Cadastrar**
5. Aguarde o **Admin da operadora** aprovar seu cadastro (você receberá e-mail quando aprovado)

---

### 3.2 Primeiro Acesso — Login

1. Acesse `/login`
2. Digite seu **e-mail**
3. O sistema detecta automaticamente sua operadora (sem precisar saber o slug)
4. Digite a **senha** e clique em **Entrar**
5. Você é redirecionado para `/{slug}/painel`

**Esqueceu a senha?**
1. Na tela de login, clique em **Esqueci minha senha**
2. Digite seu e-mail
3. Você recebe um link de redefinição por e-mail (válido por tempo limitado)
4. Clique no link → defina nova senha

---

### 3.3 Completar o Perfil

Antes de criar roteiros, complete seu perfil de guia para aparecer bem na vitrine pública.

**Acesse:** Painel → **Meu Perfil** (ou `PATCH /tenants/:slug/guides/me/profile`)

**Campos disponíveis:**

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **Bio** | Apresentação pessoal | "Sou guia credenciado pelo IBAMA há 10 anos..." |
| **Foto** | URL de uma foto de perfil | `https://cdn.exemplo.com/foto.jpg` |
| **Especialidades** | Lista de competências | `["Arqueologia", "Trekking", "Fotografia"]` |
| **Regiões** | Onde você atua | `["Serra da Capivara", "Parque do Catimbau"]` |
| **Fotos do portfólio** | Até N URLs de fotos de passeios anteriores | URLs de imagens |

Clique em **Salvar Perfil**.

---

### 3.4 Criar Destinos

Se o destino onde você atua ainda não existe na plataforma:

1. Painel → **Destinos → Novo Destino**
2. Preencha nome, descrição, estado, fotos e destaques (ver seção 2.3)
3. Envie para aprovação — o Super-Admin avaliará
4. Após aprovação, o destino fica disponível para associar à sua operadora

> **Atenção:** Você só pode **editar ou excluir** destinos que você mesmo criou, e apenas enquanto o status for `PENDENTE`. Destinos aprovados são imutáveis para condutores.

---

### 3.5 Criar Roteiros

1. Painel → **Meus Roteiros → Novo Roteiro**
2. Preencha todos os campos (ver seção 2.5)
3. Clique em **Criar**

> O roteiro é criado associado a você como `conductorId`. Você pode editar ou inativar apenas os roteiros que você criou (Admins podem editar qualquer roteiro da operadora).

**Adicionar fotos ao roteiro:**
- Após criar, acesse o roteiro → **Fotos** → adicione até 5 URLs
- Use o botão de upload se disponível, ou cole URLs diretas de imagens hospedadas (Cloudflare R2 ou similar)

---

### 3.6 Abrir Slots (Agenda)

Para que turistas possam reservar, você precisa abrir **slots** no seu roteiro.

1. Abra o roteiro → **Slots → Novo Slot**
2. Preencha (ver seção 2.7)
3. No campo **Guia responsável**, selecione **você mesmo** (ou outro guia qualificado)
4. Clique em **Criar Slot**

**Boas práticas:**
- Crie slots com **antecedência mínima de 48h** para dar tempo ao turista de pagar o PIX
- Defina a **capacidade mínima** com cuidado — slots que não atingirem o mínimo podem ser cancelados
- O **buffer** entre slots evita que você seja alocado em dois passeios sobrepostos

**Ver sua agenda:**
- Painel → **Minha Agenda** — lista todos os seus slots futuros com status

---

### 3.7 Acompanhar Reservas dos Seus Roteiros

1. Painel → **Reservas** (ou `GET /tenants/:slug/guides/me/bookings`)
2. Você vê: nome do turista, e-mail, telefone, número de pessoas, slot, status

**Status possíveis:**

| Status | Significado |
|--------|-------------|
| `PENDING` | Aguardando pagamento PIX (expira em 30 min) |
| `CONFIRMED` | PIX pago — turista confirmado |
| `CHECKED_IN` | Turista realizou check-in no dia |
| `COMPLETED` | Passeio concluído |
| `CANCELLED` | Cancelado (turista ou operadora) |
| `EXPIRED` | Não pagou no prazo |
| `NO_SHOW` | Não compareceu |

---

### 3.8 Dados e Privacidade (LGPD)

Como usuário da plataforma, você tem direitos sobre seus dados:

- **Exportar meus dados:** `GET /tenants/:slug/users/me/export` — retorna seus dados pessoais e histórico de reservas
- **Excluir minha conta:** `DELETE /tenants/:slug/users/me` — anonimiza seus dados pessoais. O histórico de transações é preservado por obrigação legal, mas seus dados pessoais são removidos.

---

## Parte 4 — Turista (Fluxo de Reserva)

> O turista **não precisa criar conta** para reservar. O checkout é feito como convidado (guest checkout).

### 4.1 Descobrir Destinos e Roteiros

1. Acesse a página inicial do CAPI
2. Navegue pelos **destinos** disponíveis em `/destinos`
3. Clique em um destino para ver:
   - Fotos e descrição
   - **Roteiros disponíveis** → `/destinos/{slug}/roteiros`
   - **Guias disponíveis** → `/destinos/{slug}/guias`
4. Clique em um roteiro para ver detalhes, fotos, dificuldade, preço e guias qualificados
5. Clique em um guia para ver seu perfil, especialidades e roteiros que ele atende

---

### 4.2 Fazer uma Reserva

1. Na página do roteiro, selecione uma **data de saída** (slot disponível)
2. Informe:
   - **Nome completo**
   - **E-mail** — receberá a confirmação e o voucher
   - **Telefone**
   - **CPF** — necessário para emissão do pagamento PIX (validado matematicamente)
   - **Número de participantes** (pax)
3. Clique em **Reservar**
4. O sistema gera um **QR Code PIX** e uma URL de pagamento via Mercado Pago

---

### 4.3 Pagar via PIX

1. Abra o app do seu banco
2. Escaneie o **QR Code PIX** ou copie o código e cole em "Pagar com PIX → Copia e Cola"
3. Confirme o valor e pague
4. **Prazo:** 30 minutos. Após esse prazo, a reserva expira automaticamente e o slot é liberado.
5. Após o pagamento ser confirmado pelo Mercado Pago:
   - Você recebe um **e-mail de confirmação** com o **código do voucher**
   - A página de confirmação atualiza o status automaticamente (a cada ~5 segundos, sem precisar recarregar)

---

### 4.4 Cancelar uma Reserva (Self-Service)

Caso precise cancelar:

1. No e-mail de confirmação, clique no link de cancelamento
   - Ou acesse a página de autoatendimento e informe **e-mail + código do voucher**
2. Confirme o cancelamento
3. O sistema registra o cancelamento
4. Para reembolso, entre em contato com a operadora — o CAPI não processa estornos automaticamente no MVP atual

---

## Apêndice A — Fluxo Completo de Onboarding

```
[ADMIN]
  ↓ cadastra operadora em /onboarding
  ↓ aguarda Super-Admin aprovar (recebe e-mail)
  ↓ faz login → painel da operadora
  ↓ cria/associa Destino
  ↓ convida Condutores (compartilha link /{slug}/cadastro)
  ↓ aprova Condutores no painel
  ↓ Condutor cria roteiros e slots
  ↓ Turistas reservam e pagam via PIX

[CONDUTOR]
  ↓ cadastra-se em /{slug}/cadastro com CPF
  ↓ aguarda Admin aprovar (recebe e-mail)
  ↓ completa perfil (bio, foto, especialidades, regiões)
  ↓ cria Roteiros
  ↓ Admin qualifica Condutor nos Roteiros
  ↓ Condutor abre Slots na agenda
  ↓ Reservas chegam por e-mail e no painel

[SUPER_ADMIN]
  ↓ monitora /super-admin/operadoras
  ↓ aprova operadoras com CNPJ válido
  ↓ monitora /super-admin/destinos
  ↓ aprova destinos submetidos
```

---

## Apêndice B — Regras e Restrições Importantes

| Regra | Detalhe |
|-------|---------|
| **Condutor só edita o que criou** | Um CONDUTOR só pode editar/excluir roteiros com `conductorId === seu ID` |
| **Destino aprovado é imutável para guias** | Após aprovação do Super-Admin, guias não podem alterar o destino |
| **CPF validado matematicamente** | CPF com dígitos verificadores inválidos (ex: `111.111.111-11`) é rejeitado com erro 422 antes do pagamento |
| **Anti-overbooking transacional** | Duas reservas simultâneas para o mesmo slot nunca resultam em mais reservas do que a capacidade — usa `prisma.$transaction` com lock pessimista |
| **Conflito de agenda do guia** | O sistema bloqueia slot se o guia já tem outro slot sobreposto (janela = duração máxima + buffer) |
| **PIX expira em 30 minutos** | Reservas não pagas são canceladas automaticamente por job agendado (cron) |
| **Rate limiting** | Login: 20 tentativas/min · Reservas: 60/min · Cadastro de operadora: 5/hora |
| **E-mails transacionais** | Operadora aprovada · Guia aprovado · Reserva criada · Reserva cancelada · Guia notificado de nova reserva |

---

## Apêndice C — URLs de Referência

| Página | URL |
|--------|-----|
| Home / Discovery | `/` |
| Login global | `/login` |
| Cadastro de operadora | `/onboarding` |
| Cadastro de guia | `/{slug}/cadastro` |
| Painel da operadora | `/{slug}/painel` |
| Roteiros do destino | `/destinos/{slug}/roteiros` |
| Detalhe do roteiro | `/destinos/{slug}/roteiros/{id}` |
| Guias do destino | `/destinos/{slug}/guias` |
| Perfil do guia | `/destinos/{slug}/guias/{id}` |
| Painel Super-Admin | `/super-admin/operadoras` |
