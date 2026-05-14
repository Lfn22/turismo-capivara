import DestinationHero from '@/src/components/ui/DestinationHero';
import StickyDestinationNav from '@/src/components/layout/StickyDestinationNav';

const MOCK_ROUTES = [
  {
    id: '1',
    name: 'Baixão das Andorinhas',
    description: 'Espetáculo natural ao entardecer — milhares de andorinhas retornando ao ninho nas falésias.',
    duration: '3h',
    difficulty: 'Fácil',
    imageUrl: null,
    accent: '#C4852A',
  },
  {
    id: '2',
    name: 'Toca do Boqueirão',
    description: 'Maior sítio arqueológico do parque. Pinturas rupestres com 25.000 anos de história humana.',
    duration: '4h',
    difficulty: 'Moderado',
    imageUrl: null,
    accent: '#7D5E4A',
  },
  {
    id: '3',
    name: 'Circuito das Pedras Furadas',
    description: 'Formações rochosas únicas moldadas por milênios de erosão. Vista panorâmica da caatinga.',
    duration: '5h',
    difficulty: 'Moderado',
    imageUrl: null,
    accent: '#5C3D2A',
  },
];

export default function TestDestinationPage() {
  return (
    <>
      <style>{`
        /* ── Reset e base ────────────────────────────────────────── */
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Storytelling ─────────────────────────────────────── */
        .story-section {
          background: var(--stone-50);
          padding: clamp(3.5rem, 7vw, 6rem) clamp(1.5rem, 5vw, 3.5rem);
        }

        .story-inner {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(3rem, 6vw, 7rem);
          align-items: start;
        }

        .story-label {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ochre);
          margin-bottom: 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .story-label::before {
          content: '';
          display: block;
          width: 24px;
          height: 1px;
          background: var(--ochre);
          flex-shrink: 0;
        }

        .story-heading {
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.025em;
          color: var(--stone-900);
          margin-bottom: 2rem;
        }

        .story-heading em {
          font-style: italic;
          color: var(--ochre-dark);
        }

        .story-text p {
          font-size: clamp(0.95rem, 1.5vw, 1.05rem);
          line-height: 1.8;
          color: var(--stone-600);
          margin-bottom: 1.25rem;
        }

        .story-text p:last-child { margin-bottom: 0; }

        /* Card visual lateral */
        .story-visual {
          position: sticky;
          top: 2rem;
        }

        .story-card {
          border-radius: 4px;
          overflow: hidden;
          background: var(--stone-900);
          aspect-ratio: 3/4;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 2rem;
        }

        .story-card-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(160deg, var(--stone-700) 0%, var(--ochre-dark) 50%, var(--stone-900) 100%);
          opacity: 0.85;
        }

        .story-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%);
        }

        .story-card-content {
          position: relative;
          z-index: 1;
        }

        .story-card-stat {
          font-family: var(--font-display), Georgia, serif;
          font-size: 3.5rem;
          font-weight: 700;
          color: #fff;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .story-card-label {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.6);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-top: 0.4rem;
        }

        .story-highlights {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 2rem;
        }

        .story-highlight-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.85rem;
          color: var(--stone-500);
        }

        .story-highlight-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--ochre);
          flex-shrink: 0;
        }

        /* Mobile: stack em coluna */
        @media (max-width: 768px) {
          .story-inner {
            grid-template-columns: 1fr;
          }
          .story-visual {
            position: static;
            order: -1;
          }
          .story-card {
            aspect-ratio: 16/9;
            padding: 1.5rem;
          }
          .story-card-stat {
            font-size: 2.5rem;
          }
        }

        /* ── Rotas mais visitadas ─────────────────────────────── */
        .routes-section {
          background: var(--stone-900);
          padding: clamp(3.5rem, 7vw, 6rem) clamp(1.5rem, 5vw, 3.5rem);
        }

        .routes-header {
          max-width: 1100px;
          margin: 0 auto;
          margin-bottom: clamp(2.5rem, 5vw, 4rem);
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .routes-eyebrow {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ochre-light);
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .routes-eyebrow::before {
          content: '';
          display: block;
          width: 24px;
          height: 1px;
          background: var(--ochre-light);
        }

        .routes-heading {
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          font-weight: 700;
          letter-spacing: -0.025em;
          color: var(--stone-50);
          line-height: 1.1;
        }

        .routes-cta-link {
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ochre-light);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          white-space: nowrap;
          transition: gap 0.2s;
        }

        .routes-cta-link:hover { gap: 0.7rem; }

        /* Grid de cards */
        .routes-grid {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5px;
        }

        .route-card {
          position: relative;
          aspect-ratio: 2/3;
          overflow: hidden;
          cursor: pointer;
          background: var(--stone-800);
        }

        .route-card-bg {
          position: absolute;
          inset: 0;
          transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .route-card:hover .route-card-bg {
          transform: scale(1.04);
        }

        .route-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 55%);
          z-index: 1;
        }

        .route-card-content {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 2;
          padding: clamp(1.25rem, 3vw, 2rem);
        }

        .route-card-difficulty {
          display: inline-block;
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ochre-light);
          margin-bottom: 0.5rem;
        }

        .route-card-name {
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(1.1rem, 2.5vw, 1.5rem);
          font-weight: 700;
          line-height: 1.15;
          color: #ffffff;
          margin-bottom: 0.6rem;
        }

        .route-card-desc {
          font-size: clamp(0.78rem, 1.2vw, 0.88rem);
          line-height: 1.55;
          color: rgba(255,255,255,0.62);
          margin-bottom: 1rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .route-card-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.72rem;
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.04em;
        }

        .route-card-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #ffffff;
          background: var(--ochre);
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 2px;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.2s;
          pointer-events: all;
        }

        .route-card-btn:hover { background: var(--ochre-dark); }

        /* Mobile: scroll horizontal para os cards */
        @media (max-width: 768px) {
          .routes-grid {
            grid-template-columns: repeat(3, 80vw);
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            -webkit-overflow-scrolling: touch;
            gap: 1rem;
            padding-bottom: 1rem;
          }

          .route-card {
            scroll-snap-align: start;
            aspect-ratio: 3/4;
          }

          .routes-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        @media (max-width: 480px) {
          .routes-grid {
            grid-template-columns: repeat(3, 88vw);
          }
        }
      `}</style>

      {/* ── Nav sticky ─────────────────────────────────────────── */}
      <StickyDestinationNav
        destinationName="Serra da Capivara"
        destinationSlug="serra-da-capivara"
      />

      {/* ── 1. Hero cinematográfico ─────────────────────────────── */}
      <DestinationHero
        title="Serra da Capivara"
        subtitle="O maior acervo de arte rupestre das Américas. 25.000 anos de presença humana inscritos nas pedras da caatinga."
        state="Piauí · Brasil"
        heroImageUrl={null}
        heroImageBlurDataUrl={null}
      />

      {/* ── 2. Storytelling ────────────────────────────────────── */}
      <section className="story-section">
        <div className="story-inner">

          {/* Coluna de texto */}
          <div>
            <p className="story-label">Sobre o Destino</p>
            <h2 className="story-heading">
              Uma janela para os<br />
              <em>primórdios da humanidade</em>
            </h2>
            <div className="story-text">
              <p>
                Encravado no semiárido piauiense, o Parque Nacional Serra da Capivara guarda
                o maior e mais antigo conjunto de sítios arqueológicos das Américas. As pinturas
                rupestres registradas aqui reescreveram a cronologia da ocupação humana no
                continente — estendendo-a para além de 25.000 anos.
              </p>
              <p>
                Reconhecido pela UNESCO como Patrimônio Mundial em 1991, o parque abriga mais
                de 1.300 sítios catalogados distribuídos por uma paisagem única: falésias
                vermelhas, vales profundos e a vegetação resiliente da caatinga, que exibe
                cores surpreendentes de outubro a março.
              </p>
              <p>
                Cada roteiro é conduzido por guias certificados pelo ICMBio — profissionais
                que nasceram e cresceram neste território e carregam o conhecimento do lugar
                não apenas nos livros, mas na memória viva da região.
              </p>
            </div>

            {/* Destaques */}
            <div className="story-highlights">
              {[
                'Patrimônio Mundial UNESCO desde 1991',
                'Mais de 1.300 sítios arqueológicos registrados',
                'Pinturas rupestres de até 25.000 anos',
                'Guias certificados pelo ICMBio',
              ].map((item) => (
                <div key={item} className="story-highlight-item">
                  <div className="story-highlight-dot" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Card visual lateral */}
          <div className="story-visual">
            <div className="story-card">
              <div className="story-card-bg" />
              <div className="story-card-overlay" />
              <div className="story-card-content">
                <div className="story-card-stat">1.300+</div>
                <div className="story-card-label">Sítios arqueológicos</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 3. Rotas mais visitadas ─────────────────────────────── */}
      <section className="routes-section">
        <div className="routes-header">
          <div>
            <p className="routes-eyebrow">Roteiros</p>
            <h2 className="routes-heading">Rotas mais visitadas</h2>
          </div>
          <a href="/destinos/serra-da-capivara/guias" className="routes-cta-link">
            Ver todos os guias
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        <div className="routes-grid">
          {MOCK_ROUTES.map((route) => (
            <div key={route.id} className="route-card">
              {/* Background: placeholder colorido até ter imagem real */}
              <div
                className="route-card-bg"
                style={{
                  background: `linear-gradient(160deg, ${route.accent}cc 0%, var(--stone-900) 100%)`,
                }}
              />
              <div className="route-card-overlay" />
              <div className="route-card-content">
                <span className="route-card-difficulty">{route.difficulty}</span>
                <h3 className="route-card-name">{route.name}</h3>
                <p className="route-card-desc">{route.description}</p>
                <div className="route-card-meta">
                  <span>⏱ {route.duration}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* ── 4. CTA — Guias ──────────────────────────────────────── */}
      <style>{`
        .guides-cta {
          background: var(--stone-50);
          border-top: 1px solid var(--stone-200);
          padding: clamp(3rem, 6vw, 5rem) clamp(1.5rem, 5vw, 3.5rem);
          text-align: center;
        }

        .guides-cta__inner {
          max-width: 560px;
          margin: 0 auto;
        }

        .guides-cta__eyebrow {
          font-size: 0.66rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ochre);
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
        }

        .guides-cta__eyebrow::before,
        .guides-cta__eyebrow::after {
          content: '';
          display: block;
          width: 24px;
          height: 1px;
          background: var(--ochre);
          flex-shrink: 0;
        }

        .guides-cta__heading {
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(1.6rem, 3.5vw, 2.4rem);
          font-weight: 700;
          letter-spacing: -0.025em;
          color: var(--stone-900);
          line-height: 1.15;
          margin-bottom: 0.75rem;
        }

        .guides-cta__sub {
          font-size: clamp(0.88rem, 1.5vw, 1rem);
          color: var(--stone-500);
          line-height: 1.7;
          margin-bottom: 2rem;
        }

        .guides-cta__btn {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--stone-900);
          background: var(--ochre);
          text-decoration: none;
          padding: 1rem 2.25rem;
          border-radius: 2px;
          transition: background 0.2s, transform 0.15s;
        }

        .guides-cta__btn:hover {
          background: var(--ochre-dark);
          transform: translateY(-1px);
        }

        @media (max-width: 480px) {
          .guides-cta__btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
      <div className="guides-cta">
        <div className="guides-cta__inner">
          <p className="guides-cta__eyebrow">Guias disponíveis</p>
          <h2 className="guides-cta__heading">Escolha quem vai te guiar</h2>
          <p className="guides-cta__sub">
            Guias certificados pelo ICMBio, nascidos e criados na Serra da Capivara.
            Cada um com seus roteiros, especialidades e avaliações.
          </p>
          <a href="/destinos/serra-da-capivara/guias" className="guides-cta__btn">
            Ver guias disponíveis
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </>
  );
}
