import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MapPin, Mountain } from 'lucide-react';
import { Tabs, type TabItem } from '@/src/components/ui/capi';

export interface DestinationHeroProps {
  title: string;
  subtitle: string | null;
  state: string;
  heroImageUrl: string | null;
  heroImageBlurDataUrl: string | null;
  /** Opcionais (v2): contagens exibidas no resumo do hero. */
  packageCount?: number;
  guideCount?: number;
}

/**
 * Hero do destino — 16:9 a partir de 768px, ~60vh no celular.
 * Foto + `--scrim-photo`, UF, nome em Playfair, resumo e contagens.
 * Mantém `id="hero"`: a StickyDestinationNav observa este elemento.
 */
export default function DestinationHero({
  title,
  subtitle,
  state,
  heroImageUrl,
  heroImageBlurDataUrl,
  packageCount,
  guideCount,
}: DestinationHeroProps) {
  const meta = [
    packageCount != null ? `${packageCount} ${packageCount === 1 ? 'roteiro' : 'roteiros'}` : null,
    guideCount != null ? `${guideCount} ${guideCount === 1 ? 'guia' : 'guias'}` : null,
  ].filter(Boolean);

  return (
    <>
      <style>{`
        .dhero {
          position: relative;
          width: 100%;
          height: 60dvh;
          min-height: 420px;
          overflow: hidden;
          background: var(--surface-brand);
          color: var(--text-on-brand);
        }
        @media (min-width: 768px) {
          .dhero { height: auto; min-height: 0; aspect-ratio: 16 / 9; max-height: 82dvh; }
        }
        .dhero__ph {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          color: var(--text-on-brand-secondary);
        }
        .dhero__scrim {
          position: absolute; inset: 0; z-index: 1;
          background:
            linear-gradient(to top, var(--scrim-photo) 0%, transparent 65%),
            linear-gradient(to bottom, var(--scrim-photo) 0%, transparent 28%);
        }
        .dhero__content {
          position: absolute; inset: auto 0 0 0; z-index: 2;
          padding-bottom: var(--space-8);
        }
        @media (min-width: 768px) { .dhero__content { padding-bottom: var(--space-12); } }
        .dhero__state {
          display: inline-flex; align-items: center; gap: 6px;
          margin-bottom: var(--space-2);
          font-size: 13px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
          color: var(--text-on-brand);
        }
        .dhero__title {
          max-width: 16ch;
          font-family: var(--font-display);
          font-size: clamp(36px, 7vw, 64px);
          font-weight: 700; line-height: 1.05; letter-spacing: -.02em;
          color: var(--text-on-brand);
        }
        .dhero__subtitle {
          max-width: 56ch;
          margin-top: var(--space-3);
          font-size: 16px; line-height: 1.55;
          color: var(--text-on-brand);
          opacity: .92;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
        }
        @media (min-width: 768px) { .dhero__subtitle { font-size: 18px; } }
        .dhero__meta {
          display: flex; flex-wrap: wrap; gap: var(--space-2);
          margin-top: var(--space-4);
        }
        .dhero__pill {
          display: inline-flex; align-items: center;
          min-height: 32px; padding: 0 var(--space-3);
          border-radius: var(--radius-pill);
          background: var(--glass); color: var(--text);
          font-size: 13px; font-weight: 600;
        }
      `}</style>

      <section id="hero" className="dhero" aria-label={`${title}, ${state}`}>
        {heroImageUrl ? (
          <Image
            src={heroImageUrl}
            alt={`${title} — ${state}`}
            fill
            priority
            placeholder={heroImageBlurDataUrl ? 'blur' : 'empty'}
            blurDataURL={heroImageBlurDataUrl ?? undefined}
            style={{ objectFit: 'cover', objectPosition: 'center 35%' }}
            sizes="100vw"
          />
        ) : (
          <div className="dhero__ph" aria-hidden="true">
            <Mountain size={56} strokeWidth={1.25} />
          </div>
        )}

        <div className="dhero__scrim" aria-hidden="true" />

        <div className="dhero__content">
          <div className="capi-container hero-content-enter">
            <p className="dhero__state">
              <MapPin size={16} strokeWidth={1.75} aria-hidden="true" />
              {state}
            </p>
            <h1 className="dhero__title">{title}</h1>
            {subtitle ? <p className="dhero__subtitle">{subtitle}</p> : null}
            {meta.length > 0 ? (
              <div className="dhero__meta">
                {meta.map((m) => (
                  <span key={m} className="dhero__pill">{m}</span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}

// ── Abas do destino (Roteiros · Guias · Sobre · Mapa) ───────────────────────

export type DestinationTab = 'roteiros' | 'guias' | 'sobre' | 'mapa';

/**
 * Faixa de abas sticky das páginas de destino. Roteiros e Guias são rotas;
 * Sobre e Mapa são âncoras na página do destino.
 */
export function DestinationTabs({
  slug,
  active,
  showMap = false,
}: {
  slug: string;
  active: DestinationTab;
  showMap?: boolean;
}) {
  const base = `/destinos/${slug}`;
  const items: TabItem[] = [
    { value: 'roteiros', label: 'Roteiros', href: `${base}/roteiros` },
    { value: 'guias', label: 'Guias', href: `${base}/guias` },
    { value: 'sobre', label: 'Sobre', href: `${base}#sobre` },
    ...(showMap ? [{ value: 'mapa', label: 'Mapa', href: `${base}#mapa` }] : []),
  ];
  return (
    <>
      <style>{`
        .dtabs {
          position: sticky; top: 0; z-index: var(--z-sticky);
          background: var(--glass);
          -webkit-backdrop-filter: saturate(1.6) blur(16px);
          backdrop-filter: saturate(1.6) blur(16px);
          border-bottom: 1px solid var(--border);
        }
        .dtabs .capi-tabs--underline { border-bottom: 0; }
      `}</style>
      <div className="dtabs">
        <div className="capi-container">
          <Tabs items={items} value={active} label="Seções do destino" />
        </div>
      </div>
    </>
  );
}

// ── Cabeçalho das subpáginas do destino (sem foto) ───────────────────────────

/**
 * Cabeçalho das subpáginas (roteiros, guias): voltar ao destino, overline,
 * título em Playfair e linha de apoio. Reserva o espaço da nav fixa do destino.
 */
export function DestinationSubheader({
  backHref,
  backLabel,
  overline,
  title,
  lead,
}: {
  backHref: string;
  backLabel: string;
  overline: string;
  title: string;
  lead?: string;
}) {
  return (
    <>
      <style>{`
        .dsub {
          padding-top: calc(56px + var(--space-6));
          padding-bottom: var(--space-6);
          background: var(--bg-page);
        }
        @media (min-width: 768px) {
          .dsub { padding-top: calc(var(--topbar-height) + var(--space-10)); padding-bottom: var(--space-8); }
        }
        .dsub__back {
          display: inline-flex; align-items: center; gap: 6px;
          min-height: var(--touch-target);
          margin-bottom: var(--space-2);
          font-size: 14px; font-weight: 600; text-decoration: none;
          color: var(--text-secondary);
          border-radius: var(--radius-sm);
        }
        .dsub__back:hover { color: var(--text); }
        .dsub__overline {
          margin-bottom: var(--space-2);
          font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
          color: var(--text-primary);
        }
        .dsub__title {
          font-family: var(--font-display);
          font-size: clamp(32px, 5vw, 44px); font-weight: 700; line-height: 1.1;
          color: var(--text);
        }
        .dsub__lead { max-width: 560px; margin-top: var(--space-2); font-size: 16px; line-height: 1.55; color: var(--text-secondary); }
      `}</style>
      <header className="dsub">
        <div className="capi-container">
          <Link href={backHref} className="dsub__back">
            <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
            {backLabel}
          </Link>
          <p className="dsub__overline">{overline}</p>
          <h1 className="dsub__title">{title}</h1>
          {lead ? <p className="dsub__lead">{lead}</p> : null}
        </div>
      </header>
    </>
  );
}
