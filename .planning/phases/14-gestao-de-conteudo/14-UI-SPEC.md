---
phase: 14
slug: gestao-de-conteudo
status: approved
reviewed_at: 2026-06-08
shadcn_initialized: false
preset: none
created: 2026-06-08
---

# Phase 14 — UI Design Contract

> Visual and interaction contract para Gestão de Conteúdo (destinos + enriquecimento de roteiros). Gerado por gsd-ui-researcher, verificado por gsd-ui-checker.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — custom inline styles + Tailwind CSS v4 |
| Preset | not applicable |
| Component library | @radix-ui/react-dialog (herdado Phase 13) |
| Toast library | sonner (herdado Phase 13) |
| Icon library | none — texto e Unicode como indicadores visuais |
| Font display | var(--font-playfair) via CSS var |
| Font body | var(--font-source) via CSS var |

**shadcn gate:** `components.json` não encontrado. Projeto usa design system manual com CSS variables + inline styles. Sem shadcn. Registry safety gate: não aplicável.

**Herança:** Este contrato herda e estende o contrato da Phase 13 (aprovado 2026-06-03). Tokens de cor, tipografia e espaçamento são idênticos. Novas adições documentadas explicitamente abaixo.

---

## Spacing Scale

Múltiplos de 4 — idêntico à Phase 13.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Gap interno de badge, icon gaps |
| sm | 8px | Gap entre botões, padding de badge de status |
| md | 16px | Padding de formulário, gap padrão entre campos |
| lg | 24px | Padding de página, section breaks |
| xl | 32px | Layout gaps principais |
| 2xl | 48px | Padding vertical de empty state |
| 3xl | 64px | Page-level spacing reservado |

**Exceções:**
- Touch targets: mínimo 44×44px em todos os botões interativos (herdado Phase 13 D-15).
- Grid de fotos da galeria: gap de 8px entre thumbnails.
- Área de drop para upload: padding interno 32px vertical × 24px horizontal.

---

## Typography

Idêntico à Phase 13. Registrado aqui para completude.

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Body | 16px | 400 | 1.6 | Descrições de campos, corpo de formulário, subtexto |
| Label | 14px | 400 | 1.5 | Labels de campo, texto secundário em cards, badges de estado |
| Heading | 24px | 600 | 1.2 | Título de página ("Meus Destinos", "Novo Destino"), título de empty state |
| Eyebrow | 11px | 400 | 1.2 | Badge de approvalStatus (PENDENTE / APROVADO / REJEITADO) |

**Regra crítica — iOS Safari zoom:** todos os `<input>`, `<select>`, `<textarea>` devem ter `font-size: 16px` mínimo — em especial o select de estados e o input de título do destino.

---

## Color

Tokens do `globals.css`. Paleta earthy — idêntica à Phase 13.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `var(--stone-50)` = #FAFAF7 | Background das páginas do painel (lista de destinos, formulário) |
| Secondary (30%) | `var(--stone-100)` = #F5F0E8 / `white` | Cards de destino na lista, fundo de área de upload, fundo do super-admin panel |
| Accent (10%) | `var(--ochre)` = #C4852A | Reservado para: botão "Salvar destino", botão "Publicar", CTA primário de empty state ("Criar primeiro destino") |
| Destructive | `#DC2626` | Reservado para: botão "Deletar destino" no dialog de confirmação, toast de erro de upload |
| Semantic — success | `#15803D` | Toast de sucesso (upload concluído, destino salvo, aprovação do admin) |
| Semantic — warning | `#B45309` | Badge PENDENTE (approvalStatus) |
| Semantic — rejected | `#DC2626` com `background: #FEF2F2` | Badge REJEITADO (approvalStatus) — texto vermelho em fundo vermelho claro |
| Semantic — approved | `#15803D` com `background: #F0FDF4` | Badge APROVADO — texto verde em fundo verde claro |

**Accent reserved for:** "Salvar destino", "Publicar", CTA de empty state. Nunca usar em badges de status, thumbnails, ou elementos informativos passivos.

**Badge de approvalStatus — especificação completa:**
- PENDENTE: `background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A`
- APROVADO: `background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0`
- REJEITADO: `background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA`
- Todos: `fontSize: 11px; fontWeight: 400; padding: 4px 8px; borderRadius: 12px`

---

## Copywriting Contract

| Elemento | Copy |
|----------|------|
| Primary CTA — criação | "Criar destino" |
| Primary CTA — formulário | "Salvar destino" |
| CTA de enriquecimento de roteiro | "Salvar alterações" |
| Botão de upload de foto | "Adicionar foto" |
| Empty state — lista de destinos (guia sem destinos) | Heading: "Nenhum destino ainda" / Body: "Crie seu primeiro destino para aparecer no marketplace." / CTA: "Criar destino" |
| Empty state — galeria de fotos do roteiro | Heading: "Nenhuma foto adicionada" / Body: "Adicione até 5 fotos para ilustrar este roteiro." / CTA: "Adicionar foto" |
| Empty state — lista de destinos (super-admin, sem pendentes) | Heading: "Nenhum destino pendente" / Body: "Todos os destinos foram revisados." / Sem CTA |
| Error state — upload falhou | "Falha no upload. Verifique o tamanho (máx. 5MB) e o formato (JPEG, PNG ou WebP) e tente novamente." |
| Error state — formulário inválido | "Preencha os campos obrigatórios antes de salvar." |
| Error state — destino não encontrado | "Destino não encontrado. Ele pode ter sido removido." |
| Confirmação destrutiva — deletar destino | Dialog: "Excluir este destino?" / Subtexto: "Esta ação não pode ser desfeita. O destino será removido do marketplace." / Botão confirmar: "Sim, excluir" / Botão cancelar: "Manter destino" |
| Confirmação destrutiva — remover foto da galeria | Toast inline: "Foto removida." com undo não implementado (MVP) |
| Badge PENDENTE — tooltip/label auxiliar | "Aguardando aprovação do administrador" |
| Badge REJEITADO — tooltip/label auxiliar | "Destino não aprovado. Entre em contato com o suporte." |

---

## Component Inventory

### `DestinationStatusBadge` (novo)
**Path:** `apps/web/src/components/ui/DestinationStatusBadge.tsx`
**Props:** `status: 'PENDING' | 'APPROVED' | 'REJECTED'`
**Visual:** conforme tabela de cores acima. `display: inline-flex; alignItems: center; gap: 4px`.
**Label por status:** PENDING → "Pendente", APPROVED → "Aprovado", REJECTED → "Rejeitado".

### `DestinationForm` (novo — painel do guia)
**Path:** `apps/web/src/app/[slug]/(painel)/destinos/novo/page.tsx` e `/[id]/editar/page.tsx`
**Layout:** formulário único em página — sem wizard/steps (CONTEXT.md D-11).
**Campos:**
- Nome do destino: `<input type="text">`, `fontSize: 16px`, `padding: 12px`, `borderRadius: 4px`, `border: 1px solid var(--stone-300)`
- Descrição: `<textarea>`, mínimo 4 linhas, mesmos estilos
- Estado (UF): `<select>` com 27 opções (26 estados + DF), em ordem alfabética por nome completo, valor = sigla (AC, AL... TO)
- Foto de capa: área de upload — ver `PhotoUploadArea` abaixo
**Botão salvar:** `background: var(--ochre)`, branco, `width: 100%`, `padding: 12px`, `minHeight: 44px`, `borderRadius: 4px`, `fontSize: 16px`, `fontWeight: 600`
**Botão cancelar/voltar:** texto link simples, `color: var(--stone-500)`, sem fundo, `minHeight: 44px`

### `PhotoUploadArea` (novo — reutilizável em destino e roteiro)
**Path:** `apps/web/src/components/ui/PhotoUploadArea.tsx`
**Props:** `photos: string[]`, `onAdd: (file: File) => Promise<void>`, `onRemove: (url: string) => void`, `maxPhotos: number` (default 5), `uploading?: boolean`
**Visual:**
- Grid de thumbnails: `display: grid; gridTemplateColumns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px`
- Cada thumbnail: `width: 80px; height: 80px; objectFit: cover; borderRadius: 4px; position: relative`
- Botão remover foto: × no canto superior direito do thumbnail, `background: rgba(0,0,0,0.6); color: white; width: 20px; height: 20px; borderRadius: 50%; fontSize: 12px; position: absolute; top: 4px; right: 4px; aria-label: "Remover foto"`
- Botão "Adicionar foto" (quando abaixo do limite): `border: 2px dashed var(--stone-300); background: var(--stone-50); width: 80px; height: 80px; borderRadius: 4px; display: flex; flexDirection: column; alignItems: center; justifyContent: center; fontSize: 12px; color: var(--stone-400); cursor: pointer`
- Texto quando limite atingido: "5/5 fotos adicionadas" — `fontSize: 14px; color: var(--stone-500); marginTop: 8px`
- Estado uploading: botão "Adicionar foto" fica `opacity: 0.5; cursor: not-allowed` com texto "Enviando..."
**Formatos aceitos:** JPEG, PNG, WebP (`accept="image/jpeg,image/png,image/webp"`).
**Tamanho máximo:** 5MB — validar no cliente antes do upload; exibir toast de erro se exceder.

### `DestinationCard` (existente — estender)
**Path:** `apps/web/src/components/ui/DestinationCard.tsx` (existente)
**Adição Phase 14:** incluir `DestinationStatusBadge` sobreposto no canto superior esquerdo do thumbnail, apenas quando exibido no painel do guia (prop `showStatus?: boolean`).
**Botões de ação (apenas quando `isOwner === true`):** "Editar" e "Excluir" abaixo do card, `minHeight: 44px`, gap 8px entre eles.

### `DestinationListPage` (novo — painel do guia)
**Path:** `apps/web/src/app/[slug]/(painel)/destinos/page.tsx`
**Layout mobile-first:**
- Header: título "Destinos" (24px, weight 600) + botão "+ Criar destino" (ochre, direita, `minHeight: 44px`)
- Lista: cards em coluna única no mobile, grid 2 colunas em ≥ 640px
- Destinos do tenant inteiro visíveis; botões Editar/Excluir apenas nos próprios (D-12)

### `SuperAdminDestinationsPage` (novo — super-admin)
**Path:** `apps/web/src/app/super-admin/destinos/page.tsx`
**Layout:** lista de destinos com `approvalStatus: PENDING` primeiro, depois APPROVED e REJECTED.
**Cada item:** thumbnail 60×60px + nome + tenant slug + estado + badge de status + botões "Aprovar" e "Rejeitar".
**Botão "Aprovar":** `background: #15803D; color: white; padding: 8px 16px; minHeight: 36px; borderRadius: 4px; fontSize: 14px`
**Botão "Rejeitar":** `background: #DC2626; color: white; padding: 8px 16px; minHeight: 36px; borderRadius: 4px; fontSize: 14px`
**Feedback:** toast de sucesso via Sonner após ação de aprovação/rejeição.

### `ItineraryEnrichmentSection` (novo — painel do guia, dentro do roteiro)
**Path:** dentro da página existente de detalhes do roteiro no painel.
**Layout:** seção abaixo das informações existentes do roteiro, separada por `<hr>` com `borderColor: var(--stone-200)`.
**Subseções:**
1. "Fotos do roteiro" — `PhotoUploadArea` com `maxPhotos={5}`
2. "Experiências incluídas" — lista de inputs de texto, um por experiência
   - Cada input: `fontSize: 16px; padding: 8px 12px; borderRadius: 4px; border: 1px solid var(--stone-300); width: 100%`
   - Botão "+" para adicionar experiência: text button, `color: var(--ochre); fontSize: 14px; fontWeight: 600; minHeight: 44px`
   - Botão "×" para remover: `color: var(--stone-400); fontSize: 16px; marginLeft: 8px; minHeight: 44px; minWidth: 44px`
**Botão "Salvar alterações":** `background: var(--ochre)`, branco, `width: 100%`, `padding: 12px`, `minHeight: 44px`, `borderRadius: 4px`, `fontSize: 16px`, `fontWeight: 600`

---

## Interaction Contracts

### Upload de foto
1. Usuário clica em "Adicionar foto" → `<input type="file">` oculto é acionado via `ref.click()`
2. Arquivo selecionado → validação cliente (tipo + tamanho) antes do POST
3. Se inválido → toast de erro imediato, sem request
4. Se válido → `uploading: true` (botão desabilita) → POST para endpoint de upload → recebe URL → `photos[]` atualizado → `uploading: false`
5. Thumbnail aparece no grid imediatamente após URL recebida

### Criação de destino (fluxo completo)
1. Guia clica "+ Criar destino" → navega para `/[slug]/painel/destinos/novo`
2. Preenche formulário → faz upload da foto de capa (opcional — foto pode ser adicionada depois)
3. Clica "Salvar destino" → validação Zod no cliente → POST para API
4. Sucesso → redirect para `/[slug]/painel/destinos` + toast "Destino criado. Aguardando aprovação."
5. Na lista → card do destino aparece com badge PENDENTE

### Aprovação pelo super-admin
1. Admin acessa `/super-admin/destinos`
2. Vê lista de PENDING primeiro
3. Clica "Aprovar" ou "Rejeitar" → PATCH para API
4. Toast de sucesso → item some da seção PENDING e aparece em APPROVED/REJECTED
5. Guia: na próxima visita ao painel, badge do destino muda para APROVADO/REJEITADO

### Delete de destino
1. Guia clica "Excluir" no card → abre `CancelDialog` adaptado (título: "Excluir este destino?")
2. Confirma → DELETE para API → redirect/reload + toast "Destino excluído."
3. Card some da lista

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | nenhum | não aplicável |
| third-party | nenhum | não aplicável |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
