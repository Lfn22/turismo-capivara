import Image from 'next/image';
import OrganicDivider from '@/src/components/destination/OrganicDivider';

const FALLBACK_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzlDNjMxOCIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzFGMEUwOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9InVybCgjZykiLz48L3N2Zz4=';

export interface DestinationHeroProps {
  title: string;
  subtitle: string | null;
  state: string;
  heroImageUrl: string | null;
  heroImageBlurDataUrl: string | null;
}

export default function DestinationHero({
  title,
  subtitle,
  state,
  heroImageUrl,
  heroImageBlurDataUrl,
}: DestinationHeroProps) {
  return (
    <>
      <style>{`
        /* ── Hero: full-screen cinematográfico ───────────────────── */
        .dest-hero {
          position: relative;
          width: 100%;
          height: 78dvh;
          min-height: 480px;
          max-height: 800px;
          overflow: hidden;
          background: var(--stone-900);
        }

        /* Camada de imagem — sticky parallax suave */
        .dest-hero__img {
          position: absolute;
          inset: 0;
          height: 78dvh;
          z-index: 0;
          /* Leve escala extra para permitir movimento vertical sem bordas brancas */
          transform: scale(1.06);
          transform-origin: center center;
          transition: transform 0.1s linear;
          will-change: transform;
        }

        /* Overlay uniforme — protege legibilidade do texto centralizado */
        .dest-hero__overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0.3) 0%,
            rgba(0, 0, 0, 0.5) 50%,
            rgba(0, 0, 0, 0.65) 100%
          );
        }

        /* Bloco de texto — ancorado na base da tela */
        .dest-hero__content {
          position: absolute;
          inset: 0;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: clamp(5rem, 8vw, 7rem) clamp(1.5rem, 5vw, 3.5rem) clamp(3rem, 5vw, 5rem);
        }

        .dest-hero__eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ochre-light);
          margin-bottom: 1.1rem;
        }

        /* Linhas laterais simétricas no eyebrow centralizado */
        .dest-hero__eyebrow::before,
        .dest-hero__eyebrow::after {
          content: '';
          display: block;
          width: 24px;
          height: 1px;
          background: var(--ochre-light);
          flex-shrink: 0;
        }

        .dest-hero__title {
          font-family: var(--font-display), Georgia, serif;
          font-weight: 700;
          line-height: 1.0;
          letter-spacing: -0.03em;
          color: #ffffff;
          margin: 0 auto;
          margin-bottom: 0;
          font-size: clamp(2.4rem, 6vw, 5rem);
          max-width: 16ch;
        }

        .dest-hero__subtitle {
          font-size: clamp(0.88rem, 1.6vw, 1rem);
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.68);
          margin: 0 auto;
          max-width: 52ch;
        }

        /* Indicador de scroll — linha animada */
        .dest-hero__scroll {
          position: absolute;
          bottom: clamp(1.5rem, 4vw, 2.5rem);
          right: clamp(1.5rem, 5vw, 3.5rem);
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.62rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .dest-hero__scroll-line {
          width: 1px;
          height: 48px;
          background: linear-gradient(to bottom, rgba(255,255,255,0.5), rgba(255,255,255,0));
          animation: scrollLineAnim 1.8s ease-in-out infinite;
        }

        @keyframes scrollLineAnim {
          0%   { transform: scaleY(0); transform-origin: top; opacity: 1; }
          50%  { transform: scaleY(1); transform-origin: top; opacity: 1; }
          51%  { transform-origin: bottom; }
          100% { transform: scaleY(0); transform-origin: bottom; opacity: 0.3; }
        }

        /* Linha decorativa — separa title do subtitle */
        .dest-hero__divider {
          width: 40px;
          height: 1px;
          background: var(--ochre);
          margin: 1.1rem auto;
        }

        /* Mobile */
        @media (max-width: 480px) {
          .dest-hero {
            height: 70dvh;
            min-height: 420px;
          }
          .dest-hero__img {
            height: 70dvh;
          }
          .dest-hero__title {
            font-size: clamp(2rem, 9vw, 2.8rem);
          }
          .dest-hero__subtitle {
            font-size: 0.88rem;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .dest-hero__scroll {
            display: none;
          }
        }

        /* Tablet */
        @media (min-width: 481px) and (max-width: 768px) {
          .dest-hero {
            height: 72dvh;
          }
          .dest-hero__img {
            height: 72dvh;
          }
        }
      `}</style>

      <section id="hero" className="dest-hero">
        {/* Imagem de fundo */}
        <div className="dest-hero__img">
          {heroImageUrl ? (
            <Image
              src={heroImageUrl}
              alt={`${title} — ${state}`}
              fill
              priority
              placeholder="blur"
              blurDataURL={heroImageBlurDataUrl ?? FALLBACK_BLUR}
              style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
              sizes="100vw"
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(160deg, var(--stone-700) 0%, var(--ochre-dark) 40%, var(--stone-900) 100%)',
              }}
            />
          )}
        </div>

        {/* Overlay de gradiente */}
        <div className="dest-hero__overlay" />

        {/* Conteúdo textual */}
        <div className="dest-hero__content hero-content-enter">
          <p className="dest-hero__eyebrow">{state}</p>
          <h1 className="dest-hero__title">{title}</h1>
          {subtitle && (
            <>
              <div className="dest-hero__divider" aria-hidden="true" />
              <p className="dest-hero__subtitle">{subtitle}</p>
            </>
          )}
        </div>

        {/* Scroll indicator */}
        <div className="dest-hero__scroll" aria-hidden="true">
          <div className="dest-hero__scroll-line" />
          <span>Scroll</span>
        </div>
        <OrganicDivider />
      </section>
    </>
  );
}
