'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useReducer, useState } from 'react';
import { MapPin, Pause, Play } from 'lucide-react';
import { IconButton } from '@/src/components/ui/capi';

export interface HeroSlide {
  src: string;
  blurDataUrl?: string | null;
  /** Legenda curta: nome do destino ou do roteiro. */
  label: string;
  /** "Destino" | "Roteiro" — aparece antes da legenda. */
  kind: string;
  href: string;
}

const INTERVAL_MS = 6000;

type SlideState = { index: number; mounted: ReadonlySet<number> };
type SlideAction = { type: 'next'; count: number } | { type: 'go'; to: number; count: number };

/** Avança o índice e já marca a foto seguinte para montar (pré-carrega antes do fade). */
function slideReducer(state: SlideState, action: SlideAction): SlideState {
  const index = action.type === 'next' ? (state.index + 1) % action.count : action.to;
  const next = (index + 1) % action.count;
  if (state.index === index && state.mounted.has(next)) return state;
  return { index, mounted: new Set([...state.mounted, index, next]) };
}

/**
 * Fundo do hero com as fotos de destinos e roteiros em fade.
 * - Só carrega a foto atual e a próxima (economiza dados no 4G).
 * - Pausa com a aba oculta, com prefers-reduced-motion e pelo botão (WCAG 2.2.2).
 */
export default function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const [{ index, mounted }, dispatch] = useReducer(slideReducer, { index: 0, mounted: new Set([0, 1]) });
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const count = slides.length;
  const running = count > 1 && !paused && !reducedMotion;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!running) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      timer = setInterval(() => dispatch({ type: 'next', count }), INTERVAL_MS);
    };
    const stop = () => clearInterval(timer);
    const onVisibility = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [running, count]);

  if (count === 0) return null;
  const current = slides[index];

  return (
    <>
      <style>{`
        .hero-slides { position: absolute; inset: 0; z-index: -2; }
        .hero-slides__img { object-fit: cover; opacity: 0; transition: opacity 1.2s ease-in-out; }
        .hero-slides__img.is-active { opacity: 1; }
        @media (prefers-reduced-motion: reduce) { .hero-slides__img { transition: none; } }

        .hero-slides__bar {
          position: absolute; z-index: 1;
          left: 0; right: 0;
          bottom: calc(var(--space-16) + var(--space-3));
          display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
        }
        .hero-slides__caption {
          display: inline-flex; align-items: center; gap: 6px; min-width: 0;
          min-height: var(--touch-target);
          font: 500 13px/1.3 var(--font-sans);
          color: var(--text-on-brand);
          text-decoration: none;
          text-shadow: 0 1px 2px rgba(18, 10, 4, .45);
        }
        .hero-slides__caption span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .hero-slides__caption:hover span { text-decoration: underline; text-underline-offset: 3px; }
        .hero-slides__kind { opacity: .8; }
        .hero-slides__controls { display: flex; align-items: center; gap: var(--space-2); flex-shrink: 0; }
        .hero-slides__dots { display: none; gap: 6px; }
        @media (min-width: 640px) { .hero-slides__dots { display: flex; } }
        .hero-slides__dot {
          width: 8px; height: 8px; padding: 0; border: 0; border-radius: 999px;
          background: var(--text-on-brand); opacity: .45; cursor: pointer;
          transition: opacity .2s, width .2s;
        }
        .hero-slides__dot[aria-current='true'] { opacity: 1; width: 20px; }
        .hero-slides__dot:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 3px; }
      `}</style>

      <div className="hero-slides" aria-hidden="true">
        {slides.map((s, i) =>
          mounted.has(i) ? (
            <Image
              key={s.src}
              src={s.src}
              alt=""
              fill
              priority={i === 0}
              sizes="100vw"
              className={`hero-slides__img${i === index ? ' is-active' : ''}`}
              placeholder={s.blurDataUrl ? 'blur' : 'empty'}
              blurDataURL={s.blurDataUrl ?? undefined}
            />
          ) : null
        )}
      </div>

      <div className="hero-slides__bar capi-container">
        <Link href={current.href} className="hero-slides__caption" aria-live={running ? 'off' : 'polite'}>
          <MapPin size={14} strokeWidth={2} aria-hidden="true" />
          <span>
            <span className="hero-slides__kind">{current.kind} · </span>
            {current.label}
          </span>
        </Link>

        {count > 1 ? (
          <div className="hero-slides__controls">
            <div className="hero-slides__dots" role="group" aria-label="Escolher foto">
              {slides.map((s, i) => (
                <button
                  key={s.src}
                  type="button"
                  className="hero-slides__dot"
                  aria-label={`Foto ${i + 1} de ${count}: ${s.label}`}
                  aria-current={i === index ? 'true' : undefined}
                  onClick={() => dispatch({ type: 'go', to: i, count })}
                />
              ))}
            </div>
            {!reducedMotion ? (
              <IconButton
                icon={paused ? Play : Pause}
                label={paused ? 'Retomar fotos' : 'Pausar fotos'}
                variant="glass"
                size="sm"
                onClick={() => setPaused((p) => !p)}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
