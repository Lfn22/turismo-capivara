'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  destinations: number;
  guides: number;
  packages: number;
}

function AnimatedCounter({ target, suffix, active }: { target: number; suffix: string; active: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active || target === 0) return;

    // Respeita prefers-reduced-motion: mostra valor final imediatamente
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(target);
      return;
    }

    const steps = 40;
    const duration = 1800;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const t = step / steps;
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(eased * target));

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
    { value: guides, suffix: '', label: 'Guias Locais' },
    ...(packages > 0 ? [{ value: packages, suffix: '', label: 'Roteiros' }] : []),
  ];

  return (
    <div ref={ref} className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, var(--stone-800), var(--stone-900))',
        borderTop: '1px solid rgba(196,133,42,0.15)',
        borderBottom: '1px solid rgba(196,133,42,0.15)',
        boxShadow: 'inset 0 1px 0 rgba(196,133,42,0.08), inset 0 -1px 0 rgba(196,133,42,0.08)',
      }}>
      <div className="max-w-[900px] mx-auto py-8 px-5 grid gap-4 text-center"
          style={{ gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}>
        {stats.map((stat, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="font-[family-name:var(--font-display)] font-bold text-2xl md:text-4xl"
              style={{ color: 'var(--ochre-light)' }}>
              <AnimatedCounter target={stat.value} suffix={stat.suffix} active={active} />
            </span>
            <span className="text-xs font-semibold tracking-[0.15em] uppercase"
              style={{ color: 'var(--stone-400)' }}>
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
