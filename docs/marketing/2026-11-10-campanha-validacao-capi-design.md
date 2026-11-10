# Campanha de Validação CAPI — Documento de Design

*2026-11-10 · Status: rascunho para aprovação*

> Este documento descreve **o que** a campanha precisa entregar e **por quê**. Depois de aprovado, vira o kit de campanha (copys, criativos, calendário, roteiros de abordagem, setup do teste pago) e uma pequena spec de produto.

---

## 1. Intenção e o porquê

A CAPI já está no ar com os destinos **Serra da Capivara** (São Raimundo Nonato e Coronel José Dias) e **Serra das Confusões**, com roteiros cadastrados — mas **sem nenhum guia cadastrado**. Antes de investir em escala, a equipe quer responder três perguntas:

1. **Existe interesse real?** Turistas querem encontrar e reservar guia local por uma plataforma, em vez de só por indicação ou agência?
2. **Os guias topam?** Guias e agências enxergam valor numa vitrine gratuita e se engajam a ponto de divulgar o próprio perfil?
3. **Quanto custa crescer?** Qual o custo de trazer um lead quando se coloca dinheiro (mesmo pouco)?

A visão de longo prazo é uma **rede de turismo regional** — Dunas do São Francisco, Cânions do Viana e outros destinos próximos entram depois. A campanha nasce na Capivara/Confusões, mas a narrativa já fala de "região", não de um parque só.

## 2. Objetivos

**Objetivo primário (60 dias, ~16/nov/2026 → ~15/jan/2027):** chegar ao ponto em que a plataforma tem oferta e demanda suficientes para se sustentar, medido por:

| # | Meta | Alvo | Como medir |
|---|------|------|-----------|
| M1 | Guias aprovados (Cadastur/ICMBio) | **15+**, cobrindo Capivara e Confusões | Painel super-admin / banco |
| M2 | Agências/associações parceiras | **3+** | Onboarding concluído |
| M3 | Leads de turistas (nome + WhatsApp) | **300+** | Tabela de leads (ver §7) |
| M4 | Pedidos repassados a guias / reservas fechadas | **20+ / 5+** | Planilha de acompanhamento + `Booking` |
| M5 | Custo por lead no teste pago | **≤ R$ 3** | Meta Ads Manager + leads com `utm_source=meta` |
| M6 | Guias que divulgam o próprio perfil CAPI | **50%+** dos aprovados | Visitas com `utm_source=guia` + checagem manual |

**Hipóteses que a campanha testa** (cada meta acima responde a uma):

- **H1 — Oferta:** guias aceitam se cadastrar quando a proposta é "vitrine grátis, sem taxa" (M1, M2).
- **H2 — Demanda:** turistas deixam contato para um roteiro guiado na região (M3).
- **H3 — Conversão:** lead vira conversa com guia e parte vira reserva (M4).
- **H4 — Eficiência:** dá para gerar lead barato o bastante para escalar (M5).
- **H5 — Efeito rede:** guias viram canal de divulgação gratuito da CAPI (M6).

### Não-objetivos
- Escalar vendas ou volume de reservas.
- Construir marca nacional ou campanha institucional.
- Lançar os destinos de expansão (Dunas, Viana) — só mencioná-los como "em breve".
- Cobrar qualquer coisa dos guias.

### Anti-objetivos (seria fracasso mesmo "funcionando")
- **Vitrine vazia:** mandar turista para o app antes de ter guias — queima lead e reputação.
- **Lead que ninguém atende:** captar contato e não responder em até 24 h.
- **Prometer o que o app não faz:** ex.: "reserve e pague agora" se o fluxo de pagamento não estiver ativo para aquele guia.
- **Parecer concorrente das agências e dos guias:** a CAPI é vitrine e canal, não intermediária que "rouba" cliente.
- **Gastar o orçamento sem aprender:** anúncio rodando sem UTM, sem pixel ou sem comparação entre criativos.

## 3. Restrições

- **Dinheiro:** praticamente zero. ~**R$ 300** reservados só para o teste pago, liberados apenas quando houver **≥ 10 guias aprovados**. Todo o resto é orgânico, parceria e trabalho da equipe.
- **Equipe:** a própria equipe CAPI, pequena, com poucas horas por semana, **com gente fisicamente em São Raimundo Nonato / Coronel José Dias** — a Fase 1 é corpo a corpo (visitas a guias, associações, agências e pousadas) e a equipe produz foto e vídeo reais. Tudo precisa ser produzível com **celular + Canva + WhatsApp Business**.
- **Reserva e pagamento pelo app:** durante a campanha o turista **reserva e paga pela CAPI** (PIX via Mercado Pago). Hoje o pagamento cai numa conta Mercado Pago única da plataforma (`MP_ACCESS_TOKEN`), sem repasse automático — a CAPI recebe e repassa ao guia manualmente até o repasse automático existir (Fase 5 do roadmap). Para manter o "sem taxa", **a CAPI absorve a tarifa do Mercado Pago** nesta fase *(decisão minha — revisar)*. Guia sem agenda/roteiro configurado ainda pode receber o turista via WhatsApp como fallback.
- **Gratuidade:** guias e agências não pagam nada **por tempo indeterminado**, até a CAPI definir um modelo de sustentação. A copy diz "sem taxa, sem mensalidade" e **nunca** "para sempre" / "nunca vai cobrar" — para não criar uma promessa que o modelo futuro quebre.
- **Prazo:** 60 dias. Coincide com **férias de fim de ano** (pico de viagens) e com o **início das chuvas** no semiárido (caatinga verde) — os dois são ganchos de conteúdo.
- **Identidade visual:** usar a marca CAPI existente — paleta areia/ocre/terra, Playfair Display (títulos) + Plus Jakarta Sans (texto), logo CAPI, estética rupestre. Tagline: *"Caminho entre quem explora e quem opera."*
- **Regras do parque:** visitação à Serra da Capivara é feita com condutor credenciado — isso é argumento, não obstáculo ("você vai precisar de um guia de qualquer jeito; escolha o seu").
- **LGPD:** captura de lead com consentimento explícito e link para `/politica-privacidade`.

## 4. Públicos

**A. Guias/condutores (oferta) — prioridade nº 1 nas 3 primeiras semanas.**
Condutor credenciado em São Raimundo Nonato ou Coronel José Dias (também Serra das Confusões), que hoje vende por WhatsApp, Instagram pessoal, indicação de pousada ou via agência. Dor: depender de indicação, sazonalidade, pouca presença online. Quer: mais clientes sem pagar comissão, perfil profissional para mostrar. Relação hoje: **alguns contatos soltos, nenhuma relação formal.**

**B. Agências e associações de condutores (oferta + canal).**
Já são o canal de confiança do turista. Entram como **parceiras**: operam na CAPI sob a própria marca (é o modelo multi-tenant que já existe), ganham vitrine e ferramentas de agenda/reserva. **Os guias vinculados a uma agência aparecem na vitrine geral do destino** (a listagem pública de guias não filtra por agência) e contam para M1 — fechar uma agência com vários guias é o atalho mais rápido contra a vitrine vazia.

**C. Turistas (demanda).**
Nordestinos de capitais e cidades-polo próximas (Teresina, Petrolina/Juazeiro, Recife, Salvador, Fortaleza) e viajantes de ecoturismo/arqueologia de outras regiões. **Descobrem** o destino em redes sociais e pesquisa; **decidem** por indicação ou agência. A CAPI precisa ocupar o lugar do "amigo que já foi": prova social, rosto do guia, avaliação, resposta rápida no WhatsApp.

**D. Pousadas, hotéis e comércio local (canal de indicação).**
Já recebem a pergunta "vocês indicam um guia?". Cartaz/QR code no balcão vira ponto de captação gratuito.

## 5. Mensagens

**Nome da campanha (proposta):** *"Serra com quem é de lá"*

| Público | Mensagem central | Apoio |
|---------|------------------|-------|
| Turista | **Conheça a Serra da Capivara com quem é de lá.** Escolha seu guia, veja o roteiro e reserve num lugar só. | Guias credenciados e aprovados · compare roteiros e preços · reserve e pague por PIX no app · tire dúvidas no WhatsApp · Patrimônio Mundial da UNESCO |
| Guia | **Sua vitrine na internet, de graça. Você guia, a CAPI divulga.** | Sem taxa, sem mensalidade · recebe o valor integral da reserva · perfil profissional com fotos e avaliações · roteiros e agenda num lugar só · a CAPI investe em anúncio para trazer turista até você |
| Agência/associação | **Sua operação com vitrine própria, agenda e reservas — sem custo.** | Página com sua marca · guias vinculados à sua agência · reservas organizadas |
| Pousada/comércio | **Seu hóspede pergunta por guia? Aponte para a CAPI.** | QR code no balcão · hóspede bem atendido volta e indica |

**Gancho de expansão (todas as peças, discreto):** "Serra da Capivara, Serra das Confusões e, em breve, mais caminhos da região."

## 6. Canais e fases

**Princípio de ordem: oferta antes de demanda.** Nenhum tráfego (orgânico pesado ou pago) para turista antes de ≥ 10 guias aprovados.

| Fase | Semanas | Foco | Canais (custo) |
|------|---------|------|----------------|
| **0. Preparação** | S1 | Produto pronto para captar e medir; perfis sociais; materiais de abordagem | Ajuste no app (§7), Instagram + WhatsApp Business + Google Perfil da Empresa (grátis) |
| **1. Oferta** | S1–S3 | Recrutar guias e agências | Abordagem 1:1 por WhatsApp e presencial em SRN/CJD; consulta pública do Cadastur para mapear guias; associações de condutores; indicação guia→guia (grátis) |
| **2. Demanda orgânica** | S3–S8 | Conteúdo + guias divulgando + parceiros | Instagram (Reels/carrossel), TikTok (reaproveitando Reels), grupos e comunidades de viagem do Nordeste, pousadas com QR, kit de divulgação para cada guia (grátis) |
| **3. Teste pago** | S4–S6 | Medir custo por lead | Meta Ads (Instagram/Facebook), ~R$ 300, 2–3 criativos competindo, público regional (PI, PE, BA, CE) com interesses de ecoturismo/arqueologia/trilhas |
| **4. Conversão e decisão** | S6–S8 | Lead → conversa → reserva; leitura dos resultados | WhatsApp da equipe + guias; relatório final com decisão seguir/ajustar/parar |

**Por que esses canais:** o turista descobre por rede social e decide por confiança → Instagram/Reels para descoberta, guia com rosto e WhatsApp para confiança. Os guias e pousadas são o canal mais barato que existe (zero) e o mais crível. Meta Ads entra só como instrumento de medição, não como motor.

**Fora do escopo agora:** Google Ads (busca de baixo volume e caro para o orçamento), influenciadores pagos, impressão de material em volume, eventos.

## 7. Pré-requisitos de produto (pequena spec separada)

A campanha depende de três ajustes no app — sem eles, os anti-objetivos "vitrine vazia" e "gastar sem aprender" acontecem:

1. **Captura de interesse do turista ("Quero fazer este roteiro" / "Me avise").** Nas páginas de destino e de roteiro: nome, WhatsApp, destino/roteiro, mês pretendido, consentimento LGPD. Salva no banco (hoje a action `apps/web/app/actions/waitlist.ts` só envia e-mail e não está ligada a nenhuma tela), registra evento no PostHog com as UTMs e notifica a equipe.
2. **Meta Pixel** no web (PageView + evento `Lead` na captura), para otimizar e montar público de remarketing.
3. **Link de divulgação do guia** com UTM padrão (`utm_source=guia&utm_campaign=<id-do-guia>`), para medir M6.

Também: confirmar que `NEXT_PUBLIC_POSTHOG_KEY` está configurada na Vercel (não está no ambiente local).

O detalhamento técnico fica para a spec/plano de implementação, seguindo o fluxo normal do projeto.

**Calendário relativo:** as semanas S1–S8 contam a partir do **Dia 1 = captura de lead e Pixel no ar**, não de data fixa. Os ajustes podem ser implementados neste repositório logo após a aprovação deste documento.

## 8. Operação dos leads e das reservas

- Todo lead recebe resposta em **até 24 h** pelo WhatsApp Business da CAPI (mensagem modelo no kit).
- Se há guia com agenda para aquele roteiro → mandar o link de reserva no app; se o guia ainda não tem agenda → apresentar 1–3 guias e passar o contato.
- Reservas pagas no app: a equipe repassa o valor ao guia manualmente (prazo e forma combinados no termo de adesão) até existir repasse automático.
- Se não há → lista de espera daquele destino, com aviso quando houver guia.
- Planilha simples de acompanhamento (lead → contatado → repassado → reservou) até existir painel no app.

## 9. Medição e cadência

- **Semanal (15 min):** guias aprovados, leads, pedidos repassados, reservas, gasto pago e CPL, posts publicados.
- **Fonte:** banco (guias, leads, reservas), PostHog (visitas por UTM, funil destino → roteiro → lead), Meta Ads Manager (gasto, CPL).
- **Leitura final (S8):** cada hipótese H1–H5 marcada como confirmada, parcial ou refutada, com a decisão de próximos passos.

## 10. Riscos

| Risco | Mitigação |
|-------|-----------|
| Guias desconfiam ("qual é a pegadinha?") | Abordagem presencial, termo simples "sem taxa", mostrar perfil pronto de um guia piloto, indicação entre guias |
| Poucos guias até S3 → teste pago atrasa | Teste pago só depende de ≥ 10 guias; se não houver, o tempo vai todo para oferta e o teste desliza 1–2 semanas |
| Leads sem resposta | Responsável fixo pelo WhatsApp, mensagens modelo, alerta de novo lead |
| Agências enxergam concorrência | Posicionar como canal e ferramenta, com a marca delas na página |
| Repasse manual atrasa ou gera desconfiança do guia | Prazo de repasse fixo e curto no termo, comprovante enviado ao guia, responsável único na equipe |
| Tarifa do Mercado Pago absorvida pela CAPI vira custo | No volume esperado (5–20 reservas) o custo é pequeno; registrar no relatório semanal para alimentar o modelo de sustentação |
| Chuva/estrada afastam turista em dez–jan | Usar como gancho ("caatinga verde"), mostrar condições reais, focar em datas e roteiros viáveis |

## 11. Decidido pelo usuário

- Campanha de **validação**: interesse, leads iniciais e força de mercado.
- Foco geográfico: Serra da Capivara (SRN, CJD) e Serra das Confusões; visão de **rede regional** com Dunas do São Francisco, Cânions do Viana etc.
- Guias: vitrine e propagador de marketing, **sem taxas**. Quanto mais guias e agências, melhor.
- Turista descobre por redes sociais/pesquisa; decide por indicação ou agência.
- Execução pela equipe CAPI, **com presença física em SRN/CJD**.
- Durante a campanha, **reserva e pagamento pelo app**.
- Gratuidade para guias e agências **por tempo indeterminado**, até a CAPI achar um modelo de sustentação.
- Metas M1–M6 e teste pago de ~R$ 300 aprovados.
- Formato: este documento no repositório; kit final como página compartilhável com a identidade visual CAPI.

## 12. Decisões minhas (para revisar)

- Nome da campanha "Serra com quem é de lá" e as mensagens da §5.
- Ordem oferta → demanda, com gatilho de ≥ 10 guias para o pago.
- Janela de 60 dias contada a partir do Dia 1 (captura + Pixel no ar), previsto para ~16/nov/2026.
- CAPI absorve a tarifa do Mercado Pago e faz repasse manual ao guia durante a validação.
- Copy de gratuidade sem "para sempre"/"nunca".
- Meta Ads como único canal pago; Google Ads fora.
- Públicos geográficos do pago (PI, PE, BA, CE).
- Pousadas como canal de indicação.
- Os três ajustes de produto da §7.

## 13. Deixado para quem executar

- Texto final de cada copy e o design de cada criativo (dentro das mensagens e da identidade acima).
- Distribuição exata do orçamento entre criativos e dias.
- Escolha de quais grupos/comunidades online usar.
- Calendário de posts dia a dia dentro das fases.
