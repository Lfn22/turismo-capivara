'use client';

import { useEffect, useRef, useState } from 'react';

export default function HeroLogoAnimation() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('capi-hero-seen')) {
      setShouldAnimate(false);
      svgRef.current?.querySelectorAll('.draw-stroke, .dot-pop, .head-fill')
        .forEach((el) => el.classList.add('animate'));
      return;
    }

    setShouldAnimate(true);
    sessionStorage.setItem('capi-hero-seen', '1');

    const svg = svgRef.current;
    if (!svg) return;

    svg.querySelectorAll('.draw-stroke').forEach((path) => {
      const len = (path as SVGPathElement).getTotalLength?.() ?? 500;
      (path as HTMLElement).style.setProperty('--path-length', String(len));
    });

    svg.querySelectorAll('[data-delay]').forEach((el) => {
      const delay = parseFloat(el.getAttribute('data-delay') ?? '0') * 1000;
      setTimeout(() => el.classList.add('animate'), delay);
    });
  }, []);

  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="mb-8">
      <svg
        ref={svgRef}
        viewBox="0 0 320 260"
        className="w-[280px] h-[240px] md:w-[320px] md:h-[260px]"
        style={{ color: 'var(--ochre)', overflow: 'visible' }}
        aria-label="Logo CAPI animada — figuras rupestres com arco"
      >
        {/* Left figure */}
        <circle className={`head-fill dot-pop ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          cx="72" cy="38" r="11" fill="currentColor"
          style={{ '--pop-delay': '0.15s' } as React.CSSProperties} data-delay="0.15" />
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M40 100 L56 72 L72 52" strokeWidth="3.5" data-delay="0.3"
          style={{ '--draw-duration': '0.8s', '--draw-delay': '0.3s' } as React.CSSProperties} />
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M72 52 L88 72 L104 100" strokeWidth="3.5" data-delay="0.35"
          style={{ '--draw-duration': '0.8s', '--draw-delay': '0.35s' } as React.CSSProperties} />
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M72 52 L72 128" strokeWidth="4.5" data-delay="0.5"
          style={{ '--draw-duration': '0.6s', '--draw-delay': '0.5s' } as React.CSSProperties} />
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M72 128 L52 180" strokeWidth="3" data-delay="0.8"
          style={{ '--draw-duration': '0.5s', '--draw-delay': '0.8s' } as React.CSSProperties} />
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M72 128 L92 180" strokeWidth="3" data-delay="0.85"
          style={{ '--draw-duration': '0.5s', '--draw-delay': '0.85s' } as React.CSSProperties} />

        {/* Right figure */}
        <circle className={`head-fill dot-pop ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          cx="248" cy="38" r="11" fill="currentColor"
          style={{ '--pop-delay': '0.25s' } as React.CSSProperties} data-delay="0.25" />
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M216 100 L232 72 L248 52" strokeWidth="3.5" data-delay="0.35"
          style={{ '--draw-duration': '0.8s', '--draw-delay': '0.35s' } as React.CSSProperties} />
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M248 52 L264 72 L280 100" strokeWidth="3.5" data-delay="0.45"
          style={{ '--draw-duration': '0.8s', '--draw-delay': '0.45s' } as React.CSSProperties} />
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M248 52 L248 128" strokeWidth="4.5" data-delay="0.65"
          style={{ '--draw-duration': '0.6s', '--draw-delay': '0.65s' } as React.CSSProperties} />
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M248 128 L228 180" strokeWidth="3" data-delay="0.9"
          style={{ '--draw-duration': '0.5s', '--draw-delay': '0.9s' } as React.CSSProperties} />
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M248 128 L268 180" strokeWidth="3" data-delay="0.95"
          style={{ '--draw-duration': '0.5s', '--draw-delay': '0.95s' } as React.CSSProperties} />

        {/* Arch */}
        <path className={`draw-stroke ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          d="M110 170 Q110 55 160 30 Q210 55 210 170" strokeWidth="6" data-delay="1.2"
          style={{ '--draw-duration': '1.2s', '--draw-delay': '1.2s' } as React.CSSProperties} />

        {/* Center dot */}
        <circle className={`dot-pop ${!shouldAnimate || prefersReduced ? 'animate' : ''}`}
          cx="160" cy="112" r="14" fill="currentColor"
          style={{ '--pop-delay': '1.9s', transformOrigin: '160px 112px' } as React.CSSProperties} data-delay="1.9" />
      </svg>
    </div>
  );
}
