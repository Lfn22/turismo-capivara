'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  destinations: number;
  guides: number;
  packages: number;
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function AnimatedCounter({ target, suffix, active }: { target: number; suffix: string; active: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active || target === 0) return;
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
export default function StatsBar({ destinations, guides, packages }: Props) {
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

  const stats = [
    { value: destinations, suffix: '', label: 'Destinos' },
    { value: guides, suffix: '', label: 'Guias locais' },
    ...(packages > 0 ? [{ value: packages, suffix: '', label: 'Roteiros' }] : []),
  ];

  return (
    <div ref={ref} className="bg-surface-brand text-on-brand">
      <dl className="capi-container capi-container--content grid gap-4 text-center"  style={{ paddingBlock: 'var(--space-10)', gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
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
