# CAPI — UI/UX Redesign Spec

## Contexto

O frontend do CAPI tem problemas de consistência visual (estilos misturados — inline CSS, style tags, Tailwind), aparência genérica de template, falta de fluidez/animações, e responsividade mobile fragmentada. A identidade rupestre/natureza do CAPI não se traduz na experiência visual.

**Objetivo:** Transformar o CAPI de "site genérico estático" para uma experiência fluida, com identidade rupestre forte e polish profissional — páginas públicas primeiro, painel depois.

## Identidade Visual

- **Essência:** Rupestre, pedra, natureza — tecnologia conectando turista e natureza através dos guias
- **Paleta:** Stone neutral (50-900) + ochre (#C4852A) como destaque
- **Tipografia:** Playfair Display (display/títulos) + Source Sans Pro (body)
- **Direção:** Manter e refinar, evoluir em pontos específicos

## Três Camadas de Evolução

### 1. Movimento & Fluidez
- Scroll-reveal (IntersectionObserver nativo, sem bibliotecas)
- Hero com logo SVG animada (stroke-dasharray draw)
- Micro-interações em hover (cards, botões, logo nav)
- Transições entre páginas com sweep ochre + selo rupestre
- `prefers-reduced-motion: reduce` → tudo estático

### 2. Identidade Rupestre
- Logo vetorizada do PNG para SVG animável (só no hero)
- Separadores orgânicos com figuras rupestres (RupestreSeparator)
- Curvas orgânicas SVG no hero de destinos (não linhas retas)
- Texturas sutis de pedra nos backgrounds de seções escuras
- Figuras rupestres "ghost" como decoração em seções (opacity 4-6%)

### 3. Polish & Hierarquia
- Grid de espaçamento 8px (8, 16, 24, 32, 48, 64, 96)
- Escala tipográfica definida (5 tamanhos)
- 3 níveis de sombra padronizados
- Contraste melhor nos CTAs
- Espaço negativo generoso

## Abordagem de Estilização

**Tailwind-first + CSS dedicado para animações:**
- Tailwind para layout, espaçamento, cores, responsividade (~90%)
- CSS separado para animações complexas, keyframes, efeitos rupestres (~10%)
- Migrar inline `style={{}}` e `<style>` tags para Tailwind classes
- Cores via CSS variables / Tailwind config

## Estrutura CSS

```
apps/web/src/styles/
  ├── tokens.css          ← variáveis CSS (cores, espaçamento, tipografia, sombras)
  ├── animations.css      ← keyframes e classes de animação
  └── rupestre.css        ← elementos visuais rupestres (separadores, texturas)
```

## Navegação

### Páginas públicas — Mobile
- **Bottom nav fixa** com 4 abas: Home, Destinos, Explorar, Perfil
- Hamburger removido para rotas principais
- Ícones com label, aba ativa em ochre
- Safe area para iPhone (padding bottom)

### Páginas públicas — Desktop
- Nav horizontal no topo (existente, melhorado)
- Transparente no hero → sólido com blur no scroll
- Hover com underline ochre animado
- Logo com micro-animação (figuras "dançam" no hover)

### Painel
- Mantém sidebar/hamburger atual (mais opções)
- Recebe apenas tokens visuais (cores, tipografia)

## Componentes

### Públicos (novos)
```
apps/web/src/components/home/
  ├── HeroSection.tsx
  ├── HeroLogoAnimation.tsx    ← SVG animada (draw + dust)
  ├── DestinationsSection.tsx
  ├── GuidesSection.tsx
  ├── CTASection.tsx
  └── RupestreSeparator.tsx

apps/web/src/components/layout/
  ├── PublicNav.tsx             ← refatorar
  ├── BottomNav.tsx             ← NOVO
  ├── PublicLayout.tsx          ← NOVO
  └── StickyDestinationNav.tsx  ← ajustar tokens

apps/web/src/components/destination/
  ├── DestinationHero.tsx       ← refatorar (curva orgânica)
  ├── DestinationRoteiros.tsx   ← refatorar (cards com badges)
  └── OrganicDivider.tsx        ← NOVO

apps/web/src/components/roteiro/
  ├── RoteiroHero.tsx           ← refatorar (badges sobrepostos)
  ├── RoteiroGuideCard.tsx      ← refatorar
  └── FloatingCTA.tsx           ← NOVO (botão fixo mobile)
```

### Painel (novos)
```
apps/web/src/components/painel/
  ├── PainelCard.tsx
  ├── PainelMetric.tsx
  ├── PainelTable.tsx
  ├── PainelEmptyState.tsx
  ├── PainelPageHeader.tsx
  └── PainelButton.tsx
```

## Páginas — Detalhes

### Home
- Hero: logo SVG animada (figuras draw → arco → ponto → CAPI letras stagger → tagline → CTA)
- Animação roda uma vez por sessão (sessionStorage flag)
- Partículas de poeira durante draw
- Glow dourado atrás da logo
- Seções: Destinos (grid 3col desktop / scroll horizontal mobile) → Guias (fundo escuro + textura) → CTA final
- Separadores rupestres entre seções
- Scroll-reveal em todos os elementos

### Destino (`/destinos/[slug]`)
- Hero com curva orgânica SVG (não linha reta)
- Stats em linha: roteiros, guias, avaliação (números Playfair em ochre)
- Cards de roteiro com badges (duração, dificuldade) + preço + "Ver datas"
- Separadores rupestres entre seções

### Roteiro (`/destinos/[slug]/roteiros/[id]`)
- Hero com badges sobrepostos + preço
- Guide card clicável (foto, nome, avaliação, seta)
- Highlights em tags ochre
- Calendário de slots: dias disponíveis em ochre
- Floating CTA fixo mobile: preço + data + "Reservar"

### Painel
- Identidade CAPI sutil: Playfair nos títulos, ochre nos indicadores, stone para fundo
- Sem figuras rupestres ou texturas
- Componentes padronizados substituem implementações inline
- Consistência entre todas as telas

## Ordem de Implementação (Abordagem B)

| # | Entregável | Descrição |
|---|-----------|-----------|
| 1 | Fundação | tokens.css, animations.css, rupestre.css, config Tailwind |
| 2 | Home | Hero animado (vetorizar logo → SVG), seções, scroll-reveal |
| 3 | Navegação | BottomNav, PublicLayout, refatorar PublicNav |
| 4 | Destino | Hero curva orgânica, stats, cards roteiro com badges |
| 5 | Roteiro | Hero badges, guide card, slot picker, floating CTA |
| 6 | Guia | Perfil público — aplicar tokens |
| 7 | Explorar | Mapa — aplicar tokens |
| 8 | Painel | Componentes padronizados, migrar páginas |

## Decisões Técnicas

| Decisão | Motivo |
|---------|--------|
| IntersectionObserver nativo, sem AOS/framer-motion | Zero dependências, GPU-accelerated |
| SVG inline para logo animada, PNG para demais usos | Animação requer paths manipuláveis |
| CSS scroll-snap para carousel mobile | Nativo, sem swiper.js |
| sessionStorage para flag de animação hero | Uma vez por sessão |
| CSS media query para bottom nav (não JS) | Sem layout shift |
| Vetorização manual da logo a partir do PNG | Não existe arquivo vetorial original |

## Fora do Escopo

- Funcionalidades novas (é só visual/UX)
- Mudanças de API/backend
- Checkout/booking flow (Phase 18 separada)
- Testes E2E (Phase 23)

## Mockups de Referência

Mockups interativos salvos em `.superpowers/brainstorm/289-1785456467/content/`:
- `hero-final.html` — Hero animado completo com scroll
- `hero-mobile.html` — Mobile home + destino lado a lado
- `animation-showcase.html` — Catálogo de animações (4 demos)
- `navigation-demo.html` — Desktop vs mobile navigation
- `destino-roteiro.html` — Destino e roteiro em desktop + mobile
