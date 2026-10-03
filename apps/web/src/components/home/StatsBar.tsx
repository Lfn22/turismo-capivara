'use client';

import { useEffect, useRef, useState } from 'react';

const stats = [
  { value: 120, suffix: '+', label: 'Roteiros' },
  { value: 45, suffix: '', label: 'Guias Locais' },
  { value: 2800, suffix: '+', label: 'Aventureiros' },
];

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function AnimatedCounter({ target, suffix, active }: { target: number; suffix: string; active: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    const duration = prefersReducedMotion() ? 0 : 1800;
    const steps = duration === 0 ? 1 : 40;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      // Ease-out cubic
      const t = step / steps;
      const eased = 1 - Math.pow(1 - t, 3);
      current = Math.round(eased * target);
      setCount(current);

      if (step >= steps) {
        setCount(target);
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [active, target]);

  return (
    <span>
      {count.toLocaleString('pt-BR')}{suffix}
    </span>
  );
}

/** Faixa de números em `surface-brand`. Valores em sans 700 com dígitos tabulares. */
export default function StatsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="bg-surface-brand text-on-brand">
      <dl className="capi-container capi-container--content grid grid-cols-3 gap-4 text-center" style={{ paddingBlock: 'var(--space-10)' }}>
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col-reverse items-center gap-1">
            <dt
              className="text-xs font-semibold uppercase tracking-[0.08em]"
              style={{ color: 'var(--text-on-brand-secondary)' }}
            >
              {stat.label}
            </dt>
            <dd
              className="text-[clamp(24px,4vw,32px)] font-bold leading-none"
              style={{ color: 'var(--text-on-brand)', fontVariantNumeric: 'tabular-nums' }}
            >
              <AnimatedCounter target={stat.value} suffix={stat.suffix} active={active} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
