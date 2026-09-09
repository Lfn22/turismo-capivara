import Link from 'next/link';
import Image from 'next/image';

const FALLBACK_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiM0NDQwM2MiLz48L3N2Zz4=';

interface Props {
  slug: string;
  title: string;
  subtitle: string | null;
  state: string;
  heroImageUrl: string | null;
  heroImageBlurDataUrl: string | null;
  /** Override link destination. Defaults to /destinos/{slug} */
  href?: string;
  /** Heading level for the card name. Defaults to h2. */
  headingLevel?: 'h2' | 'h3';
}

export default function DestinationCard({
  slug,
  title,
  subtitle,
  state,
  heroImageUrl,
  heroImageBlurDataUrl,
  href,
  headingLevel: Heading = 'h2',
}: Props) {
  const cardHref = href ?? `/destinos/${slug}`;

  return (
    <>
      <style precedence="default">{`
        .dcard {
          display: block;
          text-decoration: none;
          color: inherit;
          border-radius: 12px;
          overflow: hidden;
          background: #fff;
          border: 1px solid var(--stone-200, #e7e5e4);
          transition: box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }
        .dcard::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          background: linear-gradient(135deg, rgba(196,133,42,0.2), transparent 60%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
          z-index: 1;
        }
        .dcard:hover {
          box-shadow: 0 12px 32px rgba(196, 133, 42, 0.15),
                      0 4px 12px rgba(0, 0, 0, 0.06);
          transform: scale(1.03);
        }
        .dcard:hover::before {
          opacity: 1;
        }
        .dcard:active {
          transform: scale(0.98);
        }
        .dcard:focus-visible {
          outline: 2px solid var(--ochre, #c2783c);
          outline-offset: 2px;
        }
        .dcard__image {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          background: var(--stone-200, #E8DDD0);
          overflow: hidden;
        }
        .dcard__image-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--stone-200, #E8DDD0);
          color: var(--stone-400, #B8A090);
        }
        .dcard__body {
          padding: 20px;
        }
        .dcard__state {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ochre, #c2783c);
          margin: 0 0 6px;
        }
        .dcard__name {
          font-family: var(--font-display, Georgia, serif);
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 8px;
          color: var(--stone-900, #1c1917);
          line-height: 1.2;
        }
        .dcard__desc {
          font-size: 14px;
          color: var(--stone-500, #78716c);
          margin: 0;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .dcard__arrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 14px;
          font-size: 13px;
          font-weight: 600;
          color: var(--ochre, #c2783c);
        }
      `}</style>
      <Link href={cardHref} className="dcard">
        {/* Image */}
        <div className="dcard__image">
          {heroImageUrl ? (
            <Image
              src={heroImageUrl}
              alt={title}
              fill
              sizes="(max-width: 480px) 100vw, (max-width: 1024px) 50vw, 33vw"
              placeholder="blur"
              blurDataURL={heroImageBlurDataUrl ?? FALLBACK_BLUR}
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
          ) : (
            <div className="dcard__image-placeholder" aria-hidden="true">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="dcard__body">
          <p className="dcard__state">{state}</p>
          <Heading className="dcard__name">{title}</Heading>
          {subtitle && <p className="dcard__desc">{subtitle}</p>}
          <span className="dcard__arrow">
            Explorar destino
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </Link>
    </>
  );
}
